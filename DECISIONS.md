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

## 2026-08-24 (later) — Harder, and aimed at middle school

Jeff's feedback: too easy (it made money almost every week), too young in tone,
and the weekly summary needed to show money in the bank.

### Why it could not lose money

A cup cost $0.24 and sold for $1.00 — a 76% margin — against $0–10 of weekly
rent and no other fixed cost. There was no combination of bad decisions that
arithmetic would let you lose on. Worse, **the player could see next week's
weather before ordering stock**, so the one genuinely risky decision in the game
had no risk in it at all.

### What now makes a week losable

**The forecast is a forecast.** `state.weather` is what happens; `state.forecast`
is what the player sees while deciding, and it is right about 65% of the time,
otherwise off by one step. Ordering stock is now a bet. The results screen shows
what was promised versus what arrived.

**Overhead belongs to the location, not the business.** Every spot charges a
weekly cost that arrives whether or not you sell anything — front yard $2, park
$14, soccer field $22 at Pro scale. This is the spec's "overhead is a choice"
lesson (Section 6) made literal, and it puts a floor under every week that sales
have to clear. *First attempt put this on the business, which made the free front
yard unplayable — the safe option must stay a real option.*

**Margins are thin enough to matter.** A cup now costs $0.42 against a $1.50
expected price. Combined with the overhead floor, price and volume both matter.

**A rival stand across the street.** They start at your expected price and
re-price every three weeks, drifting toward undercutting you. Charge well over
them and customers walk. Pro and Tycoon only — Rookie faces no rival.

**Spoilage doubled to 40%.** Combined with the uncertain forecast this is the
classic newsvendor problem: order too much and you throw it out, order too little
and you turn people away.

**Five new downside events** — stolen cash box, liability insurance, a health
inspection, a spoiled batch, a week of rain — where every option costs something.
Existing event costs roughly doubled.

Result across a full 50-week run at Pro, taking the first option on every event
card: **10 losing weeks, worst week −$64, 21 weeks losing customers to the rival,
14 wrong forecasts.** Greedy pricing ($2.50) now ends at a $4,812 offer against
$7,757 for sensible pricing — price is a real decision instead of free money.

### Tier scaling

Raising costs broke Rookie completely: 42 losing weeks out of 50. Two causes,
both real bugs rather than tuning:

1. **Event costs were absolute.** A $30 hit is a rounding error at Tycoon and
   fatal at Rookie, where a week grosses $16. Cash and stock swings on event
   cards now scale with the tier (Rookie 0.3×, Pro 1×, Tycoon 2.5×), and event
   copy no longer quotes dollar figures, since the figure moves.
2. **The restock suggestion collapsed to zero.** It was based on last week alone,
   so one rained-out week suggested ordering nothing — and a stand that orders
   nothing sells nothing, forever. It now uses the best of the last three weeks
   with a floor.

`TierConfig` gained `fixedCostScale`, `unitCostScale`, `spoilScale` and
`eventScale`, which is the spec's model: same loop, different numbers.
Rookie now sits at 4 losing weeks out of 50, which is right for ages 6–9.

### The weekly summary

Pro now gets a real P&L using real words — Sales, Cost of cups sold, **Gross
profit**, then each overhead line, then **Net profit** — followed by a separate
bank block: opening balance, loan payment, and **money in the bank**. Keeping
profit and cash visibly separate is the point; they are different numbers and a
middle schooler can handle being told so. Rookie still collapses to money in,
money out, profit, plus the bank line.

### Tone

Pro is the default tier and is now described as "Overhead, a price war, and weeks
you lose money." Ages relabelled (Rookie 6–9, Pro 10–14, Tycoon 14+). Avatars
went from animals to ⚡🔥🌊🎯🚀👑💎🐺. "Let's go!" → "Start", "How did I do?" →
"See the numbers", "Awesome!" → "Got it".

**FOR JEFF:** this is a tone nudge, not a redesign. If Pro still reads young,
the next lever is dropping Rookie from the tier picker entirely and making Pro
the floor — say the word.

### Save compatibility

`SAVE_VERSION` 1 → 2. `GameState` gained `forecast`, `rivalPrice` and
`rivalCooldown`, so old saves are dropped on load rather than half-migrated.
Any run in progress starts over.

