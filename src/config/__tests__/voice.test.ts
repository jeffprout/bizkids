import { describe, expect, it } from 'vitest';
import { ALL_EVENTS, LEMONADE_EVENTS, TRUCK_EVENTS, eventsForBusiness } from '../events';
import { BUSINESSES } from '../businesses';
import type { EventChoice } from '../../engine/types';

/**
 * Jeff got a glowing review for his food truck that thanked him for the
 * lemonade and offered to hand out a free cup. Then a rival "Kid" turned up
 * outside it offering free cookies.
 *
 * There used to be one shared pool, written while there was only a lemonade
 * stand. Placeholders were tried first and read worse — a card that fits every
 * business belongs to none of them. Each business has its own complete pool now.
 *
 * What is shared is the curriculum, and these tests hold both halves of that:
 * no card may speak in another business's words, and no business may quietly
 * lose a concept the other one teaches.
 */
const SAYS = (e: (typeof ALL_EVENTS)[number]) => [
  e.title,
  e.line,
  e.character,
  ...e.choices.flatMap((c) => [c.label, c.result]),
];

describe('every card belongs to exactly one business', () => {
  it('files each card under a business that exists', () => {
    for (const e of ALL_EVENTS) {
      expect(Object.keys(BUSINESSES), `${e.id} pool "${e.pool}"`).toContain(e.pool);
    }
  });

  it('deals a business only its own cards', () => {
    for (const id of Object.keys(BUSINESSES)) {
      const pool = eventsForBusiness(id);
      expect(pool.length, id).toBeGreaterThan(20);
      for (const e of pool) expect(e.pool, `${id} was dealt ${e.id}`).toBe(id);
    }
  });

  it("never lets one business speak in another one's words", () => {
    const OTHERS: Record<string, RegExp> = {
      lemonade: /\b(meal|meals|truck|griddle|propane|fryer|curb|window)\b/i,
      truck: /\b(lemonade|lemon|cup|cups|cocoa|stand|pitcher)\b/i,
    };
    const offenders: string[] = [];
    for (const e of ALL_EVENTS) {
      const wrong = OTHERS[e.pool];
      if (!wrong) continue;
      for (const text of SAYS(e)) {
        if (wrong.test(text)) offenders.push(`${e.pool}/${e.id}: "${text}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('leaves no placeholders behind from when the pool was shared', () => {
    for (const e of ALL_EVENTS) {
      for (const text of SAYS(e)) {
        expect(/\{[A-Za-z]+\}/.test(text), `${e.id}: "${text}"`).toBe(false);
      }
    }
  });

  it('speaks American English, idiom as well as spelling', () => {
    // Jeff, reading his own cards: "What does 'take their pitch' mean?" and
    // "'A truck parks up'? What does that mean?" Spelling was already checked
    // below; the idiom was not, and a British market trader's vocabulary had
    // walked into a game for American middle schoolers.
    const britishisms =
      /\b(pitch|pitches|parks? up|parked up|till|tills|footfall|car park|takeaway|rubbish|fortnight|petrol|rota)\b/i;
    const offenders: string[] = [];
    for (const e of ALL_EVENTS) {
      for (const text of SAYS(e)) if (britishisms.test(text)) offenders.push(`${e.id}: "${text}"`);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps "kid" out of it, everywhere', () => {
    // Aimed at middle school. "Rival Kid" and "Weather Kid" both read young.
    const offenders = ALL_EVENTS.filter((e) => /\bkid\b/i.test(e.character)).map(
      (e) => `${e.id}: ${e.character}`,
    );
    expect(offenders).toEqual([]);
  });

  it('spells the same word the same way in both pools', () => {
    const british = /\b(neighbour|colour|flavoured|realise|whilst|kerb|queue)\b/i;
    const offenders: string[] = [];
    for (const e of ALL_EVENTS) {
      for (const text of SAYS(e)) if (british.test(text)) offenders.push(`${e.id}: "${text}"`);
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * "Why would anyone not pick 'hand over the log'? That makes no sense."
 *
 * The health inspection cost $60 and GAINED reputation if you had the log, and
 * $260 and lost reputation if you had not. Nobody picks the second, so the card
 * was a menu with a wrong answer printed on it rather than a decision. Worse,
 * whether the log existed was settled weeks earlier — it was not a choice the
 * player was in a position to make at all.
 *
 * A choice has to beat every other choice at SOMETHING.
 */
describe('no card offers a choice nobody would take', () => {
  /** Every axis a player could prefer a choice for. More is better on all of them. */
  const axes = (c: EventChoice) => ({
    cash: (c.cash ?? 0) + (c.cashUnits ?? 0),
    reputation: c.reputation ?? 0,
    demand: (c.demandMod ?? 1) * (c.capacityMod ?? 1),
    stock: c.inventory ?? 0,
    keeps: (c.equipment ?? 0) + (c.capacity ?? 0),
    // A lower unit cost is better, so it is negated to point the same way.
    unitCost: -(c.unitCostMod ?? 1),
    price: c.priceMod ?? 1,
    // Out sick: unpaid saves the wage, paid keeps the goodwill.
    saveWage: c.staffOut === 'unpaid' ? 1 : 0,
    coverage: c.setsInsured === true ? 1 : 0,
  });

  const dominated = (choices: EventChoice[]) =>
    choices
      .filter((c) => {
        const mine = axes(c);
        return choices.some((other) => {
          if (other.id === c.id) return false;
          const theirs = axes(other);
          const keys = Object.keys(mine) as (keyof typeof mine)[];
          return keys.every((k) => theirs[k] >= mine[k]) && keys.some((k) => theirs[k] > mine[k]);
        });
      })
      .map((c) => c.id);

  it('catches one, given the card exactly as Jeff saw it', () => {
    // Kept verbatim so this guard can never quietly stop testing anything.
    expect(
      dominated([
        { id: 'ready', label: 'Hand over the log', cash: -60, reputation: 0.2, result: '' },
        { id: 'wing', label: 'You have not kept one', cash: -260, reputation: -0.3, result: '' },
      ]),
    ).toEqual(['wing']);
  });

  it('passes a card where each choice is better at something', () => {
    expect(
      dominated([
        { id: 'cheap', label: 'Patch it', cash: -50, result: '' },
        { id: 'proper', label: 'Fix it properly', cash: -200, equipment: 200, result: '' },
      ]),
    ).toEqual([]);
  });

  it('finds none anywhere in the game', () => {
    const offenders = ALL_EVENTS.flatMap((e) => dominated(e.choices).map((id) => `${e.id}/${id}`));
    expect(offenders).toEqual([]);
  });
});

describe('the curriculum survives having two pools', () => {
  /** Concepts both businesses are expected to teach. */
  const SHARED = [
    'Demand shocks',
    'Seasonality',
    'Capital expenditure vs deferred maintenance',
    'Variable cost changes',
    'Regulatory and fixed costs',
    'Competition',
    'Windfalls',
    'Capacity and promises',
    'Economies of scale',
    'Word of mouth',
    'Service recovery',
    'Quality perception',
    'Price perception',
    'Managing people',
    'Presentation',
    'Location risk',
    'Reputation vs revenue',
    'Payroll and coverage',
    'Shrinkage and controls',
    'Risk and insurance',
    'Inventory risk',
    'Demand shocks you cannot control',
  ];

  it('teaches every shared concept in both businesses', () => {
    const lemonade = new Set(LEMONADE_EVENTS.map((e) => e.concept));
    const truck = new Set(TRUCK_EVENTS.map((e) => e.concept));
    const missing: string[] = [];
    for (const concept of SHARED) {
      if (!lemonade.has(concept)) missing.push(`lemonade is missing "${concept}"`);
      if (!truck.has(concept)) missing.push(`truck is missing "${concept}"`);
    }
    expect(missing).toEqual([]);
  });

  it('gives each business lessons the other one cannot teach', () => {
    const lemonade = new Set(LEMONADE_EVENTS.map((e) => e.concept));
    const truck = new Set(TRUCK_EVENTS.map((e) => e.concept));
    // The truck's whole point: it is a vehicle, and vehicles break and need permits.
    expect(truck).toContain('A vehicle is an asset that fails');
    expect(truck).toContain('Bidding for a spot with no guarantee');
    expect(lemonade).not.toContain('A vehicle is an asset that fails');
  });

  it('scales the money to the business it belongs to', () => {
    const biggest = (events: typeof ALL_EVENTS) =>
      Math.max(...events.flatMap((e) => e.choices.map((c) => Math.abs(c.cash ?? 0))));
    // A truck turns over a couple of thousand a week. A $9 problem is not one.
    expect(biggest(TRUCK_EVENTS)).toBeGreaterThan(biggest(LEMONADE_EVENTS) * 5);
  });

  it('never has a card with nothing to choose between', () => {
    for (const e of ALL_EVENTS) {
      expect(e.choices.length, `${e.id}`).toBeGreaterThan(1);
      expect(new Set(e.choices.map((c) => c.id)).size, `${e.id} duplicate ids`).toBe(
        e.choices.length,
      );
    }
  });
});
