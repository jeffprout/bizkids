/**
 * Plain-English explanations for the numbers on screen.
 *
 * Two jobs. It answers "what is this?" for a player mid-game, and — because
 * every entry is tagged with the concept it teaches — it is the raw material for
 * the curriculum map the School Edition ships (spec Section 12).
 *
 * Keep `plain` to one or two short sentences. No jargon inside the explanation
 * of the jargon.
 */
export interface GlossaryEntry {
  term: string;
  plain: string;
  /** Curriculum concept this line demonstrates. */
  concept: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  cupsSold: {
    term: 'Cups sold',
    plain: 'How many people actually bought a drink from you this week.',
    concept: 'Units sold',
  },
  treatsSold: {
    term: 'Treats sold',
    plain:
      'How many of the batch you made actually sold. The rest were thrown out — you baked them before you knew who was coming.',
    concept: 'Attach rate',
  },
  sales: {
    term: 'Sales',
    plain: 'All the money customers handed you. Also called revenue.',
    concept: 'Revenue',
  },
  drinkSales: {
    term: 'Drink sales',
    plain: 'Money from the drinks alone, before treats are counted.',
    concept: 'Revenue by product line',
  },
  treatSales: {
    term: 'Treats',
    plain: 'Money from the snacks people added to their drink.',
    concept: 'Add-on revenue',
  },
  cogs: {
    term: 'Cost of cups sold',
    plain:
      'What the lemons, cups and ice cost for only the drinks you actually sold. Stock still sitting in your cooler is not counted here.',
    concept: 'Cost of goods sold',
  },
  treatCogs: {
    term: 'Treat batch',
    plain:
      'What making the batch cost. You pay it before the week starts, so a quiet week loses money on treats and a busy one makes it back several times over.',
    concept: 'Fixed cost vs variable cost',
  },
  avgUnitCost: {
    term: 'What a cup costs you',
    plain:
      'The average cost of the stock in your cooler. Buying a cheap batch pulls this down, and every cup you sell afterwards costs you less.',
    concept: 'Weighted-average inventory cost',
  },
  spoilage: {
    term: 'Thrown out',
    plain:
      'Leftover drinks that went bad before anyone bought them. You paid for these and got nothing back.',
    concept: 'Spoilage and waste',
  },
  stockLost: {
    term: 'Stock lost',
    plain: 'Supplies destroyed by something that happened this week, like a batch that turned.',
    concept: 'Inventory write-off',
  },
  grossProfit: {
    term: 'Gross profit',
    plain:
      'Sales minus what the drinks themselves cost. It is what is left to cover everything else.',
    concept: 'Gross profit',
  },
  fixedCosts: {
    term: 'What your spot costs',
    plain:
      'Rent, the permit, ice and cups for the spot you picked — the whole weekly figure shown on the card when you chose it. It arrives whether you sell a hundred drinks or none. Cheaper spots cost less but fewer people walk past.',
    concept: 'Fixed costs',
  },
  rent: {
    term: 'Spot rent',
    plain:
      'What you pay for the right to set up where you did. The front yard charges no rent, but it still has running costs.',
    concept: 'Fixed costs',
  },
  wages: {
    term: 'Helper pay',
    plain: 'Your helper gets paid the same whether the week was busy or dead.',
    concept: 'Payroll',
  },
  marketing: {
    term: 'Advertising',
    plain: 'What you spent telling people about the stand this week.',
    concept: 'Customer acquisition cost',
  },
  interest: {
    term: 'Loan interest',
    plain:
      'The bank’s fee for lending you the money. This part is a real cost. Paying back the amount you borrowed is not.',
    concept: 'Interest vs principal',
  },
  lateFee: {
    term: 'Late fee',
    plain: 'A penalty for not having enough money when the loan payment came due.',
    concept: 'Cost of missed payments',
  },
  eventCash: {
    term: 'What happened',
    plain: 'Money that came in or went out because of the choice you made on an event card.',
    concept: 'Unplanned costs',
  },
  netProfit: {
    term: 'Net profit',
    plain:
      'What the business actually earned after every cost. This is the number a buyer cares about.',
    concept: 'Net profit',
  },
  bankStart: {
    term: 'Bank at week start',
    plain: 'How much cash you had before the week began.',
    concept: 'Cash flow',
  },
  suppliesBought: {
    term: 'Supplies bought',
    plain:
      'Cash you spent stocking up. Anything you did not sell is still yours — it is sitting in the cooler, not gone.',
    concept: 'Inventory as an asset',
  },
  overheadCash: {
    term: 'Bills paid this week',
    plain:
      'Everything that left the bank besides stock: your spot, any helper you paid, any advertising you bought and any late fee.',
    concept: 'Operating expenses',
  },
  assetPayment: {
    term: 'Lease payment',
    plain:
      'What you pay every week to use the truck you do not own. It never stops, it never goes down, and when you sell the business the truck is not yours to sell.',
    concept: 'Equity vs rental of a fixed asset',
  },
  loanPayment: {
    term: 'Loan payment',
    plain:
      'The whole payment to the bank. Part is interest (a cost) and part pays back what you borrowed (not a cost).',
    concept: 'Interest vs principal',
  },
  emergencyAdvance: {
    term: 'Emergency advance',
    plain:
      'The bank covered you because you ran out of cash. You pay it back with extra on top, so it is expensive help.',
    concept: 'Cost of running out of cash',
  },
  bankEnd: {
    term: 'Money in the bank',
    plain: 'What you actually have right now. This is not the same as profit.',
    concept: 'Cash vs profit',
  },
  inventorySwing: {
    term: 'Money in stock',
    plain:
      'The bank pays for every cup you buy. Profit only counts the cups you sell. This line is the gap. Money that went into stock has left the bank but is still yours — it is sitting in the cooler waiting to be sold.',
    concept: 'Working capital',
  },
  principalRepaid: {
    term: 'Loan principal repaid',
    plain:
      'Paying back what you borrowed. It takes money out of the bank but is not a cost, because you are clearing a debt.',
    concept: 'Interest vs principal',
  },
  bankMoved: {
    term: 'Bank moved',
    plain: 'How much your cash went up or down this week, once everything is counted.',
    concept: 'Cash flow',
  },
  // --- the sale ---
  avgWeeklyProfit: {
    term: 'Profit each week',
    plain: 'Your average weekly profit over the last year of trading.',
    concept: 'Earnings',
  },
  annualProfit: {
    term: 'A year of profit',
    plain: 'Your weekly profit stretched over a full year. Buyers think in years, not weeks.',
    concept: 'Annualised earnings',
  },
  multiple: {
    term: 'Multiple',
    plain:
      'How many years of profit a buyer will pay. A steady, well-liked business earns a higher number.',
    concept: 'Valuation multiple',
  },
  goodwill: {
    term: 'The business is worth',
    plain: 'A year of profit multiplied by the number above. This is what the habit of customers is worth.',
    concept: 'Goodwill',
  },
  equipmentValue: {
    term: 'Your gear',
    plain: 'The table, cooler and sign go with the sale, so they add to the price.',
    concept: 'Asset value',
  },
  debtPayoff: {
    term: 'What you owe',
    plain: 'Any loan still outstanding gets paid off out of the sale price.',
    concept: 'Debt at exit',
  },
  offer: {
    term: 'The offer',
    plain: 'What the buyer will hand you for the whole business, all in.',
    concept: 'Enterprise value',
  },
};

export function explain(id: string): GlossaryEntry | undefined {
  return GLOSSARY[id];
}
