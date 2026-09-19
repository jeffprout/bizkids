import { describe, expect, it } from 'vitest';
import { restockBounds } from '../restock';
import { businessFor } from '../../config/businesses';
import { TIERS } from '../../config/difficulty';

/**
 * Jeff, on Tycoon: "Supplies only go up to 600. I can serve over 1000, but can
 * only go up to 600."
 *
 * The stepper's ceiling was a hard-coded 600, written when 600 was more than any
 * business could serve. Tycoon's truck serves 624 on its own and well over a
 * thousand with both hands hired, so the ceiling sat BELOW capacity — the
 * supplies card said "can serve 1,144" directly above a stepper that stopped at
 * 600, and the game refused to sell what it had just said you could sell.
 */
const base = {
  cash: 50000,
  committed: 500,
  unitCost: 4.16,
  step: 25,
  capacity: 624,
  inventory: 0,
};

describe('the supplies stepper', () => {
  it('always reaches past what the business can serve', () => {
    // Over-ordering is half of what the week teaches. A ceiling at or below
    // capacity would quietly take that lesson off the table.
    expect(restockBounds(base).max).toBeGreaterThan(base.capacity);
  });

  it('reaches past capacity for every tier of every business', () => {
    for (const id of ['lemonade', 'truck']) {
      for (const tier of ['rookie', 'pro', 'tycoon'] as const) {
        const biz = businessFor(id, tier);
        const t = TIERS[tier];
        // Both hands hired, on the menu that serves slowest.
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

  it('never offers more than the player can pay for', () => {
    const out = restockBounds({ ...base, cash: 1000, committed: 500 });
    // $500 left at $4.16 each is 120 meals, and stock comes in packs of 25.
    expect(out.max).toBe(100);
    expect(out.max * base.unitCost).toBeLessThanOrEqual(500);
  });

  it('leaves the week its committed bill', () => {
    const out = restockBounds({ ...base, cash: 2000, committed: 1500 });
    expect(out.max * base.unitCost).toBeLessThanOrEqual(500);
  });

  it('still offers one pack to a business with nothing to sell', () => {
    // Reserving the bill must never strand a player with no stock and no way to
    // earn. If the bank covers one pack at all, one pack stays on the table.
    const out = restockBounds({ ...base, cash: 200, committed: 500, inventory: 0 });
    expect(out.max).toBe(base.step);
  });

  it('offers nothing when even one pack is out of reach', () => {
    expect(restockBounds({ ...base, cash: 10, committed: 0 }).max).toBe(0);
  });

  it('counts what is already in the cooler against the ceiling', () => {
    const full = restockBounds({ ...base, inventory: 5000 });
    expect(full.max).toBe(0);
    const half = restockBounds({ ...base, inventory: base.capacity });
    expect(half.max).toBe(restockBounds(base).max - base.capacity);
  });

  it('counts a pallet already coming as stock you do not buy again', () => {
    const empty = restockBounds({ ...base, inventory: 0 });
    const pallet = restockBounds({ ...base, inventory: 338 });
    expect(pallet.max).toBeLessThan(empty.max);
    expect(empty.max - pallet.max).toBeGreaterThanOrEqual(325);
  });

  it('never lands the player on a number that is not a whole pack', () => {
    for (const cash of [137, 999, 4321, 88888]) {
      const out = restockBounds({ ...base, cash });
      expect(out.max % base.step, `cash ${cash}`).toBe(0);
    }
  });
});
