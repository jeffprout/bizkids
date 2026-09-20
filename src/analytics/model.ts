/**
 * Re-export of the counters model. The implementation lives next to the
 * API routes so Vercel can bundle it — importing `src/` from `/api` 500s.
 */
export {
  applyEvent,
  emptyStats,
  hydrateStats,
  parseEvent,
  type PlayEvent,
  type PlayStats,
} from '../../api/model';
