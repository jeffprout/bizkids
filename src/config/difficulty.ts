import type { Tier } from '../engine/types';

export interface TierConfig {
  id: Tier;
  name: string;
  ages: string;
  emoji: string;
  blurb: string;
  /** Max decision cards in one week, event cards not counted. Price and
   *  supplies always take two of these. */
  maxCards: number;
  /** Price slider step. Rookie uses round quarters. */
  priceStep: number;
  minPrice: number;
  maxPrice: number;
  /** How hard customers react to price. */
  elasticity: number;
  /** Late payment fee. */
  lateFee: number;
  /** Show the full profit-and-loss recap, or the simple money-in/money-out one. */
  showFullPnL: boolean;
  /** Show cost-per-customer marketing readouts. */
  showCAC: boolean;
  /** Restock is chosen in packs of this size. */
  restockStep: number;
  /** Rough cap on words per screen, per the engagement rules. */
  maxWords: number;
}

export const TIERS: Record<Tier, TierConfig> = {
  rookie: {
    id: 'rookie',
    name: 'Rookie',
    ages: 'Ages 6-8',
    emoji: '🐣',
    blurb: 'Small money. Two choices. Big fun.',
    maxCards: 3,
    priceStep: 0.25,
    minPrice: 0.25,
    maxPrice: 3,
    elasticity: 1.1,
    lateFee: 2,
    showFullPnL: false,
    showCAC: false,
    restockStep: 10,
    maxWords: 12,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    ages: 'Ages 9-12',
    emoji: '🚀',
    blurb: 'Real costs, real loans, real profit.',
    maxCards: 4,
    priceStep: 0.25,
    minPrice: 0.25,
    maxPrice: 5,
    elasticity: 1.35,
    lateFee: 5,
    showFullPnL: true,
    showCAC: true,
    restockStep: 10,
    maxWords: 25,
  },
  tycoon: {
    id: 'tycoon',
    name: 'Tycoon',
    ages: 'Ages 13+',
    emoji: '🏦',
    blurb: 'Amortized loans, NNN leases, CAC. Phase 2.',
    maxCards: 6,
    priceStep: 0.05,
    minPrice: 0.25,
    maxPrice: 8,
    elasticity: 1.5,
    lateFee: 10,
    showFullPnL: true,
    showCAC: true,
    restockStep: 25,
    maxWords: 60,
  },
};
