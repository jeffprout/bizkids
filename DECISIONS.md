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

## 2026-08-24 (late) — Explaining the line items

Jeff asked for hover explanations, or a question mark to click.

**Not hover alone.** Wrap-readiness rule 2 is "no hover-dependent interactions",
because iPad and Chromebook are the primary targets and neither has a hover
state. Hover-only help would be invisible to most of the audience.

**Not a tiny "?" per row either.** A 16px icon is not a 44px touch target, and
giving each one a 44px hit area would make adjacent rows' targets overlap, since
ledger rows are only about 26px apart. Padding the rows out to 44px each would
undo the work of fitting a week on one screen.

**What shipped:** one full-width **"❓ What do these mean?"** button per screen
that reveals a plain-English line under every explainable item at once, and
collapses again. It is a 696 x 44 target, unambiguous, and works identically by
touch and mouse. Each row also carries a small grey `?` marker so it is visible
that an explanation exists, and a native `title` tooltip — so Jeff gets his hover
behaviour on desktop as a bonus, never as the mechanism.

Explanations are off by default, so the results screen still fits one screen
until you ask for help. With them on it is deliberately long; you are reading,
not tapping through.

**`src/config/glossary.ts`** holds 27 entries, each with the plain wording and
the curriculum concept it demonstrates (fixed costs, cost of goods sold, working
capital, interest vs principal, valuation multiple, goodwill…). That tagging is
deliberate: spec Section 12 wants every mechanic mapped to a concept and the map
shipped as a document, and this file is that map in machine-readable form rather
than a second thing to keep in sync.

Wired into the results screen (P&L, the bank reconciliation, the profit-to-cash
bridge) and the sale screen, which is the most jargon-heavy of all.

---

## 2026-08-24 (late) — Treats sold was not actually reported

Jeff: "It doesn't say how many treats were sold." He was right in substance. The
count existed, but only tucked inside a money row's label as `🍭 Treats (18)`,
next to a prominent `🥤 Cups sold  55` row — so the one number with its own line
was drinks, and treats looked like a dollar figure with a footnote. On Rookie,
where the P&L collapses to a single Sales line, the count never appeared at all.

Treats now get a count row of their own, directly under cups sold and on every
tier, and the money row is plain `🍭 Treat sales`:

```
🥤 Cups sold      63
🍭 Treats sold    28
💰 Drink sales   $95
🍭 Treat sales   $14
```

Added in the two other places the number is actually wanted:

- The week animation, which counts cups up, now also shows "🍭 21 treats too".
- The treats card itself reports last week's take-up — "Last week 21 of your 46
  customers added one" — which is the number you need to judge whether to keep
  selling them, and it is the attach rate made concrete.

New glossary entry `treatsSold`, tagged to the concept **attach rate**.

---

## 2026-08-24 (late) — Cost of treats sold

Jeff: "what about cost of treats sold?" A genuine reporting error, not a
presentation gap. The engine computed the treat cost correctly but folded it into
the total: `cogs = served * unitCost + sideCogs`. The recap then split revenue by
product line while showing a single cost line labelled **Cost of cups sold** —
which quietly contained the candy. Split revenue against combined cost means
neither line's margin is true.

Now reported separately:

```
💰 Drink sales           $96
🍭 Treat sales           $15
🍋 Cost of cups sold    -$27
🍭 Cost of treats sold -$2.32
```

Drink cost is derived as `cogs - sideCogs`, both of which are already on
`WeekResult`. **Deliberately no new field, so `SAVE_VERSION` stays at 4** — with
playtesters about to start, a save-shape change would reset everyone's run for a
label fix, and that trade is not worth it.

A test now pins `cogs - sideCogs` to exactly `served x unit cost`, so nothing can
drift back into the drinks line. *(The first version of that test had a garbled
`find` predicate that always matched the first recipe and compared against the
wrong unit cost — the test was wrong, not the code.)*

The treats card also now answers "are these worth selling" directly: "Last week
29 of your 64 customers added one, worth $12.18 after what they cost."

---

## 2026-08-24 (late) — Switching helpers, and why the soccer field always won

