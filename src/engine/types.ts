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
  /**
   * Multiplies how many can be served in a week. A wider menu draws a bigger
   * line and then serves it more slowly; a single item flies out of the
   * window. Omitted means the product makes no difference to throughput, which
   * is true of a lemonade stand and emphatically not of a kitchen.
   */
  capacityMod?: number;
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

/**
 * How the core asset gets acquired — the truck, the cart, the ovens.
 *
 * Startup cost is not one number. Buying new costs the most and opens straight
 * away. Buying used and doing it up is far cheaper, but the doors stay shut for
 * weeks while the loan clock runs, and what turns up under the hood is a roll
 * of the dice. Leasing gets you open tomorrow for almost nothing down, and
 * leaves you owning nothing at all when it comes time to sell.
 *
 * That last part is the lesson: the choice made in week 1 is still on the books
 * in week 50, because owned assets add to the sale price and leased ones do not.
 */
export interface AssetOption {
  id: string;
  name: string;
  emoji: string;
  /** Photograph on the setup card. Emoji stays for lists that have no room. */
  photo?: string;
  kind: 'new' | 'used' | 'lease';
  /** Paid on day one, before any financing. */
  upfront: Record<Tier, number>;
  /** Weeks of build-out before a single sale. 0 opens immediately. */
  weeksToOpen: number;
  /** What it is worth on the books once open. Leases are worth nothing. */
  equity: Record<Tier, number>;
  /** Charged every week for the whole run. Only leases have one. */
  weeklyPayment: Record<Tier, number>;
  /**
   * Used gear is a gamble. Its equity and reliability land somewhere in this
   * band — sometimes a steal, sometimes rust and surprises.
   */
  conditionRange?: { low: number; high: number };
  /** Multiplies the chance of a breakdown card. Below 1 is more reliable. */
  reliability: number;
  blurb: string;
  /** What the player is told after the roll settles. Used gear only. */
  conditionNotes?: { good: string; fair: string; poor: string };
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
  kind: 'oneTime' | 'weekly' | 'owned';
  cost: number;
  blurb: string;
  /** Immediate demand multiplier bonus, e.g. 0.25 = +25% customers. */
  boost: number;
  /**
   * Weeks the boost lasts. One-time campaigns decay linearly to nothing.
   * Owned channels (a wrap, a painted sign) ignore this: they are paid once
   * and keep working.
   */
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
  'cash' | 'reputation' | 'demandMod' | 'inventory' | 'unitCostMod' | 'capacityMod';

export interface EventChoice {
  id: string;
  label: string;
  /** Permanent gear bought or lost. Adds to the sale price at exit. */
  equipment?: number;
  /** Permanent change to how many cups a week you can serve. */
  capacity?: number;
  /**
   * Instant one-off effects applied when the choice is made.
   *
   * `cash` is BUSINESS-SIZED money — a permit, a repair, a catering invoice —
   * and scales with the tier, because a bigger business faces bigger bills.
   */
  cash?: number;
  /**
   * Money measured in what you sell, converted at this week's actual price.
   *
   * Refunding one cold meal is not a business-sized bill, it is one meal. Priced
   * in dollars it went through the tier's money multiplier and a $30 refund
   * became $75 at Tycoon — nearly seven meals handed back for one complaint.
   * Priced in units it is simply the price, at every tier, forever, and a card
   * written today stays right when a business reprices tomorrow.
   */
  cashUnits?: number;
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
  /**
   * The business cannot move this week, whatever the player would prefer.
   *
   * A truck whose engine has just blown, and whose owner chose not to fix it,
   * is not driving anywhere — but the very next card asked where to park.
   * Choices that ground the business say so, and the spot card is not dealt.
   */
  locksLocation?: boolean;
  /** Line the mascot says after the choice. */
  result: string;
}

export interface GameEvent {
  id: string;
  /** Which business's pool this card belongs to. */
  pool: string;
  character: string;
  emoji: string;
  title: string;
  /** One line of dialogue. Keep it under ~14 words. */
  line: string;
  choices: EventChoice[];
  /** Only draw at or above this stage. */
  minStage?: Stage;
  /**
   * Weeks the doors have actually been open. Closed refit weeks do not count.
   * A used truck that went viral on the morning it first unlocked the window
   * had not been seen by anyone.
   */
  minOpenWeeks?: number;
  /** Only draw in these seasons. A cold snap in July is not a thing. */
  seasons?: Season[];
  /** Only draw when the week's actual weather is one of these. */
  weathers?: Weather[];
  /** Only draw when this is true of the state. Named predicates live in events.ts. */
  requires?: 'hasEmployee' | 'hasLoan' | 'hasInventory' | 'hasMarketing';
  /**
   * Only happens at these spots.
   *
   * A festival organizer auctioning the main gate pitch has nothing to say to
   * somebody parked outside an office block, and was saying it anyway. Cards
   * with this are dealt AFTER the spot is chosen, and drop out of the week
   * entirely if the player picks somewhere else.
   */
  locations?: string[];
  weight: number;
  /**
   * A mechanical failure of the thing you work out of — the engine, the fryer,
   * the cooler. Weighted by the asset's reliability so a used truck really does
   * break more than a new one, and a poor used truck more than a good one.
   */
  breakdown?: boolean;
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
  /**
   * What the player actually ordered on the supplies card. A pallet from a
   * supplier is extra, and used to get lumped in so a Tycoon run that ordered
   * 400 showed "bought 763".
   */
  orderedUnits: number;
  orderedSpend: number;
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
  /** A lease payment on the core asset, if it is leased rather than owned. */
  assetPayment: number;
  /** True on a week spent building out, before the doors ever opened. */
  buildingOut: boolean;
  /**
   * What the used-gear roll actually bought, revealed on the last closed week.
   * The player paid for a gamble in week 1; this is when they find out.
   */
  conditionReveal?: string;
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
  /** Title of the card that destroyed it, when a card did. */
  stockLostTo?: string;
  miniGoalMet: boolean;
  /** Cash the bank fronted you because the account went negative. */
  emergencyAdvance: number;
  /** Third bad week in a row — time for a talk with the banker. */
  bankerTalk: boolean;
  /** What each event choice did, for the results animation. */
  eventLines: { emoji: string; text: string; title: string; cash: number; units: number }[];
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
  /** Which acquisition route was taken, if the business offered a choice. */
  assetId?: string;
  /**
   * Weeks of build-out still to run before the doors open. While this is above
   * zero the business cannot sell a thing, and the bills arrive anyway — which
   * is the whole cost of buying something cheap and unfinished.
   */
  weeksToOpen: number;
  /** A lease payment that runs for the life of the business. */
  assetWeekly: number;
  /** How the used-gear roll landed, 0 to 1. Undefined when nothing was rolled. */
  assetCondition?: number;
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
  /** Photograph on the setup card, instead of the emoji. */
  photo?: string;
  tagline: string;
  /** What one unit of product is called. */
  unitName: string;
  unitNamePlural: string;
  /**
   * What the player calls the thing they work out of — a stand, a truck, a
   * shop. Universal event cards use it so one card can be dealt to any
   * business without sounding like it was written for another one.
   */
  placeName: string;
  /** Money the player already has, per tier. */
  savings: Record<Tier, number>;
  /** Cost to open the doors, per tier. */
  startupCost: Record<Tier, number>;
  /** What the startup cost buys, shown on the financing screen. */
  startupBuys: string;
  /** Value of the gear you own — added to the sale price at exit. */
  startingEquipmentValue: Record<Tier, number>;
  /**
   * How the core asset can be acquired. Businesses without a meaningful asset
   * choice — a lemonade stand is a table and a cooler — leave this out and get
   * `startupCost` and `startingEquipmentValue` as before.
   */
  assetOptions?: AssetOption[];
  locations: LocationDef[];
  qualities: QualityDef[];
  /**
   * How much people want this KIND of thing by season and by sky, before any
   * particular recipe changes it.
   *
   * Left out, a business inherits the game's default curve — which was written
   * for a lemonade stand, where a heat wave is worth 1.8x and freezing is worth
   * 0.35x. That is thirst, not appetite. People still eat lunch in January, so a
   * food truck that inherits it spends every winter week at 0.45 x 0.35 = a
   * sixth of normal trade, and has no way to answer.
   *
   * A recipe may still override both — that is what a hot drink in January is.
   */
  seasonMods?: Record<Season, number>;
  weatherMods?: Record<Weather, number>;
  /**
   * What this business calls an add-on, in the singular. A stand sells a treat;
   * a truck sells a side. The screen used to say "Sell a treat too?" and offer
   * "Just drinks" to a food truck, which is somebody else's game.
   */
  sideNoun: string;
  /** Small add-on items sold alongside the main product. */
  sideProducts: SideProduct[];
  loanOffers: Record<Tier, LoanOffer[]>;
  marketing: MarketingChannel[];
  employees: EmployeeDef[];
  /** Price customers think is normal. The price curve pivots here. */
  /**
   * What the price control offers, when the tier's own multipliers do not suit.
   *
   * The tier says how far a player may stray from the going rate and how finely,
   * which works for a lemonade stand. A food truck needs quarters — its rival
   * prices to the quarter, and a player who can only move in dollars can never
   * match or undercut them — but quarters across the tier's full range would be
   * over a hundred taps, so it names its own band instead.
   */
  priceBand?: Record<Tier, { min: number; max: number; step: number }>;
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
