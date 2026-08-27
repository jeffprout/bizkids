# DECISIONS.md

A running log of choices made while building Boss Mode (called BizKids until
August 2026). Newest first.
Anything a player would notice and that the spec did not settle is flagged
**FOR JEFF** — those are yours to overrule.

---

## 2026-08-25 (fourth pass) — No more British idiom

Jeff: *"No more British idiom. Not sure how that even happened."*

**How it happened:** the copy was written in a British register, and the only
guard checked SPELLING. Spelling is the easy half — nothing in the game ever said
"colour" — while the vocabulary walked straight in. A market trader's "pitch", a
"till" instead of a register, a truck that "parks up", "footfall", "proper" as an
intensifier, "reads badly", "put it down to experience", and — in a game whose
owner sells insurance for a living — "Liability Cover" instead of coverage.

**The bigger miss:** the first guard, written earlier the same day, read only
EVENT CARDS. That is exactly how the location named **"Festival Pitch"** survived
it. The word was on screen every single week, on a card the test never looked at.
The new guard in `americanEnglish.test.ts` walks every string a player can read —
cards, location names, menu names, side items, staff, marketing, loans, asset
options, badges and the glossary — and it is proven non-vacuous by reintroducing
"Festival Pitch" and watching it fail.

Fixed: Festival Pitch -> **Festival Grounds**; the till -> a locking register;
"sixty covers" -> sixty lunches; "a meal deal" -> a combo; "fair enough, they
say" -> they get it; "have a word" -> talk to them; "reads badly" -> looks bad;
"a corner near the bins" -> by the dumpsters; "grey" -> gray; "Passer-by" ->
Passerby; "four weeks shut" -> four weeks closed; "afterwards" -> after that;
"Annualised" -> Annualized; and every "proper/properly" as an intensifier.

**The glossary was written entirely for the lemonade stand.** A food truck owner
tapping the "?" beside "Cost of meals sold" was told what the lemons, cups and
ice cost. Every entry is now business-neutral — which is the right call here and
NOT a retreat to the placeholder approach Jeff rejected for event cards. A card
is somebody speaking and belongs to one business; a definition of gross profit is
the same idea whatever is being sold. Guarded by its own test.

**Also found on the way:** four cards per business still shared the title "Bad
Review", which reads as the same card over and over. They are now Cold And Slow,
Smaller Plates, Too Expensive, Grease On The Window, Nobody Looked Up, Warm And
Slow, Too Watery, Sticky Table. A test that hooked on `title === 'Bad Review'`
broke, and was re-pointed at the `concept` tag — what a card teaches is durable,
what it is called is not.

---

## 2026-08-25 (third pass) — Demand was not arbitrary, it was invisible

Jeff, losing interest: *"It is almost impossible to make money... I don't
understand how the amount of people visiting the truck is calculated. It seems
very arbitrary but slightly tied to weather. The locations are almost the same
results. The help almost is never justified."* Then, with a screenshot: *"I just
had a heat wave so I hired a helper and stocked up and only sold 285 meals at a
festival. I mean... WTF."*

Every one of those was a real defect. The balance guard added earlier this
session did not catch any of them, because **it plays with an oracle** — it calls
`computeDemand` to decide how much to order, which no human can do. It proved the
economics can work, not that the game can be played. A second probe was written
that can only see what the SCREEN shows, and it told a very different story.

**Week 35 reconstructed.** Fall, Festival Pitch, heat wave, five stars, $90 of
advertising: 700 foot traffic x 0.3 conversion x 0.72 season x 1.8 heat x 1.35
stars x 1.3 advertising = **about 478 expected**. He got 285. The festival's
week-to-week luck was a FLAT +/-55%, so the honest range that week was 215 to
740. He ordered 630 and threw away 224 — $470 of food, against a net profit of
$19.20. Nothing was broken. He simply had no way to know, and neither would
anyone.

**The noise was flat, and far too wide.** `noiseMod` was uniform over the spot's
whole volatility band, so a 0.6x week was exactly as likely as a normal one. Two
draws are averaged now, which clusters weeks near typical and makes the extremes
rare, and the bands came down: festival 0.55 -> 0.28, night district 0.4 -> 0.2,
soccer field 0.35 -> 0.22. Risk now lives where it can be READ — the season, the
sky, the forecast being wrong a third of the time, and the cards.

**The screen now says what to expect.** `engine/expectDemand.ts` runs the same
model the week will run, against the FORECAST rather than the truth, and the
supplies card shows "Expect about 242-360 meals" plus the two or three things
moving it most ("▲ rain", "▼ the rival"). Four separate forces were moving that
number — season, sky, rival price, luck — and not one was on screen. It updates
live as the price, the menu, the spot and the advertising are chosen.

**The suggested order was systematically too high.** It was "best of the last
three weeks", which orders for your BEST week every week. It now sits at the
newsvendor point — where one more portion costs about what it earns, computed
from the real margin and the real spoilage rate — nudged toward what the run has
actually been seeing.

**FOR JEFF — the help now does a second person's work.** Rosa cost $520 a week
and added 260 plates. At ~$6.40 of margin she had to recover 81 plates every
week, but capacity only binds in the busiest weeks — about ten a week at the
Friday Night District. She could not pay for herself at any spot, at any tier,
under any play: hiring lost money in every single measured run. Wages are
unchanged and realistic (~$17/hour); Rosa now adds 420 and Dev 240. Hiring is
now clearly right at the festival (+$10k over 30 weeks at Tycoon) and still
clearly wrong at the office park, which is the decision it was meant to be.

**Measured, following the game's own advice, 30 weeks, six seeds:** Tycoon
festival $60k solo / $70k with staff, night district $51k, office park $17k. Red
weeks down from 15-29% to 10-19%. The spots are no longer "almost the same".

**Also:** the menu prompt offered a food truck "a hot drink sells when lemonade
will not".

---

## 2026-08-25 (later) — Two kinds of money, and a ceiling below the floor

