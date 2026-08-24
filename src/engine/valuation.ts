import type { GameState } from './types';
import { money } from './loans';

export interface Valuation {
  /** Average weekly profit over the trailing year. */
  avgWeeklyProfit: number;
  /** Annualised earnings — what a buyer actually values. */
  annualProfit: number;
  /** Weeks of history the offer is based on. */
  weeksCounted: number;
  multiple: number;
  /** Earnings x multiple. */
  goodwill: number;
  equipmentValue: number;
  inventoryValue: number;
  cash: number;
  debtPayoff: number;
  offer: number;
  /** Plain-language reasons the multiple landed where it did. */
  reasons: { label: string; effect: string }[];
}

/**
 * Buyers value on trailing twelve months, and for a good reason: a seasonal
 * business looks broke in February and unstoppable in July. Using a short recent
 * window would price every run on whatever season it happened to end in.
 */
const TTM_WEEKS = 52;
/** Volatility is judged on the recent past, the way a buyer actually judges it. */
const STEADY_WEEKS = 12;

export function valueBusiness(
  state: GameState,
  opts: {
    multipleLow: number;
    multipleHigh: number;
    inventoryUnitCost: number;
  },
): Valuation {
  const window = state.profitHistory.slice(-TTM_WEEKS);
  const revenueWindow = state.revenueHistory.slice(-TTM_WEEKS);
  const avgWeeklyProfit = window.length
    ? window.reduce((s, p) => s + p, 0) / window.length
    : 0;
  const annualProfit = money(avgWeeklyProfit * 52);

  const reasons: { label: string; effect: string }[] = [];
  const span = opts.multipleHigh - opts.multipleLow;

  // Reputation is the biggest driver: loyal customers survive the handover.
  const repScore = Math.max(0, Math.min(1, (state.reputation - 1) / 4));
  reasons.push({
    label: `${state.reputation.toFixed(1)} star reputation`,
    effect: repScore > 0.6 ? 'raises the offer' : 'lowers the offer',
  });

  // Margin: a buyer pays more for every dollar of sales that survives to profit.
  const revenue = revenueWindow.reduce((s, r) => s + r, 0);
  const profit = window.reduce((s, p) => s + p, 0);
  const margin = revenue > 0 ? profit / revenue : 0;
  // 40% profit margin or better is an excellent small business.
  const marginScore = Math.max(0, Math.min(1, margin / 0.4));
  reasons.push({
    label: `${Math.round(margin * 100)}% of sales became profit`,
    effect: marginScore > 0.6 ? 'raises the offer' : 'lowers the offer',
  });

  // Steadiness: a buyer pays more for a business that does not swing wildly.
  const recent = state.profitHistory.slice(-STEADY_WEEKS);
  const mean = recent.length ? recent.reduce((s, p) => s + p, 0) / recent.length : 0;
  const variance = recent.length
    ? recent.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / recent.length
    : 0;
  const cv = Math.sqrt(variance) / Math.max(1, Math.abs(mean));
  const steadyScore = Math.max(0, Math.min(1, 1 - cv));
  reasons.push({
    label: steadyScore > 0.6 ? 'Steady week to week' : 'Bumpy week to week',
    effect: steadyScore > 0.6 ? 'raises the offer' : 'lowers the offer',
  });

  const blend = repScore * 0.5 + marginScore * 0.3 + steadyScore * 0.2;
  const multiple = Math.round((opts.multipleLow + span * blend) * 100) / 100;

  const goodwill = money(Math.max(0, annualProfit) * multiple);
  const inventoryValue = money(state.inventory * opts.inventoryUnitCost);
  const debtPayoff = money(
    state.loans.filter((l) => !l.paidOff).reduce((s, l) => s + l.principalBalance, 0),
  );

  const offer = money(
    goodwill + state.equipmentValue + inventoryValue + state.cash - debtPayoff,
  );

  return {
    avgWeeklyProfit: money(avgWeeklyProfit),
    annualProfit,
    weeksCounted: window.length,
    multiple,
    goodwill,
    equipmentValue: money(state.equipmentValue),
    inventoryValue,
    cash: money(state.cash),
    debtPayoff,
    offer: Math.max(0, offer),
    reasons,
  };
}
