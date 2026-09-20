import { describe, expect, it } from 'vitest';
import { applyEvent, emptyStats, hydrateStats, parseEvent } from '../model';

describe('anonymous play counters', () => {
  it('counts lemonade vs truck starts', () => {
    let s = emptyStats();
    s = applyEvent(s, { type: 'start', business: 'lemonade', tier: 'pro', asset: 'none' });
    s = applyEvent(s, { type: 'start', business: 'truck', tier: 'tycoon', asset: 'used-refurb' });
    s = applyEvent(s, { type: 'start', business: 'truck', tier: 'tycoon', asset: 'new-build' });
    expect(s.starts).toBe(3);
    expect(s.byBusiness.lemonade).toBe(1);
    expect(s.byBusiness.truck).toBe(2);
    expect(s.byTier.tycoon).toBe(2);
    expect(s.byAsset['used-refurb']).toBe(1);
  });

  it('counts a skipped insurance card as a decision, not a name', () => {
    const s = applyEvent(emptyStats(), {
      type: 'week',
      business: 'truck',
      tier: 'pro',
      location: 'lake-resort',
      quality: 'classic',
      hired: true,
      extraLoan: false,
      events: ['truck-insurance:risk'],
    });
    expect(s.weeks).toBe(1);
    expect(s.choices['truck-insurance:risk']).toBe(1);
    expect(s.hired.yes).toBe(1);
    expect(JSON.stringify(s)).not.toMatch(/jeff|pin|cash|@/i);
  });

  it('keeps a sale off the start counts', () => {
    let s = applyEvent(emptyStats(), {
      type: 'start',
      business: 'truck',
      tier: 'pro',
      asset: 'lease',
    });
    s = applyEvent(s, { type: 'sold', business: 'truck', tier: 'pro', week: 42 });
    expect(s.sold).toBe(1);
    expect(s.soldByBusiness.truck).toBe(1);
    expect(s.soldByWeek['41-50']).toBe(1);
    expect(s.byBusiness.truck).toBe(1);
    expect(s.byBusiness['sold:truck']).toBeUndefined();
  });

  it('rejects junk from the wire', () => {
    expect(parseEvent({ type: 'start' })).toBeNull();
    expect(parseEvent({ type: 'spy', name: 'Ada' })).toBeNull();
    expect(parseEvent({ type: 'start', business: 'lemonade', tier: 'pro' })?.type).toBe('start');
  });

  it('fills an older blob that is missing a key', () => {
    const s = hydrateStats({ starts: 4, byBusiness: { lemonade: 3, truck: 1 } });
    expect(s.starts).toBe(4);
    expect(s.hired).toEqual({ yes: 0, no: 0 });
    expect(s.soldByBusiness).toEqual({});
    expect(s.byBusiness.lemonade).toBe(3);
  });

  it('drops a name smuggled in as a counter key', () => {
    const s = hydrateStats({ byBusiness: { lemonade: 2, 'Jeff Prout': 1 } });
    expect(s.byBusiness).toEqual({ lemonade: 2 });
  });
});
