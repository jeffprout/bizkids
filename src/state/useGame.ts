import { useCallback, useEffect, useState } from 'react';
import type { GameState, Tier, WeekDecisions } from '../engine/types';
import type { FinancingChoice } from '../engine/newGame';
import { newGame } from '../engine/newGame';
import { simulateWeek } from '../engine/simulateWeek';
import { getBusiness } from '../config/businesses/lemonade';
import { TIERS } from '../config/difficulty';
import { valueBusiness } from '../engine/valuation';
import {
  clearRun,
  listProfiles,
  loadRun,
  newProfile,
  saveRun,
  upsertProfile,
  deleteProfile,
  type Profile,
} from '../storage/saves';
import { setSoundEnabled } from '../ui/sfx';

export type Screen =
  | 'title'
  | 'setup'
  | 'week'
  | 'run'
  | 'recap'
  | 'sell'
  | 'trophies';

export function useGame() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      setProfiles(await listProfiles());
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (profile) setSoundEnabled(profile.soundOn);
  }, [profile]);

  const refreshProfiles = useCallback(async () => {
    setProfiles(await listProfiles());
  }, []);

  const createProfile = useCallback(async (name: string, emoji: string) => {
    const p = newProfile(name, emoji);
    setProfiles(await upsertProfile(p));
    setProfile(p);
    return p;
  }, []);

  const removeProfile = useCallback(async (id: string) => {
    setProfiles(await deleteProfile(id));
  }, []);

  const chooseProfile = useCallback(async (p: Profile) => {
    setProfile(p);
    const run = await loadRun(p.id);
    if (run) {
      setState(run);
      setScreen('week');
    } else {
      setState(null);
      setScreen('setup');
    }
  }, []);

  const persist = useCallback(
    async (next: GameState, p: Profile | null = profile) => {
      await saveRun(next);
      if (p) {
        const recap = recapLine(next);
        const merged: Profile = {
          ...p,
          hasRun: true,
          badges: Array.from(new Set([...p.badges, ...next.badges])),
          lastRecap: recap,
        };
        setProfile(merged);
        setProfiles(await upsertProfile(merged));
      }
    },
    [profile],
  );

  const startRun = useCallback(
    async (tier: Tier, financing: FinancingChoice) => {
      if (!profile) return;
      const fresh = newGame({
        profileId: profile.id,
        businessId: 'lemonade',
        tier,
        financing,
        seed: Math.floor(Math.random() * 2 ** 31) || 7,
      });
      setState(fresh);
      await persist(fresh);
      setScreen('week');
    },
    [profile, persist],
  );

  const endWeek = useCallback(
    async (decisions: WeekDecisions) => {
      if (!state) return;
      const next = simulateWeek(state, decisions);
      setState(next);
      await persist(next);
      setScreen('run');
    },
    [state, persist],
  );

  const sellBusiness = useCallback(async () => {
    if (!state || !profile) return;
    const biz = getBusiness(state.businessId);
    const quality = biz.qualities.find((q) => q.id === state.qualityId) ?? biz.qualities[0];
    const v = valueBusiness(state, {
      multipleLow: biz.valuationMultiple.low,
      multipleHigh: biz.valuationMultiple.high,
      inventoryUnitCost: quality.unitCost * TIERS[state.tier].unitCostScale,
    });
    const sold: GameState = { ...state, soldFor: v.offer, gameOver: true };
    const updated: Profile = {
      ...profile,
      hasRun: false,
      badges: Array.from(new Set([...profile.badges, ...sold.badges, 'sold'])),
      lastRecap: `Sold the stand for $${Math.round(v.offer)} in week ${state.week}.`,
      highScores: [
        ...profile.highScores,
        {
          businessId: state.businessId,
          tier: state.tier,
          weeks: state.week,
          soldFor: v.offer,
          date: new Date().toISOString(),
        },
      ].sort((a, b) => b.soldFor - a.soldFor),
    };
    setProfile(updated);
    setProfiles(await upsertProfile(updated));
    await clearRun(profile.id);
    // The run is over. Leaving it in state would let the player walk back into a
    // business they have already sold.
    setState(null);
    setScreen('trophies');
    return v.offer;
  }, [state, profile]);

  const abandonRun = useCallback(async () => {
    if (!profile) return;
    await clearRun(profile.id);
    setState(null);
    setProfiles(await upsertProfile({ ...profile, hasRun: false, lastRecap: '' }));
    setScreen('setup');
  }, [profile]);

  const toggleSound = useCallback(async () => {
    if (!profile) return;
    const updated = { ...profile, soundOn: !profile.soundOn };
    setProfile(updated);
    setSoundEnabled(updated.soundOn);
    setProfiles(await upsertProfile(updated));
  }, [profile]);

  return {
    ready,
    profiles,
    profile,
    state,
    screen,
    setScreen,
    setProfile,
    refreshProfiles,
    createProfile,
    removeProfile,
    chooseProfile,
    startRun,
    endWeek,
    sellBusiness,
    abandonRun,
    toggleSound,
  };
}

/** One sentence for the Continue screen. */
export function recapLine(s: GameState): string {
  const r = s.lastResult;
  if (!r) return `Week ${s.week} — just getting started.`;
  const bits: string[] = [`Week ${s.week}`];
  if (r.stagedUp) bits.push('your stand just levelled up');
  else if (r.newBadges.length) bits.push('you earned a trophy');
  else if (r.profit > 0) bits.push(`you banked $${Math.round(r.profit)}`);
  else bits.push('a tough week');
  return `${bits.join(' — ')}.`;
}
