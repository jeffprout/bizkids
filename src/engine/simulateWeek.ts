import type { GameEvent, GameState, WeekDecisions, WeekResult } from './types';
import { getBusiness } from '../config/businesses/lemonade';
import { TIERS } from '../config/difficulty';
import { eventsForBusiness } from '../config/events';
import { BADGES, rollMiniGoal } from '../config/milestones';
import { rollWeather, seasonForWeek } from './calendar';
import { applySpoilage, computeDemand } from './demand';
import { drawEvents, resolveEventChoices } from './events';
import { chargeWeek, money } from './loans';
import { makeRng, nextSeed } from './rng';

export const FINAL_WEEK = 50;

/**
 * The whole game in one pure function. No React, no storage, no randomness that
 * is not seeded. Order of operations matters and is the same every week:
 *
 *   buy stock -> buy marketing -> hire/fire -> event effects -> sell ->
 *   pay rent and wages -> pay the bank -> throw out what spoiled -> score it.
 */
export function simulateWeek(state: GameState, decisions: WeekDecisions): GameState {
  const biz = getBusiness(state.businessId);
  const tier = TIERS[state.tier];
  const rng = makeRng(state.rngSeed);

  const location =
    biz.locations.find((l) => l.id === decisions.locationId) ?? biz.locations[0];
  const quality = biz.qualities.find((q) => q.id === decisions.qualityId) ?? biz.qualities[0];

  const cashStart = state.cash;
  const reputationStart = state.reputation;

  const ev = resolveEventChoices(state.pendingEvents, decisions.eventChoices);

  let cash = cashStart;
  let inventory = state.inventory;
  let reputation = state.reputation;
  const discussionFlags: string[] = [];

  // --- 1. Buy stock -------------------------------------------------------
  const unitCost = money(quality.unitCost * ev.unitCostMod);
  const wantUnits = Math.max(0, Math.round(decisions.restockUnits));
  const affordableUnits = unitCost > 0 ? Math.floor(Math.max(0, cash) / unitCost) : wantUnits;
  const boughtUnits = Math.min(wantUnits, affordableUnits);
  const suppliesBought = money(boughtUnits * unitCost);
  cash = money(cash - suppliesBought);
  inventory += boughtUnits;

  // --- 2. Buy marketing ---------------------------------------------------
  let marketingSpend = 0;
  const marketing = [...state.marketing];
  for (const channelId of decisions.buyMarketing) {
    const channel = biz.marketing.find((m) => m.id === channelId);
    if (!channel || cash < channel.cost) continue;
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

  // --- 3. Hire and fire ---------------------------------------------------
  let employees = [...state.employees];
  if (decisions.fireEmployee) employees = [];
  if (decisions.hireEmployeeId) {
    const hire = biz.employees.find((e) => e.id === decisions.hireEmployeeId);
    if (hire && !employees.some((e) => e.id === hire.id)) {
      employees.push(hire);
      discussionFlags.push(`Hired ${hire.name} at $${hire.weeklyWage} a week`);
    }
  }

  // --- 4. Instant event effects ------------------------------------------
  cash = money(cash + ev.cash);
  reputation += ev.reputation;
  inventory = Math.max(0, inventory + ev.inventory);
  const eventCash = money(ev.cash);

  // --- 5. Sell ------------------------------------------------------------
  const price = decisions.price;
  const breakdown = computeDemand({
    state: { ...state, marketing, reputation },
    location,
    quality,
    price,
    referencePrice: biz.referencePrice[state.tier],
    elasticity: tier.elasticity,
    conversionRate: biz.conversionRate,
    eventDemandMod: ev.demandMod,
    noiseRoll: rng(),
  });
  const demand = breakdown.demand;

  const employeeCapacity = employees.reduce((s, e) => s + e.capacityBonus, 0);
  const capacity = Math.round((biz.soloCapacity + employeeCapacity) * ev.capacityMod);

  const afterCapacity = Math.min(demand, capacity);
  const lostToCapacity = demand - afterCapacity;
  const served = Math.min(afterCapacity, inventory);
  const lostToStockout = afterCapacity - served;

  const revenue = money(served * price);
  const cogs = money(served * unitCost);
  inventory -= served;
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
  const rent = money(location.weeklyRent);
  const wages = money(employees.reduce((s, e) => s + e.weeklyWage, 0));
  cash = money(cash - rent - wages);

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
  const { kept, spoiled } = applySpoilage(inventory, biz.spoilRate);
  inventory = kept;
  const spoilageCost = money(spoiled * unitCost);

  // --- 9. Reputation ------------------------------------------------------
  reputation += quality.reputationDrift;
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
  const profit = money(revenue - cogs - spoilageCost - rent - wages - marketingSpend - interestPaid - lateFees + eventCash);
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
  const miniGoalStreak = miniGoalMet ? state.miniGoalStreak + 1 : 0;
  const miniGoalReward = miniGoalMet ? goal.reward : 0;
  cash = money(cash + miniGoalReward);

  // Marketing decay
  const nextMarketing = marketing
    .map((m) => ({ ...m, weeksLeft: m.weeksLeft - 1 }))
    .filter((m) => m.weeksLeft > 0)
    .map((m) => {
      const channel = biz.marketing.find((c) => c.id === m.channelId);
      const total = channel?.durationWeeks ?? 1;
      // Awareness decays: the boost fades toward zero over the campaign's life.
      return { ...m, boost: (channel?.boost ?? m.boost) * (m.weeksLeft / total) };
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
  const nextWeather = rollWeather(nextSeason, makeRng(seedAfterSim)());

  const interim: GameState = {
    ...state,
    week: nextWeek,
    stage,
    cash,
    reputation,
    inventory,
    locationId: location.id,
    qualityId: quality.id,
    price,
    loans,
    marketing: nextMarketing,
    employees,
    totals,
    profitHistory: [...state.profitHistory, profit],
    revenueHistory: [...state.revenueHistory, revenue],
    season: nextSeason,
    weather: nextWeather,
    miniGoalStreak,
    rngSeed: seedAfterSim,
    roughWeeks: bankerTalk ? 0 : roughWeeks,
    offerAvailable: nextWeek > FINAL_WEEK,
  };

  // Badges are checked against the state after the week resolved.
  const newBadges = BADGES.filter((b) => !state.badges.includes(b.id) && b.test(interim)).map(
    (b) => b.id,
  );
  if (justPaidOffAny) discussionFlags.push('Paid off a loan');
  if (stagedUp) discussionFlags.push(`Reached Stage ${stage}`);

  const result: WeekResult = {
    week,
    weather: state.weather,
    season: state.season,
    demand,
    served,
    lostToStockout,
    lostToCapacity,
    revenue,
    suppliesBought,
    cogs,
    rent,
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
    inventoryEnd: inventory,
    spoilage: spoiled,
    spoilageCost,
    miniGoalMet,
    miniGoalReward,
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
      emergencyAdvance,
      stagedUp,
      price,
      ref,
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
    discussionLog: [
      ...state.discussionLog,
      ...discussionFlags.map((note) => ({ week, note })),
    ],
  };

  nextState.pendingEvents = drawEvents(nextState, pool, seedAfterSim);
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
  emergencyAdvance: number;
  stagedUp: boolean;
  price: number;
  ref: number;
}): string {
  if (x.emergencyAdvance > 0) return 'You ran out of money. The bank covered it — that costs extra.';
  if (x.missedPayment) return 'You missed a loan payment. The banker is watching.';
  if (x.stagedUp) return 'Your stand just levelled up!';
  if (x.lostToStockout > x.served * 0.2) return 'You sold out early. Buy more supplies next week.';
  if (x.lostToCapacity > x.served * 0.2) return 'The line was too long. You need another pair of hands.';
  if (x.spoiled > x.served * 0.35) return 'You threw out a lot. Buy a little less next week.';
  if (x.price > x.ref * 1.8) return 'High price, fewer customers. Is it worth it?';
  if (x.profit <= 0) return 'You lost money this week. Check your costs.';
  if (x.profit > 0 && x.served > 0) return 'Solid week. Money in the bank.';
  return 'Quiet week. Try something different.';
}
