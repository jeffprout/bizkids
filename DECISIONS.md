# DECISIONS.md

A running log of choices made while building BizKids. Newest first.
Anything a player would notice and that the spec did not settle is flagged
**FOR JEFF** — those are yours to overrule.

---

## 2026-08-24 — Phase 1 build (Lemonade Stand v1)

### Architecture

**Sim engine is pure and config-driven.** `simulateWeek(state, decisions) → newState`
in `src/engine/simulateWeek.ts` imports no React and no storage. All randomness
runs through a seeded RNG (`src/engine/rng.ts`) stored on the save, so a week
replays identically and the tests are deterministic. Business #11 is a new file
in `src/config/businesses/` — the engine reads it, it does not know about lemons.

**Storage goes through one module.** `src/storage/adapter.ts` is the only file
that mentions `localStorage`, and it falls back to an in-memory map when storage
throws (private browsing, full quota) so the game never dies mid-week. Swapping
in Capacitor Preferences for iOS is a change to that one file. *(Wrap rule 1.)*

**Edition flag.** `src/config/edition.ts` reads `VITE_EDITION`. `npm run
build:school` / `npm run build:consumer` (cross-env, so they work in PowerShell).
Verified: neither build emits an external URL or font. *(Wrap rules 3, 4, 5.)*

**No AnimatePresence for the card deck.** Its exit animation did not resolve, and
the deck froze on the first card — a total blocker. Cards are now a plain keyed
remount that slides in. Boring, and it cannot hang.

**Animated counters have a timer fallback.** Browsers pause `requestAnimationFrame`
in a backgrounded tab. Without a fallback, a kid who switches tabs mid-week comes
back to a counter frozen at zero. Every counter now lands on its final number
whether or not frames are delivered.

### Financial math

**Three loan types, all real.**
- *Flat* (Rookie): borrow $50, repay $55, $11/wk × 5 — exactly the spec's example.
- *Simple interest add-on* (Pro): `I = P × r × t`, t in years. $150 @ 14% over
  26 weeks = $10.50 interest, $6.17/wk.
- *Amortized* (Tycoon, ready for Phase 2): `pmt = P·r / (1 − (1+r)^−n)`, with a
  full schedule that lands on a zero balance and front-loads interest correctly.

**Early payoff rebates unearned interest.** Add-on loans quote a payoff of
remaining *principal*, so paying early genuinely saves money. That is the lesson;
a payoff quote equal to the remaining balance would teach the opposite.

**FOR JEFF — the spec's Tycoon loan examples are slightly off.** $40k @ 10% over
5 years is **$849.88/mo**, not the ~$860 in Section 5. ($30k @ 8%/3yr ≈ $940.09,
which matches.) The code uses the correct figures and the test asserts them.
Worth fixing in the spec before a teacher runs the numbers.

**Cash flow and profit are shown as different things.** Profit counts loan
*interest* only; the principal portion moves cash without being an expense. The
Pro recap says so in one line ("You paid the bank $5.09 — $0.09 of that was
interest"). Rookie collapses the whole thing to money in / money out / profit.

**Valuation is SDE-style and uses trailing twelve months.** Offer = (annualised
profit × multiple) + equipment + inventory + cash − debt payoff. The multiple
(0.6–2.4) blends reputation 50%, profit margin 30%, steadiness 20%.
*Originally this used an 8-week window and it was a real bug:* week 50 lands in
late winter, so every single run was being priced at its seasonal worst. Real
buyers use TTM for exactly this reason. **FOR JEFF:** margins read high (~60%)
because the owner takes no wage — which is what SDE means, but a curriculum
reviewer may ask. Say the word and I will add an owner-wage line.

### Game balance

**Added a conversion rate (0.35).** `baseTraffic` is people who walk past;
roughly a third of them buy. Without this, demand ran ~5× what one kid can serve,
which made price, spot and quality decisions irrelevant — capacity was the only
thing that ever bound. Now front yard is safe and small, the park is the sweet
spot, and the soccer field genuinely needs a second pair of hands.

**Reputation drifts back toward 3.5 each week (5% of the gap).** Before this,
every strategy pinned at 5.00 stars by mid-game and reputation stopped being a
lever. Now five stars requires the premium recipe and clean weeks; the cheap
recipe settles around 3.1. A disaster week is also recoverable rather than
permanent.

**Selling out costs less reputation than bad service** (0.45 vs the original
0.8). The original numbers created a trap: stockouts pushed reputation below the
Stage 2 gate, and the cure for stockouts (hiring a helper) is *behind* that gate.

**Savings alone now always cover startup** (Pro: $55 savings vs $45 startup).
It was $35 vs $45, which made the all-savings path literally unselectable — that
breaks the spec's "no right answer" pillar.

**The supplies stepper is capped at what the player can afford.** Rookie starts
with $10 and the suggested order was $16.80, leaving a 6-year-old on a disabled
button with no way forward. Also, the restock suggestion now counts customers
turned away last week, otherwise a stand can never grow out of a stockout.

**Card deck rotates instead of slicing.** Price and supplies every week; location
every 5th week; hire, marketing and quality rotate at Stage 2. A plain
`slice(0, maxCards)` was silently dropping the location and quality cards forever
once Stage 2 unlocked.

**Stage 3 is not in the config.** It had no decisions behind it in Phase 1, and
firing a "Stage 3!" celebration that unlocks nothing is a lie. It comes back in
Phase 2 with content.

### Content

- 14 universal event cards + 6 lemonade signature cards (spec asked for 10
  universal in Phase 1; the extra variety helps playtesting).
- 11 badges, weekly mini-goals with a streak counter.
- Sounds are synthesised with Web Audio — no audio files, nothing to load,
  offline by default.

### Deliberate deviations

**Financing uses all of the player's savings.** The spec allows any mix of
savings and loan. In Phase 1 savings have no alternative use, so a partial-savings
slider would be a control that changes nothing. **FOR JEFF:** this becomes a real
choice in Phase 2 (keep savings back as a cushion vs. put it in), and I would add
the slider then.

**Rookie sees a shorter menu.** Two marketing options and one helper instead of
four and two. Driven by a `tiers` field in config, not by engine logic.

---

## Open questions for Jeff

1. **Spec Section 5 loan figures** — confirm the $860 → $849.88 correction.
2. **Owner wage in the valuation** — leave as SDE, or subtract a notional wage so
   the margin looks more like a conventional P&L?
3. **Mascot** (spec open question 1) — there is currently a 🧑‍🏫 coach line and no
   named character. One guide for the whole game, or a mentor per business?
4. **Rookie endgame** (spec open question 2) — Rookie currently gets the same
   sell-the-business screen as Pro. Simplify to a piggy-bank total?
5. **Winter** is a long slow stretch (weeks 36–48) for a drinks business. It is
   honest seasonality and the player can respond (cheaper spot, no helper, smaller
   orders), but it may test a kid's patience. Worth watching in playtesting.
