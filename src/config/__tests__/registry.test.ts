import { describe, expect, it } from 'vitest';
import { BUSINESSES, getBusiness } from '../businesses';

/**
 * Phase 2b requires that adding a business is a config change and nothing else.
 * That is easy to say and easy to lose: the register used to live inside
 * `lemonade.ts`, so adding the food truck would have meant editing the lemonade
 * stand, and every screen imported the lemonade stand by name to look up
 * whichever business was actually being played.
 *
 * These read the source text, because the coupling being guarded against is an
 * import — invisible at runtime, obvious in the file.
 */
const engineSrc = import.meta.glob('../../engine/**/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const appSrc = {
  ...(import.meta.glob('../../ui/**/*.{ts,tsx}', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>),
  ...(import.meta.glob('../../state/**/*.ts', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>),
};

/** Files that name a specific business file rather than going via the register. */
const namesABusiness = (files: Record<string, string>) =>
  Object.entries(files)
    .filter(([path]) => !path.includes('__tests__'))
    .filter(([, text]) => /businesses\/[a-z]/.test(text))
    .map(([path]) => path);

describe('adding a business is a config change', () => {
  it('reads the sources it is meant to be checking', () => {
    expect(Object.keys(engineSrc).length).toBeGreaterThan(5);
    expect(Object.keys(appSrc).length).toBeGreaterThan(5);
  });

  it('keeps the engine free of any one business', () => {
    expect(namesABusiness(engineSrc)).toEqual([]);
  });

  it('keeps the screens free of any one business', () => {
    expect(namesABusiness(appSrc)).toEqual([]);
  });

  it('defines the business contract with the engine, not inside a business', () => {
    const types = Object.entries(engineSrc).find(([p]) => p.endsWith('types.ts'))![1];
    expect(types).toContain('export interface BusinessDef');
  });

  it('registers every business under its own id', () => {
    for (const [id, biz] of Object.entries(BUSINESSES)) {
      expect(biz.id, `${id} is filed under the wrong key`).toBe(id);
      expect(getBusiness(id)).toBe(biz);
    }
  });

  it('refuses an unknown business rather than guessing', () => {
    expect(() => getBusiness('food-truck')).toThrow(/Unknown business/);
  });
});
