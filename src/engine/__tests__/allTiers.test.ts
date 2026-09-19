import { describe, expect, it } from 'vitest';
import { businessFor } from '../../config/businesses';
import { TIERS } from '../../config/difficulty';
import { computeDemand } from '../demand';
import { newGame } from '../newGame';
import { priceBandFor } from '../pricing';
import { restockBounds } from '../restock';
import { simulateWeek, FINAL_WEEK } from '../simulateWeek';
import type { GameState, Tier, WeekDecisions } from '../types';

/**
 * Every business at every level has to actually play. The well-played-truck
 * guard skipped Rookie and never touched the lemonade stand.
 */
const TIERS_ALL: Tier[] = ['rookie', 'pro', 'tycoon'];

function decide(s: GameState, over: Partial<WeekDecisions> = {}): WeekDecisions {
  const biz = businessFor(s.businessId, s.tier);
  const t = TIERS[s.tier];
  const quality = biz.qualities.find((q) => q.id === s.qualityId) ?? biz.qualities[0];
  const location = biz.locations.find((l) => l.id === s.locationId) ?? biz.locations[0];
  const price = biz.referencePrice[s.tier];
  const expected = computeDemand({
    state: s,
    location,
    quality,
    price,
    referencePrice: biz.referencePrice[s.tier],
    elasticity: t.elasticity,
    conversionRate: biz.conversionRate,
    eventDemandMod: 1,
    noiseRoll: 0.5,
  }).demand;
  const capacity = Math.round(
    (biz.soloCapacity +
      s.employees.reduce((a, e) => a + e.capacityBonus, 0) +
      s.bonusCapacity) *
      (quality.capacityMod ?? 1),
  );
  return {
    price,
    qualityId: quality.id,
    restockUnits: Math.max(0, Math.round((Math.min(expected, capacity) - s.inventory) / t.restockStep) * t.restockStep),
    locationId: location.id,
    eventChoices: Object.fromEntries(
      s.pendingEvents.map((e) => [e.id, e.choices[0].id]),
    ),
    buyMarketing: [],
    hireEmployeeIds: [],
    sideProductId: null,
    ...over,
  };
}

function open(opts: {
  businessId: string;
  tier: Tier;
  assetId?: string;
  loanIds?: string[];
  seed?: number;
}): GameState {
  const biz = businessFor(opts.businessId, opts.tier);
  return newGame({
    profileId: 'all-tiers',
    businessId: opts.businessId,
    tier: opts.tier,
    financing: {
      loanIds: opts.loanIds ?? [],
      savingsUsed: biz.savings[opts.tier],
      locationId: biz.locations[0].id,
      assetId: opts.assetId,
    },
    seed: opts.seed ?? 11,
  });
}

function play(start: GameState, weeks = FINAL_WEEK): GameState {
  let s = start;
  for (let w = 0; w < weeks && !s.gameOver; w++) {
    s = simulateWeek(s, decide(s));
  }
  return s;
}