**"Why is the refund of an angry customer $75?"** Because the card was written
`cash: -30` and Tycoon multiplied it by 2.5. Both halves of that are wrong. $30
was already three and a half meals at Pro, for one cold meal handed back; and a
refund is not the kind of money a tier should scale at all.

There are two kinds of money on an event card and the engine only had one. A
permit, a repair, a catering invoice is BUSINESS-SIZED and should scale with the
tier. Giving a customer their money back is worth one order, and the price of an
order barely moves between tiers ($9 → $11 on the truck, $1.50 → $1.75 on the
stand) while `eventScale` moves 2.5x. Cards can now say `cashUnits` and the
engine converts it at what the player is actually charging that week — right at
every tier, and still right if a business is ever repriced.

Both Bad Review cards became `cashUnits: -1`. Two more cards were double-billing:
"Comp their meal" and "Give them a free cup" charged cash AND removed the item
from stock, so comping an $11 meal cost $30 of cash plus $4.16 of food. The meal
leaving the truck IS the cost — you never had the money to lose — which is also
the better lesson. The cash line is gone from both.

**"Supplies only go up to 600 on Tycoon. I can serve over 1000."** The stepper's
ceiling was a hard-coded 600, written when 600 was more than any business could
serve. The supplies card said "can serve 1,144" directly above a stepper that
stopped at 600. It is twice serving capacity now — over-ordering has to stay
possible, because throwing stock away is half of what the week teaches, and a
ceiling AT capacity would quietly remove it. When the stepper does stop, it says
which wall you hit: "all you can afford" or "more than you can serve".

The arithmetic moved to `src/engine/restock.ts` where it can be tested, since it
carries three real constraints (the money, the committed bill, the serving
ceiling) and a rule that must never break — a business with no stock and no way
to earn is always offered one pack.

**Three capacity numbers became one.** The week screen computed serving capacity
in two places and neither applied the menu's `capacityMod`, so the chip promised
624 on an Everything Menu the engine would cap at 424.

**`npx tsc --noEmit` checks NOTHING in this repo.** The root `tsconfig.json` is
solution-style (`"files": []` plus references), so that command type-checks an
empty file list and exits 0 no matter what is broken. `npm run check` (`tsc -b &&
vitest run`) is the real gate. Found by shipping a `Cannot find name` past a
green `--noEmit`.

---

## 2026-08-25 — Tycoon was a tax, not a difficulty

Jeff, playing the food truck: *"I can't make a dollar in Tycoon on the food
truck."* He was right, and it was not a matter of playing better.

**What was wrong.** Every tier ran the SAME footfall and then piled bigger bills
on top of it. Tycoon tripled overhead, multiplied unit costs by 1.6, and put a
$120,000 build with a $910-a-week loan in front of a truck that still only sold a
hundred-odd meals a week. Played identically on an identical seed, the Pro truck
made $11,984 over twenty weeks and the Tycoon truck made $2,121 — and every
LEASED Tycoon truck, in every spot, lost money outright. Break-even at the Friday
Night District needed 176 meals a week against typical demand of 82-165.

**The fix.** A tier now scales the MARKET as well as the bills. `trafficScale`,
`capacityScale` and `wageScale` join the existing multipliers; Tycoon runs at
2.6x traffic, 2.6x capacity and 1.6x wages. A $120,000 truck is not a $24,000
trailer with worse luck — it is a bigger operation in a bigger city, and the
footfall now says so. Rent moved onto `fixedCostScale` at the same time: a flat
$260 pitch fee against triple the footfall had erased the festival's whole
lesson.

**Where the scaling lives.** `businessFor(id, tier)` in
`src/config/businesses/index.ts` returns the business already sized for the tier,
and every reader — engine and UI — goes through it. Scaling privately inside
`simulateWeek` was the obvious alternative and is wrong: the week screen reads
capacity, wages and batch sizes straight off the business to tell the player what
a decision will do, so a private scale would make every one of those numbers a
lie by the time the week ran. Pro is the scale everything is authored at, and
`businessFor` returns the base object unchanged there — asserted by test.

**A card that wiped the fridge.** Jeff bought 225 meals ahead of a forecast heat
wave, served 25, and turned 299 people away. The cooler card is written to
destroy 80 portions; event scaling ran that PORTION COUNT through the MONEY
multiplier and made it 200. Physical things now scale by `trafficScale` — a
cooler holds what a cooler holds, and a bigger truck loses a bigger cooler's
worth, stinging exactly as much as it did at Pro. Money still scales by
`eventScale`. Tested by comparing the loss as a share of a well-stocked week
across tiers: it used to be 35% at Pro and 87% at Tycoon.

**The recap now names the culprit.** `stockLostTo` carries the card's title
through to the ledger, so "Stock lost (200)" reads "It Failed Overnight (200)"
and the order-judgement block says so too. The result line was already at the
bottom of the recap; the number and the reason are together now.

**FOR JEFF — Tycoon lemonade got $220 more pocket money.** A 2.6x market needs
stock to sell into it, and $30 of working capital could not buy it. Tycoon
savings went $210 → $430 (startup is still $180). Rookie and Pro are untouched.

**A balance guard, so this cannot come back quietly.**
`src/engine/__tests__/tierScale.test.ts` plays 30 weeks competently across every
tier, spot and acquisition route on four seeds and fails if any of them ends in
the red or goes bust. That is the test that would have caught this before Jeff
did.

**Smaller things found on the way.** The First Sale badge congratulated a food
truck owner on selling their "very first cup" — every business earns that badge,
so it cannot name what was sold. The used-truck card said "opens in 5 weeks" next
to a blurb promising four weeks shut; the count IS the number of shut weeks, so
it reads "shut for 4 weeks" now.

**Known and NOT fixed:** the week screen still draws a lemonade stand for the
food truck (`StandArt.tsx`). It wants a truck scene of its own with the same
stage-by-stage upgrades, which is real art work rather than a tuning fix.

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

## 2026-08-25 — Updated spec and handoff, and off Vercel

