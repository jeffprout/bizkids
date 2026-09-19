import type { GameEvent, GameState } from './types';
import { makeRng, weightedPick } from './rng';

const NO_REPEAT_WEEKS = 8;

function meetsRequirement(event: GameEvent, state: GameState): boolean {
  if (event.minStage && state.stage < event.minStage) return false;
  if (event.minOpenWeeks) {
    const openWeeks = state.history.filter((h) => !h.buildingOut).length;
    if (openWeeks < event.minOpenWeeks) return false;
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

export function eventBelongsInHand(event: GameEvent, state: GameState): boolean {
  return meetsRequirement(event, state);
}

export function eventFitsState(event: GameEvent, state: GameState): boolean {
  if (!meetsRequirement(event, state)) return false;
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
  return true;
}

/**
 * Weighted draw for the coming week: ~60% one event, 20% two, 20% none.
 * A card cannot come back within 8 weeks.
 *
 * `reliability` multiplies the weight of breakdown cards. A new truck at 0.45
 * almost never blows an engine in the first year; a rattly used one at 1.6
 * does, which is the whole cost of buying cheap.
 */
export function drawEvents(
  state: GameState,
  pool: GameEvent[],
  seed: number,
  reliability = 1,
): GameEvent[] {
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
      (e) => !blocked.has(e.id) && !drawn.some((d) => d.id === e.id) && eventFitsState(e, state),
    );
    if (candidates.length === 0) break;
    const picked = weightedPick(
      candidates,
      (e) => e.weight * (e.breakdown ? reliability : 1),
      rng(),
    );
    if (picked) drawn.push(picked);
  }
  return drawn;
}

export interface EventEffects {
  cash: number;
  /** Cash owed in units of what the business sells, converted by the caller at
   *  this week's price. Deliberately not scaled: the price already is. */
  cashUnits: number;
  reputation: number;
  inventory: number;
  demandMod: number;
  unitCostMod: number;
  priceMod: number;
  capacityMod: number;
  /** Permanent, unlike the Mod fields: gear kept and capacity gained. */
  equipment: number;
  capacity: number;
  /** The card that destroyed the most stock, so the recap can name it. A player
   *  who ordered for a heat wave and served twenty-five needs to be told what
   *  happened to the rest, next to the number, not left to infer it. */
  stockLostTo?: string;
  /** Some choices ground the business for the week. */
  locksLocation: boolean;
  /** One per card played, so the recap can name which card cost what. */
  lines: { emoji: string; text: string; title: string; cash: number; units: number }[];
}

/** Fold the player's answers to this week's cards into one set of modifiers. */
export function resolveEventChoices(
  events: GameEvent[],
  choices: Record<string, string>,
  /** Tier scaling for MONEY. Multipliers are never scaled. */
  scale = 1,
  /**
   * Tier scaling for PHYSICAL things — portions, covers, seats at the window.
   *
   * These used to ride the money multiplier, which is a different quantity
   * entirely. A cooler failing and losing eighty portions became a 200-portion
   * wipeout at Tycoon while the truck still only stocked 225 for the week: Jeff
   * lost 200 of 225 to one card, served 25, and turned 299 people away. Stock
   * belongs to the SIZE of the operation, so it scales with the market the tier
   * puts in front of you — a bigger truck loses a bigger cooler's worth, and it
   * stings exactly as much as it did at Pro.
   */
  unitScale = 1,
  /**
   * What one of the things costs this week, so a choice priced in units can be
   * turned into money for the recap's per-card line. The engine converts the
   * total itself; this is only so the card can name its own figure.
   */
  unitPrice = 0,
): EventEffects {
  const out: EventEffects = {
    cash: 0,
    cashUnits: 0,
    reputation: 0,
    inventory: 0,
    demandMod: 1,
    unitCostMod: 1,
    priceMod: 1,
    capacityMod: 1,
    equipment: 0,
    capacity: 0,
    locksLocation: false,
    lines: [],
  };

  let worstStockLoss = 0;

  for (const event of events) {
    const chosenId = choices[event.id];
    const choice = event.choices.find((c) => c.id === chosenId) ?? event.choices[0];
    out.cash += Math.round((choice.cash ?? 0) * scale * 100) / 100;
    out.cashUnits += choice.cashUnits ?? 0;
    out.reputation += choice.reputation ?? 0;
    const stockChange = Math.round((choice.inventory ?? 0) * unitScale);
    out.inventory += stockChange;
    if (stockChange < worstStockLoss) {
      worstStockLoss = stockChange;
      out.stockLostTo = event.title;
    }
    out.demandMod *= choice.demandMod ?? 1;
    out.unitCostMod *= choice.unitCostMod ?? 1;
    out.priceMod *= choice.priceMod ?? 1;
    out.capacityMod *= choice.capacityMod ?? 1;
    out.equipment += Math.round((choice.equipment ?? 0) * scale * 100) / 100;
    out.capacity += Math.round((choice.capacity ?? 0) * unitScale);
    out.locksLocation = out.locksLocation || Boolean(choice.locksLocation);
    out.lines.push({
      emoji: event.emoji,
      text: choice.result,
      title: event.title,
      cash:
        Math.round(((choice.cash ?? 0) * scale + (choice.cashUnits ?? 0) * unitPrice) * 100) / 100,
      units: stockChange,
    });
  }

  return out;
}
