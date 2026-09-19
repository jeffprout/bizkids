import { describe, expect, it } from 'vitest';
import { LEMONADE, FOOD_TRUCK } from '../../config/businesses';
import { newGame } from '../newGame';
import { simulateWeek } from '../simulateWeek';
import { locationsOpen } from '../locations';
import type { GameState, Season, WeekDecisions } from '../types';

/**
 * Jeff: the locations are all static and they don't change with the season.
 * Friday night is the same rush as the festival, so the festival is a
 * no-brainer. Fall should be a pumpkin patch, winter an ice rink, summer a
 * lake resort.
 *
 * The third slot is now a destination that packs up when the season turns.
 * Friday night stays. It is cheaper. A truck that cannot serve the resort
 * line should park there instead.
 */
const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];

function truckAt(locationId: string, season: Season, weather: GameState['weather']): GameState {
  return {
    ...newGame({
      profileId: 'spots',
      businessId: 'truck',
      tier: 'pro',
      financing: {
        loanIds: [],
        savingsUsed: 15000,
        locationId: 'office-park',
        assetId: 'new-build',
      },
      seed: 4,
    }),
    season,
    weather,
    forecast: weather,
    locationId,
    cash: 20000,
    inventory: 500,
    inventoryCost: 500 * 2.6,
    pendingEvents: [],
    employees: [],
  };
}

const decide = (s: GameState, over: Partial<WeekDecisions> = {}): WeekDecisions => ({
  price: 9,
  qualityId: 'short-menu',
  restockUnits: 0,
  locationId: s.locationId,
  eventChoices: {},
  buyMarketing: [],
  ...over,
});

describe('the map changes with the season', () => {
  it('puts three spots on the card, and a different destination each season', () => {
    const names: Record<string, string> = {};
    for (const season of SEASONS) {
      const truck = locationsOpen(FOOD_TRUCK.locations, season);
      const stand = locationsOpen(LEMONADE.locations, season);
      expect(truck, season).toHaveLength(3);
      expect(stand, season).toHaveLength(3);
      expect(truck.some((l) => l.id === 'office-park')).toBe(true);
      expect(truck.some((l) => l.id === 'night-district')).toBe(true);
      names[season] = truck.find((l) => l.seasons)?.name ?? '';
    }
    expect(names.spring).toBe('Ballpark Lot');
    expect(names.summer).toBe('Lake Resort');
    expect(names.fall).toBe('Pumpkin Patch');
    expect(names.winter).toBe('Ice Rink');
    expect(new Set(Object.values(names)).size).toBe(4);
  });

  it('does not put a dead soccer field on the summer card', () => {
    const summer = locationsOpen(LEMONADE.locations, 'summer').map((l) => l.id);
    expect(summer).toContain('pool');
    expect(summer).not.toContain('soccer');
    expect(summer).not.toContain('pumpkin-patch');
  });

  it('a solo truck makes more on Friday night than at the lake in summer', () => {
    // Same hands, same stock. The lake has more people than you can serve and
    // a bill you still pay. Friday night fills the window for less rent.
    const at = (id: string) =>
      simulateWeek(truckAt(id, 'summer', 'sunny'), decide(truckAt(id, 'summer', 'sunny'), { locationId: id }))
        .lastResult!.profit;
    expect(at('night-district')).toBeGreaterThan(at('lake-resort'));
  });

  it('the ice rink is where winter actually is', () => {
    const night = FOOD_TRUCK.locations.find((l) => l.id === 'night-district')!;
    const rink = FOOD_TRUCK.locations.find((l) => l.id === 'ice-rink')!;
    expect(rink.baseTraffic * rink.seasonMods.winter).toBeGreaterThan(
      night.baseTraffic * night.seasonMods.winter,
    );
  });
});
