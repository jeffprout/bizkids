import type { GameEvent, GameState } from './types';
import { makeRng, weightedPick } from './rng';

const NO_REPEAT_WEEKS = 8;

function meetsRequirement(event: GameEvent, state: GameState): boolean {
  if (event.minStage && state.stage < event.minStage) return false;
  // A cold snap in the middle of a sunny July is not a thing.
  if (event.seasons && !event.seasons.includes(state.season)) return false;
  // A weather card is dealt before the week runs, next to a forecast the player
  // is still deciding against — so it has to agree with that forecast, not just
  // with the weather that actually turns up. The forecast is wrong a third of
  // the time, which is what put a "Rain All Week" card beside a sunny forecast.
  // Requiring both keeps the card honest in both directions: it cannot
  // contradict the forecast on screen, and it cannot promise rain and deliver
  // sun. The cost is that weather cards only appear when the forecast is right,
  // which is the correct trade — a card that announces the weather is news, and
  // news that disagrees with itself teaches nothing.
  if (
    event.weathers &&
    !(event.weathers.includes(state.weather) && event.weathers.includes(state.forecast))
  ) {
    return false;
  }
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
  /** Permanent, unlike the Mod fields: gear kept and capacity gained. */
  equipment: number;
  capacity: number;
  /** One per card played, so the recap can name which card cost what. */
  lines: { emoji: string; text: string; title: string; cash: number }[];
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
    equipment: 0,
    capacity: 0,
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
    out.equipment += Math.round((choice.equipment ?? 0) * scale * 100) / 100;
    out.capacity += Math.round((choice.capacity ?? 0) * scale);
    out.lines.push({
      emoji: event.emoji,
      text: choice.result,
      title: event.title,
      cash: Math.round((choice.cash ?? 0) * scale * 100) / 100,
    });
  }

  return out;
}
