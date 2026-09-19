import type { GameEvent } from '../../engine/types';

/**
 * The lemonade stand's cards.
 *
 * There used to be one shared "universal" pool. It was written while there was
 * only a lemonade stand, so it thanked a food truck owner for the lemonade and
 * offered to hand out a free cup. Placeholders were tried and were worse — a
 * card that fits everything belongs to nobody, and "Someone opened across the
 * street. Same thing, cheaper." is not a sentence anyone says.
 *
 * So each business gets its own complete pool, in its own voice. The CONCEPTS
 * are deliberately shared — competition, word of mouth, service recovery, fixed
 * costs, shrinkage — because those are the curriculum. Only the telling changes.
 *
 * Keep `line` under ~14 words and every choice label under 5. Effects should
 * bend a week, not decide the run, and should be scaled to the money that
 * business actually handles: $9 is a lot to a lemonade stand and nothing to a
 * truck taking two thousand a week.
 */

/** The lemonade stand. These numbers are playtested — do not drift them. */
export const LEMONADE_EVENTS: GameEvent[] = [
  {
    id: 'heat-wave',
    pool: 'lemonade',
    character: 'The Forecast',
    emoji: '🥵',
    title: 'Heat Wave!',
    line: "It's boiling out there. Everybody is thirsty.",
    weight: 10,
    seasons: ['summer'],
    weathers: ['hot', 'sunny'],
    concept: 'Demand shocks',
    choices: [
      // Raise the actual price and let the demand curve answer. The heat is
      // already in the weather multiplier; this card only decides what you do
      // about it.
      {
        id: 'raise',
        label: 'Raise price today',
        priceMod: 1.3,
        reputation: -0.15,
        result: 'Surge pricing. Some kids grumble, most still buy.',
      },
      {
        id: 'normal',
        label: 'Keep my price',
        reputation: 0.15,
        result: 'A long, happy line all week, and they remember it.',
      },
    ],
  },
  {
    id: 'cold-snap',
    pool: 'lemonade',
    character: 'The Forecast',
    emoji: '🥶',
    title: 'Cold Snap',
    line: 'A cold wind blew in. Nobody wants a cold drink today.',
    weight: 8,
    seasons: ['fall', 'winter', 'spring'],
    weathers: ['cold'],
    concept: 'Seasonality',
    choices: [
      {
        id: 'hot',
        label: 'Sell it warm',
        cash: -6,
        demandMod: 1.6,
        result: 'Warm lemonade. Weirdly, it works.',
      },
      {
        id: 'ride',
        label: 'Ride it out',
        result: 'You wait out the cold. A quiet week, and you spend nothing.',
      },
    ],
  },
  {
    id: 'broken-cooler',
    pool: 'lemonade',
    character: 'Your Cooler',
    emoji: '🧊',
    title: 'The Cooler Cracked',
    line: 'Water everywhere. Your ice is melting fast.',
    weight: 8,
    concept: 'Capital expenditure vs deferred maintenance',
    choices: [
      {
        id: 'fix',
        label: 'Buy a new cooler',
        cash: -45,
        // You spend $45 and own $25 of cooler: gear is worth less the moment
        // you buy it, and the gap is the real cost of the week.
        equipment: 25,
        result: 'A real new cooler. Expensive, and it is yours.',
      },
      {
        id: 'tape',
        label: 'Tape it up',
        cash: -2,
        // Skimping is cheap this week and shows up in what the stand is worth.
        equipment: -18,
        demandMod: 0.8,
        reputation: -0.1,
        result: 'Warm-ish lemonade, and a cooler worth less than it was.',
      },
    ],
  },
  {
    id: 'supplier-hike',
    pool: 'lemonade',
    character: 'Grocery Store',
    emoji: '🛒',
    title: 'Lemons Cost More',
    line: 'Lemon prices went up this week. Sorry, kid.',
    weight: 8,
    concept: 'Variable cost changes',
    choices: [
      {
        id: 'absorb',
        label: 'Pay the extra',
        unitCostMod: 1.35,
        result: 'Your cups cost more to make this week.',
      },
      {
        id: 'cheap',
        label: 'Use less lemon',
        unitCostMod: 1.05,
        demandMod: 0.85,
        reputation: -0.15,
        result: 'Cheaper cups. Weaker taste.',
      },
    ],
  },
  {
    id: 'permit-fee',
    pool: 'lemonade',
    character: 'Town Inspector',
    emoji: '📋',
    title: 'Permit Please',
    line: 'Selling here needs a permit. Rules are rules.',
    weight: 6,
    concept: 'Regulatory and fixed costs',
    choices: [
      {
        id: 'pay',
        label: 'Pay the permit',
        cash: -22,
        reputation: 0.1,
        result: 'Stamped and legal. The inspector smiles.',
      },
      {
        id: 'move',
        label: 'Move down the block',
        demandMod: 0.7,
        result: 'No fee, but way fewer people find you.',
      },
    ],
  },
  {
    id: 'rival-opens',
    pool: 'lemonade',
    character: 'The Competition',
    emoji: '😼',
    title: 'A Rival Opens Up',
    line: 'New stand across the street. Same drink, lower price.',
    weight: 8,
    concept: 'Competition',
    choices: [
      {
        id: 'cut',
        label: 'Drop my price',
        // Dropping the price has to actually drop the PRICE. As a bare
        // demandMod it was free customers with nothing given up, which made
        // ignoring the rival a choice nobody would ever take. The demand curve
        // turns the cut into extra cups by itself.
        priceMod: 0.85,
        result: 'You match them. More cups, less money on each one.',
      },
      {
        id: 'cookies',
        label: 'Add free cookies',
        cash: -9,
        demandMod: 1.25,
        reputation: 0.2,
        result: 'Cookies win. Your line is longer.',
      },
      {
        id: 'ignore',
        label: 'Ignore them',
        demandMod: 0.78,
        result: 'Some regulars wander across the street.',
      },
    ],
  },
  {
    id: 'rival-closes',
    pool: 'lemonade',
    character: 'The Competition',
    emoji: '🫠',
    title: 'The Rival Quit',
    line: 'Too much work. I am going back to video games.',
    weight: 5,
    concept: 'Windfalls',
    choices: [
      {
        id: 'take',
        label: 'Take their customers',
        demandMod: 1.4,
        result: 'Their whole crowd walks over to you.',
      },
      {
        id: 'buy',
        label: 'Buy their table',
        cash: -12,
        equipment: 12,
        capacity: 40,
        demandMod: 1.4,
        result: 'A second table for good. You can serve more from now on.',
      },
    ],
  },
  {
    id: 'big-order',
    pool: 'lemonade',
    character: 'Team Coach',
    emoji: '📣',
    title: 'Big Team Order',
    line: 'I need 40 cups for Saturday. Can you handle it?',
    weight: 8,
    concept: 'Capacity and promises',
    choices: [
      {
        id: 'yes',
        label: 'Yes, I can do it',
        cash: 46,
        inventory: -40,
        reputation: 0.25,
        result: 'Delivered! The whole team knows your name.',
      },
      {
        id: 'no',
        label: 'Too big for me',
        reputation: -0.05,
        result: 'You pass. Safer, but no boost.',
      },
    ],
  },
  {
    id: 'bulk-discount',
    pool: 'lemonade',
    character: 'Grocery Store',
    emoji: '📦',
    title: 'Bulk Deal',
    line: 'A big box of supplies, cheap, if you take it today.',
    weight: 7,
    concept: 'Economies of scale',
    choices: [
      {
        // 90 cups at the usual $0.42 would be $37.80, so this is a genuine
        // discount. Because stock is valued at weighted-average cost, taking it
        // shows up as a lower cost of goods for weeks afterwards.
        id: 'buy',
        label: 'Buy the big box',
        cash: -25,
        inventory: 90,
        result: 'A big box, well under the usual price.',
      },
      { id: 'skip', label: 'Not this week', result: 'You keep your cash. No harm done.' },
    ],
  },
  {
    id: 'glowing-review',
    pool: 'lemonade',
    character: 'Neighbor',
    emoji: '⭐',
    title: 'Nice Review!',
    line: 'I told the whole street about your lemonade!',
    weight: 8,
    concept: 'Word of mouth',
    choices: [
      {
        id: 'thanks',
        label: 'Say thank you',
        reputation: 0.3,
        demandMod: 1.15,
        result: 'Word spreads. New faces show up.',
      },
      {
        id: 'free',
        label: 'Give them a free cup',
        // The cup leaves the cooler and that is the whole cost — you never had
        // the money to lose. Charging cash on top billed the same cup twice.
        inventory: -1,
        reputation: 0.45,
        demandMod: 1.2,
        result: 'They tell even more people. Worth it.',
      },
    ],
  },
  {
    id: 'harsh-review',
    pool: 'lemonade',
    character: 'Grumpy Customer',
    emoji: '😠',
    title: 'Warm And Slow',
    line: 'My cup was warm and the line was too long!',
    weight: 6,
    concept: 'Service recovery',
    choices: [
      {
        id: 'apologize',
        label: 'Apologize, refund it',
        // One cup handed back, at whatever you are charging for one.
        cashUnits: -1,
        reputation: 0.15,
        result: 'Handled well. They came back later.',
      },
      {
        id: 'ignore',
        label: 'Ignore it',
        reputation: -0.12,
        result: 'You let it sit. A few people read it and moved on.',
      },
      {
        id: 'argue',
        label: 'Argue back',
        // A public row draws a crowd. That is why people pick it, and why it is
        // a trap. With no upside it was not a trap, just a button to avoid.
        demandMod: 1.12,
        reputation: -0.5,
        result: 'Everyone reads it. Nobody comes out of it looking good.',
      },
    ],
  },
  {
    id: 'review-watery',
    pool: 'lemonade',
    character: 'Regular Customer',
    emoji: '🥤',
    title: 'Too Watery',
    line: 'This tastes like lemon-flavored water. Did you skimp?',
    weight: 6,
    concept: 'Quality perception',
    choices: [
      {
        id: 'remake',
        label: 'Remake it stronger',
        cash: -4,
        unitCostMod: 1.1,
        reputation: 0.2,
        result: 'You fix the batch. They notice the difference.',
      },
      {
        id: 'ignore',
        label: 'Ignore it',
        reputation: -0.12,
        result: 'One review, left alone. It nags at your rating.',
      },
      {
        id: 'blame',
        label: 'Blame the mix you bought',
        // The store does refund a weak box. Money for standing is a real trade.
        // Losing standing for nothing at all was not a choice.
        cash: 5,
        reputation: -0.3,
        result: 'The store refunds the weak box. It still looks bad.',
      },
    ],
  },
  {
    id: 'review-price',
    pool: 'lemonade',
    character: 'Neighbor',
    emoji: '💰',
    title: 'Too Expensive',
    line: 'Way overpriced for a paper cup of lemonade.',
    weight: 6,
    concept: 'Price perception',
    choices: [
      {
        id: 'explain',
        label: 'Explain your costs',
        // Said at the table, to somebody with a line waiting behind them.
        capacityMod: 0.97,
        reputation: 0.12,
        result: 'You show them the lemon receipts. They get it.',
      },
      {
        id: 'ignore',
        label: 'Ignore it',
        reputation: -0.12,
        result: 'You say nothing. The comment stays up.',
      },
      {
        id: 'discount',
        label: 'Give them a discount',
        cash: -5,
        reputation: 0.2,
        demandMod: 0.95,
        result: 'They leave happy. Word gets around that you haggle.',
      },
    ],
  },
  {
    id: 'review-rude',
    pool: 'lemonade',
    character: 'Parent',
    emoji: '🙍',
    title: 'Nobody Looked Up',
    line: 'Whoever served me barely looked up from their phone.',
    weight: 6,
    minStage: 2,
    requires: 'hasEmployee',
    concept: 'Managing people',
    choices: [
      {
        id: 'coach',
        label: 'Talk to your helper',
        // The chat happens while people are waiting, so it costs some service.
        // Free reputation made ignoring it a choice nobody would ever take.
        capacityMod: 0.95,
        reputation: 0.18,
        result: 'An awkward chat mid-shift, but service picks up.',
      },
      {
        id: 'ignore',
        label: 'Ignore it',
        reputation: -0.12,
        result: 'You let it go. The habit stays.',
      },
    ],
  },
  {
    id: 'review-dirty',
    pool: 'lemonade',
    character: 'Passerby',
    emoji: '🧽',
    title: 'Sticky Table',
    line: 'The table was sticky and there was trash everywhere.',
    weight: 6,
    concept: 'Presentation',
    choices: [
      {
        id: 'clean',
        label: 'Clean it up right',
        cash: -6,
        reputation: 0.2,
        result: 'A scrub and a fresh coat. The stand looks sharp again.',
      },
      {
        id: 'ignore',
        label: 'Ignore it',
        reputation: -0.12,
        result: 'Still sticky. People keep noticing.',
      },
    ],
  },
  {
    id: 'road-work',
    pool: 'lemonade',
    character: 'Road Crew',
    emoji: '🚧',
    title: 'Road Work',
    line: 'We are digging up your street all week.',
    weight: 6,
    concept: 'Location risk',
    choices: [
      {
        id: 'stay',
        label: 'Stay put',
        demandMod: 0.55,
        result: 'Cones everywhere. Hardly anyone gets through.',
      },
      {
        id: 'cart',
        label: 'Wheel the stand away',
        cash: -5,
        demandMod: 0.9,
        result: 'You move a block over. Mostly fine.',
      },
    ],
  },
  {
    id: 'charity-ask',
    pool: 'lemonade',
    character: 'Animal Shelter',
    emoji: '🐶',
    title: 'Charity Day',
    line: 'Donate a day of sales to the puppy shelter?',
    weight: 6,
    concept: 'Reputation vs revenue',
    choices: [
      {
        id: 'donate',
        label: 'Donate a day',
        cash: -25,
        reputation: 0.5,
        result: 'The photo goes on the shelter wall. People notice.',
      },
      { id: 'later', label: 'Maybe next time', result: 'You keep the cash this week.' },
    ],
  },
  {
    id: 'employee-sick',
    pool: 'lemonade',
    character: 'Your Helper',
    emoji: '🤒',
    title: 'Helper Is Sick',
    line: 'I feel awful. Can I take the week off?',
    weight: 7,
    minStage: 2,
    requires: 'hasEmployee',
    concept: 'Payroll and coverage',
    choices: [
      {
        id: 'paid',
        label: 'Rest up, still paid',
        reputation: 0.15,
        staffOut: 'paid',
        result: 'They rest. You run it alone this week.',
      },
      {
        id: 'unpaid',
        label: 'No work, no pay',
        reputation: -0.2,
        staffOut: 'unpaid',
        result: 'You save the wage. They are quiet about it after that.',
      },
    ],
  },
  {
    id: 'stolen-cash',
    pool: 'lemonade',
    character: 'Empty Box',
    emoji: '💸',
    title: 'Money Gone',
    line: 'Your cash box was left out. Now it is empty.',
    weight: 6,
    concept: 'Shrinkage and controls',
    choices: [
      {
        id: 'lockbox',
        label: 'Buy a lock box',
        cash: -34,
        equipment: 12,
        result: 'The cash is gone, but the lock box is yours and it will not happen twice.',
      },
      {
        id: 'shrug',
        label: 'Just move on',
        cash: -22,
        reputation: -0.05,
        result: 'You eat the loss and hope.',
      },
    ],
  },
  {
    id: 'insurance',
    pool: 'lemonade',
    character: 'Insurance Agent',
    emoji: '📑',
    title: 'You Need Liability Coverage',
    line: 'If somebody slips on your spill, who pays for it?',
    weight: 6,
    concept: 'Risk and insurance',
    choices: [
      {
        id: 'buy',
        label: 'Take the policy',
        cash: -30,
        reputation: 0.15,
        result: 'Money for nothing you can see. That is exactly what insurance is.',
      },
      {
        id: 'risk',
        label: 'Go without',
        reputation: -0.3,
        result: 'Nothing happens this week. Nothing happening is not the same as being covered.',
      },
    ],
  },
  {
    id: 'health-inspector',
    pool: 'lemonade',
    character: 'Health Inspector',
    emoji: '🔬',
    title: 'Surprise Inspection',
    line: 'Your ice is stored wrong. I have to write this up.',
    weight: 7,
    concept: 'Compliance costs',
    choices: [
      {
        // The same fake choice the truck inspector had: one option cost less
        // AND gained reputation, so nobody would ever take the other one.
        // Closing to fix it has to cost what closing actually costs — the day.
        id: 'close',
        label: 'Close today and fix it',
        cash: -12,
        demandMod: 0.45,
        reputation: 0.15,
        result: 'Closed for the afternoon, passed the recheck. The day is gone.',
      },
      {
        id: 'fine',
        label: 'Stay open, take the fine',
        cash: -40,
        reputation: -0.25,
        result: 'You sell all day, and the fine lands with a note on your record.',
      },
    ],
  },
  {
    id: 'spoiled-batch',
    pool: 'lemonade',
    character: 'Your Cold Storage',
    emoji: '🤢',
    title: 'The Batch Turned',
    line: 'You left it in the sun. This whole lot is gone.',
    weight: 7,
    seasons: ['spring', 'summer'],
    concept: 'Inventory risk',
    choices: [
      {
        id: 'dump',
        label: 'Throw it all out',
        inventory: -45,
        result: 'Painful, but nobody got a bad cup.',
      },
      {
        id: 'sell',
        label: 'Sell it anyway',
        reputation: -0.7,
        demandMod: 0.85,
        result: 'People noticed. That was a bad trade-off.',
      },
    ],
  },
  {
    id: 'wet-week',
    pool: 'lemonade',
    character: 'The Forecast',
    emoji: '⛈️',
    title: 'A Wet Week',
    line: 'Gray and wet all week. Nobody is standing outside.',
    weight: 7,
    weathers: ['rain', 'cloudy'],
    concept: 'Demand shocks you cannot control',
    choices: [
      {
        id: 'wait',
        label: 'Wait it out',
        result: 'A wet, quiet week. At least it cost you nothing extra.',
      },
      {
        id: 'canopy',
        label: 'Rent a canopy',
        cash: -18,
        demandMod: 1.5,
        result: 'People stop instead of hurrying past. It was not free.',
      },
    ],
  },

  /* ---- The cards only a lemonade stand can deal. ---- */
  {
    id: 'lem-price-war',
    pool: 'lemonade',
    character: 'The Competition',
    emoji: '💸',
    title: 'Price War',
    line: 'I just dropped my lemonade to fifty cents!',
    weight: 9,
    concept: 'Price competition',
    choices: [
      {
        id: 'match',
        label: 'Match fifty cents',
        demandMod: 1.3,
        cash: -4,
        result: 'You match. Busy week, thin margins.',
      },
      {
        id: 'quality',
        label: 'Sell a better cup',
        unitCostMod: 1.4,
        demandMod: 1.1,
        reputation: 0.25,
        result: 'You compete on taste, not price.',
      },
      {
        id: 'hold',
        label: 'Hold my price',
        demandMod: 0.82,
        reputation: 0.05,
        result: 'Some walk away. Your regulars stay.',
      },
    ],
  },
  {
    id: 'lem-tournament',
    pool: 'lemonade',
    character: 'Little League',
    emoji: '⚾',
    title: 'Tournament Weekend',
    line: 'Six teams are playing here Saturday. Thirsty ones.',
    weight: 9,
    seasons: ['spring', 'summer', 'fall'],
    concept: 'Demand spikes and stock planning',
    choices: [
      {
        id: 'stock',
        label: 'Stock up big',
        cash: -10,
        inventory: 60,
        demandMod: 1.55,
        result: 'You are ready. The crowd empties your cooler.',
      },
      {
        id: 'wing',
        label: 'Wing it',
        demandMod: 1.55,
        result: 'Huge crowd. Hope you have enough cups.',
      },
    ],
  },
  {
    id: 'lem-sugar-free',
    pool: 'lemonade',
    character: 'Health Mom',
    emoji: '🥗',
    title: 'Sugar Free?',
    line: 'Do you have anything without all that sugar?',
    weight: 7,
    concept: 'Product line extension',
    choices: [
      {
        id: 'add',
        label: 'Add a sugar-free jug',
        cash: -7,
        demandMod: 1.18,
        reputation: 0.2,
        result: 'A whole new group of customers shows up.',
      },
      {
        id: 'no',
        label: 'Sorry, just classic',
        reputation: -0.05,
        result: 'She shrugs and walks on.',
      },
    ],
  },
  {
    id: 'lem-ice-out',
    pool: 'lemonade',
    character: 'Freezer',
    emoji: '🧊',
    title: 'Out Of Ice',
    line: 'The freezer is empty and it is ninety degrees.',
    weight: 7,
    seasons: ['summer'],
    concept: 'Supply chain hiccups',
    choices: [
      {
        id: 'buy',
        label: 'Buy bags of ice',
        cash: -8,
        result: 'Cold cups all week. Small cost, no drama.',
      },
      {
        id: 'skip',
        label: 'Serve it warm',
        demandMod: 0.7,
        reputation: -0.2,
        result: 'Warm lemonade in a heat wave. Ouch.',
      },
    ],
  },
  {
    id: 'lem-dog',
    pool: 'lemonade',
    character: 'Loose Dog',
    emoji: '🐕',
    title: 'Dog At The Stand',
    line: 'A big happy dog just knocked your table over.',
    weight: 6,
    concept: 'Shrinkage and mishaps',
    choices: [
      {
        id: 'clean',
        label: 'Clean up fast',
        cash: -2,
        // Straight in and you save most of it. Leaving the mess for the photo
        // costs you the rest, which is the trade — there was not one before.
        inventory: -5,
        result: 'Straight back up. You save most of what was on the table.',
      },
      {
        id: 'photo',
        label: 'Post the photo',
        cash: -2,
        inventory: -12,
        demandMod: 1.2,
        reputation: 0.15,
        result: 'The photo goes around school. Free advertising.',
      },
    ],
  },
  {
    id: 'lem-recipe',
    pool: 'lemonade',
    character: 'Grandma',
    emoji: '👵',
    title: 'Secret Recipe',
    line: 'Try my old recipe. A pinch of mint changes everything.',
    weight: 6,
    concept: 'Product improvement',
    choices: [
      {
        id: 'try',
        label: 'Try the recipe',
        unitCostMod: 1.15,
        reputation: 0.35,
        demandMod: 1.12,
        result: 'People taste the difference right away.',
      },
      { id: 'keep', label: 'Keep mine', result: 'You stick with what you know.' },
    ],
  },
];
