import type {
  AssetOption,
  BusinessDef,
  EmployeeDef,
  SideProduct,
  LoanOffer,
  LocationDef,
  MarketingChannel,
  QualityDef,
  Tier,
} from '../../engine/types';

/**
 * The food truck.
 *
 * Where the lemonade stand teaches that a spot has a price, the truck teaches
 * two things the stand cannot: that HOW you buy the thing you work out of is
 * itself a decision worth thousands, and that being able to move every week is
 * worth paying for.
 *
 * Spec section 5 prices the Tycoon truck at $35k-$120k. Pro runs the same shape
 * at about a fifth of that — a used catering trailer rather than a full build —
 * so a twelve-year-old meets the decision at a size they can hold in their head.
 */

const LOCATIONS: LocationDef[] = [
  {
    id: 'office-park',
    name: 'Office Park',
    emoji: '🏢',
    baseTraffic: 260,
    weeklyRent: 40,
    weeklyFixedCosts: 55,
    // Desk lunches barely notice the weather and barely notice the season. The
    // same people walk out at noon in February as in July.
    seasonMods: { spring: 1, summer: 0.85, fall: 1.05, winter: 0.95 },
    blurb: 'Weekday lunch rush. Dependable, never spectacular.',
    volatility: 0.12,
  },
  {
    id: 'night-district',
    name: 'Friday Night District',
    emoji: '🌃',
    baseTraffic: 420,
    weeklyRent: 85,
    weeklyFixedCosts: 70,
    // Bars and long lines. Great when it is warm and dry, dead when it is not.
    seasonMods: { spring: 1.1, summer: 1.35, fall: 1, winter: 0.55 },
    blurb: 'Late crowds and long lines. Weather makes or breaks it.',
    // Was 0.4 and flat, which is a 2.3x spread between a good Friday and a bad
    // one before any decision the player made. The character of this spot is
    // meant to come from its SEASONS — dead in winter, packed in summer, which
    // a player can learn and plan against — not from a coin flip.
    volatility: 0.2,
  },
  {
    id: 'festival',
    name: 'Festival Grounds',
    emoji: '🎪',
    baseTraffic: 700,
    // The entry fee is the lesson: enormous traffic you have to pay for up
    // front, before you know whether anyone turns up.
    weeklyRent: 260,
    weeklyFixedCosts: 90,
    seasonMods: { spring: 1.15, summer: 1.5, fall: 0.9, winter: 0.2 },
    blurb: 'Huge crowds, huge entry fee, paid before you sell a thing.',
    // Still the swingiest spot, because paying up front for a crowd that may
    // not come is its whole lesson — but 0.55 flat was a 3.4x spread, which is
    // not a lesson, it is a slot machine.
    volatility: 0.28,
  },
];

/**
 * Menu size against speed — the truck's own version of the recipe choice. A
 * short menu serves a line fast; a long one draws more people into the line but
 * every order takes longer, so capacity falls.
 */
