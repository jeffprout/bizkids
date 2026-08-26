import type {
  BusinessDef,
  EmployeeDef,
  SideProduct,
  LoanOffer,
  LocationDef,
  MarketingChannel,
  QualityDef,
  Tier,
} from '../../engine/types';


const LOCATIONS: LocationDef[] = [
  {
    id: 'front-yard',
    name: 'Front Yard',
    emoji: '🏡',
    baseTraffic: 70,
    weeklyRent: 0,
    weeklyFixedCosts: 2,
    // Your own street: the same neighbours all year, and they still walk past
    // when it is cold. Small, steady, and almost free.
    seasonMods: { spring: 1, summer: 1, fall: 1.1, winter: 1.25 },
    blurb: 'Tiny but steady all year. About 10 people a day.',
    volatility: 0.1,
  },
  {
    id: 'park',
    name: 'Park Entrance',
    emoji: '🌳',
    baseTraffic: 210,
    weeklyRent: 5,
    weeklyFixedCosts: 14,
    // A park is a summer destination and quiet the rest of the year.
    seasonMods: { spring: 1.05, summer: 1.25, fall: 0.85, winter: 0.6 },
    blurb: 'Rent and a permit. Packed in summer, quiet in winter.',
    volatility: 0.15,
  },
  {
    id: 'soccer',
    name: 'Soccer Field',
    emoji: '⚽',
    baseTraffic: 350,
    weeklyRent: 10,
    weeklyFixedCosts: 22,
    // The league calendar rules this spot: spring and fall seasons are packed,
    // nobody is there in July, and the field is empty all winter.
    seasonMods: { spring: 1.45, summer: 0.55, fall: 1.45, winter: 0.25 },
    blurb: 'Rent and a pricey permit. Packed in season, empty in July.',
    volatility: 0.35,
  },
];

const QUALITIES: QualityDef[] = [
  {
    id: 'mix',
    name: 'Powder Mix',
    emoji: '🥄',
    unitCost: 0.22,
    demandMod: 0.88,
    reputationDrift: -0.06,
    blurb: 'Cheapest cup. People can taste it.',
  },
  {
    id: 'fresh',
    name: 'Fresh Squeezed',
    emoji: '🍋',
    unitCost: 0.42,
    demandMod: 1.0,
    reputationDrift: 0.02,
    blurb: 'Real lemons. The normal cup.',
  },
  {
    id: 'fancy',
    name: 'Fancy Fizz',
    emoji: '🫐',
    unitCost: 0.68,
    demandMod: 1.18,
    reputationDrift: 0.06,
    blurb: 'Lemons, berries and bubbles.',
  },
  {
    // The counter-seasonal pivot. Cold weather kills a lemonade stand; the same
    // table selling something hot does fine. Costs more a cup, so it is not
    // free money — it is a different business for a different season.
    id: 'cocoa',
    name: 'Hot Chocolate',
    emoji: '☕',
    // On the menu from the first cold snap of fall right through to spring. It
    // is a poor seller in a mild spring week — see seasonMods — but a cold or
    // wet one flips it, and having it there to pick is what makes that a
    // decision rather than a thing the game does to you.
    seasons: ['fall', 'winter', 'spring'],
    // Spring was 0.5, from when cocoa only existed in fall and winter. Now that
    // it stays on the menu into spring it has to be a real choice there, and at
    // 0.9 it is: sunny is clearly lemonade, rain and cold are clearly cocoa,
    // and cloudy is a coin flip. Working at $1.50 a cup, where lemonade keeps
    // $1.08 and cocoa $0.95:
    //   sunny   cocoa 0.56  lemonade 1.35
    //   cloudy  cocoa 0.94  lemonade 0.97   <- the interesting week
    //   rain    cocoa 1.11  lemonade 0.49
    //   cold    cocoa 1.45  lemonade 0.38
    seasonMods: { spring: 0.9, summer: 0.15, fall: 0.95, winter: 1.05 },
    weatherMods: { hot: 0.15, sunny: 0.65, cloudy: 1.1, rain: 1.3, cold: 1.7 },
    unitCost: 0.55,
    demandMod: 1,
    reputationDrift: 0.04,
    blurb: 'Cocoa and milk. Sells when nobody wants a cold drink.',
  },
];

