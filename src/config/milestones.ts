import type { GameState, MiniGoal } from '../engine/types';

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Awarded the first week this returns true. */
  test: (s: GameState) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: 'first-sale',
    name: 'First Sale',
    emoji: '🎉',
    // Every business earns this one, so it cannot name what was sold.
    blurb: 'You made your very first sale.',
    test: (s) => s.totals.customers > 0,
  },
  {
    id: 'hundred-club',
    name: '$100 Club',
    emoji: '💵',
    blurb: 'You had $100 in the bank.',
    test: (s) => s.cash >= 100,
  },
  {
    id: 'debt-free',
    name: 'Debt Free',
    emoji: '🕊️',
    blurb: 'You paid off a loan. All of it.',
    test: (s) => s.loans.length > 0 && s.loans.every((l) => l.paidOff),
  },
  {
    id: 'first-hire',
    name: 'The Boss',
    emoji: '🤝',
    blurb: 'You hired your first helper.',
    test: (s) => s.employees.length > 0,
  },
  {
    id: 'stage-2',
    name: 'Growing Up',
    emoji: '📈',
    blurb: 'The business reached Stage 2.',
    test: (s) => s.stage >= 2,
  },
  {
    id: 'five-star',
    name: 'Five Stars',
    emoji: '🌟',
    blurb: 'Perfect reputation. Everybody loves you.',
    test: (s) => s.reputation >= 4.95,
  },
  {
    id: 'thousand',
    name: 'Big Money',
    emoji: '🏆',
    blurb: 'You made $1,000 in total sales.',
    test: (s) => s.totals.revenue >= 1000,
  },
  {
    id: 'thousand-customers',
    name: 'Crowd Pleaser',
    emoji: '👥',
    blurb: 'You served 1,000 customers.',
    test: (s) => s.totals.customers >= 1000,
  },
  {
    id: 'marketer',
    name: 'Marketer',
    emoji: '📣',
    blurb: 'You ran your first ad.',
    test: (s) => s.totals.marketingSpend > 0,
  },
  {
    id: 'streak-3',
    name: 'On A Roll',
    emoji: '🔥',
    blurb: 'Three weekly goals in a row.',
    test: (s) => s.miniGoalStreak >= 3,
  },
  {
    id: 'sold',
    name: 'Cashed Out',
    emoji: '💼',
    blurb: 'You sold the business you built.',
    test: (s) => s.soldFor !== null,
  },
];

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}

/** Weekly optional goal. Something to aim at — it pays nothing. */
export function rollMiniGoal(state: GameState, roll: number): MiniGoal {
  const lastServed = state.lastResult?.served ?? 20;
  const lastProfit = state.lastResult?.profit ?? 5;

  // Truck-scale cash in the thousands looks silly rounded to $5. Lemonade-scale
  // cash still wants a $5 grid so a $23 target does not become $0 or $50.
  const roundCash = (n: number) =>
    n >= 500 ? Math.round(n / 50) * 50 : Math.round(n / 5) * 5;

  const cashGoal: MiniGoal = {
    id: 'cash',
    kind: 'cashEnd',
    target: Math.max(20, roundCash(state.cash * 1.15)),
    label: `End the week with ${'{target}'}`,
  };

  // Serving customers while the doors are closed is not a goal, it is a taunt.
  // Cash can only go down this week, so ask them to survive the bills — a
  // stretch target of 15% more would be impossible by construction.
  if ((state.weeksToOpen ?? 0) > 0) {
    const drain =
      state.loans
        .filter((l) => !l.paidOff)
        .reduce((sum, l) => sum + Math.min(l.weeklyPayment, l.balance), 0) +
      (state.assetWeekly ?? 0);
    const grid = state.cash >= 500 ? 50 : 5;
    return {
      id: 'cash',
      kind: 'cashEnd',
      target: Math.max(grid, Math.floor((state.cash - drain) / grid) * grid),
      label: `End the week with ${'{target}'}`,
    };
  }

  const options: MiniGoal[] = [
    {
      id: 'customers',
      kind: 'customers',
      target: Math.max(10, Math.round((lastServed * 1.1) / 5) * 5),
      label: `Serve {target} customers`,
    },
    cashGoal,
    {
      id: 'profit',
      kind: 'profit',
      target: Math.max(5, Math.round(Math.max(5, lastProfit * 1.1))),
      label: `Make {target} profit`,
    },
    {
      id: 'stars',
      kind: 'reputation',
      target: Math.min(5, Math.round((state.reputation + 0.2) * 10) / 10),
      label: `Reach {target} stars`,
    },
  ];

  return options[Math.floor(roll * options.length) % options.length];
}

export function miniGoalText(goal: MiniGoal): string {
  switch (goal.kind) {
    case 'customers':
      return `Serve ${goal.target} customers`;
    case 'cashEnd':
      return `End the week with $${goal.target}`;
    case 'profit':
      return `Make $${goal.target} profit`;
    case 'reputation':
      return `Reach ${goal.target.toFixed(1)} stars`;
  }
}
