import { motion } from 'framer-motion';
import type { Weather } from '../../engine/types';

/**
 * The business, as a photograph of the lot. Weather is a tint on the photo,
 * not a sticker on top of it.
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
      ? '/art/lot-shut.jpg'
      : '/art/lot-open.jpg'
    : '/art/lot-stand.jpg';

  return (
    <div
      className="scene"
      data-weather={weather}
      aria-label={truck ? 'Your food truck' : 'Your lemonade stand'}
    >
      <img className="scene-photo" src={src} alt="" />

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
