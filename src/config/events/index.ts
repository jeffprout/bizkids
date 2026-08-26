import type { GameEvent } from '../../engine/types';
import { LEMONADE_EVENTS } from './lemonade';
import { TRUCK_EVENTS } from './truck';

/**
 * Every card in the game, and which business may be dealt it.
 *
 * There is no shared pool any more. There used to be, written while there was
 * only a lemonade stand, and dealt to a food truck it thanked the owner for the
 * lemonade and offered to hand out a free cup. Placeholders were tried and read
 * worse — a card that fits every business belongs to none of them.
 *
 * What IS shared is the curriculum. Both pools cover competition, word of mouth,
 * service recovery, fixed costs, shrinkage, insurance and the rest. Only the
 * telling differs, and it should: a truck owner is not a kid with a card table.
 */
export const ALL_EVENTS: GameEvent[] = [...LEMONADE_EVENTS, ...TRUCK_EVENTS];

export { LEMONADE_EVENTS, TRUCK_EVENTS };

export function eventsForBusiness(businessId: string): GameEvent[] {
  return ALL_EVENTS.filter((e) => e.pool === businessId);
}
