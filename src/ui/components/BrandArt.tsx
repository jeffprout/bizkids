/**
 * The two businesses, drawn. Same ink weight, one ground line, workshop
 * shapes — a folding table and a stainless truck, not a cartoon sky.
 */
const INK = '#16181e';

export function BrandArt() {
  return (
    <svg
      viewBox="0 0 340 130"
      width="100%"
      style={{ maxWidth: 340, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="A lemonade stand and a food truck"
    >
      <rect x="16" y="112" width="288" height="2" rx="1" fill={INK} opacity="0.28" />

      {/* Lemonade: folding table + crate + pitcher */}
      <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round" fill="none" strokeLinecap="round">
        <path d="M28 112 L36 78" />
        <path d="M108 112 L100 78" />
        <rect x="24" y="70" width="88" height="16" rx="1.5" fill="#c4a574" />
        <path d="M28 78 H108" opacity="0.35" />
      </g>
      <g stroke={INK} strokeWidth="2.2" strokeLinejoin="round">
        <rect x="58" y="48" width="16" height="20" rx="2" fill="#cfd5dc" />
        <path d="M74 54 q8 4 0 12" fill="none" />
        <path d="M56 48 h20" strokeLinecap="round" />
      </g>

      {/* Truck */}
      <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
        <rect x="152" y="40" width="118" height="54" rx="3" fill="#e4e8ee" />
        <path d="M270 58 h14 a3 3 0 0 1 2.4 1.3 l11 14 a3 3 0 0 1 .6 1.7 V94 h-28 z" fill="#2c3340" />
        <path d="M276 62 h8 l7 11 h-15 z" fill="#7d93a8" strokeWidth="2" />
        <rect x="186" y="32" width="28" height="8" rx="1" fill="#c5cad1" />
        <rect x="164" y="56" width="68" height="22" rx="1" fill="#1c2430" />
        <rect x="168" y="60" width="60" height="14" fill="#3d5368" stroke="none" />
        <rect x="240" y="58" width="20" height="20" rx="1" fill="#242a33" strokeWidth="2" />
        <g stroke="#d7dde5" strokeWidth="1.5" opacity="0.7" strokeLinecap="round">
          <path d="M244 64 h12" />
          <path d="M244 69 h12" />
          <path d="M244 74 h7" />
        </g>
        <path d="M156 88 H238" strokeWidth="3.5" strokeLinecap="square" />
        <path d="M154 92 H266" stroke="#1f7a4c" strokeWidth="4" strokeLinecap="square" />
      </g>
      <g stroke={INK} strokeWidth="2.2">
        <circle cx="184" cy="101" r="11" fill="#1c1f26" />
        <circle cx="184" cy="101" r="4" fill="#c5cad1" stroke="none" />
        <circle cx="276" cy="101" r="11" fill="#1c1f26" />
        <circle cx="276" cy="101" r="4" fill="#c5cad1" stroke="none" />
      </g>
    </svg>
  );
}
