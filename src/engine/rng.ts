/** Deterministic RNG (mulberry32). Seeded from the save so a week replays identically
 *  and so the sim tests are repeatable. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextSeed(seed: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0) || 1;
}

/** Pick one item using per-item weights. */
export function weightedPick<T>(items: T[], weightOf: (t: T) => number, roll: number): T | null {
  const total = items.reduce((s, i) => s + weightOf(i), 0);
  if (total <= 0) return null;
  let x = roll * total;
  for (const item of items) {
    x -= weightOf(item);
    if (x <= 0) return item;
  }
  return items[items.length - 1];
}
