import { describe, expect, it } from 'vitest';
import {
  amortizationSchedule,
  amortizedPayment,
  chargeWeek,
  payoffQuote,
  takeLoan,
  totalInterestFor,
  weeklyPaymentFor,
} from '../loans';
import type { LoanOffer } from '../types';

describe('amortization', () => {
  it('matches the standard monthly payment formula', () => {
    // $30,000 at 8% for 3 years is the spec's Tycoon example (~$940/mo).
    expect(amortizedPayment(30000, 0.08, 36, 12)).toBeCloseTo(940.09, 2);
    // $40,000 at 10% for 5 years. The spec says ~$860; the real figure is $849.88.
    expect(amortizedPayment(40000, 0.1, 60, 12)).toBeCloseTo(849.88, 2);
    // A classic textbook check: $200,000 at 6% over 30 years.
    expect(amortizedPayment(200000, 0.06, 360, 12)).toBeCloseTo(1199.1, 2);
  });

  it('handles a zero-rate loan as straight division', () => {
    expect(amortizedPayment(1200, 0, 12, 12)).toBe(100);
  });

  it('produces a schedule that ends at exactly zero', () => {
    const rows = amortizationSchedule(30000, 0.08, 36, 12);
    expect(rows).toHaveLength(36);
    expect(rows[rows.length - 1].balance).toBe(0);
  });

  it('front-loads interest, as a real schedule does', () => {
    const rows = amortizationSchedule(30000, 0.08, 36, 12);
    expect(rows[0].interest).toBeCloseTo(200, 2); // 30000 * 0.08/12
    expect(rows[0].interest).toBeGreaterThan(rows[35].interest);
    expect(rows[0].principal).toBeLessThan(rows[35].principal);
  });

  it('total payments minus principal equals total interest', () => {
    const rows = amortizationSchedule(30000, 0.08, 36, 12);
    const paid = rows.reduce((s, r) => s + r.payment, 0);
    expect(paid - 30000).toBeCloseTo(rows.reduce((s, r) => s + r.interest, 0), 1);
  });
});

describe('flat (Rookie) loans', () => {
  const offer: LoanOffer = {
    id: 'family-50',
    lender: 'Family Bank',
    emoji: '👨‍👩‍👧',
    principal: 50,
    kind: 'flat',
    annualRate: 0,
    termWeeks: 5,
    flatTotal: 55,
    blurb: '',
  };

  it('charges exactly $5 of interest and $11 a week', () => {
    expect(totalInterestFor(offer)).toBe(5);
    expect(weeklyPaymentFor(offer)).toBe(11);
  });

  it('clears to zero after five payments', () => {
    let loan = takeLoan(offer);
    expect(loan.balance).toBe(55);
    for (let i = 0; i < 5; i++) {
      const out = chargeWeek(loan, 1000);
      expect(out.paid).toBe(11);
      loan = out.loan;
    }
    expect(loan.paidOff).toBe(true);
    expect(loan.balance).toBe(0);
    expect(loan.weeksRemaining).toBe(0);
  });

  it('adds a late fee and does not advance the term when cash is short', () => {
    const loan = takeLoan(offer);
    const out = chargeWeek(loan, 3, 2);
    expect(out.missed).toBe(true);
    expect(out.loan.balance).toBe(57);
    expect(out.loan.weeksRemaining).toBe(5);
    expect(out.loan.missedPayments).toBe(1);
  });
});

describe('simple-interest (Pro) loans', () => {
  const offer: LoanOffer = {
    id: 'credit-union-150',
    lender: 'Kids Credit Union',
    emoji: '🏦',
    principal: 150,
    kind: 'simple',
    annualRate: 0.14,
    termWeeks: 26,
    blurb: '',
  };

  it('uses I = P x r x t with t in years', () => {
    // 150 * 0.14 * (26/52) = 10.50
    expect(totalInterestFor(offer)).toBe(10.5);
    expect(weeklyPaymentFor(offer)).toBeCloseTo(6.17, 2);
  });

  it('pays off over the full term', () => {
    let loan = takeLoan(offer);
    for (let i = 0; i < 26; i++) loan = chargeWeek(loan, 1000).loan;
    expect(loan.paidOff).toBe(true);
    expect(loan.balance).toBe(0);
  });

  it('rebates unearned interest when paid off early', () => {
    let loan = takeLoan(offer);
    for (let i = 0; i < 5; i++) loan = chargeWeek(loan, 1000).loan;
    const quote = payoffQuote(loan);
    // Five weeks of principal have been paid, so the quote is under the balance.
    expect(quote).toBeLessThan(loan.balance);
    expect(quote).toBeCloseTo(150 - 5 * (150 / 26), 1);
  });
});
