import { list, put } from '@vercel/blob';
import { applyEvent, emptyStats, hydrateStats, type PlayEvent, type PlayStats } from './model';

const PATH = 'play-stats.json';

export async function loadStats(): Promise<PlayStats> {
  const { blobs } = await list({ prefix: PATH });
  const found = blobs.find((b) => b.pathname === PATH);
  if (!found?.downloadUrl) return emptyStats();
  const res = await fetch(found.downloadUrl);
  if (!res.ok) return emptyStats();
  return hydrateStats(await res.json());
}

export async function saveStats(stats: PlayStats): Promise<void> {
  await put(PATH, JSON.stringify(stats), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export async function record(event: PlayEvent): Promise<void> {
  const current = await loadStats();
  await saveStats(applyEvent(current, event));
}
