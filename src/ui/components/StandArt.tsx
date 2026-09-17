import { motion } from 'framer-motion';
import type { Stage, Weather } from '../../engine/types';

const INK = '#21304a';

/**
 * The business, drawn. It physically upgrades as the player grows, and it is
 * the business they are actually running — a lemonade stand that stays a
 * lemonade stand on a food-truck week was somebody else's game on screen.
 */
export function StandArt({
  businessId = 'lemonade',
  stage,
  weather,
  reputation,
  hasEmployee,
  hasSign,
  buildingOut = false,
  customers = 0,
  animateCustomers = false,
}: {
  businessId?: string;
  stage: Stage;
  weather: Weather;
  reputation: number;
  hasEmployee: boolean;
  hasSign: boolean;
  buildingOut?: boolean;
  customers?: number;
  animateCustomers?: boolean;
}) {
  const shownCustomers = buildingOut ? 0 : Math.min(6, Math.max(0, Math.round(customers)));
  const faces = ['🧒', '👦', '👩', '🧑', '👴', '👧'];
  const truck = businessId === 'truck';

  return (
    <div className="scene" aria-label={truck ? 'Your food truck' : 'Your lemonade stand'}>
      <svg viewBox="0 0 320 190" role="img" aria-hidden="true">
        <Sky weather={weather} />
        {truck ? (
          <Truck
            stage={stage}
            buildingOut={buildingOut}
            hasEmployee={hasEmployee}
            hasWrap={hasSign}
            reputation={reputation}
          />
        ) : (
          <LemonadeStand
            stage={stage}
            hasEmployee={hasEmployee}
            hasSign={hasSign}
            reputation={reputation}
          />
        )}
      </svg>

      {Array.from({ length: shownCustomers }).map((_, i) => (
        <motion.div
          key={i}
          className="customer"
          initial={animateCustomers ? { x: -60, opacity: 0 } : false}
          animate={{ x: 20 + i * 40, opacity: 1 }}
          transition={{ delay: i * 0.22, type: 'spring', stiffness: 90, damping: 14 }}
          style={{ left: 0 }}
        >
          {faces[i % faces.length]}
        </motion.div>
      ))}
    </div>
  );
}

function LemonadeStand({
  stage,
  hasEmployee,
  hasSign,
  reputation,
}: {
  stage: Stage;
  hasEmployee: boolean;
  hasSign: boolean;
  reputation: number;
}) {
  return (
    <>
      <g transform={stage >= 2 ? 'translate(150 96) scale(1.15)' : 'translate(150 100)'}>
        {stage >= 2 && (
          <>
            <rect x="-62" y="-58" width="124" height="16" rx="6" fill="#ff6b6b" />
            <rect x="-62" y="-42" width="124" height="6" fill="#ffffff" opacity="0.7" />
            <rect x="-56" y="-42" width="6" height="34" fill="#c98a4b" />
            <rect x="50" y="-42" width="6" height="34" fill="#c98a4b" />
          </>
        )}
        <rect x="-58" y="-10" width="116" height="44" rx="6" fill="#d99a54" />
        <rect x="-58" y="-10" width="116" height="10" rx="4" fill="#f0b877" />
        <rect x="-64" y="-16" width="128" height="10" rx="5" fill="#b9793c" />
        <rect
          x="-16"
          y="-42"
          width="26"
          height="28"
          rx="6"
          fill="#fff4c1"
          stroke="#e0b53c"
          strokeWidth="2"
        />
        <rect x="-14" y="-30" width="22" height="14" rx="4" fill="var(--lemon)" />
        <circle cx="16" cy="-30" r="6" fill="none" stroke="#e0b53c" strokeWidth="3" />
        <rect x="20" y="-26" width="10" height="12" rx="2" fill="#ffffff" stroke="#cfd9e6" />
        <rect x="32" y="-26" width="10" height="12" rx="2" fill="#ffffff" stroke="#cfd9e6" />
        {stage >= 3 && (
          <rect x="-44" y="-26" width="10" height="12" rx="2" fill="#ffffff" stroke="#cfd9e6" />
        )}
      </g>

      {hasSign && (
        <g transform="translate(58 92)">
          <rect x="-4" y="0" width="8" height="46" fill="#a9743d" />
          <rect
            x="-34"
            y="-30"
            width="68"
            height="34"
            rx="6"
            fill="#fff"
            stroke="var(--ink)"
            strokeWidth="3"
          />
          <text x="0" y="-8" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">
            LEMONADE
          </text>
        </g>
      )}

      <text x="122" y="120" fontSize="26" textAnchor="middle">
        🧑
      </text>
      {hasEmployee && (
        <text x="196" y="120" fontSize="24" textAnchor="middle">
          👧
        </text>
      )}

      {reputation >= 4.5 && (
        <text x="160" y="34" fontSize="16" textAnchor="middle">
          ✨ ⭐ ✨
        </text>
      )}
    </>
  );
}

/**
 * Same language as the title art: 3px ink, the game's palette, sitting on the
 * ground line the CSS already paints. Stage upgrades the wrap and the awning;
 * a refit covers the window and puts the truck on blocks.
 */
