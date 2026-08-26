import { motion } from 'framer-motion';
import type { Stage, Weather } from '../../engine/types';

/**
 * The business, drawn. It physically upgrades as the player grows: a bigger
 * stand, an awning, a sign, a helper. Progress you can see beats numbers.
 */
export function StandArt({
  stage,
  weather,
  reputation,
  hasEmployee,
  hasSign,
  customers = 0,
  animateCustomers = false,
}: {
  stage: Stage;
  weather: Weather;
  reputation: number;
  hasEmployee: boolean;
  hasSign: boolean;
  customers?: number;
  animateCustomers?: boolean;
}) {
  const shownCustomers = Math.min(6, Math.max(0, Math.round(customers)));
  const faces = ['🧒', '👦', '👩', '🧑', '👴', '👧'];

  return (
    <div className="scene" aria-label="Your lemonade stand">
      <svg viewBox="0 0 320 190" role="img" aria-hidden="true">
        {/* sky + ground handled by CSS gradient; draw the props */}
        <Sky weather={weather} />
        {/* stand */}
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
          {/* pitcher */}
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
          {/* cups */}
          <rect x="20" y="-26" width="10" height="12" rx="2" fill="#ffffff" stroke="#cfd9e6" />
          <rect x="32" y="-26" width="10" height="12" rx="2" fill="#ffffff" stroke="#cfd9e6" />
          {stage >= 3 && (
            <rect x="-44" y="-26" width="10" height="12" rx="2" fill="#ffffff" stroke="#cfd9e6" />
          )}
        </g>

        {/* sign */}
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

        {/* owner */}
        <text x="122" y="120" fontSize="26" textAnchor="middle">
          🧑
        </text>
        {hasEmployee && (
          <text x="196" y="120" fontSize="24" textAnchor="middle">
            👧
          </text>
        )}

        {/* stars floating above when reputation is high */}
        {reputation >= 4.5 && (
          <text x="160" y="34" fontSize="16" textAnchor="middle">
            ✨ ⭐ ✨
          </text>
        )}
      </svg>

      {/* customers walk up during the week animation */}
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
