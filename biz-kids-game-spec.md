# BizKids — Business Simulation Game for Kids
## Full Design Spec (handoff document for Claude Code)

**One-line pitch:** Kids pick one of 10 businesses, finance it (loan vs. savings), then run it week by week through growth stages, real tradeoffs, and curveball events — ending with a chance to sell the business they built.

**Format:** Browser game (React single-page app). Persistent save file (localStorage, with export/import to JSON so saves survive browser changes). Played across many short sessions over days or weeks.

---

## 1. Design Pillars

1. **Real lessons, felt not lectured.** Every mechanic maps to a real business concept (leverage, cash cushion, recurring revenue, location, delegation). The game never explains the lesson in a paragraph — the outcome teaches it.
2. **Grows with the player.** Three difficulty tiers AND three in-game growth stages. Week 40 should feel completely different from week 3.
3. **Attention is the boss fight.** This is a kids' game first. Fast turns, constant visible feedback, celebrations, and a decision every 30–60 seconds. No walls of text, ever. (See Section 3 — treat it as a hard requirement, not polish.)
4. **No "right answer" design.** Loan vs. savings, cheap spot vs. busy spot — both paths are playable. The game shows consequences, not grades.

---

## 2. Difficulty Tiers (chosen at new game)

| | Rookie (6–8) | Pro (9–12) | Tycoon (13+) |
|---|---|---|---|
| Numbers | Round, small ($5–$500) | Realistic small biz | Realistic ($1k–$250k) |
| Loans | "Pay back $55 total" | Simple interest, weekly payment | Amortized monthly payments, multiple offers, credit score |
| Choices per turn | 2 | 2–3 | 3–5 |
| Reading level | 1 short sentence per card | 2 sentences | Normal |
| Businesses available | 1–5 | 1–8 | All 10 |
| Taxes/payroll | No | Sales tax only | Payroll, quarterly taxes |

Tier changes numbers and depth — the game loop and UI are identical, so it's one codebase.

---

## 3. Engagement & Interactivity (hard requirements)

The #1 risk is a kid getting bored between decisions. Build these in from v1:

- **Turn = tap, tap, watch.** Each week: 2–5 decision cards (tap to choose) → "End Week" → a 3–5 second animated results sequence (customers walking up, cash counter ticking up/down, weather playing overhead). Never a static results table.
- **The money counter is a character.** Cash ticks up with a satisfying sound per sale; big expenses hit with a visible "ouch." Net worth bar always on screen, always moving.
- **Micro-feedback everywhere.** Every choice card immediately shows a reaction: customers cheer, the mascot sweats when cash is low, the loan shark-ish banker taps his watch when a payment is due.
- **Celebrations.** Milestones (first $100, loan paid off, first employee, stage-up) trigger full-screen confetti + a badge added to a trophy shelf on the save screen.
- **Streaks & mini-goals.** Each week shows one optional mini-goal ("serve 30 customers," "end the week with $50+ cash"). Hitting 3 in a row = bonus event.
- **Short sessions by design.** A session of 3–4 game weeks takes ~10 minutes. The game suggests a stopping point ("Nice week to pause — your save is safe!") rather than dragging.
- **Choices with personality.** Event cards are written like a comic panel: a character, one line of dialogue, big choice buttons. Example: *Rival kid across the street drops lemonade to 50¢.* → [Drop my price] [Add free cookies] [Ignore them]
- **Visible world.** The business itself is drawn on screen and physically upgrades — a bigger stand, a painted truck, a second chair in the office. Progress the kid can SEE beats numbers.
- **Sound toggle + no idle timers.** Fun sounds default-on; nothing punishes the player for not logging in (this is not a dark-pattern mobile game).

---

## 4. Core Game Loop

1. **Start of week:** dashboard shows cash, debt, reputation (1–5 stars), weekly forecast (weather/season), mini-goal.
2. **Decision phase:** 2–5 cards — recurring decisions (price, hours, restock) + any event cards + any unlocked stage decisions.
3. **End Week:** animated simulation of the week's results.
4. **Results recap:** one screen, big numbers — revenue, expenses, loan payment, profit, reputation change. One-line "coach" comment max.
5. **Autosave.** Loop repeats. A run is ~50 game weeks (8–12 real sessions).

