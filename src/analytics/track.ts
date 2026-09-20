import { FEATURES } from '../config/edition';
import type { PlayEvent } from './model';

/** Fire-and-forget. A failed post must never stall a week. */
export function track(event: PlayEvent): void {
  if (!FEATURES.analytics) return;
  try {
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {
      /* offline Chromebook, blocked request — the game still plays */
    });
  } catch {
    /* ignore */
  }
}