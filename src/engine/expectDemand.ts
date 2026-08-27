import type { BusinessDef, GameState, Weather } from './types';
import type { TierConfig } from '../config/difficulty';
import { computeDemand, rivalShare } from './demand';

/**
 * How many people to expect this week, and why.
 *
 * Jeff, who has run several real businesses, after a Tycoon run: "I don't
 * understand how the amount of people visiting the truck is calculated. It seems
 * very arbitrary but slightly tied to weather."
 *
 * He was right, and not because the model is arbitrary — it is not — but because
 * FOUR different things were moving the number and the screen showed none of
 * them: the season, the sky, the rival's price, and week-to-week luck. A player
 * was asked to order stock against a number they had no way to estimate, which
 * makes the one decision the whole game is built on a guess. Throwing stock away
 * then reads as bad luck rather than as a bad order.
 *
 * So the same model that runs the week is run ahead of it, against the FORECAST
 * rather than the truth, and the answer is put on the supplies card. The
 * uncertainty that is left is the honest kind: the forecast is wrong about a
 * third of the time, and cards land that nobody could have planned for.
 */
export interface DemandExpectation {
  /** A bad week for the spot, at the forecast weather. */
  low: number;
  /** The middle of the range — what a normal week looks like. */
  mid: number;
  high: number;
  /**
   * What to actually order. Not the middle and not the peak: the point where one
   * more portion costs about what it earns. Selling out loses the whole margin
   * on a plate; over-ordering loses only what the wasted food cost, and only the
   * part that spoils. That asymmetry is the newsvendor problem, and it is the
   * lesson the ordering card exists to teach.
   */
  order: number;
  /** The two or three things moving it most, biggest first, for the screen. */
  drivers: { label: string; mult: number }[];
}

export function expectDemand(inp: {
  state: GameState;
  biz: BusinessDef;
  tier: TierConfig;
  price: number;
  qualityId: string;
  locationId: string;
  /** Campaigns bought on this screen but not yet in state. */
  extraMarketingBoost?: number;
  /** Override the weather to reason about. Defaults to the forecast. */
  weather?: Weather;
}): DemandExpectation {
  const { state, biz, tier } = inp;
  const location = biz.locations.find((l) => l.id === inp.locationId) ?? biz.locations[0];
  const quality = biz.qualities.find((q) => q.id === inp.qualityId) ?? biz.qualities[0];
  const weather = inp.weather ?? state.forecast;

  const at = (noiseRoll: number) =>
    computeDemand({
      // The forecast, not the truth. A player deciding on Sunday only has the
      // forecast, and the game must not quietly know better than they do.
      state: { ...state, weather },
      location,
      quality,
      bizSeasonMods: biz.seasonMods,
      bizWeatherMods: biz.weatherMods,
      price: inp.price,
      referencePrice: biz.referencePrice[state.tier],
      elasticity: tier.elasticity,
      conversionRate: biz.conversionRate,
      eventDemandMod: 1,
      noiseRoll,
    });

  const facesRival = biz.rival.tiers.includes(state.tier);
  const rival = facesRival ? rivalShare(inp.price, state.rivalPrice, biz.rival.sensitivity) : 1;
  const lift = 1 + (inp.extraMarketingBoost ?? 0);
  const scale = (n: number) => Math.max(0, Math.round(n * rival * lift));

  const mid = at(0.5);
  const low = scale(at(0.15).demand);
  const high = scale(at(0.85).demand);
  const midDemand = scale(mid.demand);

  /**
   * Where to sit in that range. A plate not sold costs the whole margin; a plate
   * wasted costs what the food cost, and only the share of it that spoils. When
   * running out hurts more than throwing out, the right order is above the
   * middle — which is the entire point of the card.
   */
  const unitCost = quality.unitCost * tier.unitCostScale;
  const marginPerSale = Math.max(0.01, inp.price - unitCost);
  const costPerWasted = Math.max(0.01, unitCost * biz.spoilRate * tier.spoilScale);
  const ratio = marginPerSale / (marginPerSale + costPerWasted);
  const order = Math.round(low + (high - low) * ratio);

  const drivers = [
    { label: seasonLabel(state.season), mult: mid.seasonMod },
    { label: weatherLabel(weather), mult: mid.weatherMod },
    { label: `${state.reputation.toFixed(1)} stars`, mult: mid.repMod },
    { label: 'your price', mult: mid.priceMod },
    { label: quality.name, mult: mid.qualityMod },
    { label: 'advertising', mult: mid.marketingMod * lift },
    { label: 'the rival', mult: rival },
  ]
    // Only things actually pushing the number around are worth screen space.
    .filter((d) => Math.abs(d.mult - 1) >= 0.06)
    .sort((a, b) => Math.abs(b.mult - 1) - Math.abs(a.mult - 1));

  return { low, mid: midDemand, high, order, drivers };
}

const seasonLabel = (s: GameState['season']) => s[0].toUpperCase() + s.slice(1);

const weatherLabel = (w: Weather) =>
  ({ hot: 'heat', sunny: 'sun', cloudy: 'clouds', rain: 'rain', cold: 'cold' })[w];