describe('every business opens at every level', () => {
  const cases: { businessId: string; tier: Tier; assetId?: string; loanIds: string[] }[] = [
    { businessId: 'lemonade', tier: 'rookie', loanIds: [] },
    { businessId: 'lemonade', tier: 'pro', loanIds: [] },
    { businessId: 'lemonade', tier: 'tycoon', loanIds: [] },
    { businessId: 'truck', tier: 'rookie', assetId: 'new-build', loanIds: ['family-2000'] },
    { businessId: 'truck', tier: 'rookie', assetId: 'used-refurb', loanIds: [] },
    { businessId: 'truck', tier: 'rookie', assetId: 'lease', loanIds: [] },
    { businessId: 'truck', tier: 'pro', assetId: 'new-build', loanIds: ['sba-25000'] },
    { businessId: 'truck', tier: 'pro', assetId: 'used-refurb', loanIds: ['cu-12000'] },
    { businessId: 'truck', tier: 'pro', assetId: 'lease', loanIds: [] },
    { businessId: 'truck', tier: 'tycoon', assetId: 'new-build', loanIds: ['sba-120000'] },
    { businessId: 'truck', tier: 'tycoon', assetId: 'used-refurb', loanIds: ['cu-60000'] },
    { businessId: 'truck', tier: 'tycoon', assetId: 'lease', loanIds: [] },
  ];

  for (const c of cases) {
    const label = `${c.businessId} ${c.tier}${c.assetId ? ` ${c.assetId}` : ''}`;

    it(`${label} starts with money and a reachable price`, () => {
      const s = open(c);
      const biz = businessFor(c.businessId, c.tier);
      const band = priceBandFor(biz, c.tier, TIERS[c.tier]);
      expect(s.cash, label).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(s.cash), label).toBe(true);
      expect(s.price, `${label} opening`).toBeGreaterThanOrEqual(band.min);
      expect(s.price, `${label} opening`).toBeLessThanOrEqual(band.max);
      expect(s.gameOver).toBeFalsy();
    });

    it(`${label} plays fifty weeks without breaking`, () => {
      const s = play(open(c));
      expect(s.gameOver, `${label} bust`).toBeFalsy();
      expect(Number.isFinite(s.cash), `${label} cash`).toBe(true);
      expect(Number.isFinite(s.totals.profit), `${label} profit`).toBe(true);
      expect(s.week).toBe(FINAL_WEEK + 1);
      expect(s.totals.customers, `${label} customers`).toBeGreaterThan(0);
    });
  }

  it('the used truck stays closed for four weeks at every level', () => {
    for (const tier of TIERS_ALL) {
      const loan = tier === 'rookie' ? [] : tier === 'pro' ? ['cu-12000'] : ['cu-60000'];
      let s = open({ businessId: 'truck', tier, assetId: 'used-refurb', loanIds: loan });
      expect(s.weeksToOpen).toBe(4);
      for (let w = 0; w < 4; w++) {
        s = simulateWeek(s, decide(s));
        expect(s.lastResult!.buildingOut, `${tier} week ${w + 1}`).toBe(true);
        expect(s.lastResult!.served, `${tier} week ${w + 1}`).toBe(0);
        expect(s.lastResult!.miniGoalMet, `${tier} week ${w + 1}`).toBe(false);
        expect(s.lastResult!.newBadges, `${tier} week ${w + 1}`).toEqual([]);
      }
      s = simulateWeek(s, decide(s));
      expect(s.lastResult!.buildingOut, `${tier} open`).toBe(false);
      expect(s.lastResult!.served, `${tier} open`).toBeGreaterThan(0);
    }
  });

  it('a wrap stays a one-time buy at Pro and Tycoon', () => {
    for (const tier of ['pro', 'tycoon'] as Tier[]) {
      let s = open({
        businessId: 'truck',
        tier,
        assetId: 'new-build',
        loanIds: [],
      });
      s = { ...s, cash: 20000, stage: 2, pendingEvents: [] };
      s = simulateWeek(s, decide(s, { buyMarketing: ['wrap'] }));
      expect(s.lastResult!.marketingSpend).toBe(700);
      const boost = s.marketing.find((m) => m.channelId === 'wrap')!.boost;
      s = simulateWeek(s, decide(s, { buyMarketing: ['wrap'] }));
      expect(s.lastResult!.marketingSpend, tier).toBe(0);
      expect(s.marketing.filter((m) => m.channelId === 'wrap')).toHaveLength(1);
      expect(s.marketing.find((m) => m.channelId === 'wrap')!.boost, tier).toBe(boost);
    }
  });

  it('Rookie never faces the rival', () => {
    for (const id of ['lemonade', 'truck']) {
      const biz = businessFor(id, 'rookie');
      expect(biz.rival.tiers, id).not.toContain('rookie');
    }
  });

  it('the supplies stepper still reaches past capacity at every level', () => {
    for (const id of ['lemonade', 'truck']) {
      for (const tier of TIERS_ALL) {
        const biz = businessFor(id, tier);
        const t = TIERS[tier];
        const capacity = Math.round(
          (biz.soloCapacity + biz.employees.reduce((a, e) => a + e.capacityBonus, 0)) *
            Math.min(...biz.qualities.map((q) => q.capacityMod ?? 1)),
        );
        const out = restockBounds({
          cash: 1_000_000,
          committed: 0,
          unitCost: biz.qualities[1].unitCost * t.unitCostScale,
          step: t.restockStep,
          capacity,
          inventory: 0,
        });
        expect(out.max, `${id}/${tier}`).toBeGreaterThan(capacity);
      }
    }
  });
});
