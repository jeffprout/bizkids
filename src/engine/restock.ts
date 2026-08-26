/**
 * How many the supplies stepper may offer.
 *
 * This lived inline in the week screen with a hard-coded ceiling of 600, written
 * when 600 was more than any business could serve. A Tycoon truck serves over a
 * thousand, so the ceiling sat BELOW capacity: the card said "can serve 1,144"
 * directly above a stepper that stopped at 600 — the game refusing to sell you
 * what it had just told you you could sell.
 *
 * It is arithmetic with three real constraints in it, so it belongs here where
 * it can be tested rather than in a component where it cannot.
 */
export interface RestockBounds {
  /** Most the stepper may reach. */
  max: number;
  /** What the money alone would allow, before the serving ceiling. */
  affordable: number;
  /** Total stock the week is allowed to end up holding. */
  ceiling: number;
}

export function restockBounds(inp: {
  cash: number;
  /** Rent, wages, advertising and debt already committed this week. */
  committed: number;
  unitCost: number;
  /** Stock is bought in packs of this size. */
  step: number;
  /** What the business can physically hand over this week. */
  capacity: number;
  /** What is already in the cooler. */
  inventory: number;
}): RestockBounds {
  const { cash, committed, unitCost, step, capacity, inventory } = inp;
  const packs = (budget: number) =>
    unitCost > 0 ? Math.floor(Math.floor(Math.max(0, budget) / unitCost) / step) * step : Infinity;

  // The stepper never goes past what the player can pay for, so there is no way
  // to land on a disabled button with no obvious way out. What is left after the
  // week's committed bill is the real budget, not the whole bank balance.
  const affordable = packs(cash - committed);

  // Reserving the bill must never leave a player with stock they cannot buy and
  // nothing to sell. If the bank covers one pack at all, one pack stays on the
  // table — going short into a week you can sell your way out of beats a dead
  // end with no way to earn.
  const floor = inventory === 0 && packs(cash) >= step ? step : 0;

  // Twice what you can serve. Over-ordering has to stay possible — throwing
  // stock away is half of what the week teaches, and a stepper that stopped at
  // capacity would quietly take that lesson off the table. This only stops the
  // number running away somewhere nobody could ever sell from.
  const ceiling = Math.ceil((capacity * 2) / step) * step;
  const room = Math.max(0, ceiling - inventory);

  return { max: Math.max(0, Math.min(room, Math.max(affordable, floor))), affordable, ceiling };
}
