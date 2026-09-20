/**
 * One codebase, two editions. `VITE_EDITION=school|consumer` at build time.
 * Never fork the app — gate features here.
 */
export type Edition = 'school' | 'consumer';

export const EDITION: Edition =
  (import.meta.env.VITE_EDITION as Edition | undefined) ?? 'school';

export const FEATURES = {
  /** Teacher tools, discussion flags, printable Business Report (Phase 3). */
  classroom: EDITION === 'school',
  /** Anything that opens an external URL needs a parental gate in the consumer build. */
  parentalGate: EDITION === 'consumer',
  /** Save export/import to a JSON file. Hidden in the consumer build for now. */
  fileExport: true,
  /**
   * Anonymous play counters for the school site. Off in the consumer / Kids
   * Category wrap — that build must not send anything off the device.
   */
  analytics: EDITION === 'school',
};
