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
  /**
   * Overhead this spot costs every week whether or not you sell anything —
   * permit, ice, cups. A front yard barely has any; a park pitch does. Stated at
   * Pro scale and multiplied by the tier's fixedCostScale.
   */
  weeklyFixedCosts: number;
  /** Reputation the location can never drag you below (credibility floor). */
  reputationFloor?: number;
  /**
   * How busy this spot is by season, on top of the season's effect on thirst.
   * A soccer field lives and dies by the league calendar; a park is a summer
   * destination; a front yard barely notices. Without this the busiest spot is
   * simply the best spot all year and there is nothing to decide.
   */
  seasonMods: Record<Season, number>;
  /** One short line shown on the choice card. */
  blurb: string;
  /** Weekend-heavy spots swing harder week to week. */
  volatility: number;
}

/** What you are selling: a recipe tier, or a whole seasonal alternative. */
export interface QualityDef {
  id: string;
  name: string;
  emoji: string;
  /** Seasons this is on the menu. Omitted means all year. */
  seasons?: Season[];
  /** Replaces the season's effect on demand. A hot drink has its own calendar. */
  seasonMods?: Record<Season, number>;
  /** Replaces the weather's effect on demand. Cocoa likes what lemonade hates. */
  weatherMods?: Record<Weather, number>;
  /** Cost to make one unit. */
  unitCost: number;
  /** Multiplies demand — better product, more customers. */
  demandMod: number;
  /** Reputation drift per week while this quality is in use. */
  reputationDrift: number;
  blurb: string;
}

/** A small add-on item sold to people already buying the main product. */
/**
 * A treat sold alongside the drink.
 *
 * Made in a batch, ahead of time, the way anyone actually bakes. That is the
 * whole point: treats used to appear in exact proportion to drinks sold, with
 * price above cost on every one, so choosing one was strictly better than not
 * choosing one in every week forever — which is not a decision. Now the money
 * goes out on Sunday and Tuesday decides whether it was worth it.
 */
export interface SideProduct {
  id: string;
  name: string;
  emoji: string;
  /** What making one batch costs, paid whether or not anyone turns up. */
  batchCost: number;
  /** How many the batch makes. Sell more than this and the rest go unsold. */
  batchSize: number;
  price: number;
  /** Share of served customers who add one. */
  attachRate: number;
  reputationBonus?: number;
  tiers?: Tier[];
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
  /** Permanent gear bought or lost. Adds to the sale price at exit. */
  equipment?: number;
  /** Permanent change to how many cups a week you can serve. */
  capacity?: number;
  /** Instant one-off effects applied when the choice is made. */
  cash?: number;
  reputation?: number;
  inventory?: number;
  /** Multipliers that apply to THIS week's simulation only. */
  demandMod?: number;
  unitCostMod?: number;
  capacityMod?: number;
  /**
   * Multiplies the price actually charged this week. Use this rather than a
   * demandMod when a choice is about changing the price: the demand curve then
   * produces the drop in volume itself, and the ledger shows the higher take per
   * cup. A hand-written demandMod would be inventing an elasticity the model
   * already has.
   */
  priceMod?: number;
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
  /** Only draw in these seasons. A cold snap in July is not a thing. */
  seasons?: Season[];
  /** Only draw when the week's actual weather is one of these. */
  weathers?: Weather[];
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
  /** Side item to sell alongside the main product. null means none. */
  sideProductId?: string | null;
  locationId: string;
  /** Event id -> chosen choice id. */
  eventChoices: Record<string, string>;
  /** Marketing channels purchased this week. */
  buyMarketing: string[];
  /** Helpers taken on this week. More than one is allowed. */
  hireEmployeeIds?: string[];
  /** Helpers let go this week, by id. */
  fireEmployeeIds?: string[];
  /** @deprecated Single-helper shape kept so older saves and calls still work. */
  hireEmployeeId?: string;
  /** @deprecated Let everyone go. Superseded by fireEmployeeIds. */
  fireEmployee?: boolean;
  /** Pay extra toward the loan this week. */
  extraLoanPayment?: number;
}

/**
 * An optional weekly target. Deliberately pays nothing — a business does not
 * hand itself a bonus for hitting a number, and fake cash would corrupt both the
 * bank balance and the P&L.
 */
