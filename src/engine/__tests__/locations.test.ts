import { describe, expect, it } from 'vitest';
import { LEMONADE, FOOD_TRUCK } from '../../config/businesses';
import { newGame } from '../newGame';
import { simulateWeek } from '../simulateWeek';
import { locationsOpen } from '../locations';
import type { GameState, Season, WeekDecisions } from '../types';

/**
 * Jeff: more than three options, and if the lake produces significantly more
 * revenue it should cost significantly more. Three spots was a compression.
 * Four is a market. The packed ones now cost like packed ones.
 */
const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];

const DESTINATIONS: Record<Season, string[]> = {
  spring: ['Ballpark Lot', 'Farmers Market'],
  summer: ['Lake Resort', 'County Fair'],
  fall: ['Pumpkin Patch', 'Haunted House'],
  winter: ['Ice Rink', 'Winter Market'],
};

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
  it('puts four spots on the card, two of them in season', () => {
    for (const season of SEASONS) {
      const truck = locationsOpen(FOOD_TRUCK.locations, season);
      const stand = locationsOpen(LEMONADE.locations, season);
      expect(truck, season).toHaveLength(4);
      expect(stand, season).toHaveLength(4);
      expect(truck.some((l) => l.id === 'office-park')).toBe(true);
      expect(truck.some((l) => l.id === 'night-district')).toBe(true);
      const seasonal = truck.filter((l) => l.seasons).map((l) => l.name).sort();
      expect(seasonal).toEqual([...DESTINATIONS[season]].sort());
    }
  });

  it('does not put a dead soccer field on the summer card', () => {
    const summer = locationsOpen(LEMONADE.locations, 'summer').map((l) => l.id);
    expect(summer).toContain('pool');
    expect(summer).toContain('boardwalk');
    expect(summer).not.toContain('soccer');
    expect(summer).not.toContain('pumpkin-patch');
  });

  it('charges the lake like a lake, not like Friday night', () => {
    const weekly = (l: (typeof FOOD_TRUCK.locations)[number]) => l.weeklyRent + l.weeklyFixedCosts;
    const night = FOOD_TRUCK.locations.find((l) => l.id === 'night-district')!;
    const lake = FOOD_TRUCK.locations.find((l) => l.id === 'lake-resort')!;
    expect(weekly(lake)).toBeGreaterThan(weekly(night) * 2.5);
    expect(weekly(lake) / weekly(night)).toBeGreaterThan(lake.baseTraffic / night.baseTraffic);
  });

  it('a solo truck makes more on Friday night than at the lake in summer', () => {
    const at = (id: string, weather: GameState['weather'] = 'sunny') =>
      simulateWeek(
        truckAt(id, 'summer', weather),
        decide(truckAt(id, 'summer', weather), { locationId: id }),
      ).lastResult!.profit;
    expect(at('night-district')).toBeGreaterThan(at('lake-resort'));
    expect(at('night-district', 'rain')).toBeGreaterThan(at('lake-resort', 'rain'));
  });

  it('the ice rink is where winter actually is', () => {
    const night = FOOD_TRUCK.locations.find((l) => l.id === 'night-district')!;
    const rink = FOOD_TRUCK.locations.find((l) => l.id === 'ice-rink')!;
    expect(rink.baseTraffic * rink.seasonMods.winter).toBeGreaterThan(
      night.baseTraffic * night.seasonMods.winter,
    );
  });
});
