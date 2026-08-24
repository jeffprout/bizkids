import type { ActiveLoan, LoanOffer } from './types';

/** Round to cents. Money math never carries float dust into the UI. */
export const money = (n: number): number => Math.round(n * 100) / 100;

/**
 * Standard amortizing payment (Tycoon tier, and the real-world formula):
 *   pmt = P * r / (1 - (1 + r)^-n)
 * `periodsPerYear` is 12 for a monthly mortgage, 52 for a weekly loan.
 */
export function amortizedPayment(
  principal: number,
  annualRate: number,
  periods: number,
  periodsPerYear = 12,
): number {
  if (periods <= 0) return 0;
  const r = annualRate / periodsPerYear;
  if (r === 0) return money(principal / periods);
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -periods));
  return money(pmt);
}

/** Full amortization schedule — the artifact a teacher will check line by line. */
export function amortizationSchedule(
  principal: number,
  annualRate: number,
  periods: number,
  periodsPerYear = 12,
): { period: number; payment: number; interest: number; principal: number; balance: number }[] {
  const pmt = amortizedPayment(principal, annualRate, periods, periodsPerYear);
  const r = annualRate / periodsPerYear;
  let balance = principal;
  const rows = [];
  for (let period = 1; period <= periods; period++) {
    const interest = money(balance * r);
    // Final payment absorbs rounding drift so the balance lands exactly on zero.
    const principalPart = period === periods ? balance : money(pmt - interest);
    const payment = money(principalPart + interest);
    balance = money(balance - principalPart);
    rows.push({ period, payment, interest, principal: principalPart, balance });
  }
  return rows;
}

/** Total interest paid over the life of a loan offer, before any early payoff. */
export function totalInterestFor(offer: LoanOffer): number {
  switch (offer.kind) {
    case 'flat':
      return money((offer.flatTotal ?? offer.principal) - offer.principal);
    case 'simple':
      // Simple-interest add-on loan: I = P x r x t, with t in years.
      return money(offer.principal * offer.annualRate * (offer.termWeeks / 52));
    case 'amortized': {
      const pmt = amortizedPayment(offer.principal, offer.annualRate, offer.termWeeks, 52);
      return money(pmt * offer.termWeeks - offer.principal);
    }
  }
}

export function weeklyPaymentFor(offer: LoanOffer): number {
  if (offer.kind === 'amortized') {
    return amortizedPayment(offer.principal, offer.annualRate, offer.termWeeks, 52);
  }
  const total = offer.principal + totalInterestFor(offer);
  return money(total / offer.termWeeks);
}

export function takeLoan(offer: LoanOffer): ActiveLoan {
  const interest = totalInterestFor(offer);
  const weeklyPayment = weeklyPaymentFor(offer);
  return {
    offerId: offer.id,
    lender: offer.lender,
    emoji: offer.emoji,
    kind: offer.kind,
    principal: offer.principal,
    annualRate: offer.annualRate,
    termWeeks: offer.termWeeks,
    balance: money(offer.principal + interest),
    principalBalance: offer.principal,
    weeklyPayment,
    weeksRemaining: offer.termWeeks,
    totalInterest: interest,
    missedPayments: 0,
    paidOff: false,
  };
}

export interface LoanPaymentOutcome {
  loan: ActiveLoan;
  paid: number;
  interestPortion: number;
  principalPortion: number;
  missed: boolean;
  lateFee: number;
  justPaidOff: boolean;
}

/**
 * Charge one week of a loan. If `availableCash` cannot cover it the payment is
 * missed: a late fee is added to the balance and the banker gets grumpy.
 */
export function chargeWeek(loan: ActiveLoan, availableCash: number, lateFee = 5): LoanPaymentOutcome {
  if (loan.paidOff || loan.weeksRemaining <= 0) {
    return { loan, paid: 0, interestPortion: 0, principalPortion: 0, missed: false, lateFee: 0, justPaidOff: false };
  }
  const due = money(Math.min(loan.weeklyPayment, loan.balance));

  if (availableCash < due) {
    const fee = money(lateFee);
    return {
      loan: {
        ...loan,
        balance: money(loan.balance + fee),
        missedPayments: loan.missedPayments + 1,
      },
      paid: 0,
      interestPortion: 0,
      principalPortion: 0,
      missed: true,
      lateFee: fee,
      justPaidOff: false,
    };
  }

  let interestPortion: number;
  if (loan.kind === 'amortized') {
    interestPortion = money(loan.principalBalance * (loan.annualRate / 52));
  } else {
    // Add-on loans spread the pre-computed interest evenly across the term.
    interestPortion = money(loan.totalInterest / loan.termWeeks);
  }
  interestPortion = Math.min(interestPortion, due);
  const principalPortion = money(due - interestPortion);

  const weeksRemaining = loan.weeksRemaining - 1;
  const balance = money(loan.balance - due);
  const principalBalance = money(Math.max(0, loan.principalBalance - principalPortion));
  const paidOff = weeksRemaining <= 0 || balance <= 0.005;

  return {
    loan: {
      ...loan,
      balance: paidOff ? 0 : balance,
      principalBalance: paidOff ? 0 : principalBalance,
      weeksRemaining: Math.max(0, weeksRemaining),
      paidOff,
    },
    paid: due,
    interestPortion,
    principalPortion,
    missed: false,
    lateFee: 0,
    justPaidOff: paidOff,
  };
}

/**
 * Cost to clear the loan today. Add-on loans rebate the unearned interest, so
 * paying early genuinely saves money — that is the lesson.
 */
export function payoffQuote(loan: ActiveLoan): number {
  if (loan.paidOff) return 0;
  return money(loan.principalBalance);
}
