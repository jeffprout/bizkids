import { describe, expect, it } from 'vitest';
import { newGame } from '../newGame';
import { simulateWeek, FINAL_WEEK } from '../simulateWeek';
import { applySpoilage, priceCurve, reputationMod } from '../demand';
import { seasonForWeek } from '../calendar';
import { valueBusiness } from '../valuation';
import type { GameState, WeekDecisions } from '../types';
import { LEMONADE } from '../../config/businesses/lemonade';
import { ALL_EVENTS } from '../../config/events';

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
    expect(next.lastResult!.rent).toBe(10);
  });

  it('pays wages once a helper is hired', () => {
    const state = { ...start(), cash: 300, stage: 2 as const };
    const next = simulateWeek(state, decide(state, { hireEmployeeId: 'maya' }));
    expect(next.employees).toHaveLength(1);
    expect(next.lastResult!.wages).toBe(40);
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
        eventChoices: { 'health-inspector': 'fix' },
      }).lastResult!.eventCash;
    };
    expect(hit('rookie')).toBeGreaterThan(hit('pro'));
    expect(hit('pro')).toBe(-26);
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