const QUALITIES: QualityDef[] = [
  {
    id: 'one-thing',
    name: 'One Thing, Done Well',
    emoji: '🌮',
    unitCost: 2.1,
    demandMod: 0.82,
    capacityMod: 1.35,
    reputationDrift: 0.05,
    blurb: 'One item only. The line moves fast and never stalls.',
  },
  {
    id: 'short-menu',
    name: 'Short Menu',
    emoji: '🍔',
    unitCost: 2.6,
    demandMod: 1,
    capacityMod: 1,
    reputationDrift: 0.06,
    blurb: 'Four things you are good at. The normal way to run a truck.',
  },
  {
    /**
     * The counter-seasonal pivot, and the reason a freezing forecast is now a
     * decision rather than a sentence. Cold weather empties a lunch line; the
     * same window selling something hot in a bowl does fine. It costs more a
     * plate and it serves slower, so it is not free money — it is a different
     * truck for a different half of the year.
     */
    id: 'hot-bowls',
    name: 'Hot Bowls',
    emoji: '🍲',
    // On the menu from the first cold week of fall right through spring, so the
    // player can see it coming and can also choose to stay on burgers.
    seasons: ['fall', 'winter', 'spring'],
    // Against the truck's own curve below, at $11 a plate:
    //   sunny   bowls 0.60  short menu 1.25
    //   cloudy  bowls 1.10  short menu 1.00   <- the interesting week
    //   rain    bowls 1.35  short menu 0.60
    //   cold    bowls 1.70  short menu 0.50
    seasonMods: { spring: 0.9, summer: 0.2, fall: 1.05, winter: 1.2 },
    weatherMods: { hot: 0.25, sunny: 0.6, cloudy: 1.1, rain: 1.35, cold: 1.7 },
    unitCost: 2.95,
    demandMod: 1,
    // Ladled, not griddled. A little slower than a burger.
    capacityMod: 0.9,
    reputationDrift: 0.06,
    blurb: 'Chili, ramen, stew. Sells when nobody wants to eat standing up cold.',
  },
  {
    id: 'big-menu',
    name: 'Everything Menu',
    emoji: '📋',
    unitCost: 3.2,
    demandMod: 1.25,
    capacityMod: 0.68,
    reputationDrift: 0.03,
    blurb: 'Something for everyone. More come, and each one takes longer.',
  },
];

const ASSETS: AssetOption[] = [
  {
    id: 'new-build',
    name: 'New Build-Out',
    emoji: '✨',
    kind: 'new',
    upfront: { rookie: 4200, pro: 24000, tycoon: 120000 },
    weeksToOpen: 0,
    equity: { rookie: 3400, pro: 19500, tycoon: 96000 },
    weeklyPayment: { rookie: 0, pro: 0, tycoon: 0 },
    // Everything is new, so almost nothing breaks in the first year.
    reliability: 0.45,
    blurb: 'Open on day one, nothing breaks, and you own it at the end.',
  },
  {
    id: 'used-refurb',
    name: 'Used Truck + Refit',
    emoji: '🔧',
    kind: 'used',
    upfront: { rookie: 2100, pro: 12000, tycoon: 60000 },
    // Four weeks of bills with the doors closed and the loan clock running.
    weeksToOpen: 4,
    equity: { rookie: 2000, pro: 11500, tycoon: 58000 },
    weeklyPayment: { rookie: 0, pro: 0, tycoon: 0 },
    // What is actually under the hood. Half the price of new, and somewhere
    // between a steal and a very expensive mistake.
    conditionRange: { low: 0.55, high: 1.35 },
    reliability: 1.6,
    blurb: 'Half the money, four weeks closed, and you find out what you bought.',
    conditionNotes: {
      good: 'Barely used. Whoever sold this had no idea what they had.',
      fair: 'Honest miles. It runs, and it will need watching.',
      poor: 'Rust under the paint. This is going to cost you.',
    },
  },
  {
    id: 'lease',
    name: 'Lease a Truck',
    emoji: '📄',
    kind: 'lease',
    upfront: { rookie: 600, pro: 3200, tycoon: 14000 },
    weeksToOpen: 0,
    // The whole point: you never own a penny of it.
    equity: { rookie: 0, pro: 0, tycoon: 0 },
    weeklyPayment: { rookie: 26, pro: 145, tycoon: 580 },
    reliability: 0.7,
    blurb: 'Cheapest way in, open right away, and you hand it back at the end.',
  },
];

const SIDE_PRODUCTS: SideProduct[] = [
  {
    id: 'fries',
    name: 'Loaded Fries',
    emoji: '🍟',
    batchCost: 46,
    batchSize: 70,
    price: 3.5,
    attachRate: 0.4,
    reputationBonus: 0.03,
    blurb: 'Cut and blanched before service. Everyone wants them.',
  },
  {
    id: 'cans',
    name: 'Cold Drinks',
    emoji: '🥤',
    batchCost: 42,
    batchSize: 120,
    price: 2,
    attachRate: 0.55,
    blurb: 'A crate of cans. Keeps forever, but you buy the whole crate.',
  },
  {
    id: 'churros',
    name: 'Churros',
    emoji: '🥨',
    batchCost: 58,
    batchSize: 60,
    price: 4,
    attachRate: 0.28,
    reputationBonus: 0.06,
    tiers: ['pro', 'tycoon'],
    blurb: 'Fried from a prepped batch. Best money per sale.',
  },
];

