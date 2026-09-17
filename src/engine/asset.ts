import type { AssetOption, GameState } from './types';
import { businessFor } from '../config/businesses';

/** The acquisition route this run actually took, if the business offered one. */
export function assetOf(state: GameState): AssetOption | undefined {
  const biz = businessFor(state.businessId, state.tier);
  return biz.assetOptions?.find((a) => a.id === state.assetId);
}

/**
 * Multiplies the chance of a breakdown card. Below 1 is more reliable.
 *
 * Used gear rolls once at purchase: a poor truck is worth less AND breaks more.
 * The same scale that cuts the equity raises the breakdown weight, so the roll
 * is one fact with two consequences rather than a sticker price that then
 * forgets itself.
 */
export function reliabilityOf(state: GameState): number {
  const asset = assetOf(state);
  if (!asset) return 1;
  if (asset.conditionRange && state.assetCondition != null) {
    const { low, high } = asset.conditionRange;
    const scale = low + (high - low) * state.assetCondition;
    return asset.reliability / Math.max(0.01, scale);
  }
  return asset.reliability;
}

/** What the used-gear roll actually bought. Undefined when nothing was rolled. */
export function conditionNoteOf(state: GameState): string | undefined {
  const notes = assetOf(state)?.conditionNotes;
  const roll = state.assetCondition;
  if (!notes || roll == null) return undefined;
  if (roll >= 2 / 3) return notes.good;
  if (roll >= 1 / 3) return notes.fair;
  return notes.poor;
}