---

## 2026-08-24 (evening) — Deck order and weekly spot choice

Jeff, after playing: he wants to pick the spot every week, and supplies asked
last — "since I'll know if I'm going to market to people or hire an extra set of
hands."

**Spot is now a weekly card**, first after any events. It was week 1 and every
fifth week.

**Supplies is now the last card before End Week**, and the suggested quantity is
*reactive*: it recomputes from advertising bought and helpers hired or let go
earlier in the same week. Advertising raises expected demand; a helper raises how
many cups you can physically hand over. The card also states the capacity plainly
("You have 45 cups left over. You can serve 350 this week.") and calls out what
changed. Until the player touches the stepper it follows the suggestion; after
that it is theirs.

Note that hiring does **not** always raise the suggested order — only when
capacity was the binding constraint. A helper does not create demand, and the
number should not pretend otherwise.

**Deck shape is now:** events → spot → price → rotating extras → supplies →
ready. `maxCards` counts all three fixed cards, so the caps went up (Rookie 4,
Pro 6, Tycoon 8), leaving 1 / 3 / 5 slots for rotating extras.

**Staffing replaced the hire-only card.** You could previously hire but never let
anyone go, so a wage was a permanent commitment — which is a genuine dead end now
that winter can run at a loss. The card surfaces when there is a decision to
make: nobody hired yet, or a losing week a wage might be the cause of.

### Does free weekly relocation break it?

Checked before shipping, because chasing the forecast between a free front yard
and a busy pitch looked like an obvious exploit. It is not:

| Strategy | Losing weeks | Final offer |
|---|---|---|
| Park all season, $1.50 | 11/50 | $8,005 |
| Chase the forecast, $1.50 | 11/50 | $8,528 |
| Soccer all season, $1.75 | 10/50 | $12,010 |
| Chase the forecast, $1.75 | 16/50 | $10,394 |

Active management earns about 6% over a fixed pitch at the lower price, and is
*worse* at the higher one — retreating to the front yard on a forecast that turns
out fine costs you the good week. Since the forecast is only right about two
thirds of the time, weekly relocation is a real bet rather than free money, so no
moving cost was added. A lemonade stand is portable; the spec already gives the
food truck weekly spot choice as its signature mechanic (Section 7).

Full 50-week run after the change: no dead ends, 12 losing weeks, worst -$46.

---

## 2026-08-24 (night) — Second playtest pass

Seven items from Jeff playing it. Three were bugs.

**Weather ran in long streaks.** Each week drew independently from a seasonal
table, and at 45% odds "sunny" repeating five weeks running is entirely likely —
which reads as broken even though it is not. Repeating last week's condition is
now discounted to 30% of its weight, and after three weeks it cannot repeat at
all. Verified over a 50-week run: longest streak 3, all five conditions used.

**Event choices cost money invisibly.** *(bug)* Buying the rival's table did
debit the cash — `eventCash` was folded into profit — but no line in the recap
ever named it, so choices felt free. The P&L now carries a "⚡ What happened"
line (or "Lucky break" when an event pays). This is why the week Jeff bought the
table looked like nothing happened.

**Buying the rival's table bought nothing lasting.** *(bug)* The card said "A
second table. More room to serve" and granted a one-week demand bump. Event
choices can now carry permanent `equipment` and `capacity`, so the table is
+40 cups a week forever and adds to the sale price at exit.

**Back on every card.** It was suppressed on event cards. Now every card has it
except the very first of a week, where there is nothing to go back to — the
previous week is already simulated and saved.

**"You need another pair of hands" with a helper already hired.** *(bug)* The
coach line never checked the payroll. With a helper it now reads "Even with help
the line was too long. A quieter spot or a higher price would thin it."

**A cold snap in sunny midsummer.** Event cards had no seasonal awareness. They
now take optional `seasons` and `weathers` gates: heat wave is summer-only and
needs hot or sunny weather, cold snap is barred from summer, rain-all-week only
deals when it is actually wet, and the spoiled-batch and out-of-ice cards are
warm-season only.