Jeff sent revised `CLAUDE.md` and the game spec (then `biz-kids-game-spec.md`,
now `boss-mode-spec.md`). Both are now in the
repo. Three changes in them:

1. **Spec Section 7: 10 businesses becomes 11.** A **Pizza Parlor** joins, as the
   deliberate foil to the food truck — the truck teaches mobility (escape a bad
   spot weekly), the parlor teaches commitment (a multi-year NNN lease is signed,
   now make it work).
2. **Phase 2 is now a launch set of four**, not all ten: Lemonade Stand
   (Rookie), Food Truck (Pro), Pizza Parlor (Pro/Tycoon), Insurance Agency
   (Tycoon) — one per signature system, fully tuned. **Phase 2b** ships the
   remaining seven as free post-launch updates, each a pure config addition:
   *"if adding a business requires engine changes, the engine is wrong."*
3. **Hosting moves to Cloudflare Pages.** Vercel's free tier prohibits commercial
   use; Cloudflare's permits it and has no bandwidth cap, which matters for
   district pilots. Netlify is the fallback.

### The hosting change was urgent, because I had it wrong

I set the project up on Vercel one session earlier and told Jeff to deploy with
`npx vercel --prod`. That is precisely what the revised spec rules out, and he is
days from sending links to testers. Replaced now rather than later:

- `vercel.json` deleted; `public/_headers` added, which is how Cloudflare Pages
  takes cache rules (hashed assets immutable, everything else `no-cache`). It is
  copied into `dist` by Vite, verified in the built output.
- `npm run deploy` builds the School Edition and pushes it with Wrangler.
- The build stamp now reads `CF_PAGES_COMMIT_SHA` instead of the Vercel variable,
  so a deployed build still identifies itself in playtest reports.
- `PLAYTEST.md` rewritten around Cloudflare, with the commercial-use reason
  stated so nobody quietly reverts to Vercel later.

No gameplay code was touched: `git diff src/` is empty and all 80 tests pass.

### Not done, deliberately

I had begun a structural refactor to honour the new Phase 2b rule — the business
registry currently lives *inside* `businesses/lemonade.ts`, so adding a pizza
parlor would mean editing the lemonade stand, and `BusinessDef` (the engine's
contract for a business) is declared there too. Jeff said mid-session not to
change the current game, so it was reverted in full.

**Worth doing before Phase 2 starts, not during it.** The engine itself is clean
— no lemonade-specific logic anywhere in `/src/engine`, only the registry import.
The fix is small and mechanical: move `BusinessDef` to `engine/types.ts`, put the
registry in `config/businesses/index.ts`, and point imports at it. Left as an
open item rather than a surprise.

---

## 2026-08-25 — Twelve fixes from playing the deployed build

Played the live site through 7 weeks on Pro and read the numbers off every
recap. Twelve issues, all fixed in one pass. The engine was right throughout;
almost every problem was in what the game *told* the player.

**1. The P&L did not add up on screen.** `dollars()` showed cents only below
$10, so a column read `25 - 5.88 - 1.68 = 17` and the total said `$14.94` six
lines later. Cents are now shown whenever they exist, at any size. This is the
one that mattered most: a game teaching a ledger cannot print a ledger that
fails to add up, and a teacher checks that first.

**2. The spot cards quoted rent only.** Front Yard said "Free" and charged $2;
Soccer Field said "$10 rent" and charged $32 — rent plus a permit the card never
priced. The card now carries the all-in weekly bill, which is the number the
player is actually charged. Overhead is the point of the Pro tier; hiding
two-thirds of it made the lesson unlearnable.

**3. The confirmation screen showed the wrong stock.** It read `state.inventory +
restock`, but the value the game buys is `restockUnits` — which differs whenever
the player accepts the suggested amount without touching the stepper. The
default path, every week, said "0 cups" just before committing.

**4. Event choices hid their price.** "Remake it stronger" costs $4 and raises
unit cost 10% for good; nothing said so. Cash and stock effects are now on the
button; reputation and demand stay hidden. The gamble is whether it works, not
what it costs.

**5. The supplies cap ignored costs already committed.** It offered the whole
bank balance while rent for the spot just chosen was locked in, so the default
order could leave a player unable to pay. It now reserves rent, wages,
advertising and the loan payment, and shows both figures. A floor keeps one
order affordable so the rail can never create a dead end. Verified against a
50-week probe on both tiers and four seeds: a well-played run is bit-for-bit
identical with and without the reserve, so it only ever binds where it helps.

**6. "Buy a little less next week" fired when nothing had been bought.** The tip
keyed on spoilage alone. When the waste comes out of stock already held, the
lesson is about holding it, not ordering it.

**7. The headline valuation was too jumpy to steer by.** One $15 week in week 3
annualised to $535, and the next quiet week halved it. Trailing profit is now
averaged over at least 8 weeks even when fewer have been played — which is what
a buyer does with a short track record, and is stated as a reason on the Goals
screen. Selling unlocks in week 9, so no actual sale price changes.

**8. Screens that did not fit.** Goals overflowed a 1366x640 laptop by 239px and
the recap by 99px. The recap's three ledgers now sit in one grid and go
side-by-side on wide-and-short windows, where the app widens to 1000px: spending
width to buy height is right when height is the scarce dimension. Phones keep
one column with tighter spacing — type size and the 44px tap minimum are never
touched. Everything fits at 375x812, 414x896, 768x1024, 1024x600, 1366x640,
1440x900. **Residual:** the very worst recap — an insolvency week with a late
fee, an event, an emergency advance and 17 ledger rows — still needs about 60px
of scroll on a 375x667 phone. Closing it would mean cutting detail Jeff asked
for, so it stands.

**9. "What happened -$30" named no card.** With two cards on screen the player
could not tell which took the money. Each card's cash now carries its own title
and gets its own row — but only when the parts add back to the total, so the
ledger still balances. A card that hands over stock is booked as supplies, not
as an event cost, and stays lumped.

