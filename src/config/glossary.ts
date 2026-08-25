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
      'How many of your drink customers also bought a snack. Nobody comes just for the treat — it rides along with a drink.',
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
    term: 'Cost of treats sold',
    plain:
      'What the snacks themselves cost you. Keeping it apart from the drinks is how you tell whether the treats are actually worth selling.',
    concept: 'Cost of goods sold by product line',
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
    term: 'Ice, cups & permit',
    plain:
      'Costs that show up every week whether you sell a hundred drinks or none. Cheaper spots have smaller ones.',
    concept: 'Fixed costs',
  },
  rent: {
    term: 'Spot rent',
    plain: 'What you pay for the right to set up where you did. The front yard is free.',
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
    term: 'Rent & running costs',
    plain: 'Rent, permit, ice, cups and any wages, all leaving the bank this week.',
    concept: 'Operating expenses',
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
    term: 'Stock bought vs sold',
    plain:
      'Selling drinks you paid for in an earlier week brings in cash without costing cash now. Buying stock you have not sold yet does the opposite.',
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
