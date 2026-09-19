import { describe, expect, it } from 'vitest';
import { newGame } from '../newGame';
import { simulateWeek, FINAL_WEEK } from '../simulateWeek';
import { valueBusiness } from '../valuation';
import { LEMONADE } from '../../config/businesses';
import { SEASON_INFO, WEATHER_INFO } from '../calendar';
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
        .filter((l) => !l.seasons || l.seasons.includes(s.season))
        .sort((a, b) => b.baseTraffic * b.seasonMods[s.season] - a.baseTraffic * a.seasonMods[s.season])
        .find((l) => costOf(l) <= s.cash * 0.2) ?? LEMONADE.locations[0];
    // Pick the drink by what the weather is actually doing, the way a player
    // would. Blindly grabbing whatever seasonal item exists meant selling cocoa
    // on a warm spring afternoon, which is the wrong call and not what this
    // probe is here to measure.
    const onMenu = LEMONADE.qualities.filter(
      (q) => !q.seasons || q.seasons.includes(s.season),
    );
    const scoreOf = (q: (typeof onMenu)[number]) => {
      const weatherMod = q.weatherMods ? q.weatherMods[s.weather] : WEATHER_INFO[s.weather].demandMod;
      const seasonMod = q.seasonMods ? q.seasonMods[s.season] : SEASON_INFO[s.season].demandMod;
      const margin = LEMONADE.defaultPrice[tier] - q.unitCost * t.unitCostScale;
      return weatherMod * seasonMod * (q.demandMod ?? 1) * margin;
    };
    const quality = onMenu.reduce((best, q) => (scoreOf(q) > scoreOf(best) ? q : best));
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

  it('still lets a well-played run stage up without going broke', () => {
    const pro = [7, 12345, 99, 2024].map((s) => playRun('pro', s, true));
    const rookie = [7, 12345, 99, 2024].map((s) => playRun('rookie', s, true));
    for (const r of pro) {
      expect(r.broke).toBe(0);
      expect(r.stage).toBeGreaterThan(1);
    }
    // Rookie is the gentle tier: it must never lose money more often than pro.
    const worstRookie = Math.max(...rookie.map((r) => r.losing));
    const worstPro = Math.max(...pro.map((r) => r.losing));
    expect(worstRookie).toBeLessThanOrEqual(worstPro);
  });
});

describe('treats stay worth choosing, without being a free win', () => {
  it('sets every batch to pay off at a busy spot and not at a quiet one', () => {
    const scale = TIERS.pro.unitCostScale;
    for (const sp of LEMONADE.sideProducts) {
      const cost = sp.batchCost * scale;
      const breakEven = cost / sp.price / sp.attachRate;
      const bestCase = sp.batchSize * sp.price - cost;

      // A front yard turns over roughly two dozen customers a week; a soccer
      // field in season, well over a hundred. Break-even has to sit between the
      // two, or the treat is either free money or never worth taking.
      expect(breakEven, `${sp.name} break-even`).toBeGreaterThan(20);
      expect(breakEven, `${sp.name} break-even`).toBeLessThan(45);

      // And the upside has to be worth the money going out on Sunday.
      expect(bestCase, `${sp.name} best case`).toBeGreaterThan(cost);
    }
  });
});
