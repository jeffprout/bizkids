# CLAUDE.md — BizKids Project Instructions

You are building **BizKids**, a business-simulation game that teaches kids how to run a business. The complete design is in `biz-kids-game-spec.md` in this folder — **read it fully before writing any code.** This file tells you how to execute it.

## Who you're working with

Jeff is the product owner. He works in insurance and knows small-business finance cold — when the spec says "the math must be real" (amortization, NNN leases, CAC), that is a hard requirement, not flavor. When the spec is ambiguous, ask him rather than inventing product behavior. Small technical decisions are yours; anything a player would notice is his.

## Non-negotiables (from the spec — do not trade these away)

1. **Engagement is a hard requirement** (spec Section 3). Animated results every week, decisions every 30–60 seconds, celebrations, visible business upgrades. If a screen is a static table of numbers, it's wrong.
2. **Real financial math** (Sections 5, 6, 9). Actual amortization schedules, NNN lease cost breakdowns, honest CAC behavior. This will be pitched to school systems — teachers will check the numbers.
3. **One codebase, edition flag** (Section 15). `VITE_EDITION=school|consumer`. Never fork.
4. **The five wrap-readiness rules** (Section 15): storage abstraction module, touch-first UI (≥44px targets), no server dependencies, build-time edition flag, no runtime external links/fonts.

## Tech stack & conventions

- React + Vite + TypeScript. Framer Motion for animation. No backend, no accounts.
- **Data-driven:** businesses, events, loans, locations, and stage unlocks live in typed config files (`/src/config/`). Adding business #11 must require zero engine changes.
- **Pure sim engine:** `simulateWeek(state, decisions) → newState` in `/src/engine/`, no React imports, fully unit-tested. Test loan amortization, the demand model, spoilage math, and NNN cost calculation first — these are the numbers teachers will verify.
- **Storage:** all persistence through one `save/load` module (localStorage now, Capacitor Preferences later). No direct localStorage calls in components.
- Keep a `DECISIONS.md` log: date, decision, why. Jeff will read it between sessions.
- Commit per feature with clear messages. Run tests before claiming a phase done.

## Build order

### Phase 1 — Lemonade Stand v1 (build this and STOP for playtesting)
Scope: the full loop for ONE business at Rookie + Pro difficulty.
- New game → difficulty select → financing screen (savings vs. Family Bank loan)
- Location choice (front yard / park entrance / soccer field)
- Weekly loop: price + restock decisions, event cards (10 universal events), End Week animation, results recap, autosave
- Stage 2 unlock (first helper + simple marketing: flyers, event booth)
- Week 50 sell-the-business offer, trophy shelf, profile support
- Full juice per Section 3: cash counter ticks, confetti milestones, comic-style event cards, visible stand upgrades (emoji/SVG art is fine)

**Definition of done for Phase 1:** a 9-year-old can play 3 game-weeks in ~10 minutes with zero adult help, every decision is a tap, no screen shows more than ~25 words, sim engine tests pass, and the save survives a browser close.

Do not start Phase 2 until Jeff confirms playtesting is done.

### Phase 2 — Full game
All 10 businesses from config, Tycoon tier, Stage 3, full event pools (20 universal + 8–10 per business), the complete Marketing System (Section 9), Startup Asset Decision (Section 5), lease/buy/remote with NNN mechanics (Section 6), endgame valuation with recurring-revenue and owned-asset multiples.

### Phase 3 — School Edition
Behind `VITE_EDITION=school`: discussion-moment flags in save recaps, printable end-of-run Business Report, teacher class-roster view, curriculum-mapping doc generated from mechanic tags.

### Phase 4 — App Store wrap
Capacitor iOS wrap of the consumer edition. Kids Category compliance checklist: no ads, no analytics SDKs, no data off device, parental gate on any external link, Apple native review prompt fired sparingly after milestone celebrations (never on first session).

## Working style

- Prefer boring, readable code over clever code — Jeff may hand sessions to a future collaborator.
- When you finish a work session, summarize: what's done, what's next, any open questions for Jeff.
- The spec is the source of truth. If you believe the spec is wrong, say so and propose the change — don't silently deviate.
