import type { GameEvent, GameState, WeekDecisions, WeekResult } from './types';
import { businessFor } from '../config/businesses';
import { TIERS } from '../config/difficulty';
import { eventsForBusiness } from '../config/events';
import { BADGES, rollMiniGoal } from '../config/milestones';
import { forecastFor, rollWeather, seasonForWeek } from './calendar';
import { applySpoilage, computeDemand, rivalShare } from './demand';
import { resolveLocation } from './locations';
import { drawEvents, resolveEventChoices } from './events';
import { conditionNoteOf, reliabilityOf } from './asset';
import { chargeWeek, money } from './loans';
import { priceBandFor } from './pricing';
import { makeRng, nextSeed } from './rng';
import { sanitizeRun } from './sanitize';

export const FINAL_WEEK = 50;

/**
 * The whole game in one pure function. No React, no storage, no randomness that
 * is not seeded. Order of operations matters and is the same every week:
 *
 *   buy stock -> buy marketing -> hire/fire -> event effects -> sell ->
 *   pay rent and wages -> pay the bank -> throw out what spoiled -> score it.
 */
export function simulateWeek(input: GameState, decisions: WeekDecisions): GameState {
  // Never trust the incoming shape. One undefined number becomes NaN and then
  // spreads through profit, the history and the valuation without a whisper.
  const state = sanitizeRun(input);
  const biz = businessFor(state.businessId, state.tier);
  const tier = TIERS[state.tier];
  const rng = makeRng(state.rngSeed);

  const picked = biz.qualities.find((q) => q.id === decisions.qualityId) ?? biz.qualities[0];
  // A seasonal product comes off the menu when its season ends, so a player who
  // stops paying attention is put back on the year-round recipe rather than
  // quietly selling cocoa in July.
  const inSeason = (q: typeof picked) => !q.seasons || q.seasons.includes(state.season);
  const quality = inSeason(picked)
    ? picked
    : (biz.qualities.find((q) => q.id === state.qualityId && inSeason(q)) ??
      biz.qualities.find(inSeason) ??
      biz.qualities[0]);

  const cashStart = state.cash;
  const reputationStart = state.reputation;

  /**
   * Where the week is actually spent.
   *
   * A card that grounds the business overrides whatever spot was asked for —
   * the engine is in pieces, it is not going anywhere. That is settled first,
   * because which cards even happen depends on where the week is spent.
   *
   * A business still being built out cannot sell anything, and it cannot have
   * an operating week happen to it either. The closed-week screen sends no
   * answers, and `resolveEventChoices` used to pick the first option on every
   * card that had been drawn for a week the player never saw — so a used truck
   * would silently buy a permit, dump a cooler, or nurse a fryer along while
   * the doors were still shut. Demand is gated below; the cards are gated here.
   */
  const buildingOut = (state.weeksToOpen ?? 0) > 0;
  const grounded =
    !buildingOut &&
    state.pendingEvents.some((e) =>
      e.choices.some((c) => c.id === decisions.eventChoices[e.id] && c.locksLocation),
    );
  const wantedId = grounded ? state.locationId : decisions.locationId;
  const location = grounded
    ? (biz.locations.find((l) => l.id === wantedId) ?? biz.locations[0])
    : resolveLocation(biz.locations, wantedId, state.season);

  /**
   * A card tied to a spot only happens at that spot. Park somewhere else and the
   * organizer is not there to talk to you, so the card does not fire
   * and none of its effects land.
   */
  const eventsHappening = buildingOut
    ? []
    : state.pendingEvents.filter(
        (e) => !e.locations || e.locations.includes(location.id),
      );

  const ev = resolveEventChoices(
    eventsHappening,
    decisions.eventChoices,
    tier.eventScale,
    tier.trafficScale,
    decisions.price,
  );

  /**
   * A refund is one order handed back, so it is worth what one order costs.
   *
   * Money on a card comes in two kinds. A permit, a repair or a catering invoice
   * is business-sized and scales with the tier. Giving a customer their money
   * back is not: it is the price, and the price barely moves between tiers. Run
   * through the money multiplier, a $30 refund became $75 at Tycoon — seven
   * meals handed back for one cold one. Cards say `cashUnits` for that kind and
   * it is converted here, at what the player is actually charging.
   */
  const unitMoney = money(ev.cashUnits * decisions.price);

  let cash = cashStart;
  let inventory = state.inventory;
  let inventoryCost = state.inventoryCost;
  let reputation = state.reputation;
  const discussionFlags: string[] = [];

  // --- 1. Buy stock -------------------------------------------------------
  const unitCost = money(quality.unitCost * tier.unitCostScale * ev.unitCostMod);
  const wantUnits = buildingOut ? 0 : Math.max(0, Math.round(decisions.restockUnits));
  const affordableUnits = unitCost > 0 ? Math.floor(Math.max(0, cash) / unitCost) : wantUnits;
  const boughtUnits = Math.min(wantUnits, affordableUnits);
  let suppliesBought = money(boughtUnits * unitCost);
  const orderedUnits = boughtUnits;
  const orderedSpend = suppliesBought;
  cash = money(cash - suppliesBought);
  inventory += boughtUnits;
  inventoryCost = money(inventoryCost + suppliesBought);

  // --- 2. Buy marketing ---------------------------------------------------
  let marketingSpend = 0;
  const marketing = [...state.marketing];
  if (!buildingOut) {
    for (const channelId of decisions.buyMarketing) {
      const channel = biz.marketing.find((m) => m.id === channelId);
      if (!channel || cash < channel.cost) continue;
      // A wrap is paint on the truck. You do not buy it twice, and a second
      // tap this week is not a second wrap.
      if (channel.kind === 'owned' && marketing.some((m) => m.channelId === channel.id)) continue;
      cash = money(cash - channel.cost);
      marketingSpend = money(marketingSpend + channel.cost);
      reputation += channel.reputationBonus ?? 0;
      marketing.push({
        channelId: channel.id,
        weeksLeft: channel.durationWeeks,
        boost: channel.boost,
        customersBrought: 0,
        spent: channel.cost,
      });
      discussionFlags.push(`Spent $${channel.cost} on ${channel.name}`);
    }
  }

  // --- 3. Hire and fire ---------------------------------------------------
  // A stand can run more than one pair of hands. Each is hired and let go on
  // its own, and each draws its own wage every week it stays.
  let employees = [...state.employees];
  if (!buildingOut) {
    if (decisions.fireEmployee) employees = [];
    const letGo = decisions.fireEmployeeIds ?? [];
    for (const id of letGo) {
      const gone = employees.find((e) => e.id === id);
      if (gone) discussionFlags.push(`Let ${gone.name} go`);
    }
    employees = employees.filter((e) => !letGo.includes(e.id));

    const hiring =
      decisions.hireEmployeeIds ?? (decisions.hireEmployeeId ? [decisions.hireEmployeeId] : []);
    for (const id of hiring) {
      const hire = biz.employees.find((e) => e.id === id);
      if (hire && !employees.some((e) => e.id === hire.id)) {
        employees.push(hire);
        discussionFlags.push(`Hired ${hire.name} at $${hire.weeklyWage} a week`);
      }
    }
  }

  // --- 4. Instant event effects ------------------------------------------
  cash = money(cash + ev.cash + unitMoney);
  reputation += ev.reputation;

  let stockLost = 0;
  let stockLostCost = 0;
  let eventCash = money(ev.cash + unitMoney);

  if (ev.inventory > 0) {
    // A card that hands you stock is a purchase, not an expense. Its cash is
    // what that stock cost, so it joins supplies bought and is recovered
    // through cost of goods when the cups actually sell. Booking it as an
    // event expense charged the player twice for the same box.
    const stockSpend = money(Math.max(0, -ev.cash));
    inventory += ev.inventory;
    inventoryCost = money(inventoryCost + stockSpend);
    suppliesBought = money(suppliesBought + stockSpend);
    eventCash = money(ev.cash + unitMoney + stockSpend);
  } else if (ev.inventory < 0) {
    // Stock an event destroys is a real loss, written off at what it cost.
    const before = inventory;
    inventory = Math.max(0, inventory + ev.inventory);
    stockLost = before - inventory;
    const avg = before > 0 ? inventoryCost / before : 0;
    stockLostCost = money(stockLost * avg);
    inventoryCost = money(Math.max(0, inventoryCost - stockLostCost));
  }

  // --- 5. Sell ------------------------------------------------------------
  // An event that changes the price changes the PRICE, and the demand curve
  // does the rest. Faking it with a demand multiplier would invent a second
  // elasticity next to the one the model already has.
  const price = money(decisions.price * ev.priceMod);
  const breakdown = computeDemand({
    state: { ...state, marketing, reputation },
    location,
    quality,
    bizSeasonMods: biz.seasonMods,
    bizWeatherMods: biz.weatherMods,
    price,
    referencePrice: biz.referencePrice[state.tier],
    elasticity: tier.elasticity,
    conversionRate: biz.conversionRate,
    eventDemandMod: ev.demandMod,
    // Two draws averaged, so weeks cluster near typical and the extremes are
    // rare rather than equally likely. One flat draw made the spot's whole
    // volatility band uniform, which is what made demand feel arbitrary.
    noiseRoll: (rng() + rng()) / 2,
  });
  // The stand across the street. Undercut them and you take share; charge well
  // over them and customers walk.
  const facesRival = biz.rival.tiers.includes(state.tier);
  const rivalMod = facesRival ? rivalShare(price, state.rivalPrice, biz.rival.sensitivity) : 1;
  /**
   * A business still being built out cannot sell anything. The doors are shut,
   * refit is half finished, and every bill — the loan, the lease, the pitch fee
   * — arrives anyway. That is the whole price of buying something cheap and
   * unfinished, and it has to be felt rather than described.
   *
   * Gating demand here rather than sales means nobody is recorded as turned
   * away either: they never came, because there was nothing to come to.
   */
  const demandBeforeRival = buildingOut ? 0 : breakdown.demand;
  const demand = Math.max(0, Math.round(demandBeforeRival * rivalMod));
  const lostToRival = Math.max(0, demandBeforeRival - demand);

  const employeeCapacity = ev.staffOut
    ? 0
    : employees.reduce((s, e) => s + e.capacityBonus, 0);
  const bonusCapacity = Math.max(0, state.bonusCapacity + ev.capacity);
  // What you sell changes how fast you can serve it: one item flies out of the
  // window, an everything-menu turns every order into a conversation.
  const capacity = Math.round(
    (biz.soloCapacity + employeeCapacity + bonusCapacity) *
      ev.capacityMod *
      (quality.capacityMod ?? 1),
  );

  const afterCapacity = Math.min(demand, capacity);
  const lostToCapacity = demand - afterCapacity;
  const served = Math.min(afterCapacity, inventory);
  const lostToStockout = afterCapacity - served;

  // Side item: a share of the people already buying a drink add one. It needs
  // no extra customers, which is the whole point of an add-on.
  const side = biz.sideProducts.find((sp) => sp.id === decisions.sideProductId);
  // Treats are baked in a batch before the week starts. The batch is paid for
  // whether anyone turns up or not, and what does not sell is thrown out — so a
  // quiet week loses money on treats, which is the entire reason they are a
  // decision rather than free margin.
  const sideWanted = side ? Math.round(served * side.attachRate) : 0;
  const sideBatchSize = side ? side.batchSize : 0;
  const sideUnits = Math.min(sideWanted, sideBatchSize);
  const sideWasted = Math.max(0, sideBatchSize - sideUnits);
  const sideRevenue = money(sideUnits * (side?.price ?? 0));
  const sideCogs = money((side?.batchCost ?? 0) * tier.unitCostScale);

  // Stock is valued at weighted average, so a cheap box genuinely lowers what
  // every cup cost and the saving lands in gross profit.
  const avgUnitCost = inventory > 0 ? money(inventoryCost / inventory) : unitCost;
  const drinkCogs = money(served * avgUnitCost);
  const revenue = money(served * price + sideRevenue);
  const cogs = money(drinkCogs + sideCogs);
  inventory -= served;
  inventoryCost = money(Math.max(0, inventoryCost - drinkCogs));
  cash = money(cash + revenue);

  // Attribute new customers to live campaigns, so the CAC readout is honest.
  const campaignShare = marketing.reduce((s, m) => s + m.boost, 0);
  if (campaignShare > 0) {
    const liftedCustomers = served - served / (1 + campaignShare);
    for (const m of marketing) {
      m.customersBrought += Math.round(liftedCustomers * (m.boost / campaignShare));
    }
  }

  // --- 6. Rent and wages --------------------------------------------------
  // A truck in the shop is not parked at a lunch spot. The loan still comes
  // due — that is the price of buying cheap with borrowed money — but the
  // pitch fee is for a curb you are not on.
  const rent = buildingOut ? 0 : money(location.weeklyRent);
  const fixedCosts = buildingOut
    ? 0
    : money(location.weeklyFixedCosts * tier.fixedCostScale);
  // A leased asset costs the same every week for the life of the business,
  // whether it is open, being built out, or having a terrible July.
  const assetPayment = money(state.assetWeekly ?? 0);
  const wages =
    ev.staffOut === 'unpaid' ? 0 : money(employees.reduce((s, e) => s + e.weeklyWage, 0));
  cash = money(cash - rent - fixedCosts - assetPayment - wages);

  // --- 7. Pay the bank ----------------------------------------------------
  let loanPayment = 0;
  let interestPaid = 0;
  let lateFees = 0;
  let missedPayment = false;
  let justPaidOffAny = false;
  const loans = state.loans.map((loan) => {
    if (loan.paidOff) return loan;
    const out = chargeWeek(loan, cash, tier.lateFee);
    if (out.missed) {
      missedPayment = true;
      lateFees = money(lateFees + out.lateFee);
    } else {
      cash = money(cash - out.paid);
      loanPayment = money(loanPayment + out.paid);
      interestPaid = money(interestPaid + out.interestPortion);
      if (out.justPaidOff) justPaidOffAny = true;
    }
    return out.loan;
  });

  // Optional extra payment toward principal — early payoff saves real interest.
  if (decisions.extraLoanPayment && decisions.extraLoanPayment > 0) {
    let budget = Math.min(decisions.extraLoanPayment, cash);
    for (const loan of loans) {
      if (loan.paidOff || budget <= 0) continue;
      const pay = Math.min(budget, loan.principalBalance);
      loan.principalBalance = money(loan.principalBalance - pay);
      loan.balance = money(Math.max(0, loan.balance - pay));
      budget = money(budget - pay);
      cash = money(cash - pay);
      loanPayment = money(loanPayment + pay);
      if (loan.principalBalance <= 0.005) {
        loan.paidOff = true;
        loan.balance = 0;
        loan.weeksRemaining = 0;
        justPaidOffAny = true;
      }
    }
    discussionFlags.push('Paid extra toward the loan');
  }

  // --- 8. Spoilage --------------------------------------------------------
  const { kept, spoiled } = applySpoilage(inventory, biz.spoilRate * tier.spoilScale);
  const spoilageCost = money(spoiled * avgUnitCost);
  inventory = kept;
  inventoryCost = money(Math.max(0, inventoryCost - spoilageCost));
  if (inventory === 0) inventoryCost = 0;

  // --- 9. Reputation ------------------------------------------------------
  reputation += quality.reputationDrift;
  if (side && sideUnits > 0) reputation += side.reputationBonus ?? 0;
  if (served > 0 && lostToStockout === 0 && lostToCapacity === 0) reputation += 0.04;
  if (demand > 0) {
    // Selling out annoys people, but not as much as bad service does. These are
    // deliberately mild: a player who fixes their ordering has to be able to
    // climb back above the Stage 2 reputation gate, or the fix for stockouts
    // (hiring a helper) sits behind the very problem it solves.
    reputation -= (lostToStockout / demand) * 0.45;
    reputation -= (lostToCapacity / demand) * 0.3;
  }
  const ref = biz.referencePrice[state.tier];
  if (price > ref * 2) reputation -= 0.25;
  else if (price > ref * 1.5) reputation -= 0.1;
  if (employees.length > 0) {
    const avgSkill = employees.reduce((s, e) => s + e.skill, 0) / employees.length;
    reputation += avgSkill >= 0.7 ? 0.05 : -0.05;
  }
  if (missedPayment) reputation -= 0.1;
  // Reputation drifts back toward the middle. Five stars has to be earned every
  // week by a better product, not banked once and forgotten — and a disaster
  // week is recoverable rather than permanent.
  reputation += (3.5 - reputation) * 0.05;
  reputation = Math.max(
    location.reputationFloor ?? 1,
    Math.min(5, Math.round(reputation * 1000) / 1000),
  );

  // --- 10. Emergency cash -------------------------------------------------
  let emergencyAdvance = 0;
  if (cash < 0) {
    emergencyAdvance = money(-cash);
    cash = 0;
    const rescue = loans.find((l) => l.offerId === 'rescue' && !l.paidOff);
    if (rescue) {
      rescue.balance = money(rescue.balance + emergencyAdvance * 1.2);
      rescue.principalBalance = money(rescue.principalBalance + emergencyAdvance);
      rescue.weeksRemaining = Math.max(rescue.weeksRemaining, 8);
      rescue.weeklyPayment = money(rescue.balance / rescue.weeksRemaining);
    } else {
      const total = money(emergencyAdvance * 1.2);
      loans.push({
        offerId: 'rescue',
        lender: 'Emergency Advance',
        emoji: '🚨',
        kind: 'flat',
        principal: emergencyAdvance,
        annualRate: 0,
        termWeeks: 8,
        balance: total,
        principalBalance: emergencyAdvance,
        weeklyPayment: money(total / 8),
        weeksRemaining: 8,
        totalInterest: money(total - emergencyAdvance),
        missedPayments: 0,
        paidOff: false,
      });
    }
    discussionFlags.push('Ran out of cash and needed an advance');
  }

  // --- 11. Score the week -------------------------------------------------
  const grossProfit = money(revenue - cogs - spoilageCost - stockLostCost);
  const profit = money(
    grossProfit -
      rent -
      fixedCosts -
      assetPayment -
      wages -
      marketingSpend -
      interestPaid -
      lateFees +
      eventCash,
  );
  const cashChange = money(cash - cashStart);

  const roughWeeks = emergencyAdvance > 0 || missedPayment ? state.roughWeeks + 1 : 0;
  const bankerTalk = roughWeeks >= 3;

  const totals = {
    revenue: money(state.totals.revenue + revenue),
    profit: money(state.totals.profit + profit),
    customers: state.totals.customers + served,
    marketingSpend: money(state.totals.marketingSpend + marketingSpend),
    interestPaid: money(state.totals.interestPaid + interestPaid + lateFees),
  };

  // Mini goal
  const goal = state.miniGoal;
  let miniGoalMet = false;
  if (!buildingOut) {
    switch (goal.kind) {
      case 'customers':
        miniGoalMet = served >= goal.target;
        break;
      case 'cashEnd':
        miniGoalMet = cash >= goal.target;
        break;
      case 'profit':
        miniGoalMet = profit >= goal.target;
        break;
      case 'reputation':
        miniGoalMet = reputation >= goal.target;
        break;
    }
  }
  // Closed weeks pause the streak rather than resetting it. Counting them as
  // hits is how a used truck earned "On A Roll" while it was still in the shop.
  const miniGoalStreak = buildingOut
    ? state.miniGoalStreak
    : miniGoalMet
      ? state.miniGoalStreak + 1
      : 0;

  // Marketing decay. A rented campaign fades. Paint on the truck does not.
  const nextMarketing = marketing
    .map((m) => {
      const channel = biz.marketing.find((c) => c.id === m.channelId);
      if (channel?.kind === 'owned') return m;
      return { ...m, weeksLeft: m.weeksLeft - 1 };
    })
    .filter((m) => m.weeksLeft > 0)
    .map((m) => {
      const channel = biz.marketing.find((c) => c.id === m.channelId);
      if (!channel || channel.kind === 'owned') return m;
      const total = channel.durationWeeks ?? 1;
      // Awareness decays: the boost fades toward zero over the campaign's life.
      return { ...m, boost: (channel.boost ?? m.boost) * (m.weeksLeft / total) };
    });

  // Stage-up
  let stage = state.stage;
  let stagedUp = false;
  for (const up of biz.stageUps) {
    if (
      stage < up.stage &&
      totals.revenue >= up.minTotalRevenue &&
      reputation >= up.minReputation &&
      state.week >= up.minWeek
    ) {
      stage = up.stage;
      stagedUp = true;
    }
  }

  const week = state.week;
  const nextWeek = week + 1;
  const nextSeason = seasonForWeek(nextWeek);
  const seedAfterSim = nextSeed(state.rngSeed);
  const forecastRng = makeRng(seedAfterSim);
  const nextWeather = rollWeather(
    nextSeason,
    forecastRng(),
    state.weather,
    nextSeason === state.season ? state.weatherStreak : 0,
  );
  const nextForecast = forecastFor(nextWeather, forecastRng());

  // The rival rethinks their price every few weeks, drifting toward undercutting
  // whoever is winning.
  let rivalPrice = state.rivalPrice;
  let rivalCooldown = state.rivalCooldown - 1;
  if (facesRival && rivalCooldown <= 0) {
    const roll = forecastRng();
    const target = price * (0.82 + roll * 0.3);
    // Onto the same grid the player's own control uses, so whatever the rival
    // asks can actually be matched or undercut.
    const grid = priceBandFor(biz, state.tier, tier);
    rivalPrice = Math.max(grid.min, Math.round(target / grid.step) * grid.step);
    rivalPrice = Math.min(grid.max, Math.round(rivalPrice * 100) / 100);
    rivalCooldown = biz.rival.changeEvery;
  }

  const interim: GameState = {
    ...state,
    week: nextWeek,
    stage,
    cash,
    reputation,
    inventory,
    inventoryCost,
    locationId: location.id,
    qualityId: quality.id,
    sideProductId: decisions.sideProductId ?? null,
    bonusCapacity,
    equipmentValue: money(Math.max(0, state.equipmentValue + ev.equipment)),
    price,
    loans,
    marketing: nextMarketing,
    employees,
    totals,
    profitHistory: [...state.profitHistory, profit],
    revenueHistory: [...state.revenueHistory, revenue],
    season: nextSeason,
    weather: nextWeather,
    forecast: nextForecast,
    weatherStreak: nextWeather === state.weather ? state.weatherStreak + 1 : 1,
    rivalPrice,
    rivalCooldown,
    miniGoalStreak,
    rngSeed: seedAfterSim,
    roughWeeks: bankerTalk ? 0 : roughWeeks,
    assetId: state.assetId,
    assetWeekly: state.assetWeekly ?? 0,
    assetCondition: state.assetCondition,
    // One week of the refit done. The doors open when this reaches zero.
    weeksToOpen: Math.max(0, (state.weeksToOpen ?? 0) - 1),
    offerAvailable: nextWeek > FINAL_WEEK,
  };

  // Badges wait until the doors open. A used truck starts with thousands in
  // the bank, so "$100 Club" and a free cash-goal streak used to fire in the
  // shop — a trophy for standing still.
  const newBadges = buildingOut
    ? []
    : BADGES.filter((b) => !state.badges.includes(b.id) && b.test(interim)).map((b) => b.id);
  if (justPaidOffAny) discussionFlags.push('Paid off a loan');
  if (stagedUp) discussionFlags.push(`Reached Stage ${stage}`);

  // The last closed week is when you find out what the used-gear roll actually
  // bought. Saying it at purchase would spoil the gamble; saying it never would
  // make the roll a secret number on the books.
  const conditionReveal =
    buildingOut && interim.weeksToOpen === 0 ? conditionNoteOf(state) : undefined;
  if (conditionReveal) discussionFlags.push(conditionReveal);

  const result: WeekResult = {
    week,
    weather: state.weather,
    season: state.season,
    demand,
    served,
    capacity,
    lostToStockout,
    lostToCapacity,
    revenue,
    suppliesBought,
    suppliesUnits: boughtUnits + Math.max(0, ev.inventory),
    orderedUnits,
    orderedSpend,
    cogs,
    avgUnitCost,
    price,
    assetPayment,
    buildingOut,
    conditionReveal,
    rent,
    fixedCosts,
    wages,
    marketingSpend,
    eventCash,
    loanPayment,
    interestPaid,
    lateFees,
    missedPayment,
    profit,
    cashChange,
    cashStart,
    cashEnd: cash,
    reputationStart,
    reputationEnd: reputation,
    grossProfit,
    sideUnits,
    sideWasted,
    sideBatchSize,
    sideRevenue,
    sideCogs,
    forecast: state.forecast,
    forecastWasWrong: state.forecast !== state.weather,
    rivalPrice: state.rivalPrice,
    lostToRival,
    inventoryEnd: inventory,
    spoilage: spoiled,
    spoilageCost,
    stockLost,
    stockLostCost,
    stockLostTo: ev.stockLostTo,
    miniGoalMet,
    emergencyAdvance,
    bankerTalk,
    eventLines: ev.lines,
    coachLine: coachFor({
      served,
      demand,
      lostToStockout,
      lostToCapacity,
      profit,
      spoiled,
      missedPayment,
      hasHelper: employees.length > 0,
      staffOut: Boolean(ev.staffOut),
      forecastWasWrong: state.forecast !== state.weather,
      lostToRival,
      grossProfit,
      emergencyAdvance,
      stagedUp,
      price,
      ref,
      bought: boughtUnits,
      buildingOut,
      conditionReveal,
      placeName: biz.placeName,
    }),
    newBadges,
    stagedUp,
    discussionFlags,
  };

  const pool = eventsForBusiness(state.businessId);
  const nextState: GameState = {
    ...interim,
    badges: [...state.badges, ...newBadges],
    lastResult: result,
    history: [...state.history, result],
    recentEventIds: [
      ...state.recentEventIds.filter((r) => nextWeek - r.week < 12),
      ...state.pendingEvents.map((e) => ({ id: e.id, week })),
    ],
    pendingEvents: [] as GameEvent[],
    discussionLog: [...state.discussionLog, ...discussionFlags.map((note) => ({ week, note }))],
  };

  nextState.pendingEvents =
    nextState.weeksToOpen > 0
      ? []
      : drawEvents(nextState, pool, seedAfterSim, reliabilityOf(state));
  nextState.miniGoal = rollMiniGoal(nextState, makeRng(nextSeed(seedAfterSim))());

  return nextState;
}

