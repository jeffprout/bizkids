import type { TierConfig } from '../config/difficulty';
import type { BusinessDef, Tier } from './types';

/**
 * Steps a price control can actually use. A price of $1.53 or $0.31 reads as a
 * rounding error rather than a decision, so whatever the arithmetic suggests is
 * snapped to one of these.
 */
const NICE_STEPS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50];

/** Nobody should have to tap sixty times to cross the range. */
const MOST_STEPS_ACROSS = 80;

export interface PriceBounds {
  min: number;
  max: number;
  step: number;
}

/**
 * What the price control may offer, for this business at this level.
 *
 * The tier says how far a player may stray from the going rate and how finely.
 * The business says what the going rate is. Multiplying the two is the only way
 * a $1.50 cup and a $9 meal can share one control without either of them
 * getting a nonsense range — which is exactly what happened when these were
 * fixed dollar amounts: the truck could not be priced above $5.
 */
export function priceBoundsFor(referencePrice: number, tier: TierConfig): PriceBounds {
  const floorRaw = Math.max(0.01, referencePrice * tier.priceFloorMult);
  const ceilRaw = Math.max(floorRaw * 2, referencePrice * tier.priceCeilingMult);
  const wanted = referencePrice * tier.priceStepMult;

  // The largest nice step that is no coarser than the tier asked for. Erring
  // fine and then coarsening below beats erring coarse: rounding $1.50 up to $2
  // made one tap worth 22% of a $9 meal.
  let step = NICE_STEPS[0];
  for (const n of NICE_STEPS) if (n <= wanted + 1e-9) step = n;

  // Then coarsen until crossing the range is a reasonable number of taps.
  for (const n of NICE_STEPS) {
    if (n < step) continue;
    step = n;
    if ((ceilRaw - floorRaw) / n <= MOST_STEPS_ACROSS) break;
  }

  // Snap the ends onto the step so every reachable price is a round one.
  const min = Math.max(step, Math.round(floorRaw / step) * step);
  const max = Math.max(min + step, Math.round(ceilRaw / step) * step);
  return { min: round(min), max: round(max), step };
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The band for a business, preferring whatever it declares for itself.
 *
 * Everything that needs to agree on the price grid goes through here — the
 * control the player taps AND the rival's pricing — so the two can never drift
 * apart. They had: the rival snapped to quarters no matter what, which is the
 * lemonade stand's grid, so a truck rival sat at $9.75 while the player could
 * only reach $9 or $10.
 */
export function priceBandFor(biz: BusinessDef, tier: Tier, tierConfig: TierConfig): PriceBounds {
  return biz.priceBand?.[tier] ?? priceBoundsFor(biz.referencePrice[tier], tierConfig);
}
