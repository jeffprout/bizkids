import { describe, expect, it } from 'vitest';
import { newGame } from '../newGame';
import { simulateWeek } from '../simulateWeek';
import { drawEvents } from '../events';
import { sanitizeRun } from '../sanitize';
import { ALL_EVENTS } from '../../config/events';
import { FOOD_TRUCK } from '../../config/businesses';
import type { GameState, WeekDecisions } from '../types';

/**
 * Two cards that contradicted the week they were dealt into.
 *
 * Jeff's engine blew, he chose not to move, and the very next card asked where
 * he would like to park. Then an organizer auctioned him the main gate
 * while he was outside an office block.
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
    // Asking for the lake while grounded must not move the truck.
    const next = simulateWeek(
      s,
      decide(s, { locationId: 'lake-resort', eventChoices: { 'truck-engine': 'skip' } }),
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
      decide(s, { locationId: 'night-district', eventChoices: { 'truck-engine': 'proper' } }),
    );
    expect(next.locationId).toBe('night-district');
  });

  it('only runs the slot auction at the destination', () => {
    const s = truck({ locationId: 'office-park', pendingEvents: [card('truck-slot')] });

    // Parked at the office block: the organizer is not there, so nothing happens
    // and nothing is charged, even though a bid was recorded.
    const away = simulateWeek(
      s,
      decide(s, { locationId: 'office-park', eventChoices: { 'truck-slot': 'high' } }),
    );
    expect(away.lastResult!.eventCash).toBe(0);
    expect(away.lastResult!.eventLines).toHaveLength(0);

    // At the lake, in summer, the same bid is taken.
    const there = simulateWeek(
      { ...s, season: 'summer' },
      decide(s, { locationId: 'lake-resort', eventChoices: { 'truck-slot': 'high' } }),
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

describe('fame does not land on a truck nobody has seen', () => {
  const viral = card('truck-viral');
  const blogger = card('truck-blogger');

  function usedTycoon(): GameState {
    return newGame({
      profileId: 'viral',
      businessId: 'truck',
      tier: 'tycoon',
      financing: {
        loanIds: ['cu-60000'],
        savingsUsed: FOOD_TRUCK.savings.tycoon,
        locationId: 'office-park',
        assetId: 'used-refurb',
      },
      seed: 7,
    });
  }

  function play(s: GameState, weeks: number): GameState {
    let cur = s;
    for (let w = 0; w < weeks; w++) {
      cur = simulateWeek(cur, decide(cur, { restockUnits: cur.weeksToOpen ? 0 : 200 }));
    }
    return cur;
  }

  it('does not go viral the morning a used truck first opens', () => {
    // Four closed weeks, then the first open week is week 5 — Jeff's report.
    const s = play(usedTycoon(), 4);
    expect(s.week).toBe(5);
    expect(s.weeksToOpen).toBe(0);
    expect(s.history.every((h) => h.buildingOut)).toBe(true);
    expect(s.pendingEvents.map((e) => e.id)).not.toContain('truck-viral');
    expect(s.pendingEvents.map((e) => e.id)).not.toContain('truck-blogger');
    for (let seed = 1; seed <= 40; seed++) {
      const drawn = drawEvents(s, [viral, blogger], seed);
      expect(drawn.map((e) => e.id), `seed ${seed}`).toEqual([]);
    }
  });

  it('can go viral after a month of actually serving', () => {
    const s = play(usedTycoon(), 8);
    const openWeeks = s.history.filter((h) => !h.buildingOut).length;
    expect(openWeeks).toBeGreaterThanOrEqual(4);
    const hits = Array.from({ length: 40 }, (_, i) => drawEvents(s, [viral], i + 1)).filter((d) =>
      d.some((e) => e.id === 'truck-viral'),
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('drops a fame card already in the hand if the doors just opened', () => {
    const s = play(usedTycoon(), 4);
    const loaded = sanitizeRun({ ...s, pendingEvents: [viral, blogger] });
    expect(loaded.pendingEvents.map((e) => e.id)).toEqual([]);
  });
});

describe('a skipped policy has to be able to come due', () => {
  const claim = card('slip-claim');
  const covered = card('slip-covered');
  const pitch = card('insurance');
  const open = { buildingOut: false } as GameState['history'][number];

  it('does not sue a player who was never offered coverage', () => {
    const s = { ...truck(), businessId: 'lemonade', week: 12, history: Array(10).fill(open) };
    const hits = Array.from({ length: 40 }, (_, i) => drawEvents(s, [claim], i + 1)).filter((d) =>
      d.some((e) => e.id === 'slip-claim'),
    );
    expect(hits).toHaveLength(0);
  });

  it('can sue a player who skipped the policy', () => {
    const s = {
      ...truck(),
      businessId: 'lemonade',
      week: 12,
      insured: false,
      history: Array(10).fill(open),
    };
    const hits = Array.from({ length: 40 }, (_, i) => drawEvents(s, [claim], i + 1)).filter((d) =>
      d.some((e) => e.id === 'slip-claim'),
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('covers a player who bought it, instead of charging them the whole bill', () => {
    const s = {
      ...truck(),
      businessId: 'lemonade',
      week: 12,
      insured: true,
      history: Array(10).fill(open),
    };
    expect(drawEvents(s, [claim], 7).some((e) => e.id === 'slip-claim')).toBe(false);
    const hits = Array.from({ length: 40 }, (_, i) => drawEvents(s, [covered], i + 1)).filter((d) =>
      d.some((e) => e.id === 'slip-covered'),
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('does not sell a second policy to someone who already has one', () => {
    const s = { ...truck(), insured: true, history: Array(10).fill(open), week: 12 };
    const hits = Array.from({ length: 20 }, (_, i) => drawEvents(s, [pitch], i + 1)).filter((d) =>
      d.some((e) => e.id === 'insurance'),
    );
    expect(hits).toHaveLength(0);
  });
});