const MARKETING: MarketingChannel[] = [
  {
    id: 'flyers',
    name: 'Flyers',
    emoji: '📄',
    kind: 'oneTime',
    cost: 8,
    boost: 0.22,
    durationWeeks: 2,
    blurb: 'Put up signs. Works fast, fades fast.',
    concept: 'Awareness decays',
  },
  {
    id: 'sign',
    // Rookie keeps marketing tactile and short: flyers and free samples only.
    tiers: ['pro', 'tycoon'],
    name: 'Painted Sign',
    emoji: '🪧',
    kind: 'oneTime',
    cost: 20,
    boost: 0.15,
    durationWeeks: 8,
    reputationBonus: 0.1,
    blurb: 'Pay once. A small bump that lasts.',
    concept: 'Owning attention vs renting it',
  },
  {
    id: 'booth',
    tiers: ['pro', 'tycoon'],
    name: 'Fair Booth',
    emoji: '🎪',
    kind: 'oneTime',
    cost: 35,
    boost: 0.75,
    durationWeeks: 1,
    reputationBonus: 0.25,
    blurb: 'Set up at the town fair. One huge week.',
    concept: 'Right audience, right moment',
  },
  {
    id: 'samples',
    name: 'Free Samples',
    emoji: '🥤',
    kind: 'oneTime',
    cost: 12,
    boost: 0.3,
    durationWeeks: 1,
    reputationBonus: 0.15,
    blurb: 'Give a taste. They come back.',
    concept: 'Trial drives repeat business',
  },
];


/**
 * Side items. A share of the people already buying a drink will add one, so
 * these raise revenue per customer without needing new customers — the classic
 * "would you like fries with that" lesson. Attach rates are deliberately modest.
 */
const SIDE_PRODUCTS: SideProduct[] = [
  // Batches are priced at roughly what the old per-unit cost worked out to, so a
  // busy week earns about what it always did. The difference is the quiet week:
  // the money is spent before anyone shows up, and break-even is a number a
  // player can actually work out from the card.
  //
  // Break-even, in customers = batchCost / price / attachRate:
  //   Lollipops  $5 / $0.50 / 0.45 =  23 customers
  //   Cookies   $12 / $1.00 / 0.35 =  35
  //   Gummies   $11 / $1.00 / 0.30 =  37
  //   Brownies  $17 / $2.00 / 0.22 =  39
  //
  // A front yard averaging two dozen customers cannot carry a batch of brownies.
  // A soccer field in season carries any of them. Same lesson as the canopy:
  // a fixed cost is a different decision at a different size.
  {
    id: 'lollipops',
    name: 'Lollipops',
    emoji: '🍭',
    batchCost: 5,
    batchSize: 60,
    price: 0.5,
    attachRate: 0.45,
    reputationBonus: 0.02,
    blurb: 'Cheap to make and kids always say yes. Hard to lose money on.',
  },
  {
    id: 'cookies',
    name: 'Cookies',
    emoji: '🍪',
    batchCost: 12,
    batchSize: 40,
    price: 1,
    attachRate: 0.35,
    reputationBonus: 0.03,
    blurb: 'Baked at home the night before. Most people take one.',
  },
  {
    id: 'gummies',
    name: 'Gummy Bags',
    emoji: '🐻',
    batchCost: 11,
    batchSize: 50,
    price: 1,
    attachRate: 0.3,
    blurb: 'Bagged up in advance. Keeps well, but you buy the whole box.',
  },
  {
    id: 'brownies',
    name: 'Brownies',
    emoji: '🍫',
    batchCost: 17,
    batchSize: 30,
    price: 2,
    attachRate: 0.22,
    reputationBonus: 0.05,
    tiers: ['pro', 'tycoon'],
    blurb: 'Expensive to bake, best money per sale. Needs a crowd to pay off.',
  },
];

const EMPLOYEES: EmployeeDef[] = [
  {
    id: 'maya',
    tiers: ['pro', 'tycoon'],
    name: 'Maya',
    emoji: '👧',
    quirk: 'Super fast. Talks even faster.',
    weeklyWage: 40,
    capacityBonus: 160,
    skill: 0.8,
  },
  {
    id: 'theo',
    name: 'Theo',
    emoji: '🧒',
    quirk: 'Cheap and cheerful. Spills a lot.',
    weeklyWage: 25,
    capacityBonus: 110,
    skill: 0.5,
  },
];

