import { describe, expect, it } from 'vitest';
import { newGame } from '../newGame';
import { simulateWeek, FINAL_WEEK } from '../simulateWeek';
import { applySpoilage, priceCurve, reputationMod } from '../demand';
import { seasonForWeek } from '../calendar';
import { valueBusiness } from '../valuation';
import { sanitizeRun } from '../sanitize';
import type { GameState, WeekDecisions } from '../types';
import { LEMONADE } from '../../config/businesses';
import { TIERS } from '../../config/difficulty';
import { ALL_EVENTS } from '../../config/events';
import { dollars } from '../../ui/components/bits';

function start(overrides: Partial<Parameters<typeof newGame>[0]> = {}): GameState {
  return newGame({
    profileId: 'test',
    businessId: 'lemonade',
    tier: 'pro',
    financing: { loanIds: [], savingsUsed: 55, locationId: 'park' },
    seed: 12345,
    ...overrides,
  });
}

function decide(state: GameState, over: Partial<WeekDecisions> = {}): WeekDecisions {
  return {
    price: state.price,
    qualityId: state.qualityId,
    restockUnits: 60,
    locationId: state.locationId,
    eventChoices: Object.fromEntries(state.pendingEvents.map((e) => [e.id, e.choices[0].id])),
    buyMarketing: [],
    ...over,
  };
}

describe('price curve', () => {
  it('sells more when cheaper and less when dearer', () => {
    expect(priceCurve(0.5, 1, 1.35)).toBeGreaterThan(1);
    expect(priceCurve(2, 1, 1.35)).toBeLessThan(1);
    expect(priceCurve(1, 1, 1.35)).toBe(1);
  });

  it('is bounded so the slider extremes stay sane', () => {
    expect(priceCurve(0.01, 1, 1.5)).toBeLessThanOrEqual(3);
    expect(priceCurve(50, 1, 1.5)).toBeGreaterThanOrEqual(0.05);
  });
});

describe('reputation multiplier', () => {
  it('runs from 0.7x at one star to 1.35x at five', () => {
    expect(reputationMod(1)).toBeCloseTo(0.7, 3);
    expect(reputationMod(5)).toBeCloseTo(1.35, 3);
    expect(reputationMod(3)).toBeGreaterThan(reputationMod(2));
  });
});

describe('spoilage', () => {
  it('throws out the configured share of leftovers', () => {
    expect(applySpoilage(100, 0.25)).toEqual({ kept: 75, spoiled: 25 });
    expect(applySpoilage(0, 0.25)).toEqual({ kept: 0, spoiled: 0 });
    expect(applySpoilage(3, 0.25)).toEqual({ kept: 3, spoiled: 0 });
  });
});

describe('calendar', () => {
  it('walks a real year starting in spring', () => {
    expect(seasonForWeek(1)).toBe('spring');
    expect(seasonForWeek(15)).toBe('summer');
    expect(seasonForWeek(30)).toBe('fall');
    expect(seasonForWeek(40)).toBe('winter');
  });
});

