import { describe, expect, it } from 'vitest';
import { hashPin, isFourDigitPin, pinMatches } from '../pin';

describe('a player PIN', () => {
  it('only accepts four digits', () => {
    expect(isFourDigitPin('1234')).toBe(true);
    expect(isFourDigitPin('12')).toBe(false);
    expect(isFourDigitPin('12345')).toBe(false);
    expect(isFourDigitPin('abcd')).toBe(false);
  });

  it('lets the right PIN in and keeps the wrong one out', async () => {
    const hash = await hashPin('p1', '2468');
    expect(await pinMatches('p1', '2468', hash)).toBe(true);
    expect(await pinMatches('p1', '0000', hash)).toBe(false);
  });

  it('does not store the PIN itself', async () => {
    const hash = await hashPin('p1', '2468');
    expect(hash).not.toContain('2468');
    expect(hash).toHaveLength(64);
  });

  it('salts with the player, so two kids with 1234 do not match', async () => {
    const a = await hashPin('ann', '1234');
    const b = await hashPin('ben', '1234');
    expect(a).not.toBe(b);
  });

  it('treats a player with no PIN as open', async () => {
    expect(await pinMatches('old', '0000', undefined)).toBe(true);
  });
});
