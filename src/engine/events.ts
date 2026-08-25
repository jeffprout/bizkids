import type { GameEvent, GameState } from './types';
import { makeRng, weightedPick } from './rng';

const NO_REPEAT_WEEKS = 8;

function meetsRequirement(event: GameEvent, state: GameState): boolean {
  if (event.minStage && state.stage < event.minStage) return false;
  switch (event.requires) {
    case 'hasEmployee':
      return state.employees.length > 0;
    case 'hasLoan':
      return state.loans.some((l) => !l.paidOff);
    case 'hasInventory':
      return state.inventory > 0;
    case 'hasMarketing':
      return state.marketing.length > 0;
    default:
      return true;
  }
}

/**
 * Weighted draw for the coming week: ~60% one event, 20% two, 20% none.
 * A card cannot come back within 8 weeks.
 */
export function drawEvents(state: GameState, pool: GameEvent[], seed: number): GameEvent[] {
  const rng = makeRng(seed);
  const countRoll = rng();
  const count = countRoll < 0.2 ? 0 : countRoll < 0.8 ? 1 : 2;
  if (count === 0) return [];

  const blocked = new Set(
    state.recentEventIds.filter((r) => state.week - r.week < NO_REPEAT_WEEKS).map((r) => r.id),
  );

  const drawn: GameEvent[] = [];
  for (let i = 0; i < count; i++) {
    const candidates = pool.filter(
      (e) => !blocked.has(e.id) && !drawn.some((d) => d.id === e.id) && meetsRequirement(e, state),
    );
    if (candidates.length === 0) break;
    const picked = weightedPick(candidates, (e) => e.weight, rng());
    if (picked) drawn.push(picked);
  }
  return drawn;
}

export interface EventEffects {
  cash: number;
  reputation: number;
  inventory: number;
  demandMod: number;
  unitCostMod: number;
  capacityMod: number;
  lines: { emoji: string; text: string }[];
}

/** Fold the player's answers to this week's cards into one set of modifiers. */
export function resolveEventChoices(
  events: GameEvent[],
  choices: Record<string, string>,
  /** Tier scaling for cash and stock swings. Multipliers are never scaled. */
  scale = 1,
): EventEffects {
  const out: EventEffects = {
    cash: 0,
    reputation: 0,
    inventory: 0,
    demandMod: 1,
    unitCostMod: 1,
    capacityMod: 1,
    lines: [],
  };

  for (const event of events) {
    const chosenId = choices[event.id];
    const choice = event.choices.find((c) => c.id === chosenId) ?? event.choices[0];
    out.cash += Math.round((choice.cash ?? 0) * scale * 100) / 100;
    out.reputation += choice.reputation ?? 0;
    out.inventory += Math.round((choice.inventory ?? 0) * scale);
    out.demandMod *= choice.demandMod ?? 1;
    out.unitCostMod *= choice.unitCostMod ?? 1;
    out.capacityMod *= choice.capacityMod ?? 1;
    out.lines.push({ emoji: event.emoji, text: choice.result });
  }

  return out;
}