function coachFor(x: {
  served: number;
  demand: number;
  lostToStockout: number;
  lostToCapacity: number;
  profit: number;
  spoiled: number;
  missedPayment: boolean;
  hasHelper: boolean;
  staffOut: boolean;
  forecastWasWrong: boolean;
  lostToRival: number;
  grossProfit: number;
  emergencyAdvance: number;
  stagedUp: boolean;
  price: number;
  ref: number;
  bought: number;
  buildingOut: boolean;
  conditionReveal?: string;
  placeName: string;
}): string {
  if (x.emergencyAdvance > 0)
    return 'You ran out of money. The bank covered it — that costs extra.';
  if (x.missedPayment) return 'You missed a loan payment. The banker is watching.';
  if (x.conditionReveal) return x.conditionReveal;
  if (x.buildingOut) return 'Closed this week. No sales.';
  if (x.stagedUp) return `Your ${x.placeName} just leveled up!`;
  if (x.lostToStockout > x.served * 0.2) return 'You sold out early. Buy more supplies next week.';
  if (x.lostToCapacity > x.served * 0.2) {
    if (x.staffOut) return 'Your helper was out. The line was on you.';
    return x.hasHelper
      ? 'Even with help the line was too long. A quieter spot or a higher price would thin it.'
      : 'The line was too long. You need another pair of hands.';
  }
  if (x.spoiled > x.served * 0.35) {
    // Telling a player to buy less when they bought nothing is impossible
    // advice. If the waste came out of stock they were already carrying, the
    // lesson is about holding it, not about ordering it.
    return x.bought > 0
      ? 'You threw out a lot. Buy a little less next week.'
      : 'Your leftover stock went bad. It does not keep — sell it or lose it.';
  }
  if (x.forecastWasWrong && x.profit <= 0)
    return 'The forecast was wrong and it cost you. That happens.';
  if (x.lostToRival > x.served * 0.25)
    return `The ${x.placeName} across the street is cheaper. People noticed.`;
  if (x.grossProfit > 0 && x.profit <= 0) return 'You sold plenty but costs ate all of it.';
  if (x.price > x.ref * 1.8) return 'High price, fewer customers. Is it worth it?';
  if (x.profit <= 0) return 'You lost money this week. Check your costs.';
  if (x.profit > 0 && x.served > 0) return 'Solid week. Money in the bank.';
  return 'Quiet week. Try something different.';
}
