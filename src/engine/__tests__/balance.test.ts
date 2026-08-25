import { describe, expect, it } from 'vitest';
import { newGame } from '../newGame';
import { simulateWeek, FINAL_WEEK } from '../simulateWeek';
import { valueBusiness } from '../valuation';
import { LEMONADE } from '../../config/businesses/lemonade';
import { TIERS } from '../../config/difficulty';
import type { GameState, Tier } from '../types';

/** reserveBill = the fix: hold back the week's known bill before sizing stock. */
function playRun(tier: Tier, seed: number, reserveBill: boolean) {
  const t = TIERS[tier];
  let s: GameState = newGame({
    profileId: 'probe',
    businessId: 'lemonade',
    tier,
    financing: { loanIds: [], savingsUsed: LEMONADE.savings[tier], locationId: 'front-yard' },
    seed,
  });
  let losing = 0;
  let broke = 0;
  const demand: number[] = [];

  for (let w = 0; w < FINAL_WEEK; w++) {
    const costOf = (l: (typeof LEMONADE.locations)[number]) =>
      l.weeklyRent + l.weeklyFixedCosts * t.fixedCostScale;
    // Pick the busiest spot whose weekly bill is under a fifth of the bank.
    const loc =
      [...LEMONADE.locations]
        .sort((a, b) => b.baseTraffic * b.seasonMods[s.season] - a.baseTraffic * a.seasonMods[s.season])
        .find((l) => costOf(l) <= s.cash * 0.2) ?? LEMONADE.locations[0];
    const quality =
      LEMONADE.qualities.find((q) => q.seasons?.includes(s.season)) ??
      LEMONADE.qualities.find((q) => q.id === 'classic') ??
      LEMONADE.qualities[0];
    const unitCost = quality.unitCost * t.unitCostScale;

    const budget = reserveBill ? Math.max(0, s.cash - costOf(loc)) : s.cash;
    const cap = Math.floor(Math.floor(budget / unitCost) / t.restockStep) * t.restockStep;
    const target = Math.max(20, ...demand.slice(-3));
    const restockUnits = Math.max(0, Math.min(cap, Math.ceil(Math.max(0, target - s.inventory) / t.restockStep) * t.restockStep));

    s = simulateWeek(s, {
      price: LEMONADE.defaultPrice[tier],
      qualityId: quality.id,
      restockUnits,
      locationId: loc.id,
      eventChoices: Object.fromEntries(
        s.pendingEvents.map((e) => [e.id, [...e.choices].sort((a, b) => (b.cash ?? 0) - (a.cash ?? 0))[0].id]),
      ),
      buyMarketing: [],
    });
    const r = s.lastResult!;
    demand.push(r.served + r.lostToStockout);
    if (r.profit <= 0) losing++;
    if (r.emergencyAdvance > 0) broke++;
  }
  const q = LEMONADE.qualities.find((x) => x.id === s.qualityId)!;
  const v = valueBusiness(s, {
    multipleLow: LEMONADE.valuationMultiple.low,
    multipleHigh: LEMONADE.valuationMultiple.high,
    inventoryUnitCost: q.unitCost * t.unitCostScale,
  });
  return { losing, broke, offer: Math.round(v.offer), cash: Math.round(s.cash), stage: s.stage };
}

describe('holding back the weekly bill before buying stock', () => {
  // The supplies stepper used to offer the whole bank balance, so the default
  // order could leave a player unable to pay rent they had already committed to.
  // The rail must stop that without making a well-played run any worse.
  for (const tier of ['rookie', 'pro'] as Tier[]) {
    for (const seed of [7, 12345, 99, 2024]) {
      it(`costs a well-played ${tier} run nothing on seed ${seed}`, () => {
        const spendAll = playRun(tier, seed, false);
        const reserve = playRun(tier, seed, true);
        expect(reserve).toEqual(spendAll);
      });
    }
  }

  it('still leaves pro with weeks that lose money, and rookie with few', () => {
    const pro = [7, 12345, 99, 2024].map((s) => playRun('pro', s, true));
    const rookie = [7, 12345, 99, 2024].map((s) => playRun('rookie', s, true));
    for (const r of pro) {
      expect(r.losing).toBeGreaterThan(0);
      expect(r.broke).toBe(0);
      expect(r.stage).toBeGreaterThan(1);
    }
    // Rookie is the gentle tier: it must never lose money more often than pro.
    const worstRookie = Math.max(...rookie.map((r) => r.losing));
    const worstPro = Math.max(...pro.map((r) => r.losing));
    expect(worstRookie).toBeLessThanOrEqual(worstPro);
  });
});
