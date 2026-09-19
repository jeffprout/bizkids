import { describe, expect, it } from 'vitest';
import { newGame } from '../../engine/newGame';
import { rollMiniGoal, fitMiniGoal } from '../milestones';
import type { GameState, WeekResult } from '../../engine/types';

/**
 * Jeff, week 43 of Tycoon, $265k in the bank, truck worth $920k: the weekly
 * goal was "Make $691 profit". Last week was a sick rainy write-off. 10%
 * more than a disaster is not a goal, it is a rounding error.
 */
function tycoonWeek43(): GameState {
  const s = newGame({
    profileId: 'goals',
    businessId: 'truck',
    tier: 'tycoon',
    financing: {
      loanIds: ['sba-120000'],
      savingsUsed: 70000,
      locationId: 'office-park',
      assetId: 'new-build',
    },
    seed: 3,
  });
  const typical: Partial<WeekResult> = { served: 900, profit: 4200, revenue: 12000 };
  return {
    ...s,
    week: 43,
    cash: 265177,
    profitHistory: [4100, 4800, 3900, 4500, 5200, 4300, 4000, 628],
    history: Array.from({ length: 8 }, () => typical as WeekResult),
    lastResult: { served: 590, profit: 628, revenue: 6342 } as WeekResult,
    revenueHistory: [12000, 11000, 13000, 10000, 12500, 11500, 10800, 6342],
  };
}

describe('weekly goals scale with the business', () => {
  it('does not ask a tycoon to make $691 after a bad week', () => {
    const goal = rollMiniGoal(tycoonWeek43(), 0.5);
    expect(goal.kind).toBe('profit');
    // Median of those eight weeks is about $4,200. A 10% stretch, on a $50
    // grid, is a few thousand — not last week's leftover.
    expect(goal.target).toBeGreaterThan(3000);
    expect(goal.target).toBeLessThan(8000);
  });

  it('does not ask them to grow a $265k pile by 15% in one week', () => {
    const goal = rollMiniGoal(tycoonWeek43(), 0.25);
    expect(goal.kind).toBe('cashEnd');
    const growBy = goal.target - 265177;
    expect(growBy).toBeGreaterThan(3000);
    expect(growBy).toBeLessThan(8000);
  });

  it('still gives a lemonade stand a small, reachable number', () => {
    const s = newGame({
      profileId: 'goals',
      businessId: 'lemonade',
      tier: 'pro',
      financing: { loanIds: [], savingsUsed: 55, locationId: 'park' },
      seed: 3,
    });
    const small: GameState = {
      ...s,
      cash: 80,
      profitHistory: [12, 18, 9, 14],
      history: [{ served: 40 } as WeekResult, { served: 55 } as WeekResult],
      lastResult: { served: 40, profit: 12, revenue: 60 } as WeekResult,
    };
    const profit = rollMiniGoal(small, 0.5);
    expect(profit.kind).toBe('profit');
    expect(profit.target).toBeGreaterThanOrEqual(10);
    expect(profit.target).toBeLessThan(40);
  });

  it('does not ask a winter-losing tycoon to make $5', () => {
    const s = tycoonWeek43();
    const winter: GameState = {
      ...s,
      week: 46,
      cash: 270594,
      profitHistory: [-1800, -400, 200, -2200, 80, -1500, 628, -2006],
      revenueHistory: [7200, 6400, 8100, 5800, 6900, 6100, 6342, 5900],
      lastResult: { served: 590, profit: -2006, revenue: 5900 } as WeekResult,
    };
    const goal = rollMiniGoal(winter, 0.5);
    expect(goal.kind).toBe('profit');
    // A tenth of a ~$6,400 week, plus a little stretch — not lemonade money.
    expect(goal.target).toBeGreaterThan(500);
    expect(goal.target).toBeLessThan(2000);
  });

  it('resizes a $5 profit chip on a live tycoon run', () => {
    const winter = {
      ...tycoonWeek43(),
      week: 46,
      cash: 270594,
      profitHistory: [-1800, -400, 200, -2200, 80, -1500, 628, -2006],
      revenueHistory: [7200, 6400, 8100, 5800, 6900, 6100, 6342, 5900],
      miniGoal: { id: 'profit', kind: 'profit' as const, target: 5, label: 'Make {target} profit' },
    };
    const fitted = fitMiniGoal(winter);
    expect(fitted.kind).toBe('profit');
    expect(fitted.target).toBeGreaterThan(500);
    expect(fitted.target).toBeLessThan(2000);
  });
});