**10. One number, three names.** The Front Yard's $2 was "Free" on the card,
"Ice, cups & permit" in the P&L and "Rent & running costs" in the cash table.

**11. Price hints had a dead band 1.8x wide.** $2.25 against a $1.50 rival still
read "normal". Four bands now, first warning at 1.15x.

**12. Cold Snap** was already gated out of summer; only the copy was overstated
for spring ("freezing" to "cold").

Also folded the weekly-goal celebration into the chip row, and suppressed the
coach line on weeks the banker speaks — it was saying the same thing twice on
exactly the week with the most to read.

94 tests, up from 80. The new ones cover the ledger formatting, the coach line
in both directions, the valuation damping, per-card event attribution, and a
full 50-week run on both tiers proving the supplies rail costs a good player
nothing.

---

## 2026-08-25 — Renaming the inventory line in the profit-to-cash bridge

Jeff read "Bought stock not sold yet -$4.62" sitting under the profit line and
asked why it was subtracted when the cost of goods had already been charged.

It was not double counting — the line is the reconciling item, and it exists
precisely because cost of goods does *not* cover it. In that week the bank paid
$8.40 for 20 cups; the P&L charged $1.26 for the 3 sold and $2.52 for the 6 that
spoiled, leaving $4.62 of cups still in the cooler. Profit is right to ignore an
asset the player still owns; the bank is right to feel the cash go. It is the
`(increase)/decrease in inventory` line off a cash flow statement.

The arithmetic was right, so nothing changed in the engine. But Jeff knows small
business finance cold, and if the label misleads him it has no chance with a
ten-year-old. Two things were wrong with it:

- **It named an action, not a balance.** "Bought stock not sold yet" describes
  the week-one case, where inventory starts at zero. What the line actually
  measures is the *net change* in stock value: buy 110 while holding 23 and
  selling 19, and it reports the $19.32 the stock went up by, not the $46.20
  spent. Now "Money that went into stock", and "Stock that turned back into
  cash" the other way — both true whichever direction stock moves.
- **Nothing said the card was a reconciliation.** Three rows under a heading-less
  card, directly below a column of costs, read as more costs. The card now says
  "Why the bank moved by a different amount" across the top.

Costs about 20px of height. On a 375x667 phone a busy bridge week now needs
about 33px of scroll where it previously fit; every other viewport is unchanged.
Worth it — the recap exists to be understood, and this was the one card that
demonstrably was not.

---

## 2026-08-25 — Weather cards now agree with the forecast

Jeff saw the Weather Kid announce rain all week while the forecast on the HUD
said sunny.

Events were gated on `state.weather` — the truth — while the player is shown
`state.forecast`, which is deliberately wrong about a third of the time. So any
weather card drawn in a week where the forecast had drifted contradicted the
screen it was sitting on. Jeff's exact case: the week was cloudy, the forecast
drifted to sunny, and `wet-week` accepted cloudy, so a card titled "Rain All
Week" appeared beside a sunny forecast on a week that was neither.

Worse than the cosmetic clash, the card **leaked the answer to the bet**. A
player who noticed that a weather card always told the truth could ignore the
forecast entirely whenever one appeared, which is the one mechanic the whole
ordering decision rests on.

**Fixed** by requiring a weather card to match the forecast *and* the real
weather. It cannot contradict the screen, and it cannot promise rain and deliver
sun. Within a card that spans two conditions the two may still differ — "a wet
week" is true of both rain and cloud — so the bet survives; the player learns the
band, not the answer.

Also gave each card a set its words are actually true of. `wet-week` covered
rain *and* cloudy while saying "seven days of rain", so it is now "A Wet Week —
grey and wet all week". `cold-snap` covered cold, cloudy and rain while saying "a
cold wind blew in"; it is now cold only.

**Cost:** weather cards are about a third rarer — 400 simulated weeks deal 21, so
two or three per 50-week run. That is the right trade. A card that announces the
weather is news, and news that disagrees with the forecast beside it teaches
nothing.

### Found while investigating, NOT changed — for Jeff to call

**Weather is counted twice.** `WEATHER_INFO` already scales demand by weather:
rain 0.45, cold 0.35, hot 1.8. The weather cards then multiply that again:

| week | weather alone | card choice | combined |
|---|---|---|---|
| rain | 0.45 | wet-week, "Wait it out" 0.40 | **0.18** |
| cold | 0.35 | cold-snap, "Ride it out" 0.60 | **0.21** |
| hot | 1.80 | heat-wave, "Keep my price" 1.35 | **2.43** |

So a storm week runs 82% below normal demand, and a heat wave nearly two and a
half times it. That may be exactly the drama intended — a storm week *should*
hurt — but it is worth knowing the multiplier is landing twice, because it makes
those weeks far swingier than the card's own numbers suggest. Rebalancing is a
change a player would feel, so it is Jeff's call, not mine.

---

## 2026-08-25 — The spot line, and cost tags that were lying

Two reports, one root cause: a label that did not match what it stood for.

**"Spot rent is wrong. I was on the soccer field. Old values still reporting."**
The values were current. The Soccer Field is $10 rent plus $22 permit, and the
recap printed those as two lines. But the card the player chooses from now quotes
one all-in figure — "Soccer Field · $32 a week" — so the recap showed two numbers
and neither was the one agreed to. "Spot rent -$10" beside a spot billed at $32
reads exactly like a stale value.

The recap now carries one line for the spot, under the spot's own name:
`⚽ Soccer Field -$32`. Same number on the card and on the bill. The rent/permit
split moved into the ❓ explanation, where it can be read by anyone who wants it
without contradicting the headline.

Fixing that exposed the same defect one table over: the cash-side roll-up was
labelled "Spot rent & running costs" while also containing helper pay,
advertising and any late fee — two of its five parts named. Now "Bills paid this
week", with the explanation listing all of them.

