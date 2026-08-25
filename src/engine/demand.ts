import type { GameState, LocationDef, QualityDef } from './types';
import { SEASON_INFO, WEATHER_INFO } from './calendar';

/**
 * How much sales change when you change price.
 *   multiplier = (referencePrice / price) ^ elasticity
 * Elasticity ~1.3 means a 10% price cut buys about 13% more customers — in the
 * real range for a low-differentiation product. Clamped so the curve never
 * produces nonsense at the extremes of the slider.
 */
export function priceCurve(price: number, referencePrice: number, elasticity: number): number {
  if (price <= 0) return 3;
  const raw = Math.pow(referencePrice / price, elasticity);
  return Math.max(0.05, Math.min(3, raw));
}

/** Reputation is a demand multiplier, so service compounds. 1 star = 0.7x, 5 stars = 1.35x. */
export function reputationMod(reputation: number): number {
  return 0.7 + (reputation - 1) * 0.1625;
}

export interface DemandInputs {
  state: GameState;
  location: LocationDef;
  quality: QualityDef;
  price: number;
  referencePrice: number;
  elasticity: number;
  /** Share of passers-by who buy. */
  conversionRate: number;
  /** Product of every event-driven demand multiplier for this week. */
  eventDemandMod: number;
  /** 0..1 random roll for week-to-week noise. */
  noiseRoll: number;
}

export interface DemandBreakdown {
  base: number;
  seasonMod: number;
  weatherMod: number;
  repMod: number;
  priceMod: number;
  qualityMod: number;
  marketingMod: number;
  eventMod: number;
  noiseMod: number;
  demand: number;
}

export function computeDemand(inp: DemandInputs): DemandBreakdown {
  const { state, location, quality, price, referencePrice, elasticity } = inp;

  // Two separate seasonal effects: how thirsty people are, and how busy this
  // particular spot is at this time of year.
  const seasonMod = SEASON_INFO[state.season].demandMod * location.seasonMods[state.season];
  const weatherMod = WEATHER_INFO[state.weather].demandMod;
  const repMod = reputationMod(state.reputation);
  const priceMod = priceCurve(price, referencePrice, elasticity);
  const qualityMod = quality.demandMod;
  const marketingMod = 1 + state.marketing.reduce((s, m) => s + m.boost, 0);

  // Busy-but-swingy locations vary more week to week.
  const swing = location.volatility;
  const noiseMod = 1 - swing + inp.noiseRoll * swing * 2;

  const demand =
    location.baseTraffic *
    inp.conversionRate *
    seasonMod *
    weatherMod *
    repMod *
    priceMod *
    qualityMod *
    marketingMod *
    inp.eventDemandMod *
    noiseMod;

  return {
    base: location.baseTraffic * inp.conversionRate,
    seasonMod,
    weatherMod,
    repMod,
    priceMod,
    qualityMod,
    marketingMod,
    eventMod: inp.eventDemandMod,
    noiseMod,
    demand: Math.max(0, Math.round(demand)),
  };
}

/**
 * Leftover stock spoils. Lemons, ice and cut fruit do not survive the week, so a
 * fixed share of what you did not sell is thrown out.
 */
export function applySpoilage(leftover: number, spoilRate: number): { kept: number; spoiled: number } {
  const spoiled = Math.floor(leftover * spoilRate);
  return { kept: leftover - spoiled, spoiled };
}

/**
 * The stand across the street. If they undercut you, some of your customers
 * walk over there; if you are the cheaper one, you take some of theirs. Kept
 * gentle enough that price is a lever, not a cliff.
 */
export function rivalShare(myPrice: number, rivalPrice: number, sensitivity: number): number {
  if (rivalPrice <= 0) return 1;
  const ratio = myPrice / rivalPrice;
  // ratio 1.0 -> no effect. 1.5 -> you lose share. 0.75 -> you gain some.
  const effect = 1 - (ratio - 1) * sensitivity;
  return Math.max(0.35, Math.min(1.4, effect));
}
