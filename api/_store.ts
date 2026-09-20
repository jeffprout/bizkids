import { get, put } from '@vercel/blob';
import { applyEvent, emptyStats, hydrateStats, type PlayEvent, type PlayStats } from './model.js';

const PATH = 'play-stats.json';

export async function loadStats(): Promise<PlayStats> {
  const found = await get(PATH, { access: 'private', useCache: false });
  if (!found?.stream) return emptyStats();
  const text = await new Response(found.stream).text();
  return hydrateStats(JSON.parse(text));
}

export async function saveStats(stats: PlayStats): Promise<void> {
  await put(PATH, JSON.stringify(stats), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export async function record(event: PlayEvent): Promise<void> {
  const current = await loadStats();
  await saveStats(applyEvent(current, event));
}
