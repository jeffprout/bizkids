/**
 * The two businesses, drawn rather than typed.
 *
 * Emoji were fine when this was a lemonade stand for nine-year-olds. Aimed at
 * middle school it reads as a toy, and a food truck emoji next to a real
 * illustration would look worse than either alone — so both are vector, in the
 * game's own palette, with flat shapes and one light source.
 *
 * Deliberately still, too. The title used to spring in; things that bounce read
 * young.
 */
export function BrandArt() {
  return (
    <svg
      viewBox="0 0 340 130"
      width="100%"
      style={{ maxWidth: 340, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="A lemonade stand and a food truck"
    >
      <defs>
        <linearGradient id="bm-lemon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#f6b60b" />
        </linearGradient>
        <linearGradient id="bm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8eef7" />
        </linearGradient>
      </defs>

      {/* The ground both sit on, so they read as one scene. */}
      <rect x="8" y="108" width="324" height="4" rx="2" fill="#21304a" opacity="0.12" />

      {/* ---- Lemonade stand ---- */}
      <g>
        {/* counter */}
        <rect x="18" y="74" width="86" height="34" rx="4" fill="#f2f6fc" />
        <rect x="18" y="74" width="86" height="9" rx="4" fill="#21304a" opacity="0.1" />
        {/* stripes on the stand front */}
        <rect x="26" y="88" width="10" height="20" fill="#ff6b6b" opacity="0.75" />
        <rect x="46" y="88" width="10" height="20" fill="#ff6b6b" opacity="0.75" />
        <rect x="66" y="88" width="10" height="20" fill="#ff6b6b" opacity="0.75" />
        <rect x="86" y="88" width="10" height="20" fill="#ff6b6b" opacity="0.75" />
        {/* posts and canopy */}
        <rect x="20" y="40" width="5" height="36" rx="2" fill="#21304a" opacity="0.55" />
        <rect x="97" y="40" width="5" height="36" rx="2" fill="#21304a" opacity="0.55" />
        <path d="M12 44 L110 44 L100 30 L22 30 Z" fill="#58c06a" />
        <path d="M12 44 L110 44 L106 38 L16 38 Z" fill="#21304a" opacity="0.14" />
        {/* pitcher on the counter */}
        <path
          d="M52 56 h16 a3 3 0 0 1 3 3 v13 a3 3 0 0 1 -3 3 h-16 a3 3 0 0 1 -3 -3 v-13 a3 3 0 0 1 3 -3 z"
          fill="url(#bm-lemon)"
        />
        <path
          d="M71 61 q7 4 0 9"
          fill="none"
          stroke="#f6b60b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="49" y="63" width="22" height="3" fill="#21304a" opacity="0.12" />
      </g>

      {/* ---- The lemon, between the two ---- */}
      <g transform="translate(118 52)">
        <ellipse cx="16" cy="20" rx="17" ry="14" fill="url(#bm-lemon)" />
        {/* the little nub at each end that makes a lemon a lemon */}
        <path d="M-2 20 q-4 0 -4 -3 q3 -2 5 0 z" fill="#f6b60b" />
        <path d="M34 20 q4 0 4 -3 q-3 -2 -5 0 z" fill="#f6b60b" />
        <ellipse cx="11" cy="14" rx="6" ry="4" fill="#fff8dc" opacity="0.55" />
        <path d="M16 6 q9 -8 17 -5 q-4 8 -15 8 z" fill="#58c06a" />
      </g>

      {/* ---- Food truck ---- */}
      <g transform="translate(168 26)">
        {/* box body */}
        <rect x="18" y="14" width="122" height="62" rx="7" fill="url(#bm-body)" />
        <rect
          x="18"
          y="14"
          width="122"
          height="62"
          rx="7"
          fill="none"
          stroke="#21304a"
          strokeWidth="3"
        />
        {/* cab, lower and set forward */}
        <path
          d="M140 34 h16 a5 5 0 0 1 4 2 l11 16 a5 5 0 0 1 1 3 v19 a4 4 0 0 1 -4 4 h-28 z"
          fill="#ff6b6b"
        />
        <path
          d="M140 34 h16 a5 5 0 0 1 4 2 l11 16 a5 5 0 0 1 1 3 v19 a4 4 0 0 1 -4 4 h-28 z"
          fill="none"
          stroke="#21304a"
          strokeWidth="3"
        />
        {/* windshield */}
        <path d="M145 39 h11 l9 13 h-20 z" fill="#6fc8ff" />
        {/* serving hatch */}
        <rect x="32" y="28" width="74" height="30" rx="3" fill="#21304a" opacity="0.82" />
        <rect x="36" y="32" width="66" height="22" rx="2" fill="#2b8fd8" opacity="0.35" />
        {/* hatch flap, propped open */}
        <path d="M30 28 L108 28 L114 16 L36 16 Z" fill="#ffd43b" />
        <path d="M30 28 L108 28 L110 24 L33 24 Z" fill="#21304a" opacity="0.16" />
        {/* counter shelf under the hatch */}
        <rect x="28" y="58" width="82" height="6" rx="2" fill="#21304a" opacity="0.5" />
        {/* a stripe along the body, where a truck carries its name */}
        <rect x="24" y="66" width="110" height="6" rx="3" fill="#58c06a" opacity="0.85" />
        {/* wheels */}
        <circle cx="52" cy="80" r="12" fill="#21304a" />
        <circle cx="52" cy="80" r="5" fill="#f2f6fc" />
        <circle cx="146" cy="80" r="12" fill="#21304a" />
        <circle cx="146" cy="80" r="5" fill="#f2f6fc" />
      </g>
    </svg>
  );
}