describe('simulateWeek', () => {
  it('is pure — the input state is never mutated', () => {
    const state = start();
    const snapshot = JSON.stringify(state);
    simulateWeek(state, decide(state));
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('is deterministic for the same seed and decisions', () => {
    const a = simulateWeek(start(), decide(start()));
    const b = simulateWeek(start(), decide(start()));
    expect(a.lastResult).toEqual(b.lastResult);
  });

  it('advances the week and records history', () => {
    const s1 = simulateWeek(start(), decide(start()));
    expect(s1.week).toBe(2);
    expect(s1.history).toHaveLength(1);
    expect(s1.profitHistory).toHaveLength(1);
  });

  it('cannot buy more stock than the player can afford', () => {
    const state = { ...start(), cash: 5 };
    const next = simulateWeek(state, decide(state, { restockUnits: 500 }));
    expect(next.lastResult!.suppliesBought).toBeLessThanOrEqual(5);
    expect(next.cash).toBeGreaterThanOrEqual(0);
  });

  it('never sells more than it stocked', () => {
    const state = { ...start(), inventory: 0 };
    const next = simulateWeek(state, decide(state, { restockUnits: 10 }));
    expect(next.lastResult!.served).toBeLessThanOrEqual(10);
    expect(next.lastResult!.lostToStockout).toBeGreaterThanOrEqual(0);
  });

  it('caps sales at what the owner can physically serve', () => {
    const state = { ...start(), cash: 500, locationId: 'soccer', reputation: 5 };
    const next = simulateWeek(state, decide(state, { restockUnits: 900, price: 0.25 }));
    expect(next.lastResult!.served).toBeLessThanOrEqual(LEMONADE.soloCapacity);
  });

  it('revenue equals cups sold times price', () => {
    const state = start();
    const next = simulateWeek(state, decide(state, { price: 1.5 }));
    const r = next.lastResult!;
    expect(r.revenue).toBeCloseTo(r.served * 1.5, 2);
  });

  it('profit reconciles to revenue minus every expense line', () => {
    const state = start();
    const next = simulateWeek(state, decide(state, { restockUnits: 80 }));
    const r = next.lastResult!;
    const expected =
      r.revenue -
      r.cogs -
      r.spoilageCost -
      r.rent -
      r.fixedCosts -
      r.wages -
      r.marketingSpend -
      r.interestPaid -
      r.lateFees +
      r.eventCash;
    expect(r.profit).toBeCloseTo(expected, 2);
  });

  it('charges rent for the chosen location', () => {
    const state = start();
    const next = simulateWeek(state, decide(state, { locationId: 'soccer' }));
    expect(next.lastResult!.rent).toBe(
      LEMONADE.locations.find((l) => l.id === 'soccer')!.weeklyRent,
    );
  });

  it('pays wages once a helper is hired', () => {
    const state = { ...start(), cash: 300, stage: 2 as const };
    const next = simulateWeek(state, decide(state, { hireEmployeeId: 'maya' }));
    expect(next.employees).toHaveLength(1);
    expect(next.lastResult!.wages).toBe(40);
  });

  it('swaps one helper for another in a single week', () => {
    const base = {
      ...start(),
      cash: 500,
      stage: 2 as const,
      employees: [LEMONADE.employees[0]], // Maya, $40
    };
    const next = simulateWeek(
      base,
      decide(base, { fireEmployee: true, hireEmployeeId: 'theo', restockUnits: 60 }),
    );
    expect(next.employees.map((e) => e.name)).toEqual(['Theo']);
    // Only the new hire's wage is charged, not both.
    expect(next.lastResult!.wages).toBe(25);
  });

  it('lets an employee raise the ceiling on customers served', () => {
    const base = { ...start(), cash: 900, locationId: 'soccer', reputation: 5, stage: 2 as const };
    const solo = simulateWeek(base, decide(base, { restockUnits: 900, price: 0.25 }));
    const withHelp = simulateWeek(base, decide(base, { restockUnits: 900, price: 0.25, hireEmployeeId: 'maya' }));
    expect(withHelp.lastResult!.served).toBeGreaterThan(solo.lastResult!.served);
  });

  it('drops reputation when customers are turned away', () => {
    const state = { ...start(), cash: 200, reputation: 4, locationId: 'soccer' };
    const next = simulateWeek(state, decide(state, { restockUnits: 5, price: 0.25 }));
    expect(next.lastResult!.lostToStockout).toBeGreaterThan(0);
    expect(next.reputation).toBeLessThan(4);
  });

  it('takes a loan payment out of the bank every week', () => {
    const state = start({ financing: { loanIds: ['family-60'], savingsUsed: 35, locationId: 'park' } });
    expect(state.loans).toHaveLength(1);
    const next = simulateWeek(state, decide(state));
    expect(next.lastResult!.loanPayment).toBeGreaterThan(0);
    expect(next.loans[0].weeksRemaining).toBe(11);
  });

  it('fronts emergency cash instead of going negative', () => {
    const state = { ...start(), cash: 0, locationId: 'soccer', inventory: 0 };
    const next = simulateWeek(state, decide(state, { restockUnits: 0, price: 5 }));
    expect(next.cash).toBeGreaterThanOrEqual(0);
    if (next.lastResult!.emergencyAdvance > 0) {
      expect(next.loans.some((l) => l.offerId === 'rescue')).toBe(true);
    }
  });

  it('marketing fades week by week', () => {
    const state = { ...start(), cash: 200, stage: 2 as const };
    let s = simulateWeek(state, decide(state, { buyMarketing: ['flyers'] }));
    expect(s.marketing).toHaveLength(1);
    const first = s.marketing[0].boost;
    s = simulateWeek(s, decide(s));
    expect(s.marketing.length === 0 || s.marketing[0].boost < first).toBe(true);
  });

  it('survives a full 50-week run without breaking', () => {
    let s = start({ financing: { loanIds: ['family-60'], savingsUsed: 35, locationId: 'front-yard' } });
    for (let i = 0; i < FINAL_WEEK; i++) {
      s = simulateWeek(s, decide(s, { restockUnits: 70 }));
      expect(Number.isFinite(s.cash)).toBe(true);
      expect(s.reputation).toBeGreaterThanOrEqual(1);
      expect(s.reputation).toBeLessThanOrEqual(5);
      expect(s.inventory).toBeGreaterThanOrEqual(0);
    }
    expect(s.week).toBe(FINAL_WEEK + 1);
    expect(s.offerAvailable).toBe(true);
    expect(s.history).toHaveLength(FINAL_WEEK);
  });

  it('never repeats an event card within eight weeks', () => {
    let s = start();
    const seen: { id: string; week: number }[] = [];
    for (let i = 0; i < 30; i++) {
      for (const e of s.pendingEvents) {
        const prior = seen.find((x) => x.id === e.id);
        if (prior) expect(s.week - prior.week).toBeGreaterThanOrEqual(8);
        seen.push({ id: e.id, week: s.week });
      }
      s = simulateWeek(s, decide(s));
    }
  });
});

describe('what makes a week losable', () => {
  it('charges the spot overhead whether or not anything sells', () => {
    const state = { ...start(), inventory: 0, locationId: 'park' };
    const next = simulateWeek(state, decide(state, { restockUnits: 0 }));
    const r = next.lastResult!;
    expect(r.served).toBe(0);
    expect(r.revenue).toBe(0);
    // Park is $5 rent plus $14 of permit and ice at Pro scale.
    expect(r.rent).toBe(5);
    expect(r.fixedCosts).toBe(14);
    expect(r.profit).toBeLessThan(0);
  });

  it('scales overhead down for Rookie and up for Tycoon', () => {
    const mk = (tier: 'rookie' | 'pro' | 'tycoon') =>
      simulateWeek(
        { ...start({ tier }), inventory: 0, locationId: 'park' },
        decide(start({ tier }), { restockUnits: 0, locationId: 'park' }),
      ).lastResult!.fixedCosts;
    expect(mk('rookie')).toBeLessThan(mk('pro'));
    expect(mk('pro')).toBeLessThan(mk('tycoon'));
  });

  it('separates gross profit from net profit', () => {
    const state = { ...start(), cash: 300, locationId: 'park' };
    const next = simulateWeek(state, decide(state, { restockUnits: 80 }));
    const r = next.lastResult!;
    expect(r.grossProfit).toBeCloseTo(r.revenue - r.cogs - r.spoilageCost, 2);
    expect(r.profit).toBeLessThan(r.grossProfit);
  });

  it('scales an event hit with the tier, so one card cannot wipe out Rookie', () => {
    const hit = (tier: 'rookie' | 'pro') => {
      const base = start({ tier });
      const withEvent = {
        ...base,
        cash: 400,
        pendingEvents: [ALL_EVENTS.find((e) => e.id === 'health-inspector')!],
      };
      return simulateWeek(withEvent, {
        ...decide(withEvent, { restockUnits: 0 }),
        eventChoices: { 'health-inspector': 'close' },
      }).lastResult!.eventCash;
    };
    expect(hit('rookie')).toBeGreaterThan(hit('pro'));
    expect(hit('pro')).toBe(-12);
  });

  it('gives the player a forecast that is sometimes wrong', () => {
    let s = start();
    let wrong = 0;
    for (let i = 0; i < 40; i++) {
      if (s.forecast !== s.weather) wrong++;
      s = simulateWeek(s, decide(s));
    }
    // Right about two thirds of the time, so ordering stock is a real bet.
    expect(wrong).toBeGreaterThan(3);
    expect(wrong).toBeLessThan(30);
  });

  it('loses customers to the rival when you charge well over them', () => {
    const base = { ...start(), cash: 400, rivalPrice: 1.5 };
    const cheap = simulateWeek(base, decide(base, { price: 1.25, restockUnits: 200 }));
    const dear = simulateWeek(base, decide(base, { price: 3, restockUnits: 200 }));
    expect(dear.lastResult!.lostToRival).toBeGreaterThan(cheap.lastResult!.lostToRival);
  });

  it('leaves Rookie with no rival to fight', () => {
    const s = start({ tier: 'rookie' });
    const next = simulateWeek(s, decide(s, { restockUnits: 60 }));
    expect(next.lastResult!.lostToRival).toBe(0);
  });
});

describe('playtest fixes', () => {
  it('will not run the same weather more than four weeks running', () => {
    let s = start();
    let longest = 0;
    let run = 1;
    let prev = s.weather;
    for (let i = 0; i < 120; i++) {
      s = simulateWeek(s, decide(s));
      run = s.weather === prev ? run + 1 : 1;
      prev = s.weather;
      longest = Math.max(longest, run);
    }
    expect(longest).toBeLessThanOrEqual(4);
  });

  it('still varies the weather rather than alternating mechanically', () => {
    let s = start();
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      s = simulateWeek(s, decide(s));
      seen.add(s.weather);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it('never deals a cold snap in summer', () => {
    const coldSnap = ALL_EVENTS.find((e) => e.id === 'cold-snap')!;
    expect(coldSnap.seasons).toBeDefined();
    expect(coldSnap.seasons).not.toContain('summer');
    const heatWave = ALL_EVENTS.find((e) => e.id === 'heat-wave')!;
    expect(heatWave.seasons).toEqual(['summer']);
  });

  it('only deals season-gated cards in their season', () => {
    let s = start();
    for (let i = 0; i < 50; i++) {
      for (const e of s.pendingEvents) {
        if (e.seasons) expect(e.seasons).toContain(s.season);
        if (e.weathers) expect(e.weathers).toContain(s.weather);
      }
      s = simulateWeek(s, decide(s));
    }
  });

  it('keeps the gear an event card sold you', () => {
    const base = {
      ...start(),
      cash: 300,
      pendingEvents: [ALL_EVENTS.find((e) => e.id === 'rival-closes')!],
    };
    const next = simulateWeek(base, {
      ...decide(base, { restockUnits: 40 }),
      eventChoices: { 'rival-closes': 'buy' },
    });
    expect(next.bonusCapacity).toBe(40);
    expect(next.equipmentValue).toBeGreaterThan(base.equipmentValue);
    // And it is still there next week, not just for the week it was bought.
    const after = simulateWeek(next, decide(next, { restockUnits: 40 }));
    expect(after.bonusCapacity).toBe(40);
  });

  it('reports what an event card cost so it is not invisible', () => {
    const base = {
      ...start(),
      cash: 300,
      pendingEvents: [ALL_EVENTS.find((e) => e.id === 'rival-closes')!],
    };
    const next = simulateWeek(base, {
      ...decide(base, { restockUnits: 40 }),
      eventChoices: { 'rival-closes': 'buy' },
    });
    expect(next.lastResult!.eventCash).toBe(-12);
    // The free option and the paid one differ by exactly the price of the table.
    const free = simulateWeek(base, {
      ...decide(base, { restockUnits: 40 }),
      eventChoices: { 'rival-closes': 'take' },
    });
    expect(free.lastResult!.eventCash).toBe(0);
    expect(free.cash - next.cash).toBeCloseTo(12, 2);
  });

  it('gives every bad review an ignore option that only stings a little', () => {
    // Found by what the card TEACHES, not by its title. Eight cards used to
    // share the title "Bad Review" — four per business — which read as the same
    // card over and over, so they were given distinct names and this hook broke.
    // The concept tag is the durable handle: it is what the card is for, and it
    // does not move when the wording does.
    const COMPLAINTS = [
      'Service recovery',
      'Quality perception',
      'Price perception',
      'Managing people',
      'Presentation',
    ];
    const reviews = ALL_EVENTS.filter((e) => COMPLAINTS.includes(e.concept));
    expect(reviews.length).toBeGreaterThanOrEqual(4);
    for (const review of reviews) {
      const ignore = review.choices.find((c) => c.id === 'ignore');
      expect(ignore, `${review.id} needs an ignore option`).toBeDefined();
      expect(ignore!.reputation).toBeLessThan(0);
      expect(ignore!.reputation).toBeGreaterThan(-0.2);
    }
  });

  it('sells a side treat to a share of the people already buying', () => {
    const base = { ...start(), cash: 400, stage: 2 as const };
    const plain = simulateWeek(base, decide(base, { restockUnits: 120 }));
    const withTreats = simulateWeek(base, decide(base, { restockUnits: 120, sideProductId: 'lollipops' }));
    const r = withTreats.lastResult!;
    expect(r.sideUnits).toBeGreaterThan(0);
    expect(r.sideUnits).toBeLessThanOrEqual(r.served);
    expect(r.sideRevenue).toBeGreaterThan(r.sideCogs);
    // Same customers, more money from each of them.
    expect(r.served).toBe(plain.lastResult!.served);
    expect(r.profit).toBeGreaterThan(plain.lastResult!.profit);
  });

  it('keeps the drink cost and the treat cost separately reportable', () => {
    const base = { ...start(), cash: 400, stage: 2 as const };
    const next = simulateWeek(base, decide(base, { restockUnits: 120, sideProductId: 'brownies' }));
    const r = next.lastResult!;
    expect(r.sideCogs).toBeGreaterThan(0);
    // The recap shows drink cost as cogs - sideCogs, so that has to be exactly
    // the cups: no candy hiding inside the line labelled "cost of cups sold".
    const quality = LEMONADE.qualities.find((q) => q.id === base.qualityId)!;
    const unitCost = quality.unitCost * TIERS[base.tier].unitCostScale;
    expect(r.cogs - r.sideCogs).toBeCloseTo(r.served * unitCost, 2);
  });

  it('does not blame the player for missing a helper they already have', () => {
    const base = {
      ...start(),
      cash: 900,
      locationId: 'soccer',
      reputation: 5,
      stage: 2 as const,
      employees: [LEMONADE.employees[0]],
    };
    const next = simulateWeek(base, decide(base, { restockUnits: 600, price: 0.25 }));
    const r = next.lastResult!;
    if (r.lostToCapacity > r.served * 0.2) {
      expect(r.coachLine).not.toContain('another pair of hands');
    }
  });
});

describe('the books have to balance', () => {
  it('never invents cash the business did not earn', () => {
    let s = start({ financing: { loanIds: [], savingsUsed: 55, locationId: 'park' } });
    for (let i = 0; i < 40; i++) {
      s = simulateWeek(s, decide(s, { restockUnits: 70 }));
      const r = s.lastResult!;
      // Money only ever arrives from sales, an event, or the emergency advance.
      const inflow = r.revenue + Math.max(0, r.eventCash) + r.emergencyAdvance;
      const outflow =
        r.suppliesBought +
        r.rent +
        r.fixedCosts +
        r.wages +
        r.marketingSpend +
        r.lateFees +
        Math.max(0, -r.eventCash) +
        r.loanPayment;
      expect(r.cashEnd).toBeCloseTo(r.cashStart + inflow - outflow, 2);
    }
  });

  it('expenses stock an event destroys, instead of losing it silently', () => {
    // Jeff's report: bought 100, sold 55, none left, and profit did not notice
    // that 45 cups had been dumped.
    const base = {
      ...start(),
      cash: 103,
      inventory: 0,
      locationId: 'soccer',
      pendingEvents: [ALL_EVENTS.find((e) => e.id === 'spoiled-batch')!],
    };
    const next = simulateWeek(base, {
      ...decide(base, { restockUnits: 100, price: 1.5, locationId: 'soccer' }),
      eventChoices: { 'spoiled-batch': 'dump' },
    });
    const r = next.lastResult!;
    expect(r.stockLost).toBe(45);
    expect(r.stockLostCost).toBeCloseTo(45 * 0.42, 2);
    // Every unit bought is either sold, thrown out, destroyed, or still on hand.
    expect(r.suppliesUnits).toBe(r.served + r.spoilage + r.stockLost + r.inventoryEnd);
    expect(r.grossProfit).toBeCloseTo(r.revenue - r.cogs - r.spoilageCost - r.stockLostCost, 2);
  });

  it('accounts for every cup, every week of a long run', () => {
    let s = start({ financing: { loanIds: [], savingsUsed: 55, locationId: 'park' } });
    let weeksChecked = 0;
    for (let i = 0; i < 50; i++) {
      const opening = s.inventory;
      // Only weeks with no event card, so no cup arrives or leaves off-ledger.
      const quiet = s.pendingEvents.length === 0;
      s = simulateWeek(s, decide(s, { restockUnits: 80 }));
      const r = s.lastResult!;
      if (!quiet) continue;
      weeksChecked++;
      expect(opening + r.suppliesUnits).toBe(r.served + r.spoilage + r.inventoryEnd);
    }
    expect(weeksChecked).toBeGreaterThan(3);
  });

  it('reconciles the bank balance from the lines the recap shows', () => {
    let s = start({ financing: { loanIds: ['family-60'], savingsUsed: 55, locationId: 'park' } });
    for (let i = 0; i < 50; i++) {
      s = simulateWeek(s, decide(s, { restockUnits: 70, buyMarketing: i === 3 ? ['flyers'] : [] }));
      const r = s.lastResult!;
      const moved =
        r.revenue -
        r.suppliesBought -
        (r.rent + r.fixedCosts + r.wages + r.marketingSpend + r.lateFees) +
        r.eventCash -
        r.loanPayment +
        r.emergencyAdvance;
      expect(r.cashStart + moved).toBeCloseTo(r.cashEnd, 2);
    }
  });

  it('bridges profit to cash exactly, every week', () => {
    // bank moved = profit + (cost of stock used - stock bought)
    //                     - loan principal repaid + any advance
    // The recap prints this bridge, so it has to hold to the cent or the screen
    // shows rows that do not add up.
    let s = start({ financing: { loanIds: ['credit-union-150'], savingsUsed: 55, locationId: 'park' } });
    for (let i = 0; i < 50; i++) {
      // Alternate big buys and pure sell-downs so the swing goes both ways.
      s = simulateWeek(s, decide(s, { restockUnits: i % 3 === 0 ? 200 : 0 }));
      const r = s.lastResult!;
      const inventorySwing = r.cogs + r.spoilageCost + r.stockLostCost - r.suppliesBought;
      const principalPaid = r.loanPayment - r.interestPaid;
      expect(r.profit + inventorySwing - principalPaid + r.emergencyAdvance).toBeCloseTo(
        r.cashChange,
        2,
      );
    }
  });

  it('cash beats profit when the stand is selling down old stock', () => {
    // Stock must carry a cost basis, or it is free and there is nothing to
    // expense when it sells.
    const base = { ...start(), cash: 300, inventory: 400, inventoryCost: 400 * 0.42 };
    const next = simulateWeek(base, decide(base, { restockUnits: 0 }));
    const r = next.lastResult!;
    expect(r.served).toBeGreaterThan(0);
    expect(r.suppliesBought).toBe(0);
    // Nothing was paid for stock this week, but its cost still hits profit.
    expect(r.cashChange).toBeGreaterThan(r.profit);
  });

  it('keeps profit and cash change as separate, explainable numbers', () => {
    const base = { ...start(), cash: 300, inventory: 0 };
    // Buy far more than can sell: profit should beat the cash movement, because
    // the unsold stock was paid for but not expensed.
    const next = simulateWeek(base, decide(base, { restockUnits: 300 }));
    const r = next.lastResult!;
    expect(r.inventoryEnd).toBeGreaterThan(0);
    expect(r.profit).toBeGreaterThan(r.cashChange);
  });
});

describe('no spot is right all year', () => {
  const demandAt = (season: 'spring' | 'summer' | 'fall' | 'winter', locationId: string) => {
    const base = {
      ...start(),
      cash: 800,
      season,
      weather: 'sunny' as const,
      forecast: 'sunny' as const,
      reputation: 4,
      inventory: 900,
    };
    return simulateWeek(base, decide(base, { restockUnits: 0, locationId, price: 1.5 })).lastResult!
      .demand;
  };

  it('fills the soccer field in spring and puts a pool on the card in July', () => {
    expect(demandAt('spring', 'soccer')).toBeGreaterThan(demandAt('spring', 'park'));
    expect(demandAt('summer', 'pool')).toBeGreaterThan(demandAt('summer', 'park'));
  });

  it('beats the park with the pool in summer', () => {
    expect(demandAt('summer', 'pool')).toBeGreaterThan(demandAt('summer', 'park'));
  });

  it('beats the park with the free front yard in winter', () => {
    // Not on demand — on what is left after overhead when nobody is out.
    const profitAt = (locationId: string) => {
      const base = {
        ...start(),
        cash: 800,
        season: 'winter' as const,
        weather: 'cold' as const,
        forecast: 'cold' as const,
        inventory: 200,
      };
      return simulateWeek(base, decide(base, { restockUnits: 0, locationId, price: 1.5 }))
        .lastResult!.profit;
    };
    expect(profitAt('front-yard')).toBeGreaterThan(profitAt('park'));
  });

  it('gives every season a different packed destination', () => {
    const seasons = ['spring', 'summer', 'fall', 'winter'] as const;
    const winners = seasons.map((season) => {
      const open = LEMONADE.locations.filter((l) => !l.seasons || l.seasons.includes(season));
      const scored = open.map((l) => ({
        id: l.id,
        score: l.baseTraffic * l.seasonMods[season],
      }));
      return scored.sort((a, b) => b.score - a.score)[0].id;
    });
    expect(new Set(winners).size).toBe(4);
    expect(winners).toEqual(['soccer', 'pool', 'pumpkin-patch', 'ice-rink']);
  });
});

describe('spend-or-skimp cards are real choices', () => {
  const run = (eventId: string, choiceId: string) => {
    const base = {
      ...start(),
      cash: 200,
      inventory: 150,
      pendingEvents: [ALL_EVENTS.find((e) => e.id === eventId)!],
    };
    const next = simulateWeek(base, {
      ...decide(base, { restockUnits: 0, price: 1.5 }),
      eventChoices: { [eventId]: choiceId },
    });
    return {
      cash: next.cash,
      equipment: next.equipmentValue,
      reputation: next.reputation,
      netWorth: next.cash + next.equipmentValue,
    };
  };

  it('makes the new cooler cost cash but buy something durable', () => {
    const fix = run('broken-cooler', 'fix');
    const tape = run('broken-cooler', 'tape');
    // Skimping genuinely wins on this week's cash — that is the temptation.
    expect(tape.cash).toBeGreaterThan(fix.cash);
    // And genuinely loses on what the business is worth, which is the point.
    expect(fix.equipment).toBeGreaterThan(tape.equipment);
    expect(fix.netWorth).toBeGreaterThan(tape.netWorth);
  });

  it('leaves no free option on the insurance card', () => {
    const buy = run('insurance', 'buy');
    const risk = run('insurance', 'risk');
    // Skipping cover used to cost nothing at all, so it was never a decision.
    expect(risk.cash).toBeGreaterThan(buy.cash);
    expect(risk.reputation).toBeLessThan(buy.reputation);
  });

  it('makes the lock box worth its extra cost', () => {
    const box = run('stolen-cash', 'lockbox');
    const shrug = run('stolen-cash', 'shrug');
    expect(shrug.cash).toBeGreaterThan(box.cash);
    expect(box.netWorth).toBeGreaterThanOrEqual(shrug.netWorth);
  });
});

describe('stock is held at what it cost', () => {
  const withBox = (choice: 'buy' | 'skip') => {
    const base = {
      ...start(),
      cash: 300,
      inventory: 60,
      inventoryCost: 60 * 0.42,
      pendingEvents: [ALL_EVENTS.find((e) => e.id === 'bulk-discount')!],
    };
    return simulateWeek(base, {
      ...decide(base, { restockUnits: 0, price: 1.5 }),
      eventChoices: { 'bulk-discount': choice },
    });
  };

  it('books a box of stock as a purchase, not an expense', () => {
    const next = withBox('buy');
    const r = next.lastResult!;
    // The old bug: the box was charged as an event expense AND again through
    // cost of goods when those cups sold.
    expect(r.eventCash).toBe(0);
    expect(r.suppliesBought).toBe(25);
    expect(r.suppliesUnits).toBe(90);
    expect(r.orderedUnits).toBe(0);
    expect(r.orderedSpend).toBe(0);
  });

  it('does not call a Tycoon pallet the same 130 meals the card was written at', () => {
    const pallet = ALL_EVENTS.find((e) => e.id === 'truck-pallet')!;
    const s = {
      ...newGame({
        profileId: 'pallet',
        businessId: 'truck',
        tier: 'tycoon',
        financing: {
          loanIds: [],
          savingsUsed: 70000,
          locationId: 'office-park',
          assetId: 'lease',
        },
        seed: 3,
      }),
      cash: 80000,
      inventory: 0,
      inventoryCost: 0,
      pendingEvents: [pallet],
    };
    const next = simulateWeek(s, {
      ...decide(s, { restockUnits: 400, price: 11 }),
      eventChoices: { 'truck-pallet': 'buy' },
    });
    const r = next.lastResult!;
    const t = TIERS.tycoon;
    expect(r.orderedUnits).toBe(400);
    expect(r.eventLines[0].units).toBe(Math.round(130 * t.trafficScale));
    expect(r.suppliesUnits).toBe(r.orderedUnits + r.eventLines[0].units);
    expect(r.suppliesBought).toBeCloseTo(r.orderedSpend + 240 * t.eventScale, 2);
    expect(r.eventLines[0].text).not.toMatch(/130/);
  });

  it('lowers what every cup costs after a cheap batch', () => {
    const bought = withBox('buy').lastResult!;
    const skipped = withBox('skip').lastResult!;
    expect(skipped.avgUnitCost).toBeCloseTo(0.42, 2);
    // 60 cups at $0.42 blended with 90 at $0.278 comes out near $0.33.
    expect(bought.avgUnitCost).toBeLessThan(skipped.avgUnitCost);
    expect(bought.avgUnitCost).toBeCloseTo(0.33, 2);
  });

  it('makes every cup sold cheaper after the discount', () => {
    const bought = withBox('buy').lastResult!;
    const skipped = withBox('skip').lastResult!;
    const perCup = (r: typeof bought) => (r.cogs - r.sideCogs) / r.served;
    expect(perCup(bought)).toBeLessThan(perCup(skipped));
    // Note it is NOT automatically a win: a big box in a slow week spoils
    // before it sells, which is the point of the card being a decision.
  });

  it('never lets stock value drift away from the stock on hand', () => {
    let s = start({ financing: { loanIds: [], savingsUsed: 55, locationId: 'park' } });
    for (let i = 0; i < 50; i++) {
      s = simulateWeek(s, decide(s, { restockUnits: i % 4 === 0 ? 150 : 30 }));
      expect(s.inventoryCost).toBeGreaterThanOrEqual(0);
      if (s.inventory === 0) expect(s.inventoryCost).toBe(0);
      if (s.inventory > 0) {
        // Average cost must stay inside the range of prices stock can be had for.
        const avg = s.inventoryCost / s.inventory;
        expect(avg).toBeGreaterThan(0);
        expect(avg).toBeLessThanOrEqual(0.7);
      }
    }
  });
});

describe('the winter pivot', () => {
  const sell = (
    qualityId: string,
    season: 'spring' | 'summer' | 'fall' | 'winter',
    weather: 'hot' | 'sunny' | 'cloudy' | 'rain' | 'cold',
  ) => {
    const base = {
      ...start(),
      cash: 600,
      season,
      weather,
      forecast: weather,
      inventory: 600,
      inventoryCost: 600 * 0.5,
      locationId: 'park',
    };
    return simulateWeek(base, decide(base, { qualityId, restockUnits: 0, locationId: 'park' }))
      .lastResult!;
  };

  it('sells hot chocolate when nobody wants lemonade', () => {
    expect(sell('cocoa', 'winter', 'cold').demand).toBeGreaterThan(
      sell('fresh', 'winter', 'cold').demand,
    );
  });

  it('still wants lemonade on a warm day, even in cocoa season', () => {
    // Compared on demand, not cups served — both would hit the same ceiling on
    // what one person can hand over the counter. And it has to be a season
    // cocoa is actually sold in, or the fallback makes both sides lemonade.
    expect(sell('fresh', 'fall', 'sunny').demand).toBeGreaterThan(
      sell('cocoa', 'fall', 'sunny').demand,
    );
  });

  it('makes winter worth trading through instead of surviving', () => {
    const cocoa = sell('cocoa', 'winter', 'cold');
    expect(cocoa.profit).toBeGreaterThan(sell('fresh', 'winter', 'cold').profit);
    expect(cocoa.served).toBeGreaterThan(0);
  });

  it('takes a seasonal product off the menu when its season ends', () => {
    const cocoa = LEMONADE.qualities.find((q) => q.id === 'cocoa')!;
    // On the menu from the first cold week of fall right through spring, so a
    // cold or wet spring day is a real choice. Summer is the one season it is
    // never offered in.
    expect(cocoa.seasons).toEqual(['fall', 'winter', 'spring']);
    // Asking for it in July quietly puts you back on a year-round recipe rather
    // than selling cocoa in a heat wave.
    const base = {
      ...start(),
      cash: 600,
      season: 'summer' as const,
      weather: 'hot' as const,
      inventory: 300,
      inventoryCost: 150,
    };
    const next = simulateWeek(base, decide(base, { qualityId: 'cocoa', restockUnits: 0 }));
    expect(next.qualityId).not.toBe('cocoa');
  });
});

describe('a save with a missing field cannot poison the run', () => {
  // Jeff hit "worth $NaN" on a week-44 run. A save can carry the current
  // version and still be missing a field, because updating mid-run stamps the
  // new version onto the old shape at the next autosave.
  const legacy = (drop: keyof GameState) => {
    const s = { ...start(), cash: 500, inventory: 80, inventoryCost: 33.6 } as GameState;
    delete (s as unknown as Record<string, unknown>)[drop];
    return s;
  };

  it('survives a save written before inventoryCost existed', () => {
    const next = simulateWeek(legacy('inventoryCost'), decide(start(), { restockUnits: 40 }));
    const r = next.lastResult!;
    expect(Number.isFinite(r.avgUnitCost)).toBe(true);
    expect(Number.isFinite(r.cogs)).toBe(true);
    expect(Number.isFinite(r.profit)).toBe(true);
    expect(next.profitHistory.every(Number.isFinite)).toBe(true);
  });

  it('keeps every number finite whatever is missing', () => {
    const fields: (keyof GameState)[] = [
      'inventoryCost',
      'bonusCapacity',
      'weatherStreak',
      'rivalPrice',
      'equipmentValue',
      'totals',
      'profitHistory',
    ];
    for (const field of fields) {
      const next = simulateWeek(legacy(field), decide(start(), { restockUnits: 40 }));
      const r = next.lastResult!;
      for (const [key, value] of Object.entries(r)) {
        if (typeof value === 'number') {
          expect(Number.isFinite(value), `${field} missing -> ${key} was ${value}`).toBe(true);
        }
      }
      expect(Number.isFinite(next.cash)).toBe(true);
    }
  });

  it('never shows a price that is not a number', () => {
    const broken = { ...start(), profitHistory: [NaN, 20], revenueHistory: [NaN, 60] } as GameState;
    const v = valueBusiness(broken, {
      multipleLow: 0.6,
      multipleHigh: 2.4,
      inventoryUnitCost: 0.42,
    });
    expect(Number.isFinite(v.offer)).toBe(true);
    expect(Number.isFinite(v.avgWeeklyProfit)).toBe(true);
  });
});

describe('valuation', () => {
  it('pays a multiple of yearly profit plus assets, minus debt', () => {
    const state: GameState = {
      ...start(),
      cash: 100,
      inventory: 50,
      equipmentValue: 38,
      reputation: 5,
      profitHistory: [20, 20, 20, 20, 20, 20, 20, 20],
      revenueHistory: [50, 50, 50, 50, 50, 50, 50, 50],
    };
    const v = valueBusiness(state, { multipleLow: 0.6, multipleHigh: 2.4, inventoryUnitCost: 0.24 });
    expect(v.avgWeeklyProfit).toBe(20);
    expect(v.annualProfit).toBe(1040);
    expect(v.offer).toBeCloseTo(v.goodwill + 38 + 12 + 100, 2);
  });

  it('values on a trailing year, so a bad winter cannot sink the offer', () => {
    // A year that is strong in summer and weak in winter, ending in winter.
    const year = Array.from({ length: 52 }, (_, i) => (i < 26 ? 40 : 4));
    const state: GameState = { ...start(), profitHistory: year, revenueHistory: year.map((p) => p * 2) };
    const v = valueBusiness(state, { multipleLow: 0.6, multipleHigh: 2.4, inventoryUnitCost: 0.24 });
    expect(v.weeksCounted).toBe(52);
    // 22/week average, not the 4/week the final weeks would suggest.
    expect(v.avgWeeklyProfit).toBe(22);
  });

  it('pays more for a five-star business than a one-star one', () => {
    const base: GameState = {
      ...start(),
      profitHistory: [10, 12, 14, 16, 18, 20, 22, 24],
      revenueHistory: [30, 32, 34, 36, 38, 40, 42, 44],
    };
    const good = valueBusiness({ ...base, reputation: 5 }, { multipleLow: 0.6, multipleHigh: 2.4, inventoryUnitCost: 0.24 });
    const bad = valueBusiness({ ...base, reputation: 1 }, { multipleLow: 0.6, multipleHigh: 2.4, inventoryUnitCost: 0.24 });
    expect(good.offer).toBeGreaterThan(bad.offer);
  });

  it('subtracts what is still owed to the bank', () => {
    const withDebt = start({ financing: { loanIds: ['credit-union-150'], savingsUsed: 35, locationId: 'park' } });
    const v = valueBusiness(
      { ...withDebt, profitHistory: [20, 20, 20, 20] },
      { multipleLow: 0.6, multipleHigh: 2.4, inventoryUnitCost: 0.24 },
    );
    expect(v.debtPayoff).toBe(150);
  });
});

describe('fixes from the live playtest', () => {
  it('shows odd cents at every size, so a ledger column adds up on screen', () => {
    // The old rule hid cents above $10, which printed 25 - 5.88 - 1.68 = 17.
    expect(dollars(24.5)).toBe('$24.50');
    expect(dollars(16.94)).toBe('$16.94');
    expect(dollars(14.94)).toBe('$14.94');
    // Whole dollars still read clean.
    expect(dollars(25)).toBe('$25');
    expect(dollars(-32)).toBe('-$32');
    // A food truck deals in numbers a lemonade stand never did.
    expect(dollars(24000)).toBe('$24,000');
    expect(dollars(120000)).toBe('$120,000');
    expect(dollars(1234.5)).toBe('$1,234.50');
  });

  it('never tells a player to buy less when they bought nothing', () => {
    const state: GameState = {
      ...start(),
      inventory: 60,
      inventoryCost: 60 * 0.42,
      cash: 200,
      forecast: 'rain',
      weather: 'rain',
    };
    const next = simulateWeek(state, decide(state, { restockUnits: 0, eventChoices: {} }));
    const r = next.lastResult!;
    expect(r.suppliesUnits).toBe(0);
    expect(r.coachLine).not.toContain('Buy a little less');
  });

  it('still tells a player who over-ordered to buy less', () => {
    const state: GameState = { ...start(), cash: 400, forecast: 'sunny', weather: 'rain' };
    const next = simulateWeek(state, decide(state, { restockUnits: 300, eventChoices: {} }));
    const r = next.lastResult!;
    expect(r.spoilage).toBeGreaterThan(r.served * 0.35);
    expect(r.coachLine).toBe('You threw out a lot. Buy a little less next week.');
  });

  it('does not annualise a thin track record into a wild valuation', () => {
    const opts = { multipleLow: 0.6, multipleHigh: 2.4, inventoryUnitCost: 0.24 };
    // One good week in week 3 used to price the stand as if every week were that
    // good, which sent the headline goal from $131 to $535 and back again.
    const thin: GameState = {
      ...start(),
      cash: 24,
      profitHistory: [0.97, 0.73, 14.94],
      revenueHistory: [6.75, 5.25, 24.5],
    };
    const v = valueBusiness(thin, opts);
    expect(v.avgWeeklyProfit).toBeCloseTo(16.64 / 8, 2);
    expect(v.reasons.some((r) => r.label.includes('3 weeks of history'))).toBe(true);

    // Once there is a real track record the average is the true one again.
    const full: GameState = {
      ...start(),
      profitHistory: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      revenueHistory: Array.from({ length: 10 }, () => 30),
    };
    expect(valueBusiness(full, opts).avgWeeklyProfit).toBe(10);
  });

  it('labels each event card with what it cost, and the parts add to the total', () => {
    const state = start();
    const withCards: GameState = {
      ...state,
      cash: 300,
      pendingEvents: ALL_EVENTS.filter((e) => e.id === 'permit-fee' || e.id === 'harsh-review'),
    };
    const next = simulateWeek(
      withCards,
      decide(withCards, { eventChoices: { 'permit-fee': 'pay', 'harsh-review': 'apologize' } }),
    );
    const r = next.lastResult!;
    expect(r.eventLines).toHaveLength(2);
    expect(r.eventLines.map((l) => l.title)).toEqual(['Permit Please', 'Warm And Slow']);
    // The permit is a bill, so it is -22 at Pro's 1x event scale. The refund is
    // one cup handed back, so it is the price of a cup and nothing to do with
    // the tier — the two kinds of money on a card, both landing on the line.
    expect(r.eventLines.map((l) => l.cash)).toEqual([-22, -state.price]);
    const parts = r.eventLines.reduce((sum, l) => sum + l.cash, 0);
    expect(parts).toBeCloseTo(r.eventCash, 2);
  });
});

describe('a run left open across the event-label update', () => {
  it('repairs event lines that predate the title and cash fields', () => {
    const played = simulateWeek(start(), decide(start()));
    // Exactly the shape a save written by the previous build carries.
    const old = {
      ...played,
      lastResult: {
        ...played.lastResult!,
        eventLines: [{ emoji: '📑', text: 'Money for nothing visible.' }],
      },
    } as unknown as GameState;

    const fixed = sanitizeRun(old);
    expect(fixed.lastResult!.eventLines).toEqual([
      { emoji: '📑', text: 'Money for nothing visible.', title: 'What happened', cash: 0, units: 0 },
    ]);
    // Nothing is undefined, so the recap cannot print "undefined" as a label.
    for (const line of fixed.lastResult!.eventLines) {
      expect(typeof line.title).toBe('string');
      expect(Number.isFinite(line.cash)).toBe(true);
    }
  });
});

describe('weather cards agree with the forecast beside them', () => {
  it('never deals a weather card that contradicts the forecast on screen', () => {
    // The forecast is wrong about a third of the time by design. Events used to
    // be gated on the real weather, so a "Rain All Week" card could land next to
    // a sunny forecast — and it leaked the answer to the bet the forecast exists
    // to create.
    let state = start();
    let weatherCards = 0;
    for (let w = 0; w < 400; w++) {
      for (const ev of state.pendingEvents) {
        const def = ALL_EVENTS.find((e) => e.id === ev.id)!;
        if (!def.weathers) continue;
        weatherCards++;
        // The card has to describe the forecast the player is looking at AND
        // the week that actually turns up. Within a card that covers two
        // conditions the two may still differ — "a wet week" is true of both
        // rain and cloud — so the bet the forecast creates survives.
        expect(def.weathers).toContain(state.forecast);
        expect(def.weathers).toContain(state.weather);
      }
      state = simulateWeek(state, decide(state));
      if (state.gameOver || state.week > FINAL_WEEK) state = start({ seed: w + 1 });
    }
    // The gate must not quietly delete weather cards from the game. Requiring
    // the forecast to agree costs roughly a third of them; 400 weeks deals
    // about 21, or two to three across a 50-week run.
    expect(weatherCards).toBeGreaterThan(12);
  });

  it('gives every weather card a set that matches what it says', () => {
    // Cloudy has no weather card: there is nothing dramatic to report about it,
    // and letting one cover two conditions is how "Rain All Week" ended up
    // describing a cloudy day.
    const byId = Object.fromEntries(ALL_EVENTS.map((e) => [e.id, e]));
    expect(byId['wet-week'].weathers).toEqual(['rain', 'cloudy']);
    expect(byId['cold-snap'].weathers).toEqual(['cold']);
    expect(byId['heat-wave'].weathers).toEqual(['hot', 'sunny']);
  });
});

describe('what an event choice tells you it costs', () => {
  // The card only prints a money/stock/cost-per-cup/capacity tag. Any choice
  // that changes one of those without one would read "costs no money" while
  // quietly charging the player — which is what "Pay the extra" did while
  // raising the price of every cup by 35%.
  it('leaves nothing that changes the player economics untagged', () => {
    const untagged: string[] = [];
    for (const event of ALL_EVENTS) {
      for (const c of event.choices) {
        const tagged =
          (c.cash ?? 0) !== 0 ||
          (c.inventory ?? 0) !== 0 ||
          ((c.unitCostMod ?? 1) !== 1) ||
          ((c.capacityMod ?? 1) !== 1) ||
          (c.equipment ?? 0) !== 0 ||
          (c.capacity ?? 0) !== 0;
        const costsSomething =
          (c.cash ?? 0) !== 0 ||
          (c.inventory ?? 0) !== 0 ||
          ((c.unitCostMod ?? 1) !== 1) ||
          ((c.capacityMod ?? 1) !== 1) ||
          (c.equipment ?? 0) !== 0 ||
          (c.capacity ?? 0) !== 0;
        if (costsSomething && !tagged) untagged.push(`${event.title}: ${c.label}`);
      }
    }
    expect(untagged).toEqual([]);
  });

  it('only lets a choice read as free when it moves no money and no goods', () => {
    // Reputation and demand may still move — the tag is scoped to money on
    // purpose, because how customers react is the part being bet on.
    const free = ALL_EVENTS.flatMap((e) =>
      e.choices
        .filter(
          (c) =>
            (c.cash ?? 0) === 0 &&
            (c.inventory ?? 0) === 0 &&
            (c.unitCostMod ?? 1) === 1 &&
            (c.capacityMod ?? 1) === 1 &&
            (c.equipment ?? 0) === 0 &&
            (c.capacity ?? 0) === 0,
        )
        .map((c) => `${e.title}: ${c.label}`),
    );
    // These exist and should stay free — "Ignore it" costing nothing up front
    // is the whole point of offering it.
    expect(free.length).toBeGreaterThan(0);
    for (const label of free) expect(typeof label).toBe('string');
  });
});

describe('the helper roster', () => {
  it('runs two helpers at once, and charges both wages', () => {
    let s = start();
    s = simulateWeek(s, decide(s, { hireEmployeeIds: ['maya'], restockUnits: 60 }));
    expect(s.employees.map((e) => e.id)).toEqual(['maya']);
    expect(s.lastResult!.wages).toBe(40);

    s = simulateWeek(s, decide(s, { hireEmployeeIds: ['theo'], restockUnits: 60 }));
    expect(s.employees.map((e) => e.id)).toEqual(['maya', 'theo']);
    expect(s.lastResult!.wages).toBe(65);
  });

  it('lets one helper go without losing the other', () => {
    let s = start();
    s = simulateWeek(s, decide(s, { hireEmployeeIds: ['maya', 'theo'], restockUnits: 60 }));
    expect(s.employees).toHaveLength(2);
    s = simulateWeek(s, decide(s, { fireEmployeeIds: ['maya'], restockUnits: 60 }));
    expect(s.employees.map((e) => e.id)).toEqual(['theo']);
    expect(s.lastResult!.wages).toBe(25);
  });

  it('counts every pair of hands and any gear towards what can be served', () => {
    let s = start();
    s = simulateWeek(s, decide(s, { hireEmployeeIds: ['maya', 'theo'], restockUnits: 60 }));
    const withBoth = { ...s, bonusCapacity: 40 };
    // 190 solo + 160 Maya + 110 Theo + 40 of gear.
    const capacity =
      LEMONADE.soloCapacity +
      withBoth.bonusCapacity +
      withBoth.employees.reduce((sum, e) => sum + e.capacityBonus, 0);
    expect(capacity).toBe(500);
  });

  it('gear bought from an event raises capacity for good', () => {
    let s = start();
    const before = s.bonusCapacity;
    s = {
      ...s,
      cash: 400,
      pendingEvents: ALL_EVENTS.filter((e) => e.id === 'rival-closes'),
    };
    s = simulateWeek(s, decide(s, { eventChoices: { 'rival-closes': 'buy' }, restockUnits: 60 }));
    expect(s.bonusCapacity).toBe(before + 40);
    // Still there a week later with no event.
    const later = simulateWeek({ ...s, pendingEvents: [] }, decide(s, { restockUnits: 60 }));
    expect(later.bonusCapacity).toBe(before + 40);
  });
});

describe('weather is counted once', () => {
  /**
   * The demand model already scales by weather — rain 0.45, cold 0.35, hot 1.8.
   * A weather card that also moves demand for doing nothing is charging the
   * weather twice: rain used to land at 0.45 x 0.40 = 0.18, and a player could
   * not see why the same rainy week was sometimes twice as bad as another.
   *
   * So on a weather card, the do-nothing option must be exactly neutral. Any
   * other number has to be the marginal effect of the action taken.
   */
  it('leaves the passive option on a weather card completely neutral', () => {
    const weatherCards = ALL_EVENTS.filter((e) => e.weathers);
    expect(weatherCards.length).toBeGreaterThan(0);

    for (const card of weatherCards) {
      const passive = card.choices.filter(
        (c) => !c.cash && !c.inventory && !c.equipment && !c.capacity && !c.priceMod,
      );
      expect(passive.length, `${card.title} needs a do-nothing option`).toBeGreaterThan(0);
      for (const c of passive) {
        expect(c.demandMod ?? 1, `${card.title}: "${c.label}" re-charges the weather`).toBe(1);
        expect(c.capacityMod ?? 1, `${card.title}: "${c.label}"`).toBe(1);
        expect(c.unitCostMod ?? 1, `${card.title}: "${c.label}"`).toBe(1);
      }
    }
  });

  it('prices a heat wave through the demand curve, not a hand-written penalty', () => {
    const heat = ALL_EVENTS.find((e) => e.id === 'heat-wave')!;
    const raise = heat.choices.find((c) => c.id === 'raise')!;
    expect(raise.priceMod).toBeGreaterThan(1);
    expect(raise.demandMod).toBeUndefined();
  });

  it('actually charges the higher price when a card raises it', () => {
    const base: GameState = {
      ...start(),
      cash: 400,
      inventory: 200,
      inventoryCost: 200 * 0.42,
      pendingEvents: ALL_EVENTS.filter((e) => e.id === 'heat-wave'),
    };
    const held = simulateWeek(base, decide(base, { eventChoices: { 'heat-wave': 'normal' }, restockUnits: 0 }));
    const raised = simulateWeek(base, decide(base, { eventChoices: { 'heat-wave': 'raise' }, restockUnits: 0 }));
    // Dearer per cup, and the demand curve answers with fewer of them.
    expect(raised.price).toBeCloseTo(base.price * 1.3, 2);
    expect(raised.lastResult!.served).toBeLessThan(held.lastResult!.served);
  });
});

describe('hot chocolate in spring is a real choice, not a free win', () => {
  const run = (qualityId: string, weather: 'sunny' | 'cloudy' | 'rain' | 'cold') => {
    const base: GameState = {
      ...start(),
      cash: 600,
      season: 'spring',
      weather,
      forecast: weather,
      inventory: 400,
      inventoryCost: 400 * 0.42,
      pendingEvents: [],
    };
    return simulateWeek(base, decide(base, { qualityId, restockUnits: 0 })).lastResult!;
  };

  it('is on the menu in spring', () => {
    const spring = LEMONADE.qualities.filter((q) => !q.seasons || q.seasons.includes('spring'));
    expect(spring.map((q) => q.id)).toContain('cocoa');
  });

  it('loses to lemonade on a sunny spring day', () => {
    expect(run('cocoa', 'sunny').served).toBeLessThan(run('fresh', 'sunny').served);
  });

  it('beats lemonade on a wet or cold spring day', () => {
    expect(run('cocoa', 'rain').served).toBeGreaterThan(run('fresh', 'rain').served);
    expect(run('cocoa', 'cold').served).toBeGreaterThan(run('fresh', 'cold').served);
  });

  it('is close enough on a grey spring day to be worth thinking about', () => {
    const cocoa = run('cocoa', 'cloudy').served;
    const lemonade = run('fresh', 'cloudy').served;
    const gap = Math.abs(cocoa - lemonade) / Math.max(cocoa, lemonade);
    expect(gap).toBeLessThan(0.25);
  });
});

describe('treats are a batch, bought before the week', () => {
  const week = (sideProductId: string | null, over: Record<string, unknown> = {}) => {
    const base: GameState = {
      ...start(),
      cash: 900,
      stage: 2,
      inventory: 400,
      inventoryCost: 400 * 0.42,
      pendingEvents: [],
      ...over,
    } as GameState;
    return simulateWeek(base, decide(base, { restockUnits: 0, sideProductId })).lastResult!;
  };

  it('charges the whole batch even when almost nobody comes', () => {
    // Front yard, freezing, nobody about. The baking money is already gone.
    const quiet = week('brownies', { locationId: 'front-yard', weather: 'cold', forecast: 'cold' });
    const brownies = LEMONADE.sideProducts.find((sp) => sp.id === 'brownies')!;
    expect(quiet.sideCogs).toBe(brownies.batchCost);
    expect(quiet.sideRevenue).toBeLessThan(quiet.sideCogs);
    expect(quiet.sideWasted).toBeGreaterThan(0);
  });

  it('pays well once the crowd is there', () => {
    const busy = week('brownies', { locationId: 'soccer', weather: 'hot', forecast: 'hot', reputation: 5 });
    expect(busy.sideRevenue).toBeGreaterThan(busy.sideCogs);
  });

  it('is a real decision — the same treat wins one week and loses the next', () => {
    const quiet = week('cookies', { locationId: 'front-yard', weather: 'rain', forecast: 'rain' });
    const busy = week('cookies', { locationId: 'soccer', weather: 'hot', forecast: 'hot', reputation: 5 });
    expect(quiet.sideRevenue - quiet.sideCogs).toBeLessThan(0);
    expect(busy.sideRevenue - busy.sideCogs).toBeGreaterThan(0);
  });

  it('never sells more than the batch made', () => {
    const busy = week('brownies', { locationId: 'soccer', weather: 'hot', forecast: 'hot', reputation: 5 });
    const brownies = LEMONADE.sideProducts.find((sp) => sp.id === 'brownies')!;
    expect(busy.sideUnits).toBeLessThanOrEqual(brownies.batchSize);
    expect(busy.sideUnits + busy.sideWasted).toBe(brownies.batchSize);
  });

  it('costs nothing at all when no treat is chosen', () => {
    const none = week(null);
    expect(none.sideCogs).toBe(0);
    expect(none.sideRevenue).toBe(0);
    expect(none.sideWasted).toBe(0);
  });

  it('prices every batch so the break-even is a number a child could reach', () => {
    for (const sp of LEMONADE.sideProducts) {
      const breakEven = Math.ceil(sp.batchCost / sp.price / sp.attachRate);
      // Reachable at a busy spot, out of reach in a quiet front yard — which is
      // what makes it a decision about where you are, not a free upgrade.
      expect(breakEven, sp.name).toBeGreaterThan(15);
      expect(breakEven, sp.name).toBeLessThan(60);
    }
  });
});
