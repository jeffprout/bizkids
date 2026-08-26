import type { Tier } from '../engine/types';

export interface TierConfig {
  id: Tier;
  name: string;
  ages: string;
  emoji: string;
  blurb: string;
  /** Max decision cards in one week, event cards not counted. Spot, price and
   *  supplies are asked every week and take three of these. */
  maxCards: number;
  /**
   * How far a player may move the price, and how finely — as MULTIPLES of what
   * the business charges normally, never as dollars.
   *
   * These used to be dollar amounts, which quietly assumed every business was a
   * lemonade stand. The food truck opens at $9 a meal against a $5 ceiling, so
   * the "more expensive" button did nothing at all and "cheaper" cut the price
   * by nearly half in one tap. What counts as a fair price belongs to the
   * business; how far a tier lets you stray from it belongs to the tier.
   */
  priceStepMult: number;
  priceFloorMult: number;
  priceCeilingMult: number;
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
  /** Scales every location's weekly overhead. */
  fixedCostScale: number;
  /** Scales what a unit costs to make. Rookie keeps margins forgiving. */
  unitCostScale: number;
  /** Scales how much unsold stock goes bad. */
  spoilScale: number;
  /**
   * Scales the cash and stock swings an event card causes. Event costs are
   * written at Pro scale; a $30 hit is a rounding error at Tycoon and fatal at
   * Rookie, so it has to move with the tier.
   */
  eventScale: number;
}

export const TIERS: Record<Tier, TierConfig> = {
  rookie: {
    id: 'rookie',
    name: 'Rookie',
    ages: 'Ages 6-9',
    emoji: '🐣',
    blurb: 'Small money, gentle weeks, no rivals.',
    maxCards: 5,
    priceStepMult: 0.25,
    priceFloorMult: 0.25,
    priceCeilingMult: 3,
    elasticity: 1.1,
    lateFee: 2,
    showFullPnL: false,
    showCAC: false,
    restockStep: 10,
    maxWords: 12,
    fixedCostScale: 0.3,
    unitCostScale: 0.5,
    spoilScale: 0.5,
    eventScale: 0.3,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    ages: 'Ages 10-14',
    emoji: '🚀',
    blurb: 'Overhead, a price war, and weeks you lose money.',
    maxCards: 6,
    priceStepMult: 0.167,
    priceFloorMult: 0.167,
    priceCeilingMult: 3.33,
    elasticity: 1.35,
    lateFee: 5,
    showFullPnL: true,
    showCAC: true,
    restockStep: 10,
    maxWords: 25,
    fixedCostScale: 1,
    unitCostScale: 1,
    spoilScale: 1,
    eventScale: 1,
  },
  tycoon: {
    id: 'tycoon',
    name: 'Tycoon',
    ages: 'Ages 14+',
    emoji: '🏦',
    blurb: 'Real amortized loans, leases, and money that bites back.',
    maxCards: 8,
    priceStepMult: 0.029,
    priceFloorMult: 0.143,
    priceCeilingMult: 4.57,
    elasticity: 1.5,
    lateFee: 10,
    showFullPnL: true,
    showCAC: true,
    restockStep: 25,
    maxWords: 60,
    fixedCostScale: 3,
    unitCostScale: 1.6,
    spoilScale: 1.1,
    eventScale: 2.5,
  },
};
