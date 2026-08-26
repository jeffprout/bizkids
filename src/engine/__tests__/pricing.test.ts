import { describe, expect, it } from 'vitest';
import { priceBoundsFor } from '../pricing';
import { TIERS } from '../../config/difficulty';
import { BUSINESSES } from '../../config/businesses';
import type { Tier } from '../types';

/**
 * The price control has to work for a $1.50 cup and a $9 meal.
 *
 * It used to take its floor, ceiling and step in dollars from the tier, which
 * quietly assumed every business was a lemonade stand. The food truck opens at
 * $9 against Pro's $5 ceiling, so "more expensive" did nothing at all and
 * "cheaper" cut the price by nearly half in a single tap.
 */
describe('what the price control offers', () => {
  it('leaves the lemonade stand exactly where it shipped', () => {
    // The dollar values the tiers used to hold outright. Rookie and Pro are what
    // playtesters actually saw, and neither may move.
    expect(priceBoundsFor(1, TIERS.rookie)).toEqual({ min: 0.25, max: 3, step: 0.25 });
    expect(priceBoundsFor(1.5, TIERS.pro)).toEqual({ min: 0.25, max: 5, step: 0.25 });
  });

  it('coarsens the tycoon step that was never usable anyway', () => {
    // Tycoon asked for 5c steps across a range of $0.25 to $8 — a hundred and
    // fifty taps end to end. It was never reachable in the shipped game, and it
    // is now a dime, which crosses the same range in seventy-seven.
    const tycoon = priceBoundsFor(1.75, TIERS.tycoon);
    expect(tycoon.step).toBe(0.1);
    expect((tycoon.max - tycoon.min) / tycoon.step).toBeLessThanOrEqual(80);
  });

  it('lets the food truck be priced above what it opens at', () => {
    const truck = BUSINESSES.truck;
    for (const tier of ['rookie', 'pro', 'tycoon'] as Tier[]) {
      const bounds = priceBoundsFor(truck.referencePrice[tier], TIERS[tier]);
      const opening = truck.defaultPrice[tier];
      expect(opening, `${tier} floor`).toBeGreaterThanOrEqual(bounds.min);
      expect(opening, `${tier} ceiling`).toBeLessThan(bounds.max);
      // And with real room in both directions, not one step of it.
      expect(bounds.max - opening, `${tier} headroom`).toBeGreaterThan(opening * 0.5);
    }
  });

  it('never lets a business open at a price it cannot reach', () => {
    for (const biz of Object.values(BUSINESSES)) {
      for (const tier of ['rookie', 'pro', 'tycoon'] as Tier[]) {
        if (!biz.loanOffers[tier]?.length) continue;
        const bounds = priceBoundsFor(biz.referencePrice[tier], TIERS[tier]);
        const opening = biz.defaultPrice[tier];
        expect(opening, `${biz.id} ${tier}`).toBeGreaterThanOrEqual(bounds.min);
        expect(opening, `${biz.id} ${tier}`).toBeLessThanOrEqual(bounds.max);
      }
    }
  });

  it('keeps every step a round number and every end on the step', () => {
    for (const biz of Object.values(BUSINESSES)) {
      for (const tier of ['rookie', 'pro', 'tycoon'] as Tier[]) {
        const { min, max, step } = priceBoundsFor(biz.referencePrice[tier], TIERS[tier]);
        const cents = (n: number) => Math.round(n * 100);
        expect(cents(min) % cents(step), `${biz.id} ${tier} floor on step`).toBe(0);
        expect(cents(max) % cents(step), `${biz.id} ${tier} ceiling on step`).toBe(0);
      }
    }
  });

  it('never asks for more taps than a person will make', () => {
    for (const biz of Object.values(BUSINESSES)) {
      for (const tier of ['rookie', 'pro', 'tycoon'] as Tier[]) {
        const { min, max, step } = priceBoundsFor(biz.referencePrice[tier], TIERS[tier]);
        expect((max - min) / step, `${biz.id} ${tier} taps`).toBeLessThanOrEqual(80);
      }
    }
  });

  it('sizes the step against the price, not against a lemonade stand', () => {
    // A quarter is a real move on a $1.50 cup and noise on a $9 meal.
    const cup = priceBoundsFor(1.5, TIERS.pro);
    const meal = priceBoundsFor(9, TIERS.pro);
    expect(meal.step).toBeGreaterThan(cup.step);
    // One tap should be worth something without being a lurch: call it between
    // a twentieth and a fifth of what the thing normally sells for.
    for (const [reference, bounds] of [
      [1.5, cup],
      [9, meal],
    ] as const) {
      expect(bounds.step / reference).toBeGreaterThan(0.04);
      expect(bounds.step / reference).toBeLessThan(0.2);
    }
  });
});
