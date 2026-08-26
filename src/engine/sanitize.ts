import type { GameState } from './types';
import { getBusiness } from '../config/businesses';
import { TIERS } from '../config/difficulty';
import { money } from './loans';

/**
 * Repair a run before it is used.
 *
 * A save can carry the current version number and still be missing a field: if
 * the game updates while someone has a run open, the next autosave stamps the
 * new version onto the old shape. One missing number then turns into `NaN`
 * arithmetic that spreads silently — a missing `inventoryCost` produced a NaN
 * cost of goods, a NaN profit, and a permanently poisoned profit history, while
 * cash carried on looking perfectly normal.
 *
 * So nothing trusts the shape of a loaded save. Every number is checked, and a
 * missing one is rebuilt from what is knowable.
 */
export function sanitizeRun(input: GameState): GameState {
  const s = { ...input };
  const num = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const finiteList = (v: unknown): number[] =>
    Array.isArray(v) ? v.filter((n) => typeof n === 'number' && Number.isFinite(n)) : [];

  s.cash = num(s.cash, 0);
  s.week = Math.max(1, Math.round(num(s.week, 1)));
  s.reputation = Math.min(5, Math.max(1, num(s.reputation, 3)));
  s.inventory = Math.max(0, Math.round(num(s.inventory, 0)));
  s.equipmentValue = Math.max(0, num(s.equipmentValue, 0));
  s.bonusCapacity = Math.max(0, num(s.bonusCapacity, 0));
  s.rivalPrice = num(s.rivalPrice, 1.5);
  // Added with the food truck. A lemonade run predating it has neither, and a
  // NaN here would shut the doors forever or charge a lease that never existed.
  s.weeksToOpen = Math.max(0, Math.round(num(s.weeksToOpen, 0)));
  s.assetWeekly = Math.max(0, num(s.assetWeekly, 0));
  s.rivalCooldown = num(s.rivalCooldown, 3);
  s.weatherStreak = Math.max(1, num(s.weatherStreak, 1));
  s.miniGoalStreak = Math.max(0, num(s.miniGoalStreak, 0));
  s.roughWeeks = Math.max(0, num(s.roughWeeks, 0));
  s.stage = (Math.min(3, Math.max(1, Math.round(num(s.stage, 1)))) || 1) as GameState['stage'];

  s.profitHistory = finiteList(s.profitHistory);
  s.revenueHistory = finiteList(s.revenueHistory);
  s.history = Array.isArray(s.history) ? s.history : [];
  s.badges = Array.isArray(s.badges) ? s.badges : [];
  s.loans = Array.isArray(s.loans) ? s.loans : [];
  s.marketing = Array.isArray(s.marketing) ? s.marketing : [];
  s.employees = Array.isArray(s.employees) ? s.employees : [];
  s.pendingEvents = Array.isArray(s.pendingEvents) ? s.pendingEvents : [];
  s.recentEventIds = Array.isArray(s.recentEventIds) ? s.recentEventIds : [];
  s.discussionLog = Array.isArray(s.discussionLog) ? s.discussionLog : [];

  const t = s.totals ?? ({} as GameState['totals']);
  s.totals = {
    revenue: num(t.revenue, 0),
    profit: num(t.profit, 0),
    customers: num(t.customers, 0),
    marketingSpend: num(t.marketingSpend, 0),
    interestPaid: num(t.interestPaid, 0),
  };

  // Stock value has to agree with the stock on hand. When it is missing, price
  // what is in the cooler at today's cost — the best estimate available, and
  // far better than letting NaN through.
  const biz = getBusiness(s.businessId);
  const tier = TIERS[s.tier] ?? TIERS.pro;
  const quality = biz.qualities.find((q) => q.id === s.qualityId) ?? biz.qualities[0];
  const unitCost = quality.unitCost * tier.unitCostScale;
  s.inventoryCost =
    s.inventory === 0 ? 0 : money(Math.max(0, num(s.inventoryCost, s.inventory * unitCost)));

  // Event lines gained a title and a per-card cash figure so the recap could
  // name which card took the money. A run that was open when that shipped keeps
  // the old two-field shape, and the recap would have printed the card's name as
  // "undefined". Fill the gap rather than force everyone mid-run to start over
  // for what is only a label.
  if (s.lastResult) {
    const lines = Array.isArray(s.lastResult.eventLines) ? s.lastResult.eventLines : [];
    s.lastResult = {
      ...s.lastResult,
      // Added when the recap started valuing the sales a sell-out missed. A run
      // open across that deploy has no price on its last result.
      price: num(s.lastResult.price, s.price),
      // Treats became a batch bought up front. A run open across that deploy has
      // a last result from before batches existed.
      sideWasted: Math.max(0, Math.round(num(s.lastResult.sideWasted, 0))),
      sideBatchSize: Math.max(0, Math.round(num(s.lastResult.sideBatchSize, 0))),
      assetPayment: Math.max(0, num(s.lastResult.assetPayment, 0)),
      buildingOut: Boolean(s.lastResult.buildingOut),
      eventLines: lines.map((l) => ({
        emoji: typeof l?.emoji === 'string' ? l.emoji : '⚡',
        text: typeof l?.text === 'string' ? l.text : '',
        title: typeof l?.title === 'string' ? l.title : 'What happened',
        cash: num(l?.cash, 0),
      })),
    };
  }

  s.loans = s.loans.map((l) => ({
    ...l,
    balance: Math.max(0, num(l.balance, 0)),
    principalBalance: Math.max(0, num(l.principalBalance, 0)),
    weeklyPayment: Math.max(0, num(l.weeklyPayment, 0)),
    weeksRemaining: Math.max(0, Math.round(num(l.weeksRemaining, 0))),
    totalInterest: Math.max(0, num(l.totalInterest, 0)),
    missedPayments: Math.max(0, Math.round(num(l.missedPayments, 0))),
  }));

  return s;
}
