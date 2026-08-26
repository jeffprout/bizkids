import type { GameState, Tier } from './types';
import { getBusiness } from '../config/businesses';
import { eventsForBusiness } from '../config/events';
import { rollMiniGoal } from '../config/milestones';
import { forecastFor, rollWeather, seasonForWeek } from './calendar';
import { drawEvents } from './events';
import { money, takeLoan } from './loans';
import { makeRng, nextSeed } from './rng';

// Bumped when the shape of GameState changes. loadRun drops saves that do not
// match, which is the right call: a half-migrated save is worse than a fresh one.
export const SAVE_VERSION = 5;

export interface FinancingChoice {
  /** Offer ids the player accepted. */
  loanIds: string[];
  /** How much of their own savings they are putting in. */
  savingsUsed: number;
  locationId: string;
  /** Which acquisition route, for businesses that offer a choice. */
  assetId?: string;
}

export function newGame(opts: {
  profileId: string;
  businessId: string;
  tier: Tier;
  financing: FinancingChoice;
  seed: number;
}): GameState {
  const biz = getBusiness(opts.businessId);
  const seedForSetup = opts.seed || 1;
  const setupRng = makeRng(seedForSetup);

  // How the core asset was acquired, and what that costs on day one.
  const asset = biz.assetOptions?.find((a) => a.id === opts.financing.assetId);
  const startup = asset ? asset.upfront[opts.tier] : biz.startupCost[opts.tier];

  /**
   * Used gear is a gamble taken before a single sale. The roll lands once, here,
   * and then lives with the business for the whole run: it sets what the thing
   * is actually worth and how often it breaks. Rolling it later would let a
   * player reload their way to a good truck.
   */
  const conditionRoll = asset?.conditionRange ? setupRng() : undefined;
  const conditionScale = asset?.conditionRange
    ? asset.conditionRange.low +
      (asset.conditionRange.high - asset.conditionRange.low) * (conditionRoll ?? 0.5)
    : 1;
  const equity = asset
    ? money(asset.equity[opts.tier] * conditionScale)
    : biz.startingEquipmentValue[opts.tier];

  const loans = opts.financing.loanIds
    .map((id) => biz.loanOffers[opts.tier].find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))
    .map(takeLoan);

  const borrowed = loans.reduce((s, l) => s + l.principal, 0);
  // Money on hand after paying to open the doors.
  const cash = money(opts.financing.savingsUsed + borrowed - startup);

  const week = 1;
  const season = seasonForWeek(week);
  const seed = seedForSetup;
  const rng = makeRng(nextSeed(seed));
  const weather = rollWeather(season, rng());
  const forecast = forecastFor(weather, rng());

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
    inventoryCost: 0,
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
    forecast,
    weatherStreak: 1,
    season,
    rivalPrice: biz.rival.startPrice[opts.tier],
    rivalCooldown: biz.rival.changeEvery,
    pendingEvents: [],
    recentEventIds: [],
    miniGoal: { id: 'customers', kind: 'customers', target: 25, label: '' },
    miniGoalStreak: 0,
    badges: [],
    equipmentValue: equity,
    bonusCapacity: 0,
    sideProductId: null,
    lastResult: null,
    history: [],
    rngSeed: nextSeed(seed),
    gameOver: false,
    soldFor: null,
    roughWeeks: 0,
    assetId: asset?.id,
    weeksToOpen: asset?.weeksToOpen ?? 0,
    assetWeekly: asset ? asset.weeklyPayment[opts.tier] : 0,
    assetCondition: conditionRoll,
    offerAvailable: false,
    discussionLog: [
      {
        week: 1,
        note:
          loans.length === 0
            ? 'Started with savings only — no debt, smaller cushion'
            : `Borrowed $${borrowed} from ${loans.map((l) => l.lender).join(' and ')}`,
      },
      ...(asset
        ? [
            {
              week: 1,
              note:
                asset.kind === 'lease'
                  ? `Leased the ${asset.name} — low upfront, owns nothing at the end`
                  : `Bought the ${asset.name} for $${startup}, worth $${equity} on the books`,
            },
          ]
        : []),
    ],
  };

  // Week 1 has no event cards, so the first turn is pure and simple.
  state.pendingEvents = state.week === 1 ? [] : drawEvents(state, eventsForBusiness(opts.businessId), seed);
  state.miniGoal = rollMiniGoal(state, makeRng(seed)());
  return state;
}
