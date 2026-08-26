import type { BusinessDef, Tier } from '../../engine/types';
import { TIERS } from '../difficulty';
import { LEMONADE } from './lemonade';
import { FOOD_TRUCK } from './truck';

/**
 * The register of every business in the game.
 *
 * This is the ONE place a new business is wired in. Adding the food truck means
 * writing `truck.ts` and adding a line here — nothing in `/src/engine` and
 * nothing in `/src/ui` should need to know it exists.
 *
 * The register used to live inside `lemonade.ts`, which meant adding a second
 * business required editing the first, and every screen in the game imported
 * the lemonade stand by name just to look up whichever business was actually
 * being played.
 */
export const BUSINESSES: Record<string, BusinessDef> = {
  lemonade: LEMONADE,
  truck: FOOD_TRUCK,
};

export function getBusiness(id: string): BusinessDef {
  const b = BUSINESSES[id];
  if (!b) throw new Error(`Unknown business: ${id}`);
  return b;
}

/**
 * The same business, sized for the tier being played.
 *
 * Every business is written once at Pro scale. Rookie and Tycoon are not
 * different businesses — they are the same one in a smaller or a bigger market,
 * and everything that follows from market size is derived here rather than
 * written out three times in every config file.
 *
 * This exists because the tiers used to scale only the BILLS. Tycoon tripled
 * overhead, multiplied unit costs by 1.6 and put a $120,000 truck and a
 * $910-a-week loan in front of a player — while leaving the footfall, the
 * serving capacity and the wages exactly where Pro had them. The result was a
 * business that could not be made profitable by any sequence of good decisions,
 * which is the one thing a game about running a business must never be.
 *
 * Scaling here rather than inside `simulateWeek` matters: the week screen reads
 * capacity, wages and batch sizes straight off the business to tell the player
 * what a decision will do. If the engine scaled privately, every one of those
 * numbers would be a lie by the time the week actually ran.
 */
const scaled = new Map<string, BusinessDef>();

export function businessFor(id: string, tier: Tier): BusinessDef {
  const key = `${id}:${tier}`;
  const cached = scaled.get(key);
  if (cached) return cached;

  const base = getBusiness(id);
  const t = TIERS[tier];
  const round = (n: number) => Math.round(n);

  const out: BusinessDef =
    t.trafficScale === 1 && t.capacityScale === 1 && t.wageScale === 1 && t.fixedCostScale === 1
      ? base
      : {
          ...base,
          soloCapacity: round(base.soloCapacity * t.capacityScale),
          locations: base.locations.map((l) => ({
            ...l,
            baseTraffic: round(l.baseTraffic * t.trafficScale),
            // Rent is overhead like any other, and a busier pitch costs more to
            // stand on. Leaving it flat made the festival's whole lesson — you
            // pay for footfall before you know if it turns up — evaporate at the
            // tier where the footfall was largest.
            weeklyRent: round(l.weeklyRent * t.fixedCostScale),
          })),
          employees: base.employees.map((e) => ({
            ...e,
            weeklyWage: round(e.weeklyWage * t.wageScale),
            capacityBonus: round(e.capacityBonus * t.capacityScale),
          })),
          // A batch is prepped for the crowd you expect. Left flat, the treat
          // decision at Tycoon was a rounding error against a queue ten times
          // its size. Cost per treat is unchanged — only the batch gets bigger.
          sideProducts: base.sideProducts.map((sp) => ({
            ...sp,
            batchSize: round(sp.batchSize * t.trafficScale),
            batchCost: Math.round(sp.batchCost * t.trafficScale * 100) / 100,
          })),
        };

  scaled.set(key, out);
  return out;
}

export { LEMONADE, FOOD_TRUCK };
