/**
 * Anonymous play counters. No names, no PIN, no cash, no device id.
 * The admin tab turns these into percentages.
 */
export type PlayEvent =
  | { type: 'start'; business: string; tier: string; asset: string }
  | {
      type: 'week';
      business: string;
      tier: string;
      location: string;
      quality: string;
      hired: boolean;
      extraLoan: boolean;
      events: string[];
    }
  | { type: 'sold'; business: string; tier: string; week: number };

export interface PlayStats {
  starts: number;
  byBusiness: Record<string, number>;
  byTier: Record<string, number>;
  byAsset: Record<string, number>;
  weeks: number;
  byLocation: Record<string, number>;
  byQuality: Record<string, number>;
  hired: { yes: number; no: number };
  extraLoan: { yes: number; no: number };
  choices: Record<string, number>;
  sold: number;
  soldByBusiness: Record<string, number>;
  soldByWeek: Record<string, number>;
}

export function emptyStats(): PlayStats {
  return {
    starts: 0,
    byBusiness: {},
    byTier: {},
    byAsset: {},
    weeks: 0,
    byLocation: {},
    byQuality: {},
    hired: { yes: 0, no: 0 },
    extraLoan: { yes: 0, no: 0 },
    choices: {},
    sold: 0,
    soldByBusiness: {},
    soldByWeek: {},
  };
}

const KEY = /^[a-z0-9][a-z0-9_:-]{0,63}$/i;

function bump(map: Record<string, number>, key: string, n = 1): void {
  if (!KEY.test(key)) return;
  map[key] = (map[key] ?? 0) + n;
}

function counts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) bump(out, key, value);
  }
  return out;
}

function pair(raw: unknown): { yes: number; no: number } {
  const o = raw && typeof raw === 'object' ? (raw as { yes?: unknown; no?: unknown }) : {};
  return {
    yes: typeof o.yes === 'number' && o.yes > 0 ? o.yes : 0,
    no: typeof o.no === 'number' && o.no > 0 ? o.no : 0,
  };
}

/** Fill missing keys so an older blob still opens in the admin tab. */
export function hydrateStats(raw: unknown): PlayStats {
  const data = raw && typeof raw === 'object' ? (raw as Partial<PlayStats>) : {};
  return {
    starts: typeof data.starts === 'number' && data.starts > 0 ? data.starts : 0,
    weeks: typeof data.weeks === 'number' && data.weeks > 0 ? data.weeks : 0,
    sold: typeof data.sold === 'number' && data.sold > 0 ? data.sold : 0,
    byBusiness: counts(data.byBusiness),
    byTier: counts(data.byTier),
    byAsset: counts(data.byAsset),
    byLocation: counts(data.byLocation),
    byQuality: counts(data.byQuality),
    hired: pair(data.hired),
    extraLoan: pair(data.extraLoan),
    choices: counts(data.choices),
    soldByBusiness: counts(data.soldByBusiness),
    soldByWeek: counts(data.soldByWeek),
  };
}

export function applyEvent(stats: PlayStats, event: PlayEvent): PlayStats {
  const next: PlayStats = {
    ...stats,
    byBusiness: { ...stats.byBusiness },
    byTier: { ...stats.byTier },
    byAsset: { ...stats.byAsset },
    byLocation: { ...stats.byLocation },
    byQuality: { ...stats.byQuality },
    hired: { ...stats.hired },
    extraLoan: { ...stats.extraLoan },
    choices: { ...stats.choices },
    soldByBusiness: { ...stats.soldByBusiness },
    soldByWeek: { ...stats.soldByWeek },
  };

  if (event.type === 'start') {
    next.starts += 1;
    bump(next.byBusiness, event.business);
    bump(next.byTier, event.tier);
    bump(next.byAsset, event.asset || 'none');
    return next;
  }

  if (event.type === 'week') {
    next.weeks += 1;
    bump(next.byLocation, `${event.business}:${event.location}`);
    bump(next.byQuality, `${event.business}:${event.quality}`);
    if (event.hired) next.hired.yes += 1;
    else next.hired.no += 1;
    if (event.extraLoan) next.extraLoan.yes += 1;
    else next.extraLoan.no += 1;
    for (const choice of event.events.slice(0, 20)) bump(next.choices, choice);
    return next;
  }

  next.sold += 1;
  bump(next.soldByBusiness, event.business);
  const bucket = Math.min(5, Math.ceil(Math.max(1, event.week) / 10));
  bump(next.soldByWeek, `${(bucket - 1) * 10 + 1}-${bucket * 10}`);
  return next;
}

export function parseEvent(raw: unknown): PlayEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (e.type === 'start') {
    if (typeof e.business !== 'string' || typeof e.tier !== 'string') return null;
    return {
      type: 'start',
      business: e.business,
      tier: e.tier,
      asset: typeof e.asset === 'string' ? e.asset : 'none',
    };
  }
  if (e.type === 'week') {
    if (typeof e.business !== 'string' || typeof e.tier !== 'string') return null;
    if (typeof e.location !== 'string' || typeof e.quality !== 'string') return null;
    const events = Array.isArray(e.events)
      ? e.events.filter((x): x is string => typeof x === 'string').slice(0, 20)
      : [];
    return {
      type: 'week',
      business: e.business,
      tier: e.tier,
      location: e.location,
      quality: e.quality,
      hired: Boolean(e.hired),
      extraLoan: Boolean(e.extraLoan),
      events,
    };
  }
  if (e.type === 'sold') {
    if (typeof e.business !== 'string' || typeof e.tier !== 'string') return null;
    const week = typeof e.week === 'number' && Number.isFinite(e.week) ? e.week : 0;
    return { type: 'sold', business: e.business, tier: e.tier, week };
  }
  return null;
}
