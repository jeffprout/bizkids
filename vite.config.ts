import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * A short stamp for the build, so playtest feedback can be tied to a version.
 * Vercel exposes the commit SHA; local builds fall back to the date.
 */
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
const buildId = commit ?? new Date().toISOString().slice(0, 10).replace(/-/g, '');

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
