import { describe, expect, it } from 'vitest';
import { ALL_EVENTS } from '../events';
import { BUSINESSES } from '../businesses';
import { BADGES } from '../milestones';
import { GLOSSARY } from '../glossary';
import { TIERS } from '../difficulty';
import { SEASON_INFO, WEATHER_INFO } from '../../engine/calendar';

/**
 * "No more British idiom. Not sure how that even happened."
 *
 * It happened because the copy was written in a British register and the only
 * guard checked SPELLING. Spelling is the easy half — nothing in the game said
 * "colour" — while the vocabulary walked straight in: a market trader's "pitch",
 * a "till" instead of a register, a truck that "parks up", "footfall", "proper"
 * as an intensifier, insurance "cover" instead of coverage.
 *
 * The first version of this guard read only event cards, which is exactly how
 * the location named "Festival Pitch" survived it — the word was on screen every
 * single week, on a card the test never looked at. This one walks EVERY string a
 * player can read, from every business in the register.
 *
 * The list below is vocabulary, not spelling. If a future business needs one of
 * these words in a genuinely American sense, the right move is to narrow the
 * pattern to the British sense, not to delete the entry.
 */
const BRITISH = [
  // A market trader's vocabulary.
  ['pitch|pitches', 'a rented selling spot — say spot, stall or grounds'],
  ['till|tills', 'say cash register or drawer'],
  ['footfall', 'say foot traffic'],
  ['parks? up|parked up', 'say pulls in or parks'],
  ['punter|punters', 'say customer'],
  ['takings', 'say sales or the day’s cash'],
  // Register.
  ['proper|properly', 'as an intensifier — say real, or right'],
  ['reads badly', 'say looks bad'],
  ['fair enough', 'say that is fair, or they get it'],
  ['have a word', 'say talk to them'],
  ['put prices up', 'say raise prices'],
  ['wants a word|have a word|had a word', 'say wants to talk'],
  ['do you a deal', 'say cut you a deal'],
  ['dear', 'as expensive — say high or pricey'],
  ['afterwards', 'say afterward or after that'],
  ['straight away', 'say right away'],
  ['whilst|amongst', 'say while, among'],
  ['reckon', 'say figure or think'],
  ['sorted|dodgy|knackered|gutted|chuffed|posh|bloke|mate|cheers', 'British slang'],
  // Words for things.
  ['bin|bins|binned', 'say trash, dumpster, or thrown out'],
  ['queue|queues|queued|queuing', 'say line'],
  ['kerb', 'say curb'],
  ['lorry', 'say truck'],
  ['rubbish', 'say trash, or bad'],
  ['car park', 'say parking lot'],
  ['takeaway', 'say takeout'],
  ['chips', 'say fries'],
  ['cooker|hob', 'say stove or range'],
  ['petrol', 'say gas'],
  ['fortnight', 'say two weeks'],
  ['maths', 'say math'],
  ['autumn', 'say fall'],
  ['holiday', 'say vacation'],
  // "Shut you down" and "shut down" are fine; a business that IS shut is not.
  ['shut(?!( \\w+)? down)', 'as a state — say closed'],
  ['covers', 'chef jargon for diners — say lunches or people'],
  ['meal deal', 'say combo'],
  ['rota', 'say schedule'],
  // Business and money.
  // The verb is fine ("who covers the fryer?"); the British noun is not.
  ['liability cover|insurance cover|cover note', 'insurance is coverage'],
  ['turnover', 'say revenue or sales'],
  ['cheque', 'say check'],
  ['invoice date|VAT', 'not American paperwork'],
  // Spelling, kept from the older guard.
  ['neighbour|colour|flavoured|realise|organise|apologise|practise', 'American spelling'],
  ['licence', 'say license'],
  ['grey', 'say gray'],
  ['cosy', 'say cozy'],
  ['sceptical', 'say skeptical'],
  ['aluminium', 'say aluminum'],
  ['tyre', 'say tire'],
  ['learnt|spelt|dreamt', 'say learned, spelled, dreamed'],
  ['passer-by', 'say passerby'],
] as const;

