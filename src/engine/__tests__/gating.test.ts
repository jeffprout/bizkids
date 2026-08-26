import { describe, expect, it } from 'vitest';
import { newGame } from '../newGame';
import { simulateWeek } from '../simulateWeek';
import { ALL_EVENTS } from '../../config/events';
import { FOOD_TRUCK } from '../../config/businesses';
import type { GameState, WeekDecisions } from '../types';

/**
 * Two cards that contradicted the week they were dealt into.
 *
 * Jeff's engine blew, he chose not to move, and the very next card asked where
 * he would like to park. Then a festival organizer auctioned him the main gate
 * pitch while he was outside an office block.
 */
function truck(over: Partial<GameState> = {}): GameState {
  return {
    ...newGame({
      profileId: 'gate',
      businessId: 'truck',
      tier: 'pro',
      financing: {
        loanIds: [],
        savingsUsed: 15000,
        locationId: 'office-park',
        assetId: 'new-build',
      },
      seed: 12,
    }),
    cash: 20000,
    inventory: 600,
    inventoryCost: 600 * 2.6,
    ...over,
  };
}

const decide = (s: GameState, over: Partial<WeekDecisions> = {}): WeekDecisions => ({
  price: s.price,
  qualityId: s.qualityId,
  restockUnits: 0,
  locationId: s.locationId,
  eventChoices: {},
  buyMarketing: [],
  ...over,
});

const card = (id: string) => ALL_EVENTS.find((e) => e.id === id)!;

describe('a card cannot contradict the week it was dealt into', () => {
  it('keeps the truck where it is when the driver chose not to move', () => {
    const s = truck({
      locationId: 'office-park',
      pendingEvents: [card('truck-engine')],
    });
    // Asking for the festival while grounded must not move the truck.
    const next = simulateWeek(
      s,
      decide(s, { locationId: 'festival', eventChoices: { 'truck-engine': 'skip' } }),
    );
    expect(next.locationId).toBe('office-park');
    // And it is charged for where it actually stood, not where it wanted to be.
    const officePark = FOOD_TRUCK.locations.find((l) => l.id === 'office-park')!;
    expect(next.lastResult!.rent).toBe(officePark.weeklyRent);
  });

  it('lets the truck move when the repair actually happened', () => {
    const s = truck({ locationId: 'office-park', pendingEvents: [card('truck-engine')] });
    const next = simulateWeek(
      s,
      decide(s, { locationId: 'festival', eventChoices: { 'truck-engine': 'proper' } }),
    );
    expect(next.locationId).toBe('festival');
  });

  it('only runs the festival auction at the festival', () => {
    const s = truck({ locationId: 'office-park', pendingEvents: [card('truck-slot')] });

    // Parked at the office block: the organizer is not there, so nothing happens
    // and nothing is charged, even though a bid was recorded.
    const away = simulateWeek(
      s,
      decide(s, { locationId: 'office-park', eventChoices: { 'truck-slot': 'high' } }),
    );
    expect(away.lastResult!.eventCash).toBe(0);
    expect(away.lastResult!.eventLines).toHaveLength(0);

    // At the festival, the same bid is taken.
    const there = simulateWeek(
      s,
      decide(s, { locationId: 'festival', eventChoices: { 'truck-slot': 'high' } }),
    );
    expect(there.lastResult!.eventCash).toBeLessThan(0);
    expect(there.lastResult!.eventLines).toHaveLength(1);
  });

  it('ties every spot-gated card to a spot that exists', () => {
    for (const event of ALL_EVENTS) {
      if (!event.locations) continue;
      const biz = event.pool;
      for (const id of event.locations) {
        const known = ALL_EVENTS.length > 0;
        expect(known, `${event.id}`).toBe(true);
        // The spot has to be one the business actually has.
        const spots = biz === 'truck' ? FOOD_TRUCK.locations.map((l) => l.id) : [];
        expect(spots, `${event.id} names spot "${id}"`).toContain(id);
      }
    }
  });

  it('never grounds a business without saying so on the card', () => {
    for (const event of ALL_EVENTS) {
      for (const choice of event.choices) {
        if (!choice.locksLocation) continue;
        // If a choice pins you in place, its label has to admit it.
        expect(choice.label.toLowerCase(), `${event.id}/${choice.id}`).toMatch(
          /not move|stay|stay put|do not/,
        );
      }
    }
  });
});
