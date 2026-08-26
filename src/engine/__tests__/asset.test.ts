import { describe, expect, it } from 'vitest';
import { newGame } from '../newGame';
import { simulateWeek, FINAL_WEEK } from '../simulateWeek';
import { valueBusiness } from '../valuation';
import { FOOD_TRUCK, getBusiness } from '../../config/businesses';
import { TIERS } from '../../config/difficulty';
import type { GameState, Tier, WeekDecisions } from '../types';

/**
 * The Startup Asset Decision, from spec section 5.
 *
 * Buy new and you trade on day one and own the thing. Buy used and refit and you
 * pay half, but the doors stay shut for weeks while the loan clock runs, and
 * what you actually bought is a roll of the dice. Lease and you are trading
 * tomorrow for almost nothing down, and you own nothing at all at the end.
 *
 * The last part is the whole lesson: the choice made in week 1 is still on the
 * books in week 50.
 */
function open(assetId: string, tier: Tier = 'pro', seed = 4242): GameState {
  return newGame({
    profileId: 'asset',
    businessId: 'truck',
    tier,
    financing: {
      loanIds: ['cu-12000'],
      savingsUsed: FOOD_TRUCK.savings[tier],
      locationId: 'office-park',
      assetId,
    },
    seed,
  });
}

function decide(state: GameState, over: Partial<WeekDecisions> = {}): WeekDecisions {
  return {
    price: state.price,
    qualityId: state.qualityId,
    restockUnits: 200,
    locationId: state.locationId,
    eventChoices: Object.fromEntries(state.pendingEvents.map((e) => [e.id, e.choices[0].id])),
    buyMarketing: [],
    ...over,
  };
}

describe('the startup asset decision', () => {
  it('offers three genuinely different ways in', () => {
    const ids = FOOD_TRUCK.assetOptions!.map((a) => a.id);
    expect(ids).toEqual(['new-build', 'used-refurb', 'lease']);

    const [newBuild, used, lease] = FOOD_TRUCK.assetOptions!;
    // Cheapest to dearest on day one is the reverse of what you end up owning.
    expect(lease.upfront.pro).toBeLessThan(used.upfront.pro);
    expect(used.upfront.pro).toBeLessThan(newBuild.upfront.pro);
    expect(lease.equity.pro).toBe(0);
    expect(used.equity.pro).toBeLessThan(newBuild.equity.pro);
    // Only the refit costs you weeks.
    expect(newBuild.weeksToOpen).toBe(0);
    expect(lease.weeksToOpen).toBe(0);
    expect(used.weeksToOpen).toBeGreaterThan(0);
    // Only the lease costs you every week forever.
    expect(lease.weeklyPayment.pro).toBeGreaterThan(0);
    expect(newBuild.weeklyPayment.pro).toBe(0);
  });

  it('leaves more cash in hand the less you buy', () => {
    expect(open('lease').cash).toBeGreaterThan(open('used-refurb').cash);
    expect(open('used-refurb').cash).toBeGreaterThan(open('new-build').cash);
  });

  it('sells nothing at all while the refit is running, and still charges rent', () => {
    let s = open('used-refurb');
    expect(s.weeksToOpen).toBe(4);

    for (let w = 0; w < 4; w++) {
      const before = s.cash;
      s = simulateWeek(s, decide(s));
      const r = s.lastResult!;
      expect(r.buildingOut, `week ${w + 1} should be shut`).toBe(true);
      expect(r.served).toBe(0);
      expect(r.revenue).toBe(0);
      // Nobody is recorded as turned away: they never came, because there was
      // nothing to come to.
      expect(r.lostToStockout).toBe(0);
      expect(r.lostToCapacity).toBe(0);
      // The bills arrive regardless. That is the price of the cheap way in.
      expect(r.rent + r.fixedCosts).toBeGreaterThan(0);
      expect(s.cash).toBeLessThan(before);
    }

    // Week five, the doors open.
    expect(s.weeksToOpen).toBe(0);
    s = simulateWeek(s, decide(s));
    expect(s.lastResult!.buildingOut).toBe(false);
    expect(s.lastResult!.served).toBeGreaterThan(0);
  });

  it('opens immediately when you buy new or lease', () => {
    for (const id of ['new-build', 'lease']) {
      const s = simulateWeek(open(id), decide(open(id)));
      expect(s.lastResult!.buildingOut, id).toBe(false);
      expect(s.lastResult!.served, id).toBeGreaterThan(0);
    }
  });

  it('charges the lease every single week, trading or not', () => {
    let s = open('lease');
    const weekly = FOOD_TRUCK.assetOptions!.find((a) => a.id === 'lease')!.weeklyPayment.pro;
    for (let w = 0; w < 3; w++) {
      s = simulateWeek(s, decide(s));
      expect(s.lastResult!.assetPayment).toBe(weekly);
    }
    // And a bought truck never has one.
    let owned = open('new-build');
    owned = simulateWeek(owned, decide(owned));
    expect(owned.lastResult!.assetPayment).toBe(0);
  });

  it('gives the leaseholder nothing to sell at the end', () => {
    const opts = {
      multipleLow: FOOD_TRUCK.valuationMultiple.low,
      multipleHigh: FOOD_TRUCK.valuationMultiple.high,
      inventoryUnitCost: 2.6,
    };
    const history = Array.from({ length: 20 }, () => 400);
    const shared = {
      profitHistory: history,
      revenueHistory: history.map((p) => p * 3),
      cash: 5000,
    };

    const leased = valueBusiness({ ...open('lease'), ...shared } as GameState, opts);
    const owned = valueBusiness({ ...open('new-build'), ...shared } as GameState, opts);

    expect(leased.equipmentValue).toBe(0);
    expect(owned.equipmentValue).toBeGreaterThan(0);
    // Same trading record, and the owner walks away with the truck as well.
    expect(owned.offer - leased.offer).toBeCloseTo(owned.equipmentValue, 2);
  });

  it('makes the used truck a real gamble that is settled once', () => {
    const worths = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => open('used-refurb', 'pro', seed));
    const values = worths.map((s) => s.equipmentValue);
    // Different trucks on different seeds.
    expect(new Set(values).size).toBeGreaterThan(1);

    const band = FOOD_TRUCK.assetOptions!.find((a) => a.id === 'used-refurb')!;
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(band.equity.pro * band.conditionRange!.low - 0.01);
      expect(v).toBeLessThanOrEqual(band.equity.pro * band.conditionRange!.high + 0.01);
    }

    // And it does not re-roll: play a week and the truck is the same truck.
    let s = worths[0];
    const before = s.assetCondition;
    s = simulateWeek(s, decide(s));
    expect(s.assetCondition).toBe(before);
  });

  it('leaves a business with no asset choice exactly as it was', () => {
    const lemonade = newGame({
      profileId: 'p',
      businessId: 'lemonade',
      tier: 'pro',
      financing: { loanIds: [], savingsUsed: 55, locationId: 'park' },
      seed: 7,
    });
    expect(lemonade.weeksToOpen).toBe(0);
    expect(lemonade.assetWeekly).toBe(0);
    expect(lemonade.assetId).toBeUndefined();
    expect(lemonade.equipmentValue).toBe(getBusiness('lemonade').startingEquipmentValue.pro);
  });
});

