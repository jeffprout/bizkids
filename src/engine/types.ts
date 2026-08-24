// Core game types. Kept free of React and of any business-specific detail:
// anything lemonade-specific lives in /src/config.

export type Tier = 'rookie' | 'pro' | 'tycoon';

export type Weather = 'hot' | 'sunny' | 'cloudy' | 'rain' | 'cold';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export type Stage = 1 | 2 | 3;

/** A location the player can operate from. Defined per business in config. */
export interface LocationDef {
  id: string;
  name: string;
  emoji: string;
  /** Customers who walk past in a normal week, before every modifier. */
  baseTraffic: number;
  /** Rent charged every week. */
  weeklyRent: number;
  /** Reputation the location can never drag you below (credibility floor). */
  reputationFloor?: number;
  /** One short line shown on the choice card. */
  blurb: string;
  /** Weekend-heavy spots swing harder week to week. */
  volatility: number;
}

/** A quality level for the product (recipe tier for lemonade). */
export interface QualityDef {
  id: string;
  name: string;
  emoji: string;
  /** Cost to make one unit. */
  unitCost: number;
  /** Multiplies demand — better product, more customers. */
  demandMod: number;
  /** Reputation drift per week while this quality is in use. */
  reputationDrift: number;
  blurb: string;
}

export interface LoanOffer {
  id: string;
  lender: string;
  emoji: string;
  principal: number;
  /** 'flat' = pay back a fixed total (Rookie). 'simple' = simple-interest add-on,
   *  weekly payments (Pro). 'amortized' = true amortizing loan (Tycoon). */
  kind: 'flat' | 'simple' | 'amortized';
  /** Annual rate as a decimal, e.g. 0.10 for 10%. Unused for 'flat'. */
  annualRate: number;
  /** Loan life in weeks. */
  termWeeks: number;
  /** 'flat' loans only: the exact total to be repaid. */
  flatTotal?: number;
  blurb: string;
}

/** A loan the player actually took, with live balances. */
export interface ActiveLoan {
  offerId: string;
  lender: string;
  emoji: string;
  kind: LoanOffer['kind'];
  principal: number;
  annualRate: number;
  termWeeks: number;
  /** What the player still owes in total (principal + remaining interest for flat/simple). */
  balance: number;
  /** Remaining principal — what it costs to pay the loan off today. */
  principalBalance: number;
  weeklyPayment: number;
  weeksRemaining: number;
  totalInterest: number;
  missedPayments: number;
  paidOff: boolean;
}

export interface MarketingChannel {
  id: string;
  /** Tiers this option is offered at. Omitted means every tier. */
  tiers?: Tier[];
  name: string;
  emoji: string;
  kind: 'oneTime' | 'weekly';
  cost: number;
  blurb: string;
  /** Immediate demand multiplier bonus, e.g. 0.25 = +25% customers. */
  boost: number;
  /** Weeks the boost lasts (oneTime only); it decays linearly. */
  durationWeeks: number;
  /** Reputation bump when it lands well. */
  reputationBonus?: number;
  /** Curriculum concept this teaches. */
  concept: string;
}

export interface ActiveMarketing {
  channelId: string;
  weeksLeft: number;
  boost: number;
  /** Customers this campaign has brought so far, for the CAC readout. */
  customersBrought: number;
  spent: number;
}

export interface EmployeeDef {
  id: string;
  /** Tiers this person is offered at. Omitted means every tier. */
  tiers?: Tier[];
  name: string;
  emoji: string;
  quirk: string;
  weeklyWage: number;
  /** Extra units this person lets you serve per week. */
  capacityBonus: number;
  /** 0-1; affects service quality and reputation drift. */
  skill: number;
}

export type EventEffectKey =
  | 'cash'
  | 'reputation'
  | 'demandMod'
  | 'inventory'
  | 'unitCostMod'
  | 'capacityMod';

export interface EventChoice {
  id: string;
  label: string;
  /** Instant one-off effects applied when the choice is made. */
  cash?: number;
  reputation?: number;
  inventory?: number;
  /** Multipliers that apply to THIS week's simulation only. */
  demandMod?: number;
  unitCostMod?: number;
  capacityMod?: number;
  /** Line the mascot says after the choice. */
  result: string;
}