const LOAN_OFFERS: Record<Tier, LoanOffer[]> = {
  rookie: [
    {
      id: 'family-50',
      lender: 'Family Bank',
      emoji: '👨‍👩‍👧',
      principal: 50,
      kind: 'flat',
      annualRate: 0,
      termWeeks: 5,
      flatTotal: 55,
      blurb: 'Borrow $50. Pay back $11 a week for 5 weeks.',
    },
  ],
  pro: [
    {
      id: 'family-60',
      lender: 'Family Bank',
      emoji: '👨‍👩‍👧',
      principal: 60,
      kind: 'simple',
      annualRate: 0.08,
      termWeeks: 12,
      blurb: 'Small and quick. 8% a year for 12 weeks.',
    },
    {
      id: 'credit-union-150',
      lender: 'Kids Credit Union',
      emoji: '🏦',
      principal: 150,
      kind: 'simple',
      annualRate: 0.14,
      termWeeks: 26,
      blurb: 'More money, more time, more interest. 14% a year.',
    },
  ],
  tycoon: [
    {
      id: 'cu-300',
      lender: 'Kids Credit Union',
      emoji: '🏦',
      principal: 300,
      kind: 'amortized',
      annualRate: 0.09,
      termWeeks: 52,
      blurb: 'Amortized over a year at 9%.',
    },
    {
      id: 'fast-cash-500',
      lender: 'Fast Cash Freddy',
      emoji: '🕶️',
      principal: 500,
      kind: 'amortized',
      annualRate: 0.22,
      termWeeks: 26,
      blurb: 'Money today. 22% and a short leash.',
    },
  ],
};

export const LEMONADE: BusinessDef = {
  id: 'lemonade',
  name: 'Lemonade Stand',
  emoji: '🍋',
  tagline: 'Pricing and location. The classic first business.',
  unitName: 'cup',
  unitNamePlural: 'cups',
  placeName: 'stand',
  // Savings alone must always cover startup, or the all-savings path is not
  // playable and the financing choice stops being a real choice. It also has to
  // leave enough behind to STOCK the first week: Tycoon puts a market two and a
  // half times the size in front of the stand, and $30 of working capital could
  // not buy enough cups to sell into it.
  savings: { rookie: 35, pro: 55, tycoon: 430 },
  startupCost: { rookie: 25, pro: 45, tycoon: 180 },
  startupBuys: 'A table, a pitcher, a cooler and a sign.',
  startingEquipmentValue: { rookie: 20, pro: 38, tycoon: 150 },
  locations: LOCATIONS,
  qualities: QUALITIES,
  sideProducts: SIDE_PRODUCTS,
  loanOffers: LOAN_OFFERS,
  marketing: MARKETING,
  employees: EMPLOYEES,
  referencePrice: { rookie: 1, pro: 1.5, tycoon: 1.75 },
  defaultPrice: { rookie: 1, pro: 1.5, tycoon: 2 },
  soloCapacity: 190,
  // About a third of the people who walk past a lemonade stand buy a cup. This
  // keeps demand in the same league as what one kid can physically serve, which
  // is what makes price, spot and hiring real tradeoffs instead of noise.
  conversionRate: 0.35,
  spoilRate: 0.4,
  rival: {
    tiers: ['pro', 'tycoon'],
    startPrice: { rookie: 1, pro: 1.5, tycoon: 1.75 },
    sensitivity: 0.9,
    changeEvery: 3,
  },
  valuationMultiple: { low: 0.6, high: 2.4 },
  // Stage 3 lands in Phase 2 along with the decisions that make it mean
  // something. Shipping the celebration without the content would be a lie.
  stageUps: [{ stage: 2, minTotalRevenue: 400, minReputation: 3, minWeek: 6 }],
  concepts: [
    'Opportunity cost',
    'Fixed vs variable costs',
    'Leverage (debt)',
    'Cash flow vs profit',
    'Price elasticity',
    'Inventory and spoilage',
    'Reputation compounding',
    'Valuation multiples',
  ],
};
