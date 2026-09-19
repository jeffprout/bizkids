import { describe, expect, it } from 'vitest';
import { businessFor, getBusiness } from '../../config/businesses';
import { TIERS } from '../../config/difficulty';
import { computeDemand } from '../demand';
import { resolveLocation } from '../locations';
import { resolveEventChoices } from '../events';
import { newGame } from '../newGame';
import { simulateWeek } from '../simulateWeek';
import { ALL_EVENTS } from '../../config/events';
import type { GameState, Tier, WeekDecisions } from '../types';

/**
 * Jeff, on Tycoon: "I can't make a dollar in the food truck." He was right, and
 * it was not a matter of playing better.
 *
 * Every tier ran the SAME footfall and then piled bigger bills on top. Tycoon
 * tripled overhead, multiplied unit costs by 1.6, and put a $120,000 build and a
 * $910-a-week loan in front of a truck that still only sold a hundred-odd meals
 * a week. Played identically on an identical seed, the Pro truck made $11,984
 * over twenty weeks and the Tycoon truck made $2,121 — and every leased Tycoon
 * truck, in every spot, lost money. No sequence of good decisions could win,
 * which is the one thing a game about running a business must never be.
 *
 * A $120,000 truck is not a $24,000 trailer with worse luck. It is a bigger
 * operation in a bigger city, so the tier now scales the MARKET as well as the
 * bills.
 */
describe('a tier scales the business, not just its bills', () => {
  it('leaves Pro exactly as it was written', () => {
    // Pro is the scale every business is authored at, so it must come back
    // untouched — same object, not a copy that happens to match.
    for (const id of ['lemonade', 'truck']) {
      expect(businessFor(id, 'pro')).toBe(getBusiness(id));
    }
  });

  it('gives Tycoon a bigger market, and the hands to serve it', () => {
    const pro = businessFor('truck', 'pro');
    const tycoon = businessFor('truck', 'tycoon');
    const t = TIERS.tycoon;

    for (let i = 0; i < pro.locations.length; i++) {
      expect(tycoon.locations[i].baseTraffic).toBe(
        Math.round(pro.locations[i].baseTraffic * t.trafficScale),
      );
    }
    expect(tycoon.soloCapacity).toBe(Math.round(pro.soloCapacity * t.capacityScale));

    // Capacity has to move with traffic, or the extra customers are only a
    // longer line and the tier is still just a tax.
    expect(t.capacityScale).toBe(t.trafficScale);
  });

  it('charges more for the labour and the pitch', () => {
    const pro = businessFor('truck', 'pro');
    const tycoon = businessFor('truck', 'tycoon');
    expect(tycoon.employees[0].weeklyWage).toBeGreaterThan(pro.employees[0].weeklyWage);
    expect(tycoon.employees[0].capacityBonus).toBeGreaterThan(pro.employees[0].capacityBonus);
    // The destination's whole lesson is that you pay for footfall before you know
    // it turns up. A flat pitch fee against triple the footfall erased it.
    const fee = (b: typeof pro) => b.locations.find((l) => l.id === 'lake-resort')!.weeklyRent;
    expect(fee(tycoon)).toBeGreaterThan(fee(pro));
  });

  it('preps a batch for the crowd that is actually coming', () => {
    const pro = businessFor('truck', 'pro');
    const tycoon = businessFor('truck', 'tycoon');
    const perTreat = (b: typeof pro) => b.sideProducts[0].batchCost / b.sideProducts[0].batchSize;
    expect(tycoon.sideProducts[0].batchSize).toBeGreaterThan(pro.sideProducts[0].batchSize);
    // A bigger batch, not a worse deal — cost per treat is the tier's business,
    // and unitCostScale already handles that in the engine.
    expect(perTreat(tycoon)).toBeCloseTo(perTreat(pro), 2);
  });
});