**"No charge for extra pricier lemons."** The cost tags I added to event choices
only looked at cash and stock, so "Pay the extra" on the lemon-price card read
`costs nothing` while raising the cost of every cup by 35% — the one thing that
card exists to teach. Five choices across the pool were lying the same way.

The tags now draw the line between the player's own economics and the market's
reaction. Money, stock, what a cup costs to make, how many hands are on the
table, and gear bought or wrecked are all things the player gives up or gains,
and all get said. How many customers turn up and what they think stays hidden —
that is the part being bet on.

The cooler card gained the most from this. It now reads:

    Buy a new cooler   costs $45 · +$25 of gear
    Tape it up         costs $2 · -$18 of gear

which is the depreciation lesson stated outright instead of buried in the
valuation eight weeks later.

The bare label is now "costs no money" rather than "costs nothing" — scoped on
purpose, because ignoring a bad review is free and still costs you something.

Two tests guard it: no choice that moves money, stock, unit cost, capacity or
gear may go untagged, and the set of genuinely free choices must stay non-empty.

---

## 2026-08-25 — Weather counted once, a helper roster, and tap targets

### Weather enters the model exactly once

`computeDemand` was already right: traffic x conversion x season x weather x
reputation x price x quality x marketing x event x noise, each force entering
once. The fault was in the card data. The weather cards encoded **the weather**
where they should have encoded **the decision**, so rain landed at 0.45 x 0.40 =
0.18 and a heat wave at 1.8 x 1.35 = 2.43.

The defect that mattered was not the magnitude, it was that a rainy week's
severity depended on whether a card happened to be dealt. Same weather, same
choices, an outcome twice as bad, for a reason invisible to the player.

**The rule, now enforced by a test:** on a weather card, the do-nothing option is
exactly neutral. Anything else has to be the marginal effect of the action taken.

| Card | Was | Is |
|---|---|---|
| Wet week, "Wait it out" | x0.40 | **x1.0** — the rain already did that |
| Wet week, "Rent a canopy" | x0.75, $24 | **x1.5, $18** |
| Cold snap, "Ride it out" | x0.60 | **x1.0** |
| Cold snap, "Sell it warm" | x0.95, $6 | **x1.6, $6** |
| Heat wave, "Keep my price" | x1.35 | **x1.0** + goodwill |
| Heat wave, "Raise price today" | demandMod 0.85 | **priceMod 1.3** |

That last row needed one new field. `priceMod` multiplies the price actually
charged, so the demand curve produces the drop in volume and the ledger shows
the higher take per cup. A hand-written `demandMod` was inventing a second
elasticity beside the one the model already has — and elasticity is on the list
of things the spec says teachers will check.

**Difficulty barely moved.** Fifty-week probes across both tiers and four seeds:
pro averaged 4.75 losing weeks before and 4.5 after. Weather cards appear two or
three times a run, so the double count was a rare invisible spike rather than a
systematic drag. Removing it took out variance, not challenge.

**A lesson now falls out of the model instead of being authored.** The canopy is
a fixed cost buying a proportional benefit, so it is worth taking at the soccer
field (about +40 cups, +$44, for $18) and not in the front yard (about +5 cups,
+$6). Same card, opposite answer, decided by scale.

### The rival's table did nothing visible

Jeff bought the table and watched "can serve" stay at 350. The engine was right —
`bonusCapacity` had the +40 and had been applying it all along. The chip on the
supplies card simply never added `state.bonusCapacity`, so the one number the
player could see to check the purchase was the one number that ignored it.

### Maya *and* Theo

Asked whether both could be hired at once. They could not: the card offered one
slot, and "Switch to Theo" fired Maya in the same week.

**I got this wrong first time and told Jeff the Switch button was secretly hiring
both.** That came from a test that drove the engine with a decision shape the UI
never sends — the engine appends, but the UI always passes the fire flag too. The
UI was honest; my test was not.

Now it is a roster. Each helper is an independent yes or no, each draws its own
wage, and the card totals both: `2 helpers · $65 a week · serve 500`. The engine
gained `hireEmployeeIds` and `fireEmployeeIds` so a helper can be let go without
losing the other; the old single-helper fields still work for older saves.

Two helpers is a real growth step rather than a cheat — 190 solo plus 160 plus
110 is 460, and a soccer field in peak season can want more than that.

### Buttons that shrank below the tap minimum

Found while sweeping viewports: three celebration animations scaled a container
that held a button, so for as long as the spring ran the tap target was under the
44px floor the spec calls non-negotiable — 48px of button rendering at 38 under
`scale(0.8)`. Worse, an interrupted animation leaves it there.

The end-of-week button, the sell panel and the trophy modal now rise or drop into
place instead of growing. Movement keeps the target full size at every frame. The
pop stayed where it belongs — on the emoji.

Also trimmed the treats card, which printed a generic line and a specific one
where the specific one says more.

---

## 2026-08-25 — Renamed to Boss Mode

BizKids becomes **Boss Mode** everywhere a person can see it: the title screen,
the browser tab, the page description, exported save filenames, the package name,
the docs, and the spec (now `boss-mode-spec.md`, and its open question about the
name is closed).

**The part that needed care was storage.** Profiles live under `bizkids.profiles`
and runs under `bizkids.run.{id}` in each tester's own browser. Moving those keys
without thought would have greeted everyone already playing with an empty trophy
shelf and no stand — a rename that eats a week-30 run is not a rename.

Reads now fall back to the old key when the new one is empty, and every write
goes to the new one. No migration step to run, nothing for a tester to do,
idempotent, and the old copy is left in place as a backstop rather than deleted
out from under them. Verified end to end in the browser: a profile seeded under
the old key loads with its trophies and its "where you left off" line intact, and
the next write lands on `bossmode.*`.

Exported save files carry an `app` field that said `bizkids`. Import accepts both
spellings, so a JSON a tester emailed before the rename still loads.

Four tests cover it, and they exist mainly so the fallback is not tidied away as
dead code in six months.

### Left alone deliberately

