import type { LocationDef, Season } from './types';

/**
 * A spot that only exists in its season is not on the card the rest of the
 * year. Showing a dead soccer field in July and asking the player to notice
 * the quiet-this-time-of-year chip is how the locations stayed static.
 */
export function locationOpenIn(loc: LocationDef, season: Season): boolean {
  return !loc.seasons || loc.seasons.includes(season);
}

export function locationsOpen(locations: LocationDef[], season: Season): LocationDef[] {
  return locations.filter((l) => locationOpenIn(l, season));
}

/**
 * If last week's destination packed up, land on a spot that is actually open.
 * A locked card (do not move this week) looks the location up itself.
 */
export function resolveLocation(
  locations: LocationDef[],
  id: string,
  season: Season,
): LocationDef {
  const open = locationsOpen(locations, season);
  return open.find((l) => l.id === id) ?? open[0] ?? locations[0];
}
