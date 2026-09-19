import { motion } from 'framer-motion';
import type { Stage, Weather } from '../../engine/types';

const INK = '#16181e';

/**
 * The business, drawn. Workshop shapes, not playground ones: a stainless truck
 * or a folding table, the same 2px ink, no cartoon sky. It still upgrades as
 * the player grows — wrap, awning, a second pair of hands.
 */
export function StandArt({
  businessId = 'lemonade',
  stage,
  weather,
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
  const shownCustomers = buildingOut ? 0 : Math.min(5, Math.max(0, Math.round(customers)));
  const truck = businessId === 'truck';

  return (
    <div className="scene" aria-label={truck ? 'Your food truck' : 'Your lemonade stand'}>
      <svg viewBox="0 0 320 190" role="img" aria-hidden="true">
        <Sky weather={weather} />
        <Street />
        {truck ? (
          <Truck
            stage={stage}
            buildingOut={buildingOut}
            hasEmployee={hasEmployee}
            hasWrap={hasSign}
          />
        ) : (
          <LemonadeStand
            stage={stage}
            hasEmployee={hasEmployee}
            hasSign={hasSign}
          />
        )}
      </svg>

      {Array.from({ length: shownCustomers }).map((_, i) => (
        <motion.div
          key={i}
          className="customer"
          initial={animateCustomers ? { x: -50, opacity: 0 } : false}
          animate={{ x: 18 + i * 36, opacity: 0.9 }}
          transition={{ delay: i * 0.18, type: 'spring', stiffness: 110, damping: 16 }}
          style={{ left: 0 }}
        >
          <Silhouette />
        </motion.div>
      ))}
    </div>
  );
}

function Silhouette() {
  return (
    <svg width="14" height="30" viewBox="0 0 14 30" aria-hidden="true">
      <circle cx="7" cy="5" r="3.2" fill="#2a3140" />
      <rect x="3.2" y="9" width="7.6" height="13" rx="2.4" fill="#2a3140" />
      <rect x="3.6" y="21" width="2.6" height="8" rx="1" fill="#2a3140" />
      <rect x="7.8" y="21" width="2.6" height="8" rx="1" fill="#2a3140" />
    </svg>
  );
}

function Figure({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={INK} opacity="0.92">
      <circle cx="0" cy="-16" r="4" />
      <rect x="-4.2" y="-11" width="8.4" height="14" rx="2.6" />
    </g>
  );
}

function LemonadeStand({
  stage,
  hasEmployee,
  hasSign,
}: {
  stage: Stage;
  hasEmployee: boolean;
  hasSign: boolean;
}) {
  return (
    <>
      <g transform={stage >= 2 ? 'translate(160 118) scale(1.08)' : 'translate(160 122)'}>
        {/* metal legs */}
        <g stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M-48 8 L-40 -8" />
          <path d="M48 8 L40 -8" />
          <path d="M-44 8 H44" />
        </g>
        {/* crate counter */}
        <rect
          x="-52"
          y="-16"
          width="104"
          height="22"
          rx="2"
          fill="#c4a574"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path d="M-48 -8 H48" stroke={INK} strokeWidth="1.5" opacity="0.35" />
        {/* metal pitcher */}
        <g stroke={INK} strokeWidth="2.2" strokeLinejoin="round">
          <rect x="-10" y="-38" width="16" height="20" rx="2" fill="#cfd5dc" />
          <path d="M6 -32 q8 4 0 12" fill="none" />
          <path d="M-12 -38 h20" strokeLinecap="round" />
        </g>
        {/* cups */}
        <rect x="12" y="-28" width="7" height="10" rx="1" fill="#f4f5f7" stroke={INK} strokeWidth="1.6" />
        <rect x="21" y="-28" width="7" height="10" rx="1" fill="#f4f5f7" stroke={INK} strokeWidth="1.6" />
        {stage >= 2 && (
          <path
            d="M-56 -44 h112 l-8 12 H-48 Z"
            fill="#2c3340"
            stroke={INK}
            strokeWidth="2.2"
          />
        )}
      </g>

      {hasSign && (
        <g transform="translate(64 100)" stroke={INK} strokeWidth="2.2">
          <rect x="-3" y="0" width="6" height="40" fill="#3d4450" />
          <rect x="-32" y="-28" width="64" height="30" rx="2" fill="#2c3340" />
          <path d="M-22 -14 h44" stroke="#e8edf3" strokeWidth="2" strokeLinecap="round" />
          <path d="M-16 -8 h32" stroke="#e8edf3" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </g>
      )}

      <Figure x={118} y={124} />
      {hasEmployee && <Figure x={196} y={124} scale={0.92} />}
    </>
  );
}

function Truck({
  stage,
  buildingOut,
  hasEmployee,
  hasWrap,
}: {
  stage: Stage;
  buildingOut: boolean;
  hasEmployee: boolean;
  hasWrap: boolean;
}) {
  const scale = stage >= 2 ? 1.06 : 1;
  return (
    <g transform={`translate(158 116) scale(${scale})`}>
      {/* body */}
      <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
        <rect x="-96" y="-62" width="132" height="58" rx="3" fill={buildingOut ? '#b7bcc4' : '#e4e8ee'} />
        {/* cab */}
        <path
          d="M36 -40 h18 a3 3 0 0 1 2.5 1.4 l11 15 a3 3 0 0 1 .6 1.8 V-4 h-32 z"
          fill="#2c3340"
        />
        <path d="M42 -35 h10 l8 12 h-18 z" fill="#7d93a8" strokeWidth="2" />
        {/* vent */}
        <rect x="-58" y="-70" width="28" height="8" rx="1" fill="#c5cad1" />
        {/* window / plywood */}
        {buildingOut ? (
          <g>
            <rect x="-84" y="-44" width="78" height="24" rx="1" fill="#8d7b62" />
            <path d="M-78 -40 L-12 -24 M-78 -24 L-12 -40" stroke={INK} strokeWidth="2" opacity="0.55" />
          </g>
        ) : (
          <>
            <rect x="-84" y="-44" width="78" height="24" rx="1" fill="#1c2430" />
            <rect x="-80" y="-40" width="70" height="16" fill="#3d5368" stroke="none" opacity="0.85" />
            <path d="M-86 -46 H-4" strokeWidth="3" strokeLinecap="square" />
          </>
        )}
        {/* menu board */}
        <rect x="4" y="-40" width="22" height="22" rx="1" fill="#242a33" strokeWidth="2" />
        <g stroke="#d7dde5" strokeWidth="1.6" opacity="0.7" strokeLinecap="round">
          <path d="M8 -34 h14" />
          <path d="M8 -29 h14" />
          <path d="M8 -24 h8" />
        </g>
        {/* bumper / shelf */}
        <path d="M-92 -12 H8" strokeWidth="3.5" strokeLinecap="square" />
        {/* stripe / wrap */}
        <path
          d="M-92 -6 H30"
          stroke={hasWrap || stage >= 3 ? '#1f7a4c' : '#4a5160'}
          strokeWidth="4"
          strokeLinecap="square"
        />
        {buildingOut && (
          <g>
            {/* caution stripe */}
            <path d="M-90 -18 H10" stroke="#c9a227" strokeWidth="5" />
            <g stroke={INK} strokeWidth="2" opacity="0.55">
              <path d="M-86 -21 l8 8" />
              <path d="M-74 -21 l8 8" />
              <path d="M-62 -21 l8 8" />
              <path d="M-50 -21 l8 8" />
              <path d="M-38 -21 l8 8" />
              <path d="M-26 -21 l8 8" />
              <path d="M-14 -21 l8 8" />
            </g>
          </g>
        )}
      </g>

      {buildingOut ? (
        <g fill="#3d4450" stroke={INK} strokeWidth="2">
          <path d="M-70 2 v10" />
          <path d="M-78 12 h16" />
          <path d="M20 2 v10" />
          <path d="M12 12 h16" />
        </g>
      ) : (
        <g stroke={INK} strokeWidth="2.2">
          <circle cx="-58" cy="4" r="11" fill="#1c1f26" />
          <circle cx="-58" cy="4" r="4" fill="#c5cad1" stroke="none" />
          <circle cx="38" cy="4" r="11" fill="#1c1f26" />
          <circle cx="38" cy="4" r="4" fill="#c5cad1" stroke="none" />
        </g>
      )}

      {!buildingOut && <Figure x={-46} y={-18} scale={0.85} />}
      {!buildingOut && hasEmployee && <Figure x={-22} y={-18} scale={0.8} />}
    </g>
  );
}

function Street() {
  return (
    <g>
      <g fill="#4a5562" opacity="0.4">
        <rect x="8" y="48" width="36" height="54" />
        <rect x="46" y="36" width="24" height="66" />
        <rect x="72" y="52" width="30" height="50" />
        <rect x="274" y="44" width="38" height="58" />
      </g>
      <rect x="0" y="148" width="320" height="5" fill="#3d4450" />
      <g stroke="#d5dde6" strokeWidth="1.5" opacity="0.28" strokeLinecap="square">
        <path d="M18 168 h44" />
        <path d="M78 168 h44" />
        <path d="M138 168 h44" />
        <path d="M198 168 h44" />
        <path d="M258 168 h44" />
      </g>
    </g>
  );
}

function Sky({ weather }: { weather: Weather }) {
  switch (weather) {
    case 'hot':
      return (
        <g>
          <circle cx="268" cy="32" r="18" fill="#e8c56b" />
          <circle cx="268" cy="32" r="26" fill="#e8c56b" opacity="0.22" />
        </g>
      );
    case 'sunny':
      return <circle cx="270" cy="30" r="16" fill="#e0d08a" />;
    case 'cloudy':
      return (
        <g fill="#d5dce4" opacity="0.95">
          <ellipse cx="248" cy="32" rx="32" ry="14" />
          <ellipse cx="272" cy="28" rx="22" ry="12" />
          <ellipse cx="78" cy="26" rx="26" ry="12" />
        </g>
      );
    case 'rain':
      return (
        <g>
          <ellipse cx="248" cy="28" rx="36" ry="16" fill="#7d8b99" />
          <ellipse cx="90" cy="24" rx="28" ry="12" fill="#7d8b99" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line
              key={i}
              x1={40 + i * 34}
              y1={52 + (i % 3) * 8}
              x2={34 + i * 34}
              y2={68 + (i % 3) * 8}
              stroke="#4d5d6c"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    case 'cold':
      return (
        <g fill="#e8edf3">
          <ellipse cx="250" cy="28" rx="32" ry="14" opacity="0.9" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={40 + i * 52} cy={58 + (i % 2) * 10} r="2.2" />
          ))}
        </g>
      );
  }
}
