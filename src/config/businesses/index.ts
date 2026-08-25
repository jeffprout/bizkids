import type { BusinessDef } from '../../engine/types';
import { LEMONADE } from './lemonade';

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
};

export function getBusiness(id: string): BusinessDef {
  const b = BUSINESSES[id];
  if (!b) throw new Error(`Unknown business: ${id}`);
  return b;
}

export { LEMONADE };
