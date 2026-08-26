/**
 * The two businesses, drawn rather than typed.
 *
 * Third pass. The second fixed the structural faults — one ground line, one
 * stroke weight, nothing floating — and what was left were the shapes
 * themselves:
 *
 *  - The awning sat ON the serving window as a yellow block. It is a separate
 *    band above the window now, angled, with its underside shaded and a strut
 *    holding it — so it reads as propped open rather than painted on.
 *  - The pitcher was a yellow square. It has a handle, a spout and a lid now,
 *    which is the difference between a jug and a box.
 *  - The ground line ran the full width and stuck out past the truck. It stops
 *    where the drawing does.
 *
 * Flat shapes, one 3px ink stroke, the game's palette, deliberately still.
 */
const INK = '#21304a';

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
      </defs>

      {/* One ground line, ending where the drawing does. */}
      <rect x="14" y="112" width="292" height="3.5" rx="1.75" fill={INK} opacity="0.22" />

      {/* ================= Lemonade stand ================= */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M22 46 V112" />
        <path d="M104 46 V112" />
        <path d="M10 46 L38 26 H88 L116 46 Z" fill="#58c06a" />
        <rect x="18" y="74" width="90" height="38" rx="3" fill="#ffffff" />
        <g stroke="none">
          <rect x="21" y="86" width="12" height="23" fill="#ff6b6b" opacity="0.8" />
          <rect x="45" y="86" width="12" height="23" fill="#ff6b6b" opacity="0.8" />
          <rect x="69" y="86" width="12" height="23" fill="#ff6b6b" opacity="0.8" />
          <rect x="93" y="86" width="12" height="23" fill="#ff6b6b" opacity="0.8" />
        </g>
        <path d="M18 84 H108" />
      </g>

      {/* Pitcher: lid, spout and handle, so it is a jug and not a block. */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M38 60 h18 v14 a4 4 0 0 1 -4 4 h-10 a4 4 0 0 1 -4 -4 z" fill="url(#bm-lemon)" />
        {/* spout, tipped out to the left */}
        <path d="M38 62 l-5 -3 v5 z" fill="#f6b60b" />
        {/* handle */}
        <path d="M56 63 q7 5 0 10" fill="none" strokeWidth="2.5" />
        {/* lid */}
        <path d="M36 60 h22" strokeLinecap="round" />
      </g>

      {/* Lemon, resting on the counter beside the pitcher. */}
      <g transform="translate(74 62)" stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <ellipse cx="12" cy="11" rx="13" ry="10" fill="url(#bm-lemon)" />
        <path d="M-1 11 q-4 -1 -4 -3 q3 -2 5 0" fill="#f6b60b" />
        <path d="M25 11 q4 -1 4 -3 q-3 -2 -5 0" fill="#f6b60b" />
        <path d="M12 1 q7 -7 14 -5 q-3 7 -12 7 z" fill="#58c06a" />
      </g>

      {/* ================= Food truck ================= */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        {/* box body */}
        <rect x="152" y="38" width="120" height="58" rx="6" fill="#ffffff" />
        {/* cab */}
        <path d="M272 60 h14 a4 4 0 0 1 3 1.5 l12 15 a5 5 0 0 1 1 3 V96 h-30 z" fill="#ff6b6b" />
        <path d="M277 64 h9 l8 12 h-17 z" fill="#6fc8ff" strokeWidth="2.5" />
        {/* roof vent */}
        <rect x="188" y="28" width="32" height="10" rx="3" fill="#e8eef7" />

        {/* awning: a band above the window, angled, propped on a strut */}
        <path d="M158 54 H240 L246 42 H164 Z" fill="#ffd43b" />
        {/* its underside, so it reads as a thing with depth */}
        <path d="M158 54 H240" stroke={INK} strokeWidth="3" opacity="0.35" />
        <path d="M243 48 V60" strokeWidth="2.5" strokeLinecap="round" />

        {/* serving window, clear of the awning */}
        <rect x="164" y="60" width="70" height="24" rx="2" fill="#21304a" />
        <rect
          x="168"
          y="64"
          width="62"
          height="16"
          rx="1"
          fill="#2b8fd8"
          opacity="0.45"
          stroke="none"
        />
        {/* menu board */}
        <rect x="244" y="62" width="22" height="22" rx="2" fill="#3d5170" strokeWidth="2.5" />
        <g stroke="#ffffff" strokeWidth="2" opacity="0.65" strokeLinecap="round">
          <path d="M248 68 h14" />
          <path d="M248 73 h14" />
          <path d="M248 78 h9" />
        </g>
        {/* counter shelf */}
        <path d="M160 88 H238" strokeWidth="4" strokeLinecap="round" />
        {/* body stripe */}
        <path d="M156 93 H268" stroke="#58c06a" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* Wheels, sitting exactly on the ground line. */}
      <g stroke={INK} strokeWidth="3">
        <circle cx="186" cy="101" r="11" fill={INK} />
        <circle cx="186" cy="101" r="4" fill="#ffffff" stroke="none" />
        <circle cx="278" cy="101" r="11" fill={INK} />
        <circle cx="278" cy="101" r="4" fill="#ffffff" stroke="none" />
      </g>
    </svg>
  );
}