The GitHub repository is still `bizkids` and the site is still
`bizkids-wine.vercel.app`. Both are outward-facing — the URL in particular is what
testers already have — so they are Jeff's call, not a thing to change quietly.
The local folder is likewise still `bizkids/`, which is why `launch.json` still
points `--prefix bizkids` at it.

---

## 2026-08-25 — Live on bossmodegame.com, and the register moved out of the lemonade stand

Jeff's son played it and loved it, which clears the Phase 1 playtest gate. The
game is live at **www.bossmodegame.com** (the apex redirects to www).

### Work on v2 happens on a branch

`master` deploys straight to the live domain. Vercel builds every branch to its
own preview URL, so `v2` gets somewhere to be tried on a real phone without
anyone mid-run seeing half-finished work.

The sharp edge is `SAVE_VERSION`: v2 will almost certainly change the shape of a
save, and in-progress runs cannot cross that — a tester thirty weeks in loses the
stand and keeps only trophies. On a branch that costs nothing; on the live domain
it happens to everyone at once with no warning.

### The business register is no longer inside the lemonade stand

This was the open item blocking Phase 2b, and it needed doing before four
businesses depend on the current shape rather than after.

`BusinessDef` — the contract the engine requires of a business — lived inside
`businesses/lemonade.ts`, along with the register of all businesses. So adding
the food truck would have meant editing the lemonade stand, and the second
business would have had to import the first to learn its own shape. Twelve files
across the engine, the screens and the state layer imported the lemonade stand by
name purely to look up whichever business was actually being played.

Now:

- `BusinessDef` sits in `engine/types.ts` with the engine's other contracts.
- `config/businesses/index.ts` holds the register and `getBusiness`. It is the
  one file a new business is wired into.
- `lemonade.ts` contains the lemonade stand and nothing else.
- `Setup` takes a `businessId` instead of naming one, and reads the emoji and
  title from the business. A picker screen is the only thing still to write when
  business #2 lands.

Six tests guard it, and they read the source text rather than the runtime,
because the coupling being prevented is an import — invisible when the code runs,
obvious in the file. Two of them fail if anything under `/src/engine`,
`/src/ui` or `/src/state` ever names a specific business file again.

No behaviour changed. 116 tests, and a full week still plays through identically.

---

## 2026-08-25 — What a nine-year-old actually did with it

Jeff watched his son play. Four observations, and they turned out to be one
observation.

> He kept asking "is that good?" when he saw he had leftover cups.
> He didn't see the amount of customers he had turned away.
> The throw away and the turned away is the core of the lemonade stand.

He is right, and the game had it backwards. Ordering too much and ordering too
little are the two ways a lemonade stand loses, and they were a pair of grey
pills under a large and confident ledger. Worse, **neither loss appears in the
profit line** — money you never took cannot show up in a profit and loss
statement — so a child looking at "11 left" had no way at all to tell whether
that was a win or a warning.

So the recap now opens with it, above the ledger, in money:

    🎯 How close was your order?
    🗑️ Made too many — thrown away     205 cups · $45.10
    🚫 Ran out — walked away empty      190 people · about $285 not taken
    🙌 Line too long — gave up waiting  86 people

When neither happened: *"Nothing wasted and nobody turned away. That is as close
as it gets."* On a 375x667 phone the block sits between 30px and 107px — the
first thing on the screen, above the fold, before any of the accounting. The
ledger scrolls below it, which is the right way round: the lesson first, the
evidence under it.

### Hot chocolate through spring, and a thermometer

Jeff's ask: keep cocoa on the menu from fall through spring so a cloudy day might
tempt a player into it. Done — and it needed a rebalance to be a real choice
rather than a trap. `seasonMods.spring` was 0.5, from when cocoa only existed in
the cold half of the year. At 0.9, working at $1.50 a cup where lemonade keeps
$1.08 and cocoa $0.95:

| spring weather | cocoa | lemonade | |
|---|---|---|---|
| sunny | 0.56 | 1.35 | lemonade, clearly |
| cloudy | 0.94 | 0.97 | **a coin flip — the interesting week** |
| rain | 1.11 | 0.49 | cocoa |
| cold | 1.45 | 0.38 | cocoa |

He also asked whether to add a temperature gauge. **Yes — but as a label on the
weather, never as a second variable.** A temperature rolled on its own would mean
two things to forecast and two things to be wrong about, and the ordering bet is
hard enough. Derived from weather *and season* it costs nothing and pays for
itself immediately: "Cloudy" does not tell a child whether to sell cocoa;
"Cloudy 52°" does. A sunny January and a sunny July stop looking alike.

It shows on the forecast pill, on the menu card, and on the week's results.

Two things fell out of that:

- The menu card told players *"A hot drink sells when lemonade will not"* on an
  88-degree day, because the line was unconditional. It now follows the
  thermometer.
- Cocoa on the menu for thirty-nine weeks of the year meant the menu card was
  offered nearly every week, most of them with an obvious answer. It is now
  offered when the forecast is 62 degrees or below — where the choice could
  genuinely go either way — or whenever the player is already selling the
  seasonal drink, so nobody is stuck on cocoa with no way back.

Also stopped printing a "-$0" cost of goods row on a week that sold nothing, and
"Ran out" now reads "Nothing to sell" when there was never any stock to run out
of.

### Still open: treats have no downside

Jeff: *"He used the treats, but there was never an instance where the treats
actually lost him money."*

Correct, and structural. `sideUnits = round(served x attachRate)` — treats are
made to order, in exact proportion to drinks sold, with price above cost on every
one of them:

| treat | cost | price | margin | per 100 buyers |
|---|---|---|---|---|
| Cookies | $0.30 | $1.00 | $0.70 | $24.50 |
| Lollipops | $0.08 | $0.50 | $0.42 | $18.90 |
| Gummy Bags | $0.22 | $1.00 | $0.78 | $23.40 |
| Brownies | $0.55 | $2.00 | $1.45 | $31.90 |