/** Every string a player can read, with where it came from. */
function everythingAPlayerReads(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, text?: string) => {
    if (typeof text === 'string' && text.trim()) out.push({ where, text });
  };

  for (const e of ALL_EVENTS) {
    add(`event ${e.id}`, e.title);
    add(`event ${e.id}`, e.line);
    add(`event ${e.id}`, e.character);
    for (const c of e.choices) {
      add(`event ${e.id}/${c.id}`, c.label);
      add(`event ${e.id}/${c.id}`, c.result);
    }
  }

  for (const [id, b] of Object.entries(BUSINESSES)) {
    add(`business ${id}`, b.name);
    add(`business ${id}`, b.tagline);
    add(`business ${id}`, b.startupBuys);
    add(`business ${id}`, b.unitName);
    add(`business ${id}`, b.unitNamePlural);
    add(`business ${id}`, b.placeName);
    add(`business ${id}`, b.sideNoun);
    // The spot names are on screen every single week. This is the one that got
    // away last time.
    for (const l of b.locations) {
      add(`${id} location ${l.id}`, l.name);
      add(`${id} location ${l.id}`, l.blurb);
    }
    for (const q of b.qualities) {
      add(`${id} menu ${q.id}`, q.name);
      add(`${id} menu ${q.id}`, q.blurb);
    }
    for (const sp of b.sideProducts) {
      add(`${id} side ${sp.id}`, sp.name);
      add(`${id} side ${sp.id}`, sp.blurb);
    }
    for (const emp of b.employees) {
      add(`${id} staff ${emp.id}`, emp.name);
      add(`${id} staff ${emp.id}`, emp.quirk);
    }
    for (const m of b.marketing) {
      add(`${id} marketing ${m.id}`, m.name);
      add(`${id} marketing ${m.id}`, m.blurb);
    }
    for (const offers of Object.values(b.loanOffers)) {
      for (const o of offers) {
        add(`${id} loan ${o.id}`, o.lender);
        add(`${id} loan ${o.id}`, o.blurb);
      }
    }
    for (const a of b.assetOptions ?? []) {
      add(`${id} asset ${a.id}`, a.name);
      add(`${id} asset ${a.id}`, a.blurb);
      if (a.conditionNotes) {
        add(`${id} asset ${a.id}`, a.conditionNotes.good);
        add(`${id} asset ${a.id}`, a.conditionNotes.fair);
        add(`${id} asset ${a.id}`, a.conditionNotes.poor);
      }
    }
  }

  for (const b of BADGES) {
    add(`badge ${b.id}`, b.name);
    add(`badge ${b.id}`, b.blurb);
  }

  for (const [id, g] of Object.entries(GLOSSARY)) {
    add(`glossary ${id}`, g.term);
    add(`glossary ${id}`, g.plain);
  }

  for (const t of Object.values(TIERS)) {
    add(`tier ${t.id}`, t.name);
    add(`tier ${t.id}`, t.ages);
    add(`tier ${t.id}`, t.blurb);
  }
  for (const [id, s] of Object.entries(SEASON_INFO)) add(`season ${id}`, s.label);
  for (const [id, w] of Object.entries(WEATHER_INFO)) add(`weather ${id}`, w.label);

  // The last Britishisms hid in the screens, not the cards: "on the dear side"
  // next to the price slider, "the banker wants a word" on the recap. Config
  // walking is not enough.
  const uiSrc = {
    ...(import.meta.glob('../../ui/**/*.{ts,tsx}', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>),
    ...(import.meta.glob('../../engine/simulateWeek.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>),
  };
  for (const [path, src] of Object.entries(uiSrc)) {
    if (path.includes('__tests__')) continue;
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
    const re = /(['"`])([^'"`\n]{10,})\1/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(stripped))) {
      const text = m[2].replace(/\$\{[^}]+\}/g, ' ').trim();
      if (!/[A-Za-z]{3,} [A-Za-z]{3,}/.test(text)) continue;
      if (/^(https?:|data:|text\/|application\/)/.test(text)) continue;
      add(`screen ${path}`, text);
    }
  }

  return out;
}

describe('the game speaks American English', () => {
  const strings = everythingAPlayerReads();

  it('reads every string a player can see, not just the event cards', () => {
    // The guard is only worth what it covers. "Festival Pitch" slipped through
    // the last one because it was a location name and the test read only cards.
    expect(strings.length).toBeGreaterThan(300);
    expect(strings.some((s) => s.where.includes('location'))).toBe(true);
    expect(strings.some((s) => s.where.includes('badge'))).toBe(true);
    expect(strings.some((s) => s.where.includes('glossary'))).toBe(true);
  });

  it('explains the numbers in words that fit every business', () => {
    // The "?" help was written entirely for the lemonade stand, so a food truck
    // owner tapping it beside "Cost of meals sold" was told what the lemons
    // cost. Unlike an event card — which is somebody speaking, and belongs to
    // one business — a definition of gross profit is the same idea whatever is
    // being sold, so it has to be said in words that fit all of them.
    const onlyOneBusiness = /\b(cup|cups|lemon|lemons|drink|drinks|treat|treats|meal|meals|truck|griddle|pitcher|front yard)\b/i;
    const offenders = strings
      .filter((s) => s.where.startsWith('glossary'))
      .filter((s) => onlyOneBusiness.test(s.text))
      .map((s) => `${s.where}: "${s.text}"`);
    expect(offenders).toEqual([]);
  });

  it('catches a British word wherever it is hiding', () => {
    // Non-vacuous by construction: if the pattern ever stops matching, this
    // fails rather than quietly passing everything.
    const rx = new RegExp(`\\b(${BRITISH[0][0]})\\b`, 'i');
    expect(rx.test('Festival Pitch')).toBe(true);
  });

  for (const [pattern, why] of BRITISH) {
    it(`says it the American way: ${pattern.split('|')[0]}`, () => {
      const rx = new RegExp(`\\b(${pattern})\\b`, 'i');
      const offenders = strings
        .filter((s) => rx.test(s.text))
        .map((s) => `${s.where}: "${s.text}"  (${why})`);
      expect(offenders).toEqual([]);
    });
  }
});
