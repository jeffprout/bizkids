import { createHash, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadStats } from './store';

function passwordOk(got: string): boolean {
  const want = process.env.STATS_PASSWORD ?? '';
  if (!want || !got) return false;
  const a = createHash('sha256').update(got).digest();
  const b = createHash('sha256').update(want).digest();
  return timingSafeEqual(a, b);
}

function jsonBody(req: VercelRequest): { password?: string } {
  const raw = req.body;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as { password?: string };
    } catch {
      return {};
    }
  }
  return (raw ?? {}) as { password?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  const body = jsonBody(req);
  if (!passwordOk(typeof body.password === 'string' ? body.password : '')) {
    res.status(401).json({ ok: false, message: 'Wrong password.' });
    return;
  }
  try {
    const stats = await loadStats();
    res.status(200).json({ ok: true, stats });
  } catch {
    res.status(503).json({ ok: false, message: 'Stats are not connected yet.' });
  }
}
