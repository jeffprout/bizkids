import { motion } from 'framer-motion';
import type { Weather } from '../../engine/types';

/**
 * The business, as a painted scene. Weather tints it; customers walk the
 * foreground. The photo is the lot — SVG on top is rain, snow, and the line.
 */
export function StandArt({
  businessId = 'lemonade',
  weather,
  buildingOut = false,
  customers = 0,
  animateCustomers = false,
}: {
  businessId?: string;
  stage: number;
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
  const src = truck
    ? buildingOut
      ? '/art/truck-refit.jpg'
      : '/art/truck-open.jpg'
    : '/art/lemonade.jpg';

  return (
    <div
      className="scene"
      data-weather={weather}
      aria-label={truck ? 'Your food truck' : 'Your lemonade stand'}
    >
      <img className="scene-photo" src={src} alt="" />
      <svg className="scene-weather" viewBox="0 0 320 190" role="img" aria-hidden="true">
        <WeatherLayer weather={weather} />
      </svg>

      {Array.from({ length: shownCustomers }).map((_, i) => (
        <motion.div
          key={i}
          className="customer"
          initial={animateCustomers ? { x: -50, opacity: 0 } : false}
          animate={{ x: 16 + i * 38, opacity: 1 }}
          transition={{ delay: i * 0.18, type: 'spring', stiffness: 110, damping: 16 }}
          style={{ left: 0 }}
        >
          <Person n={i} />
        </motion.div>
      ))}
    </div>
  );
}

const SHIRTS = ['#2c6e8f', '#c45c3e', '#3d6b48', '#6b4e9a', '#c9a227'];

function Person({ n }: { n: number }) {
  const shirt = SHIRTS[n % SHIRTS.length];
  return (
    <svg width="16" height="32" viewBox="0 0 16 32" aria-hidden="true">
      <circle cx="8" cy="5.5" r="3.4" fill="#e6c8a8" />
      <rect x="3.4" y="9.4" width="9.2" height="12.4" rx="2.6" fill={shirt} />
      <rect x="4" y="21.4" width="3" height="9" rx="1" fill="#2a3140" />
      <rect x="9" y="21.4" width="3" height="9" rx="1" fill="#2a3140" />
    </svg>
  );
}

function WeatherLayer({ weather }: { weather: Weather }) {
  switch (weather) {
    case 'hot':
      return (
        <g>
          <circle cx="278" cy="28" r="16" fill="#f4d35e" opacity="0.95" />
          <circle cx="278" cy="28" r="26" fill="#f4d35e" opacity="0.18" />
        </g>
      );
    case 'sunny':
      return <circle cx="278" cy="26" r="14" fill="#ffe566" opacity="0.85" />;
    case 'cloudy':
      return (
        <g fill="#f4f7fb" opacity="0.72">
          <ellipse cx="250" cy="28" rx="38" ry="14" />
          <ellipse cx="274" cy="24" rx="24" ry="12" />
          <ellipse cx="70" cy="22" rx="30" ry="12" />
        </g>
      );
    case 'rain':
      return (
        <g>
          <ellipse cx="248" cy="22" rx="40" ry="14" fill="#6d7e8e" opacity="0.55" />
          <ellipse cx="80" cy="18" rx="32" ry="12" fill="#6d7e8e" opacity="0.45" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <line
              key={i}
              x1={24 + i * 32}
              y1={48 + (i % 3) * 10}
              x2={16 + i * 32}
              y2={78 + (i % 3) * 10}
              stroke="#9eb4c6"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.85"
            />
          ))}
        </g>
      );
    case 'cold':
      return (
        <g fill="#f7fbff">
          <ellipse cx="250" cy="24" rx="36" ry="13" opacity="0.55" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <circle key={i} cx={28 + i * 44} cy={56 + (i % 2) * 14} r="2.4" opacity="0.9" />
          ))}
        </g>
      );
  }
}
