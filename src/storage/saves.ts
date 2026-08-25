import type { GameState } from '../engine/types';
import { SAVE_VERSION } from '../engine/newGame';
import { sanitizeRun } from '../engine/sanitize';
import { storage } from './adapter';

const PROFILES_KEY = 'bizkids.profiles';
const RUN_KEY = (profileId: string) => `bizkids.run.${profileId}`;

export interface HighScore {
  businessId: string;
  tier: string;
  weeks: number;
  soldFor: number;
  date: string;
}

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  badges: string[];
  highScores: HighScore[];
  /** One-line reminder of where they left off. */
  lastRecap: string;
  hasRun: boolean;
  soundOn: boolean;
}

export async function listProfiles(): Promise<Profile[]> {
  const raw = await storage.get(PROFILES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Profile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await storage.set(PROFILES_KEY, JSON.stringify(profiles));
}

export async function upsertProfile(profile: Profile): Promise<Profile[]> {
  const profiles = await listProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) profiles[idx] = profile;
  else profiles.push(profile);
  await saveProfiles(profiles);
  return profiles;
}

export async function deleteProfile(id: string): Promise<Profile[]> {
  const profiles = (await listProfiles()).filter((p) => p.id !== id);
  await saveProfiles(profiles);
  await storage.remove(RUN_KEY(id));
  return profiles;
}

export function newProfile(name: string, emoji: string): Profile {
  return {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    emoji,
    createdAt: new Date().toISOString(),
    badges: [],
    highScores: [],
    lastRecap: '',
    hasRun: false,
    soundOn: true,
  };
}

export async function saveRun(state: GameState): Promise<void> {
  await storage.set(RUN_KEY(state.profileId), JSON.stringify(state));
}

export type LoadOutcome =
  | { status: 'ok'; state: GameState }
  | { status: 'none' }
  /** A save exists but predates the current rules, so it cannot be trusted. */
  | { status: 'outdated' };

/**
 * Says WHY there is no run, not just that there isn't one. A playtester whose
 * week-20 run disappears after a redeploy deserves to be told, rather than
 * being dropped on the new-game screen wondering what happened.
 */
export async function loadRun(profileId: string): Promise<LoadOutcome> {
  const raw = await storage.get(RUN_KEY(profileId));
  if (!raw) return { status: 'none' };
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== SAVE_VERSION) return { status: 'outdated' };
    // The version alone is not proof the shape is right — see sanitizeRun.
    return { status: 'ok', state: sanitizeRun(parsed) };
  } catch {
    return { status: 'outdated' };
  }
}

export async function clearRun(profileId: string): Promise<void> {
  await storage.remove(RUN_KEY(profileId));
}

export interface SaveBundle {
  app: 'bizkids';
  version: number;
  /** Which build produced this save, so playtest reports are traceable. */
  buildId: string;
  exportedAt: string;
  profiles: Profile[];
  runs: Record<string, GameState>;
}

export async function exportAll(): Promise<SaveBundle> {
  const profiles = await listProfiles();
  const runs: Record<string, GameState> = {};
  for (const p of profiles) {
    const run = await loadRun(p.id);
    if (run.status === 'ok') runs[p.id] = run.state;
  }
  return {
    app: 'bizkids',
    version: SAVE_VERSION,
    buildId: typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev',
    exportedAt: new Date().toISOString(),
    profiles,
    runs,
  };
}

export async function importAll(bundle: unknown): Promise<{ ok: boolean; message: string }> {
  const b = bundle as SaveBundle;
  if (!b || b.app !== 'bizkids' || !Array.isArray(b.profiles)) {
    return { ok: false, message: 'That file is not a BizKids save.' };
  }
  const existing = await listProfiles();
  const merged = [...existing];
  for (const p of b.profiles) {
    const idx = merged.findIndex((m) => m.id === p.id);
    if (idx >= 0) merged[idx] = p;
    else merged.push(p);
  }
  await saveProfiles(merged);
  for (const [id, run] of Object.entries(b.runs ?? {})) {
    await storage.set(RUN_KEY(id), JSON.stringify(run));
  }
  return { ok: true, message: `Loaded ${b.profiles.length} player(s).` };
}