function Truck({
  stage,
  buildingOut,
  hasEmployee,
  hasWrap,
  reputation,
}: {
  stage: Stage;
  buildingOut: boolean;
  hasEmployee: boolean;
  hasWrap: boolean;
  reputation: number;
}) {
  const scale = stage >= 2 ? 1.08 : 1;
  return (
    <g transform={`translate(160 118) scale(${scale})`}>
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" fill="none">
        <rect x="-92" y="-64" width="128" height="62" rx="6" fill="#ffffff" />
        <path
          d="M36 -42 h16 a4 4 0 0 1 3 1.5 l12 16 a5 5 0 0 1 1 3 V-2 h-32 z"
          fill="#ff6b6b"
        />
        <path d="M42 -38 h10 l8 12 h-18 z" fill="#6fc8ff" strokeWidth="2.5" />
        <rect x="-54" y="-74" width="34" height="10" rx="3" fill="#e8eef7" />

        {stage >= 2 && (
          <>
            <path d="M-86 -48 H0 L6 -62 H-80 Z" fill="#ffd43b" />
            <path d="M-86 -48 H0" stroke={INK} strokeWidth="3" opacity="0.35" />
            <path d="M3 -54 V-42" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {buildingOut ? (
          <rect x="-80" y="-42" width="74" height="26" rx="2" fill="#9aa7b8" />
        ) : (
          <>
            <rect x="-80" y="-42" width="74" height="26" rx="2" fill="#21304a" />
            <rect
              x="-76"
              y="-38"
              width="66"
              height="18"
              rx="1"
              fill="#2b8fd8"
              opacity="0.45"
              stroke="none"
            />
          </>
        )}

        <rect x="6" y="-40" width="24" height="24" rx="2" fill="#3d5170" strokeWidth="2.5" />
        <g stroke="#ffffff" strokeWidth="2" opacity="0.65" strokeLinecap="round">
          <path d="M10 -34 h16" />
          <path d="M10 -28 h16" />
          <path d="M10 -22 h10" />
        </g>
        <path d="M-88 -14 H-4" strokeWidth="4" strokeLinecap="round" />
        <path
          d="M-88 -8 H32"
          stroke={hasWrap || stage >= 3 ? '#58c06a' : '#c5d0de'}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>

      {buildingOut ? (
        <g stroke={INK} strokeWidth="3">
          <rect x="-62" y="-6" width="14" height="10" rx="1" fill="#c98a4b" />
          <rect x="28" y="-6" width="14" height="10" rx="1" fill="#c98a4b" />
        </g>
      ) : (
        <g stroke={INK} strokeWidth="3">
          <circle cx="-56" cy="2" r="12" fill={INK} />
          <circle cx="-56" cy="2" r="4.5" fill="#ffffff" stroke="none" />
          <circle cx="40" cy="2" r="12" fill={INK} />
          <circle cx="40" cy="2" r="4.5" fill="#ffffff" stroke="none" />
        </g>
      )}

      {!buildingOut && (
        <text x="-48" y="-18" fontSize="18" textAnchor="middle">
          🧑
        </text>
      )}
      {!buildingOut && hasEmployee && (
        <text x="-18" y="-18" fontSize="16" textAnchor="middle">
          👧
        </text>
      )}

      {buildingOut && (
        <g>
          <text x="-96" y="8" fontSize="16">
            🚧
          </text>
          <text x="58" y="8" fontSize="16">
            🚧
          </text>
          <text x="-10" y="-78" fontSize="18" textAnchor="middle">
            🔧
          </text>
        </g>
      )}

      {reputation >= 4.5 && !buildingOut && (
        <text x="-20" y="-84" fontSize="14" textAnchor="middle">
          ✨ ⭐ ✨
        </text>
      )}
    </g>
  );
}

function Sky({ weather }: { weather: Weather }) {
  switch (weather) {
    case 'hot':
      return (
        <g>
          <circle cx="270" cy="34" r="24" fill="#ffd43b" />
          <circle cx="270" cy="34" r="32" fill="#ffd43b" opacity="0.35" />
        </g>
      );
    case 'sunny':
      return <circle cx="272" cy="32" r="20" fill="#ffd43b" />;
    case 'cloudy':
      return (
        <g fill="#ffffff" opacity="0.9">
          <ellipse cx="250" cy="34" rx="34" ry="16" />
          <ellipse cx="276" cy="30" rx="24" ry="14" />
          <ellipse cx="76" cy="28" rx="28" ry="13" />
        </g>
      );
    case 'rain':
      return (
        <g>
          <ellipse cx="250" cy="30" rx="38" ry="18" fill="#9fb3c8" />
          <ellipse cx="90" cy="26" rx="30" ry="14" fill="#9fb3c8" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line
              key={i}
              x1={40 + i * 34}
              y1={54 + (i % 3) * 8}
              x2={34 + i * 34}
              y2={70 + (i % 3) * 8}
              stroke="#5aa8e0"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    case 'cold':
      return (
        <g fill="#ffffff">
          <ellipse cx="252" cy="30" rx="34" ry="16" opacity="0.95" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <text key={i} x={30 + i * 50} y={60 + (i % 2) * 16} fontSize="14">
              ❄️
            </text>
          ))}
        </g>
      );
  }
}
