# Boss Mode

A business-simulation game for kids. Pick a business, finance it, run it week by
week, and sell what you built.

**Phase 1 is complete: the Lemonade Stand, full loop, Rookie and Pro tiers.**
See `DECISIONS.md` for what was decided and why, and `boss-mode-spec.md` for
the design.

## Running it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

## Builds

| Command | Output |
|---|---|
| `npm run build:school` | School Edition — the version pitched to districts |
| `npm run build:consumer` | Consumer Edition — the build Capacitor wraps for iOS |

One codebase. `VITE_EDITION` toggles the feature set in `src/config/edition.ts`.
The consumer build never phones home. The school build posts anonymous play
counters (no names, no PIN, no money) so testers can be reviewed from a
password-protected admin tab.

## Layout

```
src/
  engine/     pure sim — no React, no storage, fully tested
    simulateWeek.ts   the whole game in one pure function
    loans.ts          amortization, simple interest, payoff quotes
    demand.ts         the demand model and spoilage
    valuation.ts      trailing-twelve-month SDE valuation
  config/     all game content — businesses, events, tiers, badges
    businesses/       one file per business; adding #11 needs no engine change
  storage/    the only place that touches localStorage
  state/      the React hook that ties it together
  ui/         screens and components
```

## The numbers are real

Teachers will check them, so they are tested rather than tuned by feel:

- Amortization matches the standard payment formula and the schedule lands on
  exactly zero (`amortizedPayment`, `amortizationSchedule`).
- Simple interest is `I = P × r × t`, with `t` in years.
- Paying a loan off early rebates the unearned interest.
- Profit counts loan interest, not loan principal — cash flow and profit are
  shown as the different things they are.
- The sale price is annualised trailing-twelve-month profit × a multiple, plus
  assets, minus debt.

`npm test` covers all of the above plus a full 50-week run.