export interface MiniGoal {
  id: string;
  label: string;
  kind: 'customers' | 'cashEnd' | 'profit' | 'reputation';
  target: number;
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
  /** Cash spent buying stock this week, and how many units that bought. */
  suppliesBought: number;
  suppliesUnits: number;
  /** Cost of the units actually sold, at weighted-average cost. */
  cogs: number;
  /** What a cup of stock cost on average this week. */
  avgUnitCost: number;
  /** What a cup actually sold for, after any event that moved the price. */
  price: number;
  rent: number;
  /** Costs that arrive whether or not you sell a thing. */
  fixedCosts: number;
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
  /** Revenue minus the cost of what you sold, before any overheads. */
  grossProfit: number;
  /** Side-item sales, and what they cost. */
  sideUnits: number;
  /** Treats made and not sold. Baked fresh, so they do not keep. */
  sideWasted: number;
  /** How many the batch made, for the recap to show sold-of-made. */
  sideBatchSize: number;
  sideRevenue: number;
  sideCogs: number;
  /** What the forecast said versus what actually happened. */
  forecast: Weather;
  forecastWasWrong: boolean;
  rivalPrice: number;
  /** Share of customers lost to the stand across the street. */
  lostToRival: number;
  inventoryEnd: number;
  /** Units thrown out. */
  spoilage: number;
  /** Dollar value of what was thrown out. */
  spoilageCost: number;
  /** Stock destroyed by an event — a dumped batch, a knocked-over table. */
  stockLost: number;
  stockLostCost: number;
  miniGoalMet: boolean;
  /** Cash the bank fronted you because the account went negative. */
  emergencyAdvance: number;
  /** Third bad week in a row — time for a talk with the banker. */
  bankerTalk: boolean;
  /** What each event choice did, for the results animation. */
  eventLines: { emoji: string; text: string; title: string; cash: number }[];
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
  /**
   * What the stock on hand cost, in dollars. Held separately from the unit
   * count so stock can be valued at weighted-average cost: a bulk deal really
   * does lower what each cup cost you, and selling it shows the saving as a
   * lower cost of goods rather than as nothing at all.
   */
  inventoryCost: number;
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
  /** What actually happens this week. The player does NOT see this while
   *  deciding — they see `forecast`, which is often wrong. */
  weather: Weather;
  /** The forecast the player decides against. Right about two thirds of the time. */
  forecast: Weather;
  /** How many weeks the current weather has already run. Caps dull streaks. */
  weatherStreak: number;
  season: Season;
  /** What the stand across the street is charging. */
  rivalPrice: number;
  /** Weeks until the rival changes their price again. */
  rivalCooldown: number;
  /** Events drawn for the CURRENT week, awaiting player choices. */
  pendingEvents: GameEvent[];
  /** Event ids drawn recently — no repeats within 8 weeks. */
  recentEventIds: { id: string; week: number }[];
  miniGoal: MiniGoal;
  miniGoalStreak: number;
  badges: string[];
  /** Assets owned, added to the sale price at exit. */
  equipmentValue: number;
  /** Extra cups a week you can serve from gear, not people. */
  bonusCapacity: number;
  /** The side item on sale, if any. */
  sideProductId: string | null;
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

/**
 * Everything the engine needs to run one business. Adding business #11 means
 * adding one config file — no engine changes.
 *
 * This lives here, with the engine's other contracts, rather than inside any
 * one business. A business file should import the shape it has to satisfy; it
 * should not be the place the shape is defined, or the second business would
 * have to import the first.
 */
export interface BusinessDef {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  /** What one unit of product is called. */
  unitName: string;
  unitNamePlural: string;
  /** Money the player already has, per tier. */
  savings: Record<Tier, number>;
  /** Cost to open the doors, per tier. */
  startupCost: Record<Tier, number>;
  /** What the startup cost buys, shown on the financing screen. */
  startupBuys: string;
  /** Value of the gear you own — added to the sale price at exit. */
  startingEquipmentValue: Record<Tier, number>;
  locations: LocationDef[];
  qualities: QualityDef[];
  /** Small add-on items sold alongside the main product. */
  sideProducts: SideProduct[];
  loanOffers: Record<Tier, LoanOffer[]>;
  marketing: MarketingChannel[];
  employees: EmployeeDef[];
  /** Price customers think is normal. The price curve pivots here. */
  referencePrice: Record<Tier, number>;
  defaultPrice: Record<Tier, number>;
  /** Units one pair of hands can serve in a week. */
  soloCapacity: number;
  /** Share of the people who walk past who actually buy something. */
  conversionRate: number;
  /** Share of unsold stock thrown out each week. */
  spoilRate: number;
  /** The stand across the street. Omitted tiers do not face one. */
  rival: {
    tiers: Tier[];
    startPrice: Record<Tier, number>;
    /** How hard customers react to the price gap. */
    sensitivity: number;
    /** Weeks between the rival rethinking their price. */
    changeEvery: number;
  };
  /** Multiple of yearly profit a buyer will pay at exit. */
  valuationMultiple: { low: number; high: number };
  stageUps: { stage: 2 | 3; minTotalRevenue: number; minReputation: number; minWeek: number }[];
  /** Curriculum concepts this business teaches, for the School Edition doc. */
  concepts: string[];
}