**Side treats.** A new `sideProducts` config: cookies, lollipops, gummy bags and
brownies (Pro+). A share of the customers already buying a drink add one, so
these raise revenue per customer without needing new customers — the "would you
like fries with that" lesson. The card shows cost, price, the margin kept and the
attach rate, so picking between a 45%-attach 42¢-margin lollipop and a 22%-attach
$1.45-margin brownie is a real calculation. Over a 50-week run treats added $638
of revenue and did not flatten the difficulty (11 losing weeks, unchanged).

**Bad reviews were always the same complaint.** There is now one review card per
failure mode — warm and slow, watery, overpriced, a rude helper (needs staff),
and a dirty table — and **every one has an "Ignore it" option costing a flat
-0.12 reputation**. Doing nothing should be available and should cost a little,
which is what a real ignored review does. A test enforces that every card
titled "Bad Review" has an ignore option in that range.

`SAVE_VERSION` 3 — `GameState` gained `weatherStreak`, `bonusCapacity` and
`sideProductId`. 53 tests pass.

---

## 2026-08-24 (late) — The books did not balance

Jeff: "I bought 100, but sold out early at 55? Made $24 but same amount in bank
at the end of the week?" Reproduced exactly, and he had found a real bug.

**Stock destroyed by an event was never expensed.** *(bug — profit was wrong)*
The spoiled-batch card dumps 45 cups. Those cups were paid for, never sold, and
appeared in no expense line: not in cost of goods (never sold), not in spoilage
(that is the weekly leftover calculation), not in "What happened" (cash only).
Profit was overstated by the full value of the destroyed stock — in Jeff's week,
$18.90 of a reported $24.31. The correct figure was $5.41.

Event-destroyed stock is now written off at cost as `stockLost` / `stockLostCost`
and shown as its own line ("💥 Stock lost (45)"). A test asserts the identity
`unitsBought === sold + thrownOut + stockLost + leftOver` for the reported week,
and a 50-week test asserts it holds on every event-free week.

**"Sold out at 55" after buying 100** was the same bug seen from the other side:
45 cups had been dumped by the event, so only 55 were on the table. Correct
behaviour, invisible cause. The event's outcome line now also appears on the
results screen, not just during the week animation, because the results screen
is where the numbers get questioned.

**"$24 profit but the same money in the bank."** The bank block showed opening
balance, loan payment, closing balance — three numbers formatted like a
subtraction that did not subtract, because every other cash movement was missing.
It is now a full reconciliation: opening, sales, supplies bought (with the unit
count, which Jeff asked for separately), rent and running costs, event cash, loan
payment, closing. It always adds up. Below it, one line names the gap between
profit and cash: either "you paid for stock you have not sold yet" or "loan
principal moves cash without being a cost."

**The weekly goal bonus is gone.** Jeff: "I do not want a goal bonus. That is not
a real thing." Correct — a business does not pay itself $5 for hitting a target,
and the fake cash was inflating both the bank balance and net profit. The weekly
goal and the streak counter remain as something to aim at; they pay nothing. A
test now asserts cash only ever arrives from sales, an event, or the emergency
advance.

`SAVE_VERSION` 4. 58 tests pass.

---

## 2026-08-24 (late) — Setup asked for the spot twice

Jeff: "In the beginning it asks on two back to back screens where I will set up."
Correct, and my fault: when the spot became a weekly card I left the old setup
step in place, so the last screen of setup and the first card of week 1 asked the
same question one after the other.

Setup is now tier → financing → play. "Open for business" moved onto the
financing screen, and week 1 opens on the spot card like every other week.
`newGame` still takes a `locationId`; it is now only the starting default for
that first card.

Opening flow: name → level → financing → where will you sell → price → supplies.

---

## 2026-08-24 (late) — Fit a week on one screen

Jeff: "fit it so that I don't have to scroll." Measured first: at a 720px-tall
window the week screen ran 883px, so 163px over. The two hogs were the header
stack (164px: HUD, a pill row, the net worth bar, and the goal pill each on their
own line) and the supplies card (383px, mostly four stacked explanatory
sentences).

Changes:
- Header collapsed from four rows to two — every context pill, the weekly goal
  included, now shares one wrapping row, and the net worth bar dropped 14px to 7.
- The stand art is `clamp(96px, 17vh, 150px)` instead of a fixed 190px, so it
  gives back height on short screens rather than pushing the card down.
- The supplies card's four sentences became one row of chips (left over, can
  serve, last week's buy/sell/turned away, plus whatever was decided earlier).