No stock to buy ahead, nothing to throw away, no cash at risk. Picking a treat is
strictly better than not picking one, in every week, forever — which means it is
not a decision at all. It is also the exact opposite of the lesson the drinks
teach, where you commit cash to stock before you know who is coming.

**Built 2026-08-25.** Treats are now baked in a batch before the week starts.
The money goes out on Sunday and Tuesday decides whether it was worth it — which
is what every real trader with a kitchen already knows.

| treat | batch | costs | sells at | pays off past |
|---|---|---|---|---|
| Lollipops | 60 | $5 | $0.50 | 23 customers |
| Cookies | 40 | $12 | $1.00 | 35 customers |
| Gummy Bags | 50 | $11 | $1.00 | 37 customers |
| Brownies | 30 | $17 | $2.00 | 39 customers |

Batches are priced at roughly what the old per-unit cost worked out to, so a busy
week earns about what it always did. The card does the arithmetic — *"Brownies ·
$17 for 30 · sells at $2.00 · pays off past 39 customers"* — so the decision is
comparing one number against how many people turned up last week.

Verified at both ends. A front yard on a cold, wet day: 30 brownies baked, two
sold, twenty-eight binned, **-$13**. A soccer field in a heat wave: twenty-eight
of thirty sold, **+$39**. Same treat, opposite answer, decided by where you stood
— the same lesson the canopy teaches, and the same one the locations teach.

The batch size caps sales as well, so at a hundred and fifty customers the
brownies run out and the cheap high-volume lollipops start looking better. That
was not designed in; it falls out of giving each treat a real batch.

Unsold treats go into the order-judgement block at the top of the recap, beside
the cups thrown away, because it is the same mistake in a different aisle.

---

## 2026-08-26 — The food truck, and the startup asset decision

Two ambiguities settled with Jeff before building. The spec's worked example
prices the truck at $35k-$120k and calls it Tycoon; CLAUDE.md's roster calls it
the Pro business. **It spans both** — Pro runs the same shape at about a fifth of
the money, a used catering trailer rather than a full build, so a twelve-year-old
meets the decision at a size they can hold. Tycoon gets the spec's figures, and
finally has a business to launch with. And the truck ships **with** its signature
system rather than after it, because without the acquisition choice the truck is
the lemonade stand with different art.

### The startup asset decision

| route | day one | opens | every week | at the end |
|---|---|---|---|---|
| New build-out | $24,000 | straight away | — | worth ~$19,500 |
| Used + refit | $12,000 | **five weeks** | — | $6,300-$15,500, unknown |
| Lease | $3,200 | straight away | $145 | **nothing** |

Building out is modelled where it hurts: demand is gated to zero, so no sales, no
revenue, and nobody recorded as turned away either — they never came, because
there was nothing to come to. Rent, permits, loan payments all arrive anyway. The
week screen says so plainly rather than dealing a deck of pointless cards.

The equity lesson is now literally true in the valuation, and tested: same
trading record, and the owner's offer exceeds the leaseholder's by exactly the
value of the truck.

The used-truck condition rolls **once**, in `newGame`, and lives with the
business for the whole run. Rolling it later would let a player reload their way
to a good truck.

### What the truck teaches that the stand cannot

Three spots on the weekly-mobility mechanic the spec calls its signature: office
park lunches (dependable, never spectacular), Friday night district (brilliant
warm and dry, dead otherwise), and a festival pitch whose fee is paid before a
single sale. And a menu that trades breadth against throughput — one item flies
out of the window, an everything-menu draws a bigger queue and then serves it
slowly.

That last one needed `capacityMod` on `QualityDef`, which generalises properly:
what you sell can change how fast you can sell it. True of a kitchen, not true of
a lemonade stand, and now expressible either way.

### Things the second business exposed

Adding a business is genuinely config plus its signature system, as intended —
but it turned up three things that were only ever right by accident:

- **Money had no thousands separators.** Fine at $45, unreadable at $24000.
- **The UI called everything a cup.** `BusinessDef` has carried `unitName` and
  `unitNamePlural` since Phase 1 and nothing used them. Now the price card, the
  supplies card, the menu, the ledger and the big counter all say "meal" for a
  truck and "cup" for a stand.
- **Tycoon's blurb still said "Coming in Phase 2."** It is here.

140 tests, including fifty-week runs on all three acquisition routes.

---

## 2026-08-26 — The price buttons, and the language

**The price control was broken for the truck, and badly.** Its floor, ceiling
and step were dollar amounts held on the *tier* — which quietly assumed every
business was a lemonade stand. Pro's ceiling is $5. The truck opens at $9 a meal.
So "more expensive" did nothing at all, "cheaper" cut the price by nearly half in
a single tap, and the step was a quarter on a nine dollar meal.

What counts as a fair price belongs to the business. How far a tier lets you
stray from it belongs to the tier. They are now multipliers of the business's
reference price, resolved by `priceBoundsFor`:

| | reference | range | step |
|---|---|---|---|
| Lemonade, Rookie | $1 | $0.25 – $3 | 25c |
| Lemonade, Pro | $1.50 | $0.25 – $5 | 25c |
| Truck, Rookie | $6 | $2 – $18 | $1 |
| Truck, Pro | $9 | $2 – $30 | $1 |
| Truck, Tycoon | $11 | $2 – $50 | $1 |

Rookie and Pro lemonade come out byte-identical to the dollar values that
shipped, which is the point — a playtested balance must not move because a second
business arrived. There is a test asserting exactly that.

Two things the arithmetic needed. Steps snap to a *nice* number, because $1.53 a
meal reads as a rounding error rather than a decision. And the step errs fine and
then coarsens only if crossing the range would take more than eighty taps —
rounding to the nearest instead made one tap worth 22% of a $9 meal.

**Lemonade at Tycoon does change**: five cent steps across $0.25 to $8 is a
hundred and fifty taps end to end. It is a dime now, seventy-seven. That range
was never reachable in the shipped game, since Tycoon was not offered.

### The language

