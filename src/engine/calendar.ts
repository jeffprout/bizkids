import type { Season, Weather } from './types';
import { weightedPick } from './rng';

/** Week 1 is early April, so a 50-week run walks a real year:
 *  spring start, summer boom, fall fade, winter slog, spring again for the sale. */
const START_YEAR_WEEK = 13;

export function seasonForWeek(week: number): Season {
  const yearWeek = ((week - 1 + START_YEAR_WEEK) % 52) + 1;
  if (yearWeek >= 10 && yearWeek <= 22) return 'spring';
  if (yearWeek >= 23 && yearWeek <= 35) return 'summer';
  if (yearWeek >= 36 && yearWeek <= 48) return 'fall';
  return 'winter';
}

export const SEASON_INFO: Record<Season, { label: string; emoji: string; demandMod: number }> = {
  spring: { label: 'Spring', emoji: '🌷', demandMod: 1.0 },
  summer: { label: 'Summer', emoji: '☀️', demandMod: 1.35 },
  fall: { label: 'Fall', emoji: '🍂', demandMod: 0.8 },
  winter: { label: 'Winter', emoji: '❄️', demandMod: 0.45 },
};

export const WEATHER_INFO: Record<Weather, { label: string; emoji: string; demandMod: number }> = {
  hot: { label: 'Heat wave', emoji: '🥵', demandMod: 1.8 },
  sunny: { label: 'Sunny', emoji: '😎', demandMod: 1.25 },
  cloudy: { label: 'Cloudy', emoji: '☁️', demandMod: 0.9 },
  rain: { label: 'Rainy', emoji: '🌧️', demandMod: 0.45 },
  cold: { label: 'Freezing', emoji: '🥶', demandMod: 0.35 },
};

const WEATHER_ODDS: Record<Season, [Weather, number][]> = {
  spring: [['hot', 5], ['sunny', 40], ['cloudy', 30], ['rain', 22], ['cold', 3]],
  summer: [['hot', 28], ['sunny', 45], ['cloudy', 15], ['rain', 12], ['cold', 0]],
  fall: [['hot', 3], ['sunny', 32], ['cloudy', 35], ['rain', 25], ['cold', 5]],
  winter: [['hot', 0], ['sunny', 20], ['cloudy', 30], ['rain', 20], ['cold', 30]],
};

export function rollWeather(season: Season, roll: number): Weather {
  const table = WEATHER_ODDS[season];
  return weightedPick(table, (t) => t[1], roll)?.[0] ?? 'sunny';
}

/** Conditions ordered from best to worst for selling a cold drink. */
const WEATHER_SCALE: Weather[] = ['hot', 'sunny', 'cloudy', 'rain', 'cold'];

/**
 * The forecast the player orders against. It is right about two thirds of the
 * time and otherwise off by one step — which is what makes deciding how much to
 * buy an actual bet instead of arithmetic.
 */
export function forecastFor(actual: Weather, roll: number): Weather {
  if (roll < 0.65) return actual;
  const i = WEATHER_SCALE.indexOf(actual);
  const drift = roll < 0.825 ? -1 : 1;
  const j = Math.max(0, Math.min(WEATHER_SCALE.length - 1, i + drift));
  return WEATHER_SCALE[j];
}
