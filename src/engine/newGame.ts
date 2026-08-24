import type { GameState, Tier } from './types';
import { getBusiness } from '../config/businesses/lemonade';
import { eventsForBusiness } from '../config/events';
import { rollMiniGoal } from '../config/milestones';
import { rollWeather, seasonForWeek } from './calendar';
import { drawEvents } from './events';
import { money, takeLoan } from './loans';
import { makeRng, nextSeed } from './rng';

export const SAVE_VERSION = 1;

export interface FinancingChoice {
  /** Offer ids the player accepted. */
  loanIds: string[];
  /** How much of their own savings they are putting in. */
  savingsUsed: number;
  locationId: string;
}

export function newGame(opts: {
  profileId: string;
  businessId: string;
  tier: Tier;
  financing: FinancingChoice;
  seed: number;
}): GameState {
  const biz = getBusiness(opts.businessId);
  const startup = biz.startupCost[opts.tier];

  const loans = opts.financing.loanIds
    .map((id) => biz.loanOffers[opts.tier].find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))
    .map(takeLoan);

  const borrowed = loans.reduce((s, l) => s + l.principal, 0);
  // Money on hand after paying to open the doors.
  const cash = money(opts.financing.savingsUsed + borrowed - startup);

  const week = 1;
  const season = seasonForWeek(week);
  const seed = opts.seed || 1;
  const weather = rollWeather(season, makeRng(seed)());

  const state: GameState = {
    version: SAVE_VERSION,
    profileId: opts.profileId,
    businessId: opts.businessId,
    tier: opts.tier,
    week,
    stage: 1,
    cash,
    reputation: 3,
    inventory: 0,
    locationId: opts.financing.locationId,
    qualityId: biz.qualities[1]?.id ?? biz.qualities[0].id,
    price: biz.defaultPrice[opts.tier],
    loans,
    marketing: [],
    employees: [],
    totals: { revenue: 0, profit: 0, customers: 0, marketingSpend: 0, interestPaid: 0 },
    profitHistory: [],
    revenueHistory: [],
    weather,
    season,
    pendingEvents: [],
    recentEventIds: [],
    miniGoal: { id: 'customers', kind: 'customers', target: 25, label: '', reward: 5 },
    miniGoalStreak: 0,
    badges: [],
    equipmentValue: biz.startingEquipmentValue[opts.tier],
    lastResult: null,
    history: [],
    rngSeed: nextSeed(seed),
    gameOver: false,
    soldFor: null,
    roughWeeks: 0,
    offerAvailable: false,
    discussionLog: [
      {
        week: 1,
        note:
          loans.length === 0
            ? 'Started with savings only — no debt, smaller cushion'
            : `Borrowed $${borrowed} from ${loans.map((l) => l.lender).join(' and ')}`,
      },
    ],
  };

  // Week 1 has no event cards, so the first turn is pure and simple.
  state.pendingEvents = state.week === 1 ? [] : drawEvents(state, eventsForBusiness(opts.businessId), seed);
  state.miniGoal = rollMiniGoal(state, makeRng(seed)());
  return state;
}