/**
 * Jeff: "The help almost is never justified."
 *
 * He was right, and it was arithmetic rather than taste. Rosa cost $520 a week
 * and added 260 plates of capacity. At about $6.40 of margin a plate she had to
 * recover 81 plates EVERY week to break even — but capacity only binds in the
 * busiest weeks, and at the Friday Night District that was about ten plates a
 * week. She could not pay for herself at any spot, at any tier, under any way of
 * playing: hiring lost money in literally every measured run.
 *
 * A professional line cook roughly doubles what a truck can put out; +260 next
 * to an owner's own 240 did not say that. The wages are unchanged and realistic
 * (about $17/hour); what changes is that they now do the work of a second pair
 * of hands, so hiring is a real calculation — clearly right when the line is
 * long, clearly wrong when it is not.
 */
const EMPLOYEES: EmployeeDef[] = [
  {
    id: 'line-cook',
    name: 'Rosa',
    emoji: '👩‍🍳',
    quirk: 'Twelve years on a hot line. Nothing rattles her.',
    weeklyWage: 520,
    capacityBonus: 420,
    skill: 0.85,
  },
  {
    id: 'window',
    name: 'Dev',
    emoji: '🧑‍🍳',
    quirk: 'Works the window. Fast, chatty, forgets the pickles.',
    weeklyWage: 310,
    capacityBonus: 240,
    skill: 0.6,
  },
];

const MARKETING: MarketingChannel[] = [
  {
    id: 'socials',
    name: 'Post Where You Are',
    emoji: '📱',
    kind: 'oneTime',
    cost: 0,
    boost: 0.12,
    durationWeeks: 1,
    blurb: 'Free, and it only works if you do it every single week.',
    concept: 'An owned audience costs time, not money',
  },
  {
    id: 'boosted',
    name: 'Boosted Post',
    emoji: '🚀',
    kind: 'oneTime',
    cost: 90,
    boost: 0.3,
    durationWeeks: 2,
    blurb: 'Pay to reach further. Works while it runs, then stops.',
    concept: 'Rented attention stops when you stop paying',
  },
  {
    id: 'wrap',
    name: 'Wrap the Truck',
    emoji: '🎨',
    kind: 'oneTime',
    cost: 700,
    boost: 0.16,
    durationWeeks: 26,
    reputationBonus: 0.2,
    tiers: ['pro', 'tycoon'],
    blurb: 'Expensive once. Then it advertises everywhere you park.',
    concept: 'Owning attention vs renting it',
  },
  {
    id: 'catering',
    name: 'Chase a Catering Gig',
    emoji: '📇',
    kind: 'oneTime',
    cost: 160,
    boost: 0.45,
    durationWeeks: 1,
    reputationBonus: 0.1,
    tiers: ['pro', 'tycoon'],
    blurb: 'One booked event. A guaranteed crowd, paid up front.',
    concept: 'Booked revenue beats hoping people walk by',
  },
];