describe('a card destroys stock, not money-shaped stock', () => {
  const cooler = ALL_EVENTS.find((e) => e.id === 'truck-spoiled')!;

  it('scales what a cooler holds by the size of the truck, not the price of things', () => {
    const t = TIERS.tycoon;
    const lost = (scale: number, unitScale: number) =>
      -resolveEventChoices([cooler], { [cooler.id]: 'dump' }, scale, unitScale).inventory;

    const written = lost(1, 1);
    // What it used to do: run a portion count through the MONEY multiplier.
    expect(Math.round(written * t.eventScale)).toBeGreaterThan(written);
    // What it does now: scale with the market, so the bite stays the same share
    // of a truck that stocks 2.6x as much.
    expect(lost(t.eventScale, t.trafficScale)).toBe(Math.round(written * t.trafficScale));
  });

  it('takes the same share of a well-stocked week at Pro and at Tycoon', () => {
    const share = (tier: Tier) => {
      const biz = businessFor('truck', tier);
      const t = TIERS[tier];
      // A week's stock for the busiest spot, ordered by someone paying attention.
      const stock = computeDemand({
        state: {
          season: 'summer',
          weather: 'sunny',
          reputation: 3.5,
          marketing: [],
        } as unknown as GameState,
        location: biz.locations.find((l) => l.id === 'night-district')!,
        quality: biz.qualities[1],
        price: biz.referencePrice[tier],
        referencePrice: biz.referencePrice[tier],
        elasticity: t.elasticity,
        conversionRate: biz.conversionRate,
        eventDemandMod: 1,
        noiseRoll: 0.5,
      }).demand;
      const lost = -resolveEventChoices(
        [cooler],
        { [cooler.id]: 'dump' },
        t.eventScale,
        t.trafficScale,
      ).inventory;
      return lost / stock;
    };
    // Within a couple of points of each other. It used to be 35% at Pro and 87%
    // at Tycoon, which is not a harder lesson — it is a different card.
    expect(share('tycoon')).toBeCloseTo(share('pro'), 2);
  });

  it('names the card that took the stock, next to the number', () => {
    const s: GameState = {
      ...newGame({
        profileId: 'p',
        businessId: 'truck',
        tier: 'pro',
        financing: { loanIds: [], savingsUsed: 15000, locationId: 'night-district', assetId: 'lease' },
        seed: 3,
      }),
      cash: 8000,
      inventory: 300,
      inventoryCost: 300 * 2.6,
      pendingEvents: [cooler],
    };
    const next = simulateWeek(s, {
      price: s.price,
      qualityId: s.qualityId,
      restockUnits: 0,
      locationId: s.locationId,
      eventChoices: { [cooler.id]: 'dump' },
      buyMarketing: [],
    });
    expect(next.lastResult!.stockLost).toBeGreaterThan(0);
    expect(next.lastResult!.stockLostTo).toBe(cooler.title);
  });
});

/**
 * The guard that would have caught this before Jeff did. Playing competently —
 * price at the going rate, order to expected demand, take on help when the line
 * outgrows you — has to end a run in the black at every tier and every spot.
 */
describe('a well-played truck makes money at every tier', () => {
  function playWell(tier: Tier, locationId: string, assetId: string, loanIds: string[], seed: number) {
    const biz = businessFor('truck', tier);
    const t = TIERS[tier];
    let s = newGame({
      profileId: 'guard',
      businessId: 'truck',
      tier,
      financing: { loanIds, savingsUsed: biz.savings[tier], locationId, assetId },
      seed,
    });
    for (let w = 0; w < 30 && !s.gameOver; w++) {
      const quality = biz.qualities.find((q) => q.id === s.qualityId)!;
      const location = resolveLocation(biz.locations, s.locationId, s.season);
      const price = biz.referencePrice[tier];
      const expected = computeDemand({
        state: s,
        location,
        quality,
        price,
        referencePrice: biz.referencePrice[tier],
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
      const hire =
        expected > capacity * 1.25 && s.cash > biz.employees[0].weeklyWage * 6
          ? biz.employees.filter((e) => !s.employees.some((x) => x.id === e.id)).slice(0, 1)
          : [];
      const decisions: WeekDecisions = {
        price,
        qualityId: s.qualityId,
        restockUnits: Math.max(0, Math.min(expected, capacity) - s.inventory),
        locationId: location.id,
        eventChoices: Object.fromEntries(
          s.pendingEvents.map((e) => [
            e.id,
            [...e.choices].sort((a, b) => (b.cash ?? 0) - (a.cash ?? 0))[0].id,
          ]),
        ),
        buyMarketing: [],
        hireEmployeeIds: hire.map((e) => e.id),
        sideProductId: null,
      };
      s = simulateWeek(s, decisions);
    }
    return s;
  }

  const routes: [Tier, string, string][] = [
    ['pro', 'new-build', 'sba-25000'],
    ['pro', 'lease', ''],
    ['tycoon', 'new-build', 'sba-120000'],
    ['tycoon', 'used-refurb', 'cu-60000'],
    ['tycoon', 'lease', ''],
  ];

  for (const [tier, assetId, loan] of routes) {
    for (const spot of ['office-park', 'night-district', 'lake-resort']) {
      it(`${tier} · ${assetId} · ${spot}`, () => {
        for (const seed of [7, 21, 44, 99]) {
          const end = playWell(tier, spot, assetId, loan ? [loan] : [], seed);
          expect(end.totals.profit, `seed ${seed}`).toBeGreaterThan(0);
          expect(end.gameOver, `seed ${seed} went bust`).toBe(false);
        }
      });
    }
  }
});
