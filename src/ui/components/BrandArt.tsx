/**
 * The two businesses, drawn rather than typed.
 *
 * Second pass, from seeing the first one rendered. Three things were wrong and
 * all three were about it looking like one picture rather than three clip-art
 * pieces pushed together:
 *
 *  - The lemon floated in mid-air between them, anchored to nothing. It now sits
 *    on the counter where a lemon would actually be.
 *  - The truck's wheels hung below the stand's base, so they stood on different
 *    ground. Everything now rests on one line at y=112.
 *  - The stand had no outline and the truck had a heavy one. Both are drawn with
 *    the same 3px ink stroke now, which is most of what makes it read as
 *    deliberate rather than assembled.
 *
 * Flat shapes, one light source, the game's own palette, and deliberately still.
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

      {/* One ground line. Everything sits on it. */}
      <rect x="6" y="112" width="328" height="3.5" rx="1.75" fill={INK} opacity="0.25" />

      {/* ================= Lemonade stand ================= */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        {/* canopy posts */}
        <path d="M22 46 V112" />
        <path d="M104 46 V112" />
        {/* canopy */}
        <path d="M10 46 L38 26 H88 L116 46 Z" fill="#58c06a" />
        {/* counter */}
        <rect x="18" y="74" width="90" height="38" rx="3" fill="#ffffff" />
        {/* counter stripes, clipped inside by drawing them without stroke */}
        <g stroke="none">
          <rect x="21" y="86" width="12" height="23" fill="#ff6b6b" opacity="0.8" />
          <rect x="45" y="86" width="12" height="23" fill="#ff6b6b" opacity="0.8" />
          <rect x="69" y="86" width="12" height="23" fill="#ff6b6b" opacity="0.8" />
          <rect x="93" y="86" width="12" height="23" fill="#ff6b6b" opacity="0.8" />
        </g>
        {/* counter lip, so the top edge reads as a surface */}
        <path d="M18 84 H108" />

        {/* pitcher, standing ON the counter */}
        <path d="M40 58 h20 a2 2 0 0 1 2 2 v22 h-24 V60 a2 2 0 0 1 2 -2 z" fill="url(#bm-lemon)" />
        <path d="M62 64 q8 5 0 11" fill="none" />
      </g>

      {/* The lemon, resting on the counter beside the pitcher. */}
      <g transform="translate(74 62)" stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <ellipse cx="12" cy="11" rx="13" ry="10" fill="url(#bm-lemon)" />
        {/* the nubs that make a lemon a lemon, not an egg */}
        <path d="M-1 11 q-4 -1 -4 -3 q3 -2 5 0" fill="#f6b60b" />
        <path d="M25 11 q4 -1 4 -3 q-3 -2 -5 0" fill="#f6b60b" />
        <path d="M12 1 q7 -7 14 -5 q-3 7 -12 7 z" fill="#58c06a" />
      </g>

      {/* ================= Food truck ================= */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        {/* box body */}
        <rect x="152" y="42" width="120" height="54" rx="6" fill="#ffffff" />
        {/* cab, lower than the box */}
        <path d="M272 60 h14 a4 4 0 0 1 3 1.5 l12 15 a5 5 0 0 1 1 3 V96 h-30 z" fill="#ff6b6b" />
        {/* windshield */}
        <path d="M277 64 h9 l8 12 h-17 z" fill="#6fc8ff" strokeWidth="2.5" />
        {/* serving window */}
        <rect x="164" y="52" width="72" height="28" rx="2" fill="#21304a" />
        <rect
          x="168"
          y="56"
          width="64"
          height="20"
          rx="1"
          fill="#2b8fd8"
          opacity="0.45"
          stroke="none"
        />
        {/* awning, propped over the window */}
        <path d="M160 52 H242 L250 38 H168 Z" fill="#ffd43b" />
        {/* menu board on the body, right of the window */}
        <rect x="244" y="56" width="22" height="24" rx="2" fill="#3d5170" strokeWidth="2.5" />
        <g stroke="#ffffff" strokeWidth="2" opacity="0.65" strokeLinecap="round">
          <path d="M248 63 h14" />
          <path d="M248 68 h14" />
          <path d="M248 73 h9" />
        </g>
        {/* counter shelf under the window */}
        <path d="M160 84 H240" strokeWidth="4" strokeLinecap="round" />
        {/* roof vent, the thing that makes it a kitchen and not a van */}
        <rect x="186" y="30" width="34" height="12" rx="3" fill="#e8eef7" />
        {/* body stripe */}
        <path d="M156 90 H268" stroke="#58c06a" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* wheels, sitting exactly on the ground line */}
      <g stroke={INK} strokeWidth="3">
        <circle cx="186" cy="101" r="11" fill={INK} />
        <circle cx="186" cy="101" r="4" fill="#ffffff" stroke="none" />
        <circle cx="278" cy="101" r="11" fill={INK} />
        <circle cx="278" cy="101" r="4" fill="#ffffff" stroke="none" />
      </g>
    </svg>
  );
}