const LOAN_OFFERS: Record<Tier, LoanOffer[]> = {
  rookie: [
    {
      id: 'family-2000',
      lender: 'Family Loan',
      emoji: '👨‍👩‍👧',
      principal: 2000,
      annualRate: 0.06,
      termWeeks: 26,
      kind: 'simple',
      blurb: 'Family money, barely any interest. 6% a year.',
    },
  ],
  pro: [
    {
      id: 'cu-12000',
      lender: 'Credit Union',
      emoji: '🏦',
      principal: 12000,
      annualRate: 0.09,
      termWeeks: 52,
      kind: 'simple',
      blurb: 'Enough for a used truck and a refit. 9% a year.',
    },
    {
      id: 'sba-25000',
      lender: 'Small Business Loan',
      emoji: '🏛️',
      principal: 25000,
      annualRate: 0.11,
      termWeeks: 78,
      kind: 'simple',
      blurb: 'Enough to build new. Bigger payment every week for longer.',
    },
  ],
  tycoon: [
    {
      id: 'cu-60000',
      lender: 'Credit Union',
      emoji: '🏦',
      principal: 60000,
      annualRate: 0.09,
      termWeeks: 104,
      kind: 'amortized',
      blurb: 'A real amortizing loan. Early payments are mostly interest.',
    },
    {
      id: 'sba-120000',
      lender: 'Small Business Loan',
      emoji: '🏛️',
      principal: 120000,
      annualRate: 0.115,
      termWeeks: 156,
      kind: 'amortized',
      blurb: 'Everything you need, over three years. Watch the interest.',
    },
  ],
};

export const FOOD_TRUCK: BusinessDef = {
  id: 'truck',
  name: 'Food Truck',
  emoji: '🚚',
  tagline: 'Park it where the people are.',
  unitName: 'meal',
  unitNamePlural: 'meals',
  placeName: 'truck',
  savings: { rookie: 2600, pro: 15000, tycoon: 70000 },
  startupCost: { rookie: 2100, pro: 12000, tycoon: 60000 },
  startupBuys: 'a truck, a griddle and your first food order',
  startingEquipmentValue: { rookie: 2000, pro: 11500, tycoon: 58000 },
  assetOptions: ASSETS,
  locations: LOCATIONS,
  /**
   * A truck sells lunch, not thirst. The game's default curve is a lemonade
   * stand's — a heat wave worth 1.8x, freezing worth 0.35x — and inherited whole
   * it put the truck at 0.45 x 0.35 of normal trade in a freezing winter week,
   * with nothing on the menu that could answer.
   *
   * People eat lunch all year. What weather really decides is whether they will
   * stand outside to wait for it, so rain and cold still hurt, and a heat wave
   * is a mild positive rather than a windfall.
   */
  seasonMods: { spring: 1, summer: 1.2, fall: 0.95, winter: 0.68 },
  weatherMods: { hot: 1.15, sunny: 1.25, cloudy: 1, rain: 0.6, cold: 0.5 },
  qualities: QUALITIES,
  sideNoun: 'side',
  sideProducts: SIDE_PRODUCTS,
  loanOffers: LOAN_OFFERS,
  marketing: MARKETING,
  employees: EMPLOYEES,
  // Quarters, because the rival prices to the quarter and a player who cannot
  // match them is not competing. The band is narrower than the tier would give
  // so that quarters do not mean a hundred taps end to end.
  priceBand: {
    rookie: { min: 3, max: 13, step: 0.25 },
    pro: { min: 4, max: 20, step: 0.25 },
    tycoon: { min: 5, max: 24, step: 0.25 },
  },
  referencePrice: { rookie: 6, pro: 9, tycoon: 11 },
  defaultPrice: { rookie: 6, pro: 9, tycoon: 11 },
  // One person on a window can serve a lunch rush, not a festival.
  soloCapacity: 240,
  conversionRate: 0.3,
  // Prepped food does not keep. Harsher than a lemonade stand on purpose: it is
  // why the menu decision matters.
  spoilRate: 0.65,
  rival: {
    tiers: ['pro', 'tycoon'],
    startPrice: { rookie: 6, pro: 9, tycoon: 11 },
    sensitivity: 0.9,
    changeEvery: 4,
  },
  valuationMultiple: { low: 0.8, high: 2.8 },
  stageUps: [
    { stage: 2, minTotalRevenue: 9000, minReputation: 3.2, minWeek: 5 },
    { stage: 3, minTotalRevenue: 45000, minReputation: 3.8, minWeek: 18 },
  ],
  concepts: [
    'Asset acquisition: buy, refurbish or lease',
    'What closed weeks cost you',
    'Equity at exit',
    'Weekly mobility as a strategy',
    'Menu breadth against throughput',
    'Fixed entry fees against foot traffic you cannot count on',
  ],
};
