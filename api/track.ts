import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseEvent } from '../src/analytics/model';
import { record } from './store';

function jsonBody(req: VercelRequest): unknown {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
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
  const event = parseEvent(jsonBody(req));
  if (!event) {
    res.status(400).json({ ok: false });
    return;
  }
  try {
    await record(event);
    res.status(204).end();
  } catch {
    // Storage hiccup. The week already happened; do not make the game look broken.
    res.status(204).end();
  }
}