- Global trim: card padding 14→10, ledger rows 8→5, gaps 12→8, page bottom
  padding 40→14, tap target 56→52.
- The results screen puts the P&L and the bank reconciliation side by side
  (`.recap-cols`), stacking again under 560px.
- A `max-height: 780px` block gives back more from the art and the padding for
  laptops with a lot of browser chrome. Touch targets bottom out at 46px, still
  above the 44px floor the wrap rules require.

Verified by walking every screen of a run and measuring `scrollHeight` against
the viewport:

| Window | Screens checked | Screens that scroll |
|---|---|---|
| 760 x 890 (Jeff's) | 36 | none |
| 768 x 1024 (iPad) | 18 | none |
| 1280 x 660 (short laptop) | 30 | results by 86px, treats by 78px |
| 375 x 812 (phone) | — | results by ~110px, treats by ~47px |

**Not fully solved at the extremes, and worth saying plainly:** a card with five
options plus the header, art and button cannot fit a 660px-tall window without
shrinking text past what a kid should have to read. The decision cards fit
everywhere that matters; what still scrolls is the results screen and the
five-option treats card, on unusually short or narrow windows. If that bites,
the lever is dropping one treat option or moving the art off the decision cards.

---

## 2026-08-24 (late) — Profit-to-cash bridge

Jeff: "why does profit say $52 but the bank moves $54?" Fair question, and the
answer line I had written was guessing.

The exact identity, verified to the cent over 50 weeks:

```
bank moved = profit
           + (cost of stock used - stock bought)   <- inventory swing
           - loan principal repaid
           + any emergency advance
```

Two things move cash without touching profit, in opposite directions. Selling
stock that was paid for in an earlier week charges profit but not this week's
cash, so **cash comes in above profit**. Buying stock you have not sold yet does
the reverse. Loan principal always leaves the bank without being an expense.

**The old explainer was wrong.** It picked one of two canned sentences based on
whether more units were bought than sold, and blamed "loan principal" for every
case that was not overbuying — which names the wrong cause whenever the stand is
drawing down stock, exactly the case Jeff was looking at. Loan principal pushes
cash *below* profit; his gap was cash *above* profit.

Replaced with a real bridge on the results screen, printing only the rows that
apply:

```
🧮 Profit                     -$29.58
🥤 Sold stock bought earlier  +$75.18
🏦 Loan principal repaid       -$5.77
💵 Bank moved                 +$39.83
```

Shown to the cent, because a bridge whose rows do not visibly add up is worse
than no bridge. A test asserts the identity holds every week of a 50-week run
with the inventory swing deliberately driven both ways, and a second test
asserts cash beats profit when the stand sells with no restock.

---

## 2026-08-24 (late) — Ready to hand to playtesters

Jeff wants to send it to a few people. It is a static page with no server, so
sharing is just hosting a folder — see `PLAYTEST.md` for the commands and for
what to ask testers.

Prepared for it:

**Verified the production build, not just the dev server.** Everything up to now
had been tested against `vite dev`. Served `dist` and played through: 34 screens,
save persisted, no console errors. 127 KB gzipped.

**Build stamp.** `vite.config.ts` injects `__BUILD_ID__` — the Vercel commit SHA
when deployed, the date locally. It shows in small text on the opening screen and
is written into every exported save, so a tester's report can be tied to a
version.

**A dropped run now explains itself.** `loadRun` returned `null` for both "no
save" and "save too old to read", so a tester whose week-20 run was invalidated
by a redeploy would land on the new-game screen with no idea why. It now returns
a status, and the setup screen says the game was updated and that trophies were
kept.

**`vercel.json`** builds the School Edition and sets cache headers: hashed assets
immutable, everything else `no-cache`, so a reload picks up a new deploy rather
than a stale index.

**The save export is the feedback channel.** It already contains every week's
decisions and results; with the build id added it is self-identifying. One tap
for the tester, and Jeff can load their file and step through the actual run.

**Operational caveat, flagged in PLAYTEST.md:** changes to numbers, wording,
events and layout are safe to ship mid-test, but anything that changes the shape
of a save forces `SAVE_VERSION` up and resets in-progress runs. Worth batching
those while people are playing.

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