Two from Jeff, both correct.

### "At what point am I able to switch helpers?"

Never, was the answer. Two separate faults:

1. The staffing card only appeared when `employees.length === 0 || lostMoneyLastWeek`.
   I had made it "contextual" so it would not nag, which meant a profitable run
   never offered it at all.
2. Even when shown, it only offered keep or fire. There was no swap.

Staffing is now a **fixed weekly card at Stage 2**, alongside spot, price and
supplies — a wage is a weekly decision, so it gets asked weekly. The card offers
keep, switch, or let go:

```
👧 Keep Maya · $40 a week
🧒 Switch to Theo · $25 a week   Cheap and cheerful. Serves fewer than Maya.
🙅 Let Maya go
```

A swap sets `fireEmployee` and `hireEmployeeId` in the same week, which the
engine already handled — only one wage is charged. Rookie's card budget went
4 → 5 so it keeps a rotating slot after the four weekly cards.

### "There doesn't seem to be EVER any reason to switch from the soccer field."

Right, and the earlier probe data said so plainly: soccer had both the highest
exit ($11,764 vs the park's $7,757) **and** the fewest losing weeks. A dominant
option with no trade-off.

The arithmetic: soccer buys +48 cups a week over the park for +$13 of overhead,
about +$35/week of pure profit. Nothing in the model ever made that a bad bet.

**Fix: locations now have their own seasonality**, separate from how thirsty
people are. A soccer field lives by the league calendar; a park is a summer
destination; a front yard barely notices the year and costs almost nothing.

| Spot | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| Front yard | 1.00 | 1.00 | 1.10 | 1.25 |
| Park | 1.05 | 1.25 | 0.85 | 0.60 |
| Soccer field | 1.45 | 0.55 | 1.45 | 0.25 |

Now soccer owns spring and fall, the park owns summer, and the front yard is the
winter refuge — it wins on having almost no overhead when nobody is out, not on
traffic. Across three seeds, rotating with the season earns about 25–30% more
than camping on the soccer field *and* has roughly 40% fewer losing weeks:

```
always soccer      losing 14/50  OFFER $ 9,335
follow the season  losing  9/50  OFFER $12,118
```

The spot card now says how busy each place is right now ("🔥 Busy this time of
year", "😴 Quiet this time of year"), because a weekly choice the player cannot
see the reason for is just a dice roll. Four tests pin the reversal: soccer
peaks outside summer, the park beats it in summer, and the front yard beats both
on profit in winter.

Also trimmed the results screen — splitting drink and treat costs had pushed it
35px past the fold — by tightening its ledger rows and folding the "forecast was
wrong" banner into the heading. A full 50-week run now scrolls nowhere at
760 x 890.

---

## 2026-08-24 (late) — The cooler bought you nothing

Jeff: "I had to buy a new cooler. Did it even charge me? It should be a
significant charge for what it is."

It did charge — $28, shown as "⚡ What happened" in both the P&L and the bank
reconciliation. But checking it turned up a worse problem: **taping it up was
strictly better than buying one.**

```
fix   profit $27.64  cash $273.00  equipment $38
tape  profit $33.76  cash $274.50  equipment $38
```

Better profit, better cash, identical assets. The $28 purchased nothing durable,
so the rational play was always to skimp — which teaches the opposite of the
intended lesson.

Now it is a capital purchase with a real trade:

```
fix   cash $256.00  equipment $63  net worth $319.00
tape  cash $273.50  equipment $20  net worth $293.50
```

Buying costs $45 and adds $25 of gear — **you spend more than the asset is
worth the moment you own it**, and that gap is the honest cost of the week.
Taping costs $2 now and writes $18 off the stand's value, on top of a weak week
and a reputation ding. Skimping genuinely wins on this week's cash; buying
genuinely wins on what the business is worth at the sale. Neither dominates.

**Two other cards had the same fault** and were fixed alongside:

- *Insurance* — "Risk it" had literally no downside ("Nothing happens this week.
  Probably fine."), so paying for cover was never a decision. Skipping now costs
  0.3 reputation, which is real money here because reputation drives both demand
  and the exit multiple.
- *Stolen cash* — the lock box cost $12 more than shrugging and bought nothing.
  It now adds $12 of equipment, so the extra spend is an asset rather than a
  penalty for choosing well.

Three tests now assert that neither option on a spend-or-skimp card dominates:
the cheap route must win on cash, and the careful route must win on net worth or
reputation.

**One accounting note, deliberately left as is.** Equipment bought through an
event is expensed in full the week it is paid for, rather than capitalised and
depreciated. That is cash-basis accounting, which is legitimate and normal for a
business this size, and it keeps the profit-to-cash bridge to two terms instead
of three. The asset still shows up in net worth and in the sale price, so the
value is not lost — only the timing is simplified. Worth revisiting at Tycoon
tier, where depreciation would be a fair thing to teach.

---

## 2026-08-24 (late) — Making the long game visible

Jeff: "What is the long term goal? I'd like to see the goals a little more
pronounced."

The goal was in the design but not on the screen. A player saw `week 12/50` and
a weekly mini-goal, and nothing else until a buyer appeared in week 50. The whole
arc the spec is built around — *a business is an asset you build and sell* — was
invisible for 49 weeks.

**Stated up front.** The business card on the setup screen now says it plainly:
"Build it up over 50 weeks, then sell it for as much as you can."

**Live valuation in the HUD.** A tappable pill shows what the stand would fetch
today — `🎯 worth $959 · goals`. This is the single best change: the exit number
already existed in `valueBusiness`, it was just hidden until the end. Showing it
weekly connects every decision to the thing being built. Early on it is mostly
assets minus debt, which is honest — that really is what you would get.

The net worth bar was a fake meter (`netWorth / 400`) with no defined top. It now
tracks weeks played, which is a real quantity.

**A goals screen** (menu, or tap the pill) covering all three timescales:

- **The sale** — what you would get today, weeks remaining, and the three
  reasons the offer sits where it does, reusing the valuation's own reasoning.
- **Next stage** — progress bars against the actual thresholds (total sales and
  reputation), so Stage 2 stops being a surprise.
- **This week** — the mini-goal and streak.
- **Trophies** — earned count, plus the next three still locked, so there is
  always something visible to chase.

Costs nothing on the decision screens: the pill joins the existing wrapping row
and a full week still fits one screen with no scrolling. The goals screen itself
lands within 2px of the fold.

---

## 2026-08-24 (late) — The bulk box charged you twice, and hot chocolate

### "Where does it list that savings? Even the what happened is negative"

Jeff was looking at a card that hands you 90 cups and wondering where the
discount went. It went nowhere, because there wasn't one — and worse, **the same
stock was charged to profit twice**:

- $32 left the bank as an event expense ("⚡ What happened −$32"), and
- when those 90 cups sold, cost of goods charged another 90 × $0.42 = $37.80.

$69.80 of expense for one $32 box. The "way under normal price" copy was also a
lie: $32 against a normal $37.80 is 15% off, not a bargain.

**Root cause: stock had no cost basis.** Inventory was a unit count, and cost of
goods was always `units × today's unit price`, so stock acquired any other way
was invisible to the books.

**Fix: inventory is now held at weighted-average cost.** `GameState` carries
`inventoryCost` in dollars alongside the unit count. Buying stock moves cash to
inventory rather than expensing it; cost of goods, spoilage and event write-offs
all draw down at the running average. A card that hands you stock is now booked
as a purchase — its cash joins supplies bought instead of hitting the event line.

The saving now shows up exactly where it should: 60 cups at $0.42 blended with
90 at $0.278 gives an average of **$0.33**, and the P&L line reads "Cost of cups
sold ($0.33 each)" for weeks afterwards. The supplies card carries the same
number as a chip, so you can see the effect before you commit.

The box is $25 now, a real 34% discount. Note it is still **not** an automatic
win — a big box in a slow week spoils before it sells, which is what makes it a
decision. A test asserts that per-cup cost falls; deliberately none asserts that
buying always pays.

*(A test caught a related trap while I was at it: any test constructing
`inventory` must also set `inventoryCost`, or the stock is free and costs nothing
when sold.)*

`SAVE_VERSION` 5. Done now rather than later precisely because nothing has been
deployed to testers yet.

### Hot chocolate

Jeff: "winter months should add hot chocolate." Which also answers the winter
dead zone flagged as an open question after the first playtest.

`QualityDef` gained optional `seasons`, `seasonMods` and `weatherMods`, so a
menu item can carry its own calendar and its own response to weather instead of
inheriting lemonade's. Hot chocolate is on the menu in fall and winter only, at
$0.55 a cup, and it likes exactly what lemonade hates:

| | Hot | Sunny | Cloudy | Rain | Cold |
|---|---|---|---|---|---|
| Lemonade | 1.80 | 1.25 | 0.90 | 0.45 | 0.35 |
| Hot chocolate | 0.15 | 0.65 | 1.10 | 1.30 | 1.70 |

Over a full year at the park, winter profit goes from **$15 to $302**. And it is
a real decision rather than a free upgrade — pivoting for *both* cold seasons is
worse than not pivoting at all, because fall still belongs to lemonade:

```
lemonade all year      end cash $4,302
cocoa fall + winter    end cash $4,268
cocoa in winter only   end cash $4,619
```

The menu card is offered every week while a seasonal item is on the menu, and a
product goes off the menu when its season ends — a player who stops paying
attention is put back on a year-round recipe rather than quietly selling cocoa
in July.

**Simplification worth noting:** inventory is generic "cups of supplies", so
switching to cocoa does not strand your lemonade stock. Modelling separate stock
per product would be more truthful and considerably more fiddly; worth revisiting
if the bake shop makes it necessary in Phase 2.

---

## 2026-08-24 (late) — "worth $NaN"

Jeff's week-44 run showed `🎯 worth $NaN · goals` while money read a healthy
$6,793. Reproduced immediately.

**The version guard is not enough on its own.** `loadRun` rejects a save whose
`version` does not match, which is the right check for a save written by an older
build. But if the game updates *while a run is open*, the live state object is
the old shape and the next autosave stamps the **new** version onto it. The save
then passes the guard forever while missing a field.

Here that field was `inventoryCost`, added an hour earlier. The chain:

```
inventoryCost undefined
  -> avgUnitCost = undefined / 120   -> NaN
  -> cogs                            -> NaN
  -> profit                          -> NaN
  -> profitHistory poisoned          -> valuation NaN
```

Cash was never touched by any of it, which is exactly why the display looked
half-right: real money, nonsense valuation. That is the dangerous shape of this
bug — it does not announce itself.

**Three layers, because one was clearly not enough:**

1. **`sanitizeRun`** checks every number on a loaded save, rebuilds what is
   missing, and filters non-finite entries out of the histories. A missing
   `inventoryCost` is rebuilt by pricing the stock on hand at today's cost — an
   estimate, and vastly better than NaN. This repairs saves that are already
   broken, including Jeff's.
2. **`simulateWeek` sanitizes its input** rather than trusting the caller, so a
   bad field cannot poison a run mid-flight even if it gets in some other way.
3. **`valueBusiness` never returns a non-finite offer.** A price on screen is
   always a number; if something upstream is broken, show what is certain.

Verified against a reconstruction of the exact save — week 44, `inventoryCost`
deleted, `null`s planted in the profit history. It now loads showing
`🎯 worth $7,177`, and a full week played afterwards leaves no non-finite number
anywhere in the save.

Three tests cover it: a save missing `inventoryCost` stays finite; every result
field stays finite with each of seven fields deleted in turn; and the valuation
never returns NaN even when handed a poisoned history.

**Worth remembering for the playtest.** This is exactly the failure mode that
`PLAYTEST.md` warns about — shipping a save-shape change while people are
mid-run. The difference is that a *rejected* save is visible and explained,
while a *silently half-migrated* one is not. The sanitiser closes that gap, so
adding a field mid-test is now merely untidy rather than corrupting.

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