export interface GameEvent {
  id: string;
  /** 'universal' events can fire for any business. */
  pool: 'universal' | string;
  character: string;
  emoji: string;
  title: string;
  /** One line of dialogue. Keep it under ~14 words. */
  line: string;
  choices: EventChoice[];
  /** Only draw at or above this stage. */
  minStage?: Stage;
  /** Only draw when this is true of the state. Named predicates live in events.ts. */
  requires?: 'hasEmployee' | 'hasLoan' | 'hasInventory' | 'hasMarketing';
  weight: number;
  concept: string;
}

/** The player's choices for one week, collected by the UI. */
export interface WeekDecisions {
  price: number;
  qualityId: string;
  /** Units of stock bought this week. */
  restockUnits: number;
  locationId: string;
  /** Event id -> chosen choice id. */
  eventChoices: Record<string, string>;
  /** Marketing channels purchased this week. */
  buyMarketing: string[];
  hireEmployeeId?: string;
  fireEmployee?: boolean;
  /** Pay extra toward the loan this week. */
  extraLoanPayment?: number;
}

export interface MiniGoal {
  id: string;
  label: string;
  kind: 'customers' | 'cashEnd' | 'profit' | 'reputation';
  target: number;
  reward: number;
}

export interface WeekResult {
  week: number;
  weather: Weather;
  season: Season;
  /** Customers who wanted to buy. */
  demand: number;
  /** Customers actually served (limited by stock and by hands). */
  served: number;
  lostToStockout: number;
  lostToCapacity: number;
  revenue: number;
  /** Cash spent buying stock this week. */
  suppliesBought: number;
  /** Cost of the units actually sold (accrual). */
  cogs: number;
  rent: number;
  wages: number;
  marketingSpend: number;
  eventCash: number;
  /** Full loan payment (principal + interest) that left the bank account. */
  loanPayment: number;
  /** Interest portion only — the part that is genuinely an expense. */
  interestPaid: number;
  lateFees: number;
  missedPayment: boolean;
  /** Revenue minus operating expenses and interest. */
  profit: number;
  /** Actual change in the bank balance, which is not the same as profit. */
  cashChange: number;
  cashStart: number;
  cashEnd: number;
  reputationStart: number;
  reputationEnd: number;
  inventoryEnd: number;
  /** Units thrown out. */
  spoilage: number;
  /** Dollar value of what was thrown out. */
  spoilageCost: number;
  miniGoalMet: boolean;
  miniGoalReward: number;
  /** Cash the bank fronted you because the account went negative. */
  emergencyAdvance: number;
  /** Third bad week in a row — time for a talk with the banker. */
  bankerTalk: boolean;
  /** What each event choice did, for the results animation. */
  eventLines: { emoji: string; text: string }[];
  /** One short coach line. Max one sentence. */
  coachLine: string;
  newBadges: string[];
  stagedUp: boolean;
  /** Flags a decision worth discussing in class (School Edition). */
  discussionFlags: string[];
}

export interface GameState {
  version: number;
  profileId: string;
  businessId: string;
  tier: Tier;
  week: number;
  stage: Stage;
  cash: number;
  /** 1.0 - 5.0, shown as stars. */
  reputation: number;
  inventory: number;
  locationId: string;
  qualityId: string;
  price: number;
  loans: ActiveLoan[];
  marketing: ActiveMarketing[];
  employees: EmployeeDef[];
  /** Cumulative totals, used for stage-ups, valuation and trophies. */
  totals: {
    revenue: number;
    profit: number;
    customers: number;
    marketingSpend: number;
    interestPaid: number;
  };
  /** Profit for each completed week, newest last. Drives valuation. */
  profitHistory: number[];
  /** Revenue for each completed week, newest last. */
  revenueHistory: number[];
  weather: Weather;
  season: Season;
  /** Events drawn for the CURRENT week, awaiting player choices. */
  pendingEvents: GameEvent[];
  /** Event ids drawn recently — no repeats within 8 weeks. */
  recentEventIds: { id: string; week: number }[];
  miniGoal: MiniGoal;
  miniGoalStreak: number;
  badges: string[];
  /** Assets owned, added to the sale price at exit. */
  equipmentValue: number;
  lastResult: WeekResult | null;
  history: WeekResult[];
  rngSeed: number;
  gameOver: boolean;
  soldFor: number | null;
  roughWeeks: number;
  /** Set when the run has ended (sold or week 50 passed in classic mode). */
  offerAvailable: boolean;
  discussionLog: { week: number; note: string }[];
}