**Reputation** (1–5 stars) rises with quality/service choices and falls with stockouts, price gouging, or blown deliveries. It multiplies customer demand — the compounding "do right by customers" lesson.

---

## 5. Financing System (the heart of the game)

At startup, the player sees: **startup cost**, **their savings**, and **2–3 loan offers**. They choose any mix (all savings, all loan, or split).

- **Rookie:** "Family Bank" — borrow $50, pay back $55 ($11/week × 5). One offer. Lesson: debt costs a little extra but keeps a cushion.
- **Pro:** two offers with different rates/lengths; weekly payments shown plainly. Late payment = fee + banker warning.
- **Tycoon:** three amortized offers (e.g., $30k @ 8%/3yr ≈ $940/mo; $40k @ 10%/5yr ≈ $860/mo; $50k @ 12%/5yr). A simple credit score moves with payment history and unlocks refinancing at Stage 2 — teaching that on-time payments buy cheaper money later.
- **Mid-game borrowing:** expansion loans available at Stage 2+ (better terms if profitable — banks lend to businesses that don't need it).
- **Failure state:** cash below zero → emergency choices (skip a payment for a fee, emergency high-rate loan, sell equipment). Three bad weeks in a row = "tough talk with the banker" restart of the stage, not a cruel full wipe.

**The Startup Asset Decision (Pro/Tycoon):** startup cost is not one number — before financing, the player chooses HOW to acquire the core asset, and that choice changes the cost, the risk, and the opening date:

- **Buy new/turnkey:** highest price, opens immediately, reliability bonus (fewer breakdown events early).
- **Buy used + refurbish:** much cheaper upfront, but adds build-out weeks before revenue starts (the loan clock is already ticking) and a hidden-condition roll — sometimes the used asset is a steal, sometimes it's rust and surprises.
- **Lease/finance the asset:** low upfront, a monthly payment forever, no equity, and condition/mileage terms — the fastest cheap way in, and the right answer when you're testing a concept.

Example — **Food truck (Tycoon):** turnkey new build-out $120k, opens week 1 · used truck $35k + $25k refurb, opens week 5, condition roll · lease $2,500/mo, opens week 1, no equity at exit. The same pattern runs everywhere at smaller scale: new vs. used mower (lawn care), buy ovens vs. lease the espresso machine (bake shop), new cabinets vs. used auction cabinets (arcade), build a wash vs. buy a tired existing one (car wash). At exit, owned assets add to the sale price; leased ones don't — so the acquisition choice made in week 1 echoes in the final score.

---

## 6. Location System (universal mechanic)

Every business chooses (and can later change) a location with a rent/traffic tradeoff. Examples:

- **Lemonade stand:** Front yard (free, ~10 customers/day) · Park entrance ($5/wk, 3× traffic) · Soccer field ($10/wk, huge Saturdays, dead weekdays).
- **Car wash:** quiet street vs. gas-station corner vs. stadium lot.
- **Food truck:** picks a spot EVERY week — its signature mechanic (office park lunches vs. Friday night district vs. festivals with entry fees).
- **Web design studio / agencies:** "location" becomes home office vs. coworking vs. downtown office — rent buys credibility (reputation floor) and hiring capacity.

Financing and location interlock: keeping a cash cushion lets you afford the better spot from day one.

**Lease, Buy, or Stay Remote (Pro/Tycoon tiers):**

- **Remote/home-based:** the white-collar businesses (and pet sitting, lawn care) can run with no premises at all — $0 occupancy cost, but a reputation ceiling and no hiring capacity beyond contractors. Staying remote is a legitimate winning strategy, and the game should never punish it by default. Lesson: overhead is a choice, not a requirement.
- **Leasing — always NNN:** Tycoon-tier leases are triple net. The card shows base rent PLUS the tenant's share of property taxes, building insurance, and maintenance/CAM — so a "$2,000/mo" space really costs ~$2,700, and the player learns to read past the sticker. Lease events: annual CAM reconciliation bill (surprise true-up), a roof repair passed through to tenants, and a renewal negotiation where the landlord raises base rent — renew, renegotiate (reputation and payment history matter), or relocate (moving costs + lost weeks).
- **Buying — unlocked at Stage 3, and only with strong cash flow:** requires ~20–25% down plus a commercial mortgage (rate tied to credit score). Rent disappears, the mortgage payment is often similar, and equity quietly builds in net worth — but the down payment drains the cushion, and the building's problems become YOUR problems (repairs no longer split). The game frames the real question: *buy only when the location is core to the business and cash flow is proven — and for many businesses, the right answer is never.* A web design studio that buys a building should feel the drag; a car wash that owns its corner should feel the payoff at valuation time, where owned real estate adds to the sale price.

---

## 7. The 11 Businesses

Format: **Name — startup cost (Tycoon-scale) · core lesson · signature mechanics · signature events (partial list; 8–10 each in full build)**

1. **Lemonade Stand** — $50 · pricing & location basics · price slider, recipe quality, location · *Heat wave rush; rival price war; little league tournament; health-conscious mom asks for sugar-free.*
2. **Pet Sitting / Dog Walking** — $100 · time is your inventory · schedule grid (you can't be in two places), pack-walk upsell · *Escaped dog!; vacation-season surge; client's cat hates you; app competitor launches.*
3. **Lawn Care** — $800 · equipment & seasonality · mower quality tiers, route planning, winter pivot (leaves/snow) · *Mower breakdown mid-route; drought watering ban; HOA bulk contract; gas price spike.*
4. **Bake Shop** — $12,000 · inventory & spoilage · daily bake quantity (unsold = tossed), recipe experiments · *Health inspection; viral cupcake; oven failure; flour supplier price hike; wedding cake rush order.*
5. **Car Wash** — $25,000 · location & fixed costs · staffing per bay, memberships vs. single washes · *Pollen week windfall; rainy month; equipment leak; charity wash day (reputation vs. revenue).*
6. **Food Truck** — $35k–$120k depending on acquisition path (see Section 5) · leverage, asset acquisition & mobility · buy-new vs. refurbish vs. lease the truck, weekly spot choice, menu size vs. speed · *Viral TikTok line around the block; engine blows (worse odds on the refurb); festival slot auction; permit inspection; propane price spike.*
7. **Arcade / Game Lounge** — $80,000 · fixed costs & recurring revenue · game mix, memberships, party bookings · *Hot new cabinet released; birthday party double-booking; power outage; school break surge.*
8. **Web Design Studio** — $5,000 · project vs. retainer revenue · client pipeline, scope creep meter, contractor vs. hire · *Client wants "one tiny change" (×9); big client pays late; portfolio award; contractor misses deadline.*
9. **Marketing Agency** — $10,000 · client churn & recurring revenue · retainer book, results dashboard per client, firing bad clients · *Client's campaign flops publicly; whale client demands exclusivity; employee poached; referral wave.*
10. **Insurance Agency** — $30,000 · renewals & the book of business · new sales vs. renewal service time split, carrier relationships, retention rate · *Carrier cuts commission rates; hail storm claim wave (service crunch, retention opportunity); competitor buys leads; a big book is offered for sale — buy it with a loan?*
11. **Pizza Parlor** — $60k–$180k depending on acquisition path (build out a new space vs. buy a tired existing parlor vs. lease equipment) · commitment & the full package · signs a multi-year **NNN lease** (Section 6) — no escape from a bad corner, you market your way out or eat the mistake; dough prep quantities (spoilage), Friday/weekend staffing, dine-in vs. delivery emphasis, weekend special, event marketing as a *recurring* decision (sponsor the little league, cater the school function, host birthday parties) · *Oven dies Friday at 6pm; CAM reconciliation true-up; chain pizza opens across the street; catering gig for 200 (can you deliver?); health inspection; viral review — good or brutal.*

The pizza parlor is the deliberate foil to the food truck: the truck teaches mobility (escape a bad spot weekly), the parlor teaches commitment (the lease is signed — now make it work). Players who run both feel the difference in their bones.

The insurance agency is the flagship recurring-revenue lesson: renewals compound quietly, and its endgame valuation multiple is the highest — the kid who serviced their book sees why.

---

## 8. Growth Stages (per business)

Stage-ups trigger on revenue/reputation milestones, with a celebration + visible upgrade to the business art.

- **Stage 1 — Survive (≈ weeks 1–12):** pricing, location, loan payments, restocking. 2–3 decisions/turn.
- **Stage 2 — Grow:** unlocks first hire (payroll + a personality — employees have names and quirks), the Marketing System (Section 9), equipment upgrades, second product line, refinancing.
- **Stage 3 — Scale:** second location or bigger premises, delegation (assign the employee to run days — their skill affects results), supplier negotiation, choosing/firing clients (white-collar), price leadership vs. premium positioning.

Each stage roughly doubles the decision surface. Events are stage-gated (no "employee quits" before hiring) and scale in size ($15 cooler at Stage 1 → $4,000 machine at Stage 3).

---

## 9. Marketing System (unlocks at Stage 2)

Simple businesses keep marketing tactile (a bigger sign, flyers, free samples). The advanced businesses — bake shop through the agencies — get a real channel-allocation game, because marketing is where modern businesses are actually won or lost:

| Channel | Cost pattern | Behavior | Lesson |
|---|---|---|---|
| Flyers / signage | Cheap, one-time | Small instant bump, fades in 2 weeks | Awareness decays |
| **Event marketing** | Big one-time spend | Booth/sponsorship at a calendar event (festival, little league, home show): customer burst + reputation gain — but timing and fit matter | Right audience, right moment |
| **Search ads (pay-per-click)** | Weekly spend, adjustable | Leads on demand, but cost-per-lead rises with spend (diminishing returns) and traffic stops cold the week you stop paying | You're *renting* attention |
| **SEO & content** | Weekly spend, fixed | 6–8 weeks of nothing, then compounding "free" leads that persist even if you pause | You're *owning* attention — investment vs. rent |
| Social ads | Weekly spend + targeting choice | Player picks the audience (nearby families vs. everyone); tight targeting converts better | Targeting beats volume |
| Email / loyalty list | Nearly free | Grows automatically from customers served; sending offers drives cheap repeat business and boosts retention | Your customer list is an asset |

**Tycoon-tier marketing dashboard:** each active channel reports spend, new customers, **cost per customer (CAC)**, and revenue per customer. The player reallocates a monthly budget between channels — the core lesson is *measure, then double down on what works*. Pro tier shows the same idea with simpler labels ("this brought 12 customers for $30").

**Events hook in:** search-ad prices spike near holidays; an algorithm update shakes SEO rankings for 3 weeks; your event booth gets rained out (refund or reschedule?); a competitor outbids you for the festival slot.

---

## 10. Event Engine

- Weighted random draw each week: ~60% chance of one event, 20% two, 20% none. No repeats within 8 weeks.
- **Universal pool (20):** heat wave · cold snap / storm · equipment breakdown · supplier price increase · surprise fee/permit · competitor opens · competitor closes (windfall) · big order (deliver on time?) · discount-for-volume request · upgrade offered at a discount · employee sick day · glowing local review · harsh review (respond how?) · theft/shrinkage · local event boosts traffic · road construction kills traffic · tax season · charity ask · loyal-customer moment (reputation) · news story about your industry.
- **Signature pool:** 8–10 per business (seeds in Section 7).
- Every event = comic-style card, one character, one line, 2–3 choice buttons, instant animated consequence.

---

## 11. Endgame & Valuation

At week 50, a buyer appears with an offer based on: average recent profit × a multiple, boosted by recurring revenue %, reputation, and growth trend. Player can **sell (final score + trophy)** or **keep playing** in open-ended mode and solicit a new offer any time — teaching that businesses are assets, and recurring revenue is worth more per dollar than hustle revenue. High-score shelf compares runs across businesses and difficulty levels.

---

## 12. Classroom & School Mode (design target: entrepreneurial classes)

The long-term goal is adoption by school systems. v1 must be built so this door stays open — accuracy and structure now, teacher features in Phase 2.

- **Fits a class period by design:** 10-minute turns mean a teacher can run "play 3 game-weeks, then we discuss" inside 45 minutes.
- **Accuracy bar:** all financial math is real — actual amortization, real margin ranges per business type, honest CAC behavior. Teachers and curriculum reviewers WILL check. No hand-wavy numbers anywhere the player can see.
- **Curriculum mapping:** every mechanic tags to a concept (opportunity cost, fixed vs. variable costs, leverage, cash flow, CAC, recurring revenue, valuation). Ship this mapping as a document with the game — it becomes the spine of the school pitch deck.
- **Discussion moments:** key decisions (financing choice, first hire, sell-or-keep) flag themselves in the save recap so a teacher can ask "who took the loan, who used savings, and what happened?" — the class becomes the multiplayer.
- **Business Report artifact (Phase 2):** at run's end, the student fills a short printable/exportable report — what I chose, what happened, what I'd do differently — turning a playthrough into gradable work.
- **Teacher dashboard (Phase 2):** class roster of local profiles, side-by-side standings, and per-student decision history.
- **Privacy by design:** no accounts, no PII, no server — saves live on-device with file export. This is a genuine district selling point (COPPA/FERPA-friendly) and costs nothing to maintain.

---

## 13. Save System & Profiles

- Multiple named profiles (siblings share a device), each with its own difficulty, active run, trophy shelf, and high scores.
- Autosave every week end; manual export/import to a JSON file.
- "Continue" screen recaps last session in one sentence ("Week 14 — you just hired Maya and it's about to rain").

---

## 14. Build Notes for Claude Code

- **Stack:** React + Vite, TypeScript preferred. State in a single game-state object; localStorage persistence + JSON export. No backend.
- **Architecture:** data-driven — businesses, events, loans, and stage unlocks defined in JSON/TS config files so adding business #11 requires no engine changes.
- **Sim engine pure & testable:** `simulateWeek(state, decisions) → newState` as a pure function with unit tests (loan amortization, demand model, spoilage math).
- **Demand model (simple):** `customers = baseTraffic(location) × seasonMod × weatherMod × reputationMod × priceCurve(price)` — tune per business in config.
- **Animation:** CSS/Framer Motion is enough for v1 juice (counter ticks, card flips, confetti). Placeholder art: emoji + simple SVG scenes that upgrade per stage.
- **Build order:** v1 = lemonade stand only, full loop with juice (financing → location → 10 universal events → Stage 2 → sell). Prove the fun, then add businesses from config.

---

## 15. Distribution & Editions

**One codebase, two editions, three targets.** Build a single React app with an `edition` flag — never fork the code. Everything below is config, not separate apps:

- **School Edition (web):** deployed as a webpage on **Cloudflare Pages/Workers static hosting** (free tier permits commercial use and has unlimited bandwidth — important for district pilots; Netlify is the fallback. Avoid Vercel's free tier: it prohibits commercial use). Chromebook-first: works fully in browser, mouse/touch, no install, no accounts. Classroom features (teacher tools, Business Report, discussion flags) live behind this flag. This is the version pitched to districts.
- **Consumer Edition (App Store):** same app wrapped with **Capacitor** for iOS (and Android later). Targets Apple's **Kids Category**: no third-party ads, no analytics SDKs, no data leaving the device, parental gate on any external link. Classroom features hidden; App Store metadata, icon, and a simple onboarding instead.
- **Consumer web (optional, free):** the same consumer build also deploys as a public webpage — it costs nothing extra and doubles as the marketing/demo site for both audiences.

**Build requirements that make the wrap trivial (do these in v1, they cost nothing now and a rewrite later):**

1. **Storage abstraction:** one `saveGame()/loadGame()` module — localStorage on web, Capacitor Preferences/Filesystem on mobile. No direct localStorage calls scattered in components.
2. **Touch-first UI:** all targets ≥44px, no hover-dependent interactions, test at iPad and Chromebook screen sizes from day one.
3. **No server dependencies:** all game data ships in the bundle (already the plan). Offline-capable by default.
4. **Edition flag at build time:** `VITE_EDITION=school|consumer` toggles feature sets; one command produces each build.
5. **No external links or fonts loaded at runtime** in the consumer build (Kids Category + offline).

**Handoff sequence:** v1 web (lemonade stand) → playtest → full web School Edition → Capacitor wrap + Apple Developer account ($99/yr) + App Review for the Consumer Edition. The wrap step is ~a week of packaging work, not a rebuild, if the five requirements above are followed.

---

## 16. Open Questions (decide during build)

1. Mascot/coach character — one guide for the whole game, or a different mentor per business?
2. Should Rookie tier hide the sell-the-business endgame or use a simplified "piggy bank total" score?
3. Multiplayer-lite: siblings' businesses appear as friendly rivals on each other's map?
4. Name — working title "BizKids" (placeholder).
5. Which entrepreneurship curriculum/standards to map against for the school pitch (research before building the pitch deck).
6. Find 1–2 pilot teachers to playtest the classroom flow before approaching a district.