"Trading" was mine and it is not how anyone here talks. "Left to trade with" is
now "Money to start with"; the truck opens on day one rather than trades on it; a
closed week costs you rather than costing opportunity. Swept the rest of the same
habit while there: queues are lines, shutters are doors, and what is under the
bonnet is under the hood.

### Growing the look up

The title led with a lemon emoji at 64px and offered eight animals to pick from.
Both are gone. The hero is drawn now — a lemonade stand and a food truck, flat
vector in the game's palette, one light source, sharing a ground line so they
read as one scene rather than two stickers. Both are drawn rather than only the
truck, because an emoji lemon beside a real illustration would look worse than
either alone. It also no longer springs in; things that bounce read young.

A player is marked by the initial of their own name. The badge grid was the most
obviously childish thing on the first screen, and a monogram costs nobody a
decision they did not want to make. Profiles made before this keep what they
chose — the field is unchanged.

**Not verified visually.** The preview pane would not composite frames this
session, so the artwork was sent to Jeff as a standalone file to judge rather
than claimed to look good.

---

## 2026-08-26 — Two event pools, and the price grid

### Every card now belongs to one business

Jeff got a glowing review for his food truck thanking him for the lemonade and
offering to hand out a free cup. Then a rival **Kid** parked outside it and he
was asked whether to add free cookies.

There was one shared "universal" pool of twenty-three cards. It was written when
there was only a lemonade stand, so it said "your lemonade", "a free cup", "the
stand", and cast a rival as a kid.

I tried placeholders first — `{units}`, `{place}` — and Jeff was right to reject
it: *"Its all of them. Look at them all and make completely new ones per
business."* A card that fits every business belongs to none of them. "Someone
opened across the street. Same thing, cheaper." is not a sentence anybody says.

So there is no shared pool. Each business has its own complete set, in its own
voice, and events moved into `config/events/` beside the business they belong to.

**The concepts stay shared, because those are the curriculum.** A test asserts
both pools cover all twenty-two of them — competition, word of mouth, service
recovery, fixed costs, shrinkage, insurance, inventory risk and the rest — so
adding a business cannot quietly drop a lesson. Only the telling differs:

| concept | lemonade stand | food truck |
|---|---|---|
| Competition | "New stand across the street. Same drink, lower price." | "Another truck pulled in twenty feet away. Same menu." |
| Word of mouth | Neighbor: "I told the whole street about your lemonade!" | Food blogger: "I put you top of my street food list." |
| Shrinkage | Empty box, $34 lockbox | Empty till, $340 and a receipt roll |
| Capex | The cooler cracked | The fryer quits |

Money is scaled to the business — the truck turns over a couple of thousand a
week, so a $9 problem is not a problem. There is a test for that too.

The lemonade numbers are **byte-identical** to what shipped. Only its wording
came back from the placeholder detour.

**One thing worth knowing:** a save carries the event objects it was dealt, so a
run already in progress keeps whatever cards it drew under the old code until
they cycle. Jeff may see one or two old ones. A fresh run is clean — verified
over eleven weeks, seven cards drawn, all seven the truck's own.

Also swept: "kid" is gone from every character, and `rubbish` joined the list of
British words the tests refuse.

### The price grid

Jeff: *"Price needs to go up in .25 increments if a rival is going to be at
9.75."*

Two faults, one visible. The rival snapped to quarters — `Math.round(target * 4)
/ 4` — which is the **lemonade stand's** grid, hardcoded. On a truck stepping in
dollars it would sit at $9.75 and simply could not be matched or undercut.

Both the player's control and the rival now go through `priceBandFor`, so they
cannot drift apart. The truck declares its own band — $4 to $20 in quarters at
Pro — because quarters across the tier's full range would be over a hundred
taps. A test walks a real thirty-week run and asserts the rival never lands off
the grid.

---

## 2026-08-26 — Cards that contradicted the week they were dealt into

Two from Jeff playing the truck, and they are the same class of fault: an event
card is dealt without knowing anything about the week it lands in.

**"My engine blew. I picked not to move. The next screen asked if I wanted to
move."** A choice can now say `locksLocation`, and when it is taken the spot card
is not dealt at all and the engine ignores any spot that was asked for. The truck
is charged rent where it actually stood.

**"This should only fire if I pick the festival."** The festival organizer was
auctioning the main gate pitch to somebody parked outside an office block. Cards
can now name the spots they belong to. Those are dealt AFTER the spot is chosen,
and if the player parks elsewhere the card does not fire and none of its effects
land — no bid, no cash, no line in the recap.

The ordering matters and is worth stating: the spot is settled first, then which
cards happen, then their effects. It used to be the other way round, which is
precisely how a card could argue with the week around it.

Five tests, including that a choice which pins you in place has to admit it in
its own label.

*(The $800 bid in Jeff's screenshot was correct — Tycoon's 2.5x event scale on a
$320 card.)*

### Title art, third pass

From seeing it rendered rather than reasoning about the numbers. The awning sat
ON the serving window as a yellow block; it is a band above the window now,
angled, with its underside shaded and a strut holding it up. The pitcher was a
yellow square and now has a handle, a spout and a lid. The ground line ran the
full width and stuck out past the truck; it stops where the drawing does.

---

## Open questions for Jeff

1. **Spec Section 5 loan figures** — confirm the $860 → $849.88 correction.
2. **Owner wage in the valuation** — leave as SDE, or subtract a notional wage so
   the margin looks more like a conventional P&L?
3. **Mascot** (spec open question 1) — there is currently a 🧑‍🏫 coach line and no
   named character. One guide for the whole game, or a mentor per business?
4. **Rookie endgame** (spec open question 2) — Rookie currently gets the same
   sell-the-business screen as Pro. Simplify to a piggy-bank total?
5. **Winter** is a long slow stretch (weeks 36–48) for a drinks business.
   Largely answered by the hot chocolate pivot, but still worth watching.
6. ~~**Before Phase 2:** move the business registry out of
   `businesses/lemonade.ts`.~~ **Done 2026-08-25.**