describe('the food truck plays', () => {
  it('runs fifty weeks on every acquisition route without breaking', () => {
    for (const assetId of ['new-build', 'used-refurb', 'lease']) {
      let s = open(assetId);
      for (let w = 0; w < FINAL_WEEK; w++) {
        s = simulateWeek(s, decide(s, { restockUnits: 150 }));
        expect(Number.isFinite(s.cash), `${assetId} week ${w + 1} cash`).toBe(true);
        expect(Number.isFinite(s.lastResult!.profit), `${assetId} week ${w + 1}`).toBe(true);
      }
      expect(s.week).toBe(FINAL_WEEK + 1);
    }
  });

  it('makes the menu a trade between how many come and how fast you serve', () => {
    const [oneThing, , bigMenu] = FOOD_TRUCK.qualities;
    // A wider menu pulls a bigger crowd and then serves it more slowly.
    expect(bigMenu.demandMod).toBeGreaterThan(oneThing.demandMod);
    expect(bigMenu.capacityMod!).toBeLessThan(oneThing.capacityMod!);
    expect(bigMenu.unitCost).toBeGreaterThan(oneThing.unitCost);
  });

  it('actually serves fewer people on the wide menu when the queue is long', () => {
    const base: GameState = {
      ...open('new-build'),
      cash: 40000,
      locationId: 'festival',
      inventory: 4000,
      inventoryCost: 4000 * 2.6,
      reputation: 5,
      pendingEvents: [],
    };
    const fast = simulateWeek(base, decide(base, { qualityId: 'one-thing', restockUnits: 0 }));
    const wide = simulateWeek(base, decide(base, { qualityId: 'big-menu', restockUnits: 0 }));
    expect(fast.lastResult!.served).toBeGreaterThan(wide.lastResult!.served);
    expect(wide.lastResult!.lostToCapacity).toBeGreaterThan(fast.lastResult!.lostToCapacity);
  });

  it('prices the festival pitch so it needs the crowd to justify it', () => {
    const t = TIERS.pro;
    const [office, night, festival] = FOOD_TRUCK.locations;
    const weekly = (l: (typeof FOOD_TRUCK.locations)[number]) =>
      l.weeklyRent + l.weeklyFixedCosts * t.fixedCostScale;
    expect(weekly(festival)).toBeGreaterThan(weekly(night));
    expect(weekly(night)).toBeGreaterThan(weekly(office));
    expect(festival.baseTraffic).toBeGreaterThan(night.baseTraffic);
    expect(night.baseTraffic).toBeGreaterThan(office.baseTraffic);
    // And the festival is nearly worthless in winter, so it cannot be camped.
    expect(festival.seasonMods.winter).toBeLessThan(office.seasonMods.winter);
  });
});
