import { beforeEach, describe, expect, it } from 'vitest';
import { storage } from '../adapter';
import { listProfiles, loadRun, newProfile, saveProfiles, saveRun } from '../saves';
import { newGame, SAVE_VERSION } from '../../engine/newGame';

/**
 * The game shipped to playtesters as BizKids. Renaming it to Boss Mode moved the
 * storage keys, and anyone mid-run would have opened the game to an empty
 * trophy shelf and no stand. Reads fall back to the old keys; these tests are
 * what stops that fallback being deleted as dead code later.
 */
describe('a save written before the rename', () => {
  beforeEach(async () => {
    for (const k of await storage.keys()) await storage.remove(k);
  });

  it('still lists profiles stored under the old key', async () => {
    const legacy = newProfile('Ada', '🚀');
    legacy.badges = ['first-sale', 'hundred-club'];
    await storage.set('bizkids.profiles', JSON.stringify([legacy]));

    const found = await listProfiles();
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Ada');
    expect(found[0].badges).toEqual(['first-sale', 'hundred-club']);
  });

  it('still loads a run in progress stored under the old key', async () => {
    const run = newGame({
      profileId: 'p1',
      businessId: 'lemonade',
      tier: 'pro',
      financing: { loanIds: [], savingsUsed: 55, locationId: 'park' },
      seed: 99,
    });
    const midRun = { ...run, week: 31, cash: 812.5, version: SAVE_VERSION };
    await storage.set('bizkids.run.p1', JSON.stringify(midRun));

    const loaded = await loadRun('p1');
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.week).toBe(31);
      expect(loaded.state.cash).toBe(812.5);
    }
  });

  it('prefers the new key once anything has been written to it', async () => {
    await storage.set('bizkids.profiles', JSON.stringify([newProfile('Old', '🐺')]));
    await saveProfiles([newProfile('New', '👑')]);

    const found = await listProfiles();
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('New');
    // The old copy is left alone as a backstop, not deleted out from under them.
    expect(await storage.get('bizkids.profiles')).not.toBeNull();
  });

  it('writes new runs to the new key', async () => {
    const run = newGame({
      profileId: 'p2',
      businessId: 'lemonade',
      tier: 'pro',
      financing: { loanIds: [], savingsUsed: 55, locationId: 'park' },
      seed: 7,
    });
    await saveRun(run);
    expect(await storage.get('bossmode.run.p2')).not.toBeNull();
  });
});
