import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState, WeekDecisions } from '../../engine/types';
import { businessFor } from '../../config/businesses';
import { TIERS } from '../../config/difficulty';
import { Hud } from '../components/Hud';
import { StandArt } from '../components/StandArt';
import { WEATHER_INFO, temperatureFor } from '../../engine/calendar';
import { Choice, Stepper, dollars } from '../components/bits';
import { priceBandFor } from '../../engine/pricing';
import { restockBounds } from '../../engine/restock';
import { expectDemand } from '../../engine/expectDemand';
import { sfx } from '../sfx';

type CardId = string;

/**
 * One week of decisions, dealt one card at a time. A kid never sees more than
 * one question at once, and every question is a tap.
 */
export function Week({
  state,
  onEndWeek,
  onMenu,
  onGoals,
}: {
  state: GameState;
  onEndWeek: (d: WeekDecisions) => void;
  onMenu: () => void;
  onGoals: () => void;
}) {
  const biz = businessFor(state.businessId, state.tier);
  const tier = TIERS[state.tier];

  const [price, setPrice] = useState(state.price);
  const [qualityId, setQualityId] = useState(state.qualityId);
  const [restock, setRestock] = useState(0);
  // Until the player touches the stepper, supplies follow the suggestion — which
  // moves as they decide on advertising and helpers.
  const [restockTouched, setRestockTouched] = useState(false);
  const [locationId, setLocationId] = useState(state.locationId);
  const [eventChoices, setEventChoices] = useState<Record<string, string>>({});
  const [buyMarketing, setBuyMarketing] = useState<string[]>([]);
  // A roster, not a single slot. The engine has always allowed more than one
  // helper; the card used to offer "Switch to Theo" and quietly hire him
  // alongside Maya, charging both wages.
  const [hireIds, setHireIds] = useState<string[]>([]);
  const [letGo, setLetGo] = useState<string[]>([]);
  const [sideProductId, setSideProductId] = useState<string | null>(state.sideProductId);
  const [index, setIndex] = useState(0);

  const quality =
    biz.qualities.find(
      (q) => q.id === qualityId && (!q.seasons || q.seasons.includes(state.season)),
    ) ??
    biz.qualities.find((q) => !q.seasons) ??
    biz.qualities[0];
  const location = biz.locations.find((l) => l.id === locationId) ?? biz.locations[0];

  // Younger players get a shorter menu. Which options each tier sees is config.
  const forTier = <T extends { tiers?: (typeof state.tier)[] }>(items: T[]) =>
    items.filter((i) => !i.tiers || i.tiers.includes(state.tier));
  const marketingOptions = forTier(biz.marketing);
  const sideOptions = forTier(biz.sideProducts);
  const employeeOptions = forTier(biz.employees);
  const facesRival = biz.rival.tiers.includes(state.tier);
  // What is on the menu right now. Hot chocolate only exists in the cold months.
  const menuOptions = biz.qualities.filter((q) => !q.seasons || q.seasons.includes(state.season));
  const seasonalOnMenu = menuOptions.some((q) => q.seasons);

  // What this business calls the thing it sells. A truck sells meals, not cups,
  // and a screen that insists otherwise reads as someone else's game.
  const unit = biz.unitName;
  const units = biz.unitNamePlural;

  // What the price control may offer, scaled to what this business charges.
  const priceBounds = priceBandFor(biz, state.tier, tier);

  const unitCost = quality.unitCost * tier.unitCostScale;

  /**
   * Costs this week is already committed to by the time supplies are chosen.
   * Supplies are deliberately the last card, so the spot, the helper and the
   * advertising are all decided — which means the bill is knowable, and
   * spending every last cent on stock would leave the player unable to pay it.
   */
  const committedCosts = useMemo(() => {
    const rent = location.weeklyRent + location.weeklyFixedCosts * tier.fixedCostScale;
    const wages =
      state.employees
        .filter((e) => !letGo.includes(e.id))
        .reduce((sum, e) => sum + e.weeklyWage, 0) +
      hireIds.reduce(
        (sum, id) => sum + (employeeOptions.find((e) => e.id === id)?.weeklyWage ?? 0),
        0,
      );
    const ads = buyMarketing.reduce(
      (sum, id) => sum + (marketingOptions.find((m) => m.id === id)?.cost ?? 0),
      0,
    );
    const debt = state.loans
      .filter((l) => !l.paidOff)
      .reduce((sum, l) => sum + Math.min(l.weeklyPayment, l.balance), 0);
    return Math.round((rent + wages + ads + debt) * 100) / 100;
  }, [
    location,
    tier.fixedCostScale,
    letGo,
    state.employees,
    state.loans,
    employeeOptions,
    hireIds,
    buyMarketing,
    marketingOptions,
  ]);

  /**
   * How many the business could physically put out this week, counting the
   * helpers being hired on this very screen.
   *
   * Serving capacity is the honest ceiling on an order: past it, every extra
   * one is guaranteed waste. It also has to be a ceiling the player recognises,
   * because the same number is on the supplies card as "can serve N".
   */
  const servingCapacity = Math.round(
    (biz.soloCapacity +
      state.bonusCapacity +
      state.employees
        .filter((e) => !letGo.includes(e.id))
        .reduce((sum, e) => sum + e.capacityBonus, 0) +
      hireIds.reduce(
        (sum, id) => sum + (employeeOptions.find((e) => e.id === id)?.capacityBonus ?? 0),
        0,
      )) *
      (quality.capacityMod ?? 1),
  );

  /**
    * How many people to expect, from the same model that will run the week.
    *
    * The screen used to show only what happened LAST week and leave the player
    * to guess this one. Four separate things move the number — the season, the
    * sky, the rival's price and plain luck — and none of them were on screen, so
    * ordering stock, which is the decision the whole game is built around, was a
    * guess. Jeff: "I don't understand how the amount of people visiting the
    * truck is calculated. It seems very arbitrary."
    */
  const marketingLift = buyMarketing.reduce(
    (sum, id) => sum + (marketingOptions.find((m) => m.id === id)?.boost ?? 0),
    0,
  );
  const expected = expectDemand({
    state,
    biz,
    tier,
    price,
    qualityId,
    locationId,
    extraMarketingBoost: marketingLift,
  });

  const stockBudget = Math.max(0, state.cash - committedCosts);
  const { max: restockMax, affordable } = restockBounds({
    cash: state.cash,
    committed: committedCosts,
    unitCost,
    step: tier.restockStep,
    capacity: servingCapacity,
    inventory: state.inventory,
  });

  /**
   * The week's deck.
   *
   * Spot, price and supplies are asked every week. Supplies comes LAST on
   * purpose: how much stock you need depends on whether you just bought
   * advertising or took on a helper, so you should not have to guess at those
   * before answering it.
   *
   * Everything in between rotates, so a week stays short and no card nags.
   */
  const cards: CardId[] = useMemo(() => {
    const week = state.week;
    const stage2 = state.stage >= 2;

    const extras: CardId[] = [];
    if (stage2) extras.push('marketing');
    if (stage2) extras.push('treats');
    // The menu matters most when a seasonal product is on or coming off it, so
    // it is offered every week then rather than every other week.
    //
    // "In season" is not the same as "worth asking about". Hot chocolate now
    // stays on the menu from fall through spring, which is thirty-nine weeks of
    // the year, and on a bright sixty-eight degree spring afternoon there is no
    // decision to make. So it is offered when the thermometer says the answer
    // could go either way — or whenever the seasonal drink is the one currently
    // being sold, so nobody is ever stuck on cocoa with no way back.
    const coldEnoughToAsk = temperatureFor(state.forecast, state.season) <= 62;
    const sellingSeasonal = Boolean(biz.qualities.find((q) => q.id === state.qualityId)?.seasons);
    if (stage2 && week % 2 === 0) extras.push('quality');
    else if (seasonalOnMenu && (coldEnoughToAsk || sellingSeasonal)) extras.push('quality');

    // Spot, price, staffing and supplies are asked EVERY week. Staffing used to
    // rotate, and only surfaced after a losing week, which left no way to swap
    // or drop a helper when you wanted to — a wage is a weekly decision.
    const fixedCount = stage2 ? 4 : 3;
    const room = Math.max(0, tier.maxCards - fixedCount);
    const offset = extras.length ? week % extras.length : 0;
    const rotated = [...extras.slice(offset), ...extras.slice(0, offset)];

    // A card that grounds the business takes the spot question off the table.
    // Asking a player who just chose not to move where they would like to move
    // is the game arguing with itself.
    const grounded = state.pendingEvents.some((e) => {
      const chosen = e.choices.find((c) => c.id === eventChoices[e.id]);
      return Boolean(chosen?.locksLocation);
    });

    /**
     * Cards tied to a spot are dealt AFTER the spot is chosen, and only if the
     * player actually went there. A festival organizer auctioning the main gate
     * has nothing to say to somebody parked outside an office block.
     */
    const anywhere = state.pendingEvents.filter((e) => !e.locations);
    const atThisSpot = state.pendingEvents.filter(
      (e) => e.locations && e.locations.includes(grounded ? state.locationId : locationId),
    );

    return [
      ...anywhere.map((e) => `event:${e.id}`),
      ...(grounded ? [] : ['location']),
      ...atThisSpot.map((e) => `event:${e.id}`),
      'price',
      ...(stage2 ? ['staff'] : []),
      ...rotated.slice(0, room),
      'supplies',
      'ready',
    ];
  }, [
    state.pendingEvents,
    eventChoices,
    locationId,
    state.locationId,
    state.stage,
    state.week,
    state.forecast,
    state.season,
    state.qualityId,
    tier.maxCards,
    seasonalOnMenu,
    biz.qualities,
  ]);

  /**
   * How much stock to suggest, given everything decided so far this week.
   * Advertising raises demand; a helper raises how many cups you can physically
   * hand over. Both land before the supplies card, so both count here.
   */
  const suggestedRestock = useMemo(() => {
    const recent = state.history.slice(-3);
    /**
     * What the model says to order this week, not what happened last week.
     *
     * This was "best of the last three weeks", which sounds safe and is not: it
     * orders for your BEST week every week, so a normal week throws the
     * difference away. Worse, hiring made it worse — more hands lifted the
     * capacity cap, so the suggestion climbed to the peak and the extra waste
     * ate the helper's wages. Hiring lost money at every spot and every tier,
     * which is exactly what Jeff found: "the help is almost never justified."
     *
     * Last week still matters, as a sanity check against a model that has not
     * caught up with a run's real trade, so the suggestion is nudged toward it.
     */
    const seen = recent.length
      ? Math.max(...recent.map((h) => h.served + h.lostToStockout))
      : expected.order;
    const want = Math.min((expected.order * 2 + seen) / 3, servingCapacity);
    const need = Math.round((want - state.inventory) / tier.restockStep) * tier.restockStep;
    return Math.max(0, Math.min(restockMax, need));
  }, [
    state.history,
    state.inventory,
    servingCapacity,
    expected.order,
    tier.restockStep,
    restockMax,
  ]);

  // Who is actually on the team this week, once the taps on the staff card are
  // applied to who was already here.
  const roster = [
    ...state.employees.filter((e) => !letGo.includes(e.id)),
    ...hireIds
      .map((id) => employeeOptions.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e)),
  ];
  const rosterWages = roster.reduce((sum, e) => sum + e.weeklyWage, 0);

  const restockUnits = restockTouched ? Math.min(restock, restockMax) : suggestedRestock;
  const supplyCost = Math.round(restockUnits * unitCost * 100) / 100;
  // Gear won or bought from an event — the rival's table, say — raises this for
  // good. The engine has always counted it; this chip did not, so a player who
  // bought a second table watched the number sit still and reasonably concluded
  // the purchase had done nothing.
  const capacityAfter = servingCapacity;

  /**
   * A refit still running means there is nothing to decide: the doors are
   * down, no stock is worth buying, and no spot will sell a thing. Rather than
   * deal a deck of pointless cards, say plainly what is happening and what this
   * week costs — which is the lesson of buying something cheap and unfinished.
   */
  const weeksLeftShut = state.weeksToOpen ?? 0;

  const card = cards[Math.min(index, cards.length - 1)];
  const next = () => {
    sfx.whoosh();
    setIndex((i) => Math.min(i + 1, cards.length - 1));
  };
  const back = () => setIndex((i) => Math.max(0, i - 1));

  function finish() {
    sfx.cheer();
    onEndWeek({
      price,
      qualityId: quality.id,
      restockUnits,
      locationId,
      eventChoices,
      buyMarketing,
      hireEmployeeIds: hireIds,
      fireEmployeeIds: letGo,
      sideProductId,
    });
  }

  if (weeksLeftShut > 0) {
    return (
      <div className="stack">
        <Hud state={state} showRival={false} onMenu={onMenu} onGoals={onGoals} />
        <StandArt
          stage={state.stage}
          weather={state.forecast}
          reputation={state.reputation}
          hasEmployee={state.employees.length > 0}
          hasSign={false}
        />
        <div className="card stack center">
          <div style={{ fontSize: 52 }}>🔧</div>
          <h2>Still being built</h2>
          <p className="muted" style={{ margin: 0 }}>
            {weeksLeftShut === 1
              ? 'One more week of work. You open next week.'
              : `${weeksLeftShut} more weeks of work before you can open.`}
          </p>
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span className="pill">
              {location.emoji} {location.name}
            </span>
            <span className="pill">
              🏠 {dollars(location.weeklyRent + location.weeklyFixedCosts * tier.fixedCostScale)} a
              week
            </span>
            {state.assetWeekly > 0 && (
              <span className="pill">📄 {dollars(state.assetWeekly)} lease</span>
            )}
          </div>
          <p className="muted" style={{ margin: 0 }}>
            The bills arrive anyway. That is what the cheap way in costs.
          </p>
          <button
            className="btn btn-go"
            onClick={() =>
              onEndWeek({
                price,
                qualityId,
                restockUnits: 0,
                locationId,
                sideProductId: null,
                eventChoices: {},
                buyMarketing: [],
                hireEmployeeIds: [],
                fireEmployeeIds: [],
              })
            }
          >
            ▶️ Get on with it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <Hud state={state} showRival={facesRival} onMenu={onMenu} onGoals={onGoals} />
      <StandArt
        stage={state.stage}
        weather={state.forecast}
        reputation={state.reputation}
        hasEmployee={state.employees.length > 0}
        hasSign={state.marketing.some((m) => m.channelId === 'sign')}
      />

      <Dots count={cards.length} index={index} />

      {/* A plain keyed remount: the new card slides in, the old one is gone.
          Deliberately not AnimatePresence — an exit that never resolves would
          freeze the deck. */}
      <motion.div
        key={card}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
      >
        {card.startsWith('event:') && (
          <EventCard
            state={state}
            eventId={card.slice(6)}
            chosen={eventChoices}
            onChoose={(eid, cid) => {
              setEventChoices((c) => ({ ...c, [eid]: cid }));
              next();
            }}
          />
        )}

        {card === 'price' && (
          <div className="card stack center">
            <h2>How much per {unit}?</h2>
            <Stepper
              value={price}
              min={priceBounds.min}
              max={priceBounds.max}
              step={priceBounds.step}
              format={(v) => dollars(v, true)}
              onChange={setPrice}
            />
            <p className="muted">{priceHint(price, biz.referencePrice[state.tier])}</p>
            {facesRival && (
              <p className="muted">
                😼 The rival {biz.unitName === 'meal' ? 'truck' : 'stand'} charges $
                {state.rivalPrice.toFixed(2)}.
              </p>
            )}
            <button className="btn btn-go" onClick={next}>
              Next ➡️
            </button>
          </div>
        )}

        {card === 'supplies' && (
          <div className="card stack center">
            <h2>Last call: buy supplies</h2>
            <Stepper
              value={restockUnits}
              min={0}
              max={restockMax}
              step={tier.restockStep}
              format={(v) => `${v}`}
              onChange={(v) => {
                setRestockTouched(true);
                setRestock(v);
              }}
            />
            <p>
              {restockUnits} {units} costs <b>{dollars(supplyCost, true)}</b>
            </p>
            {/* Everything needed to size the order — last week's numbers, the
                capacity, and anything decided earlier this week — as chips
                rather than a stack of sentences, so the card clears the fold. */}
            {/* The estimate, and the two or three things moving it. This is the
                whole reason the ordering decision is playable rather than a
                guess — see engine/expectDemand.ts. */}
            <p style={{ margin: '2px 0 0' }}>
              <b>
                Expect about {expected.low}–{expected.high} {units}
              </b>
            </p>
            {expected.drivers.length > 0 && (
              <p className="muted" style={{ margin: 0, fontSize: '0.85em' }}>
                {expected.drivers
                  .slice(0, 3)
                  .map((d) => `${d.mult >= 1 ? '▲' : '▼'} ${d.label}`)
                  .join('  ·  ')}
              </p>
            )}
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span className="pill">🥤 {state.inventory} left over</span>
              {state.inventory > 0 && (
                <span className="pill">
                  🏷️ stock cost {dollars(state.inventoryCost / state.inventory, true)} a {unit}
                </span>
              )}
              <span className="pill">🙌 can serve {capacityAfter}</span>
              {state.lastResult && (
                <span className="pill">
                  ⏮️ bought {state.lastResult.suppliesUnits}, sold {state.lastResult.served}
                  {state.lastResult.lostToStockout > 0
                    ? `, ${state.lastResult.lostToStockout} away`
                    : ''}
                </span>
              )}
              {buyMarketing.length > 0 && <span className="pill">📣 ads bring more</span>}
              {hireIds.length > 0 && <span className="pill">🤝 more hands, serve more</span>}
              {letGo.length > 0 && <span className="pill">👋 fewer hands, serve fewer</span>}
              {committedCosts > 0 && (
                <span className="pill">
                  💰 {dollars(stockBudget)} to spend · {dollars(committedCosts)} of bills due
                </span>
              )}
              {restockUnits >= restockMax && restockMax > 0 && (
                // Which wall you hit matters. "All you can afford" beside a
                // stepper that stopped because there is nobody left to sell to
                // is the game blaming your bank balance for its own ceiling.
                <span className="pill">
                  {affordable <= restockMax ? '💳 all you can afford' : '🙌 more than you can serve'}
                </span>
              )}
            </div>
            <p className="muted">
              ⚠️ {WEATHER_INFO[state.forecast].label} forecast — often wrong. Leftovers go bad.
            </p>
            <button className="btn btn-go" onClick={next}>
              Next ➡️
            </button>
          </div>
        )}

        {card === 'quality' && (
          <div className="card stack">
            <h2 className="center">What are you selling?</h2>
            {/* Say what it is forecast to feel like, right where the drink is
                chosen. The whole point of keeping cocoa on the menu into spring
                is that a grey 52-degree day is a real decision — and it only is
                one if the player can see that it is 52 degrees. */}
            {seasonalOnMenu && (
              <p className="muted center">
                {WEATHER_INFO[state.forecast].emoji} They say{' '}
                {WEATHER_INFO[state.forecast].label.toLowerCase()} and{' '}
                {temperatureFor(state.forecast, state.season)}° this week.{' '}
                {/* The advice has to follow the thermometer. Telling a player a
                    hot drink is the answer on an 88-degree day, which the card
                    did, is worse than saying nothing. */}
                {/* Named from the config, not written for the stand. This line
                    offered a food truck "a hot drink sells when lemonade will
                    not" — somebody else's game again. */}
                {temperatureFor(state.forecast, state.season) <= 58
                  ? `Something hot sells when the usual ${units} will not.`
                  : `Warm enough that the usual ${units} should walk it.`}
              </p>
            )}
            {menuOptions.map((q) => (
              <Choice
                key={q.id}
                emoji={q.emoji}
                title={`${q.name} · ${dollars(q.unitCost * tier.unitCostScale, true)} a ${unit}`}
                sub={q.blurb}
                selected={qualityId === q.id}
                onClick={() => setQualityId(q.id)}
              />
            ))}
            <button className="btn btn-go" onClick={next}>
              Next ➡️
            </button>
          </div>
        )}

        {card === 'location' && (
          <div className="card stack">
            <h2 className="center">Where will you sell?</h2>
            {/* Say how busy each spot is right now. Weekly relocation is only a
                real decision if the player can see the season turning. */}
            {biz.locations.map((l) => {
              const busy = l.seasonMods[state.season];
              const note =
                busy >= 1.2
                  ? '🔥 Busy this time of year.'
                  : busy >= 0.85
                    ? '🙂 Normal this time of year.'
                    : busy >= 0.5
                      ? '😴 Quiet this time of year.'
                      : '🥶 Almost nobody there now.';
              // The all-in weekly bill, not just the rent. Overhead is the
              // whole lesson of this card, so the number the player is actually
              // charged has to be the number on the card.
              const allIn =
                Math.round((l.weeklyRent + l.weeklyFixedCosts * tier.fixedCostScale) * 100) / 100;
              return (
                <Choice
                  key={l.id}
                  emoji={l.emoji}
                  title={`${l.name} · ${allIn > 0 ? `${dollars(allIn)} a week` : 'free'}`}
                  sub={`${note} ${l.blurb}`}
                  selected={locationId === l.id}
                  onClick={() => setLocationId(l.id)}
                />
              );
            })}
            <button className="btn btn-go" onClick={next}>
              Next ➡️
            </button>
          </div>
        )}

        {card === 'staff' && (
          <div className="card stack">
            <h2 className="center">{roster.length ? 'Your helpers' : 'Want a helper?'}</h2>
            {/* A roster, not one slot. Two pairs of hands is a real answer to a
                spot that keeps turning people away, and the wage bill that comes
                with it is the point. Each helper is an independent yes or no. */}
            {tier.showFullPnL && (
              <p className="muted center">
                Alone you serve {biz.soloCapacity + state.bonusCapacity} {units} a week.
                {state.lastResult
                  ? ` Last week ${state.lastResult.served + state.lastResult.lostToCapacity} wanted one.`
                  : ''}
              </p>
            )}
            {employeeOptions.map((e) => {
              const onTeam = roster.some((r) => r.id === e.id);
              const alreadyHere = state.employees.some((x) => x.id === e.id);
              return (
                <Choice
                  key={e.id}
                  emoji={e.emoji}
                  // Wage in the title, what it buys in the sub. Putting both on
                  // the title wrapped it to two lines on a phone and pushed the
                  // card off the bottom of the screen.
                  title={`${e.name} · ${dollars(e.weeklyWage)} a week`}
                  sub={`${onTeam ? '✅ On the team. ' : ''}Serves ${e.capacityBonus} more. ${e.quirk}`}
                  selected={onTeam}
                  disabled={!onTeam && !alreadyHere && state.cash < e.weeklyWage}
                  onClick={() => {
                    if (alreadyHere) {
                      setLetGo((ids) =>
                        ids.includes(e.id) ? ids.filter((i) => i !== e.id) : [...ids, e.id],
                      );
                    } else {
                      setHireIds((ids) =>
                        ids.includes(e.id) ? ids.filter((i) => i !== e.id) : [...ids, e.id],
                      );
                    }
                  }}
                />
              );
            })}
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span className="pill">
                {roster.length === 0
                  ? '🙅 working alone'
                  : `🤝 ${roster.length} helper${roster.length > 1 ? 's' : ''}`}
              </span>
              {rosterWages > 0 && <span className="pill">💸 {dollars(rosterWages)} a week</span>}
              <span className="pill">🙌 serve {capacityAfter}</span>
            </div>
            <button className="btn btn-go" onClick={next}>
              Next ➡️
            </button>
          </div>
        )}

        {card === 'treats' && (
          <div className="card stack">
            <h2 className="center">Sell a {biz.sideNoun} too?</h2>
            {/* One line, not two. Once there is a real number from last week it
                says everything the generic sentence did and more, and the card
                has four options to fit under it on a phone. */}
            {state.lastResult && state.lastResult.sideUnits > 0 ? (
              <p className="muted center">
                Last week you sold {state.lastResult.sideUnits} of {state.lastResult.sideBatchSize}{' '}
                made
                {state.lastResult.sideWasted > 0
                  ? ` and threw ${state.lastResult.sideWasted} out`
                  : ''}
                , worth {dollars(state.lastResult.sideRevenue - state.lastResult.sideCogs, true)}{' '}
                after the batch.
              </p>
            ) : (
              <p className="muted center">
                You make a batch before the week starts. It costs the same whether anyone comes.
              </p>
            )}
            {sideOptions.map((sp) => {
              const cost = sp.batchCost * tier.unitCostScale;
              // How many people have to walk up before the batch pays for
              // itself. This is the whole decision, so the card does the sum.
              const breakEven = Math.ceil(cost / sp.price / sp.attachRate);
              return (
                <Choice
                  key={sp.id}
                  emoji={sp.emoji}
                  title={`${sp.name} · ${dollars(cost)} for ${sp.batchSize}`}
                  // Kept to one line so four options still fit a phone screen.
                  sub={`sells at ${dollars(sp.price, true)} · pays off past ${breakEven} customers`}
                  selected={sideProductId === sp.id}
                  onClick={() => setSideProductId(sp.id)}
                />
              );
            })}
            <Choice
              emoji="🚫"
              title={`No ${biz.sideNoun} this week`}
              selected={!sideProductId}
              onClick={() => setSideProductId(null)}
            />
            <button className="btn btn-go" onClick={next}>
              Next ➡️
            </button>
          </div>
        )}

        {card === 'marketing' && (
          <div className="card stack">
            <h2 className="center">Tell people about it?</h2>
            {marketingOptions.map((m) => (
              <Choice
                key={m.id}
                emoji={m.emoji}
                title={`${m.name} · ${dollars(m.cost)}`}
                sub={m.blurb}
                selected={buyMarketing.includes(m.id)}
                disabled={state.cash < m.cost && !buyMarketing.includes(m.id)}
                onClick={() =>
                  setBuyMarketing((ids) =>
                    ids.includes(m.id) ? ids.filter((i) => i !== m.id) : [...ids, m.id],
                  )
                }
              />
            ))}
            <button className="btn btn-go" onClick={next}>
              Next ➡️
            </button>
          </div>
        )}

        {card === 'ready' && (
          <div className="card stack center">
            <h2>Ready for week {state.week}?</h2>
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="pill">
                💲 {dollars(price, true)} a {unit}
              </span>
              <span className="pill">
                🥤 {state.inventory + restockUnits} {units}
              </span>
              <span className="pill">
                {location.emoji} {location.name}
              </span>
            </div>
            <button className="btn btn-go" onClick={finish}>
              ▶️ Open up!
            </button>
          </div>
        )}
      </motion.div>

      {/* Back on every card, event cards included — a player should always be
          able to reconsider the answer they just gave. */}
      {index > 0 && (
        <button className="btn btn-ghost" onClick={back}>
          ⬅️ Back
        </button>
      )}
    </div>
  );
}

function EventCard({
  state,
  eventId,
  chosen,
  onChoose,
}: {
  state: GameState;
  eventId: string;
  chosen: Record<string, string>;
  onChoose: (eventId: string, choiceId: string) => void;
}) {
  const event = state.pendingEvents.find((e) => e.id === eventId);
  if (!event) return null;
  const scale = TIERS[state.tier].eventScale;
  const units = businessFor(state.businessId, state.tier).unitNamePlural;
  return (
    <motion.div
      className="event-card"
      initial={{ rotate: -3, scale: 0.94 }}
      animate={{ rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 14 }}
    >
      <div className="event-top">
        <span className="event-avatar">{event.emoji}</span>
        <div>
          <h3>{event.title}</h3>
          <div className="sub">{event.character}</div>
        </div>
      </div>
      <div className="speech">{event.line}</div>
      <div className="stack" style={{ padding: '0 14px 14px' }}>
        {event.choices.map((c) => {
          // Say what a choice costs. Whether it works is the gamble; what it
          // costs is not.
          //
          // The line runs between the player's own economics and the market's
          // reaction. Money, stock, what a cup costs to make and how many hands
          // are on the table are all things the player is giving up or gaining,
          // and all get said out loud. How many customers turn up and what they
          // think of you is the part being bet on, and stays hidden.
          //
          // "Pay the extra" on the lemon-price card used to read "costs
          // nothing" while raising the cost of every cup by 35% — the one thing
          // that card exists to teach.
          const cash = Math.round((c.cash ?? 0) * scale * 100) / 100;
          const stock = Math.round((c.inventory ?? 0) * scale);
          const gear = Math.round((c.equipment ?? 0) * scale * 100) / 100;
          const seats = Math.round((c.capacity ?? 0) * scale);
          const shift = (mod: number | undefined) =>
            mod && mod !== 1 ? Math.round(Math.abs(mod - 1) * 100) : 0;
          const dearer = shift(c.unitCostMod);
          const hands = shift(c.capacityMod);
          const tags = [
            cash < 0 ? `costs ${dollars(-cash)}` : '',
            cash > 0 ? `pays ${dollars(cash)}` : '',
            stock > 0 ? `+${stock} ${units}` : '',
            stock < 0 ? `${stock} ${units}` : '',
            dearer ? `${units} cost ${dearer}% ${(c.unitCostMod ?? 1) > 1 ? 'more' : 'less'}` : '',
            hands ? `serve ${hands}% ${(c.capacityMod ?? 1) > 1 ? 'more' : 'fewer'}` : '',
            gear ? `${gear > 0 ? '+' : '-'}${dollars(Math.abs(gear))} of gear` : '',
            seats ? `serve ${seats} more from now on` : '',
          ].filter(Boolean);
          return (
            <Choice
              key={c.id}
              emoji="👉"
              title={c.label}
              // Scoped to money on purpose: a free choice can still cost you
              // customers or your good name, and those stay hidden.
              sub={tags.length ? tags.join(' · ') : 'costs no money'}
              selected={chosen[event.id] === c.id}
              onClick={() => onChoose(event.id, c.id)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

function Dots({ count, index }: { count: number; index: number }) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: i === index ? 22 : 10,
            height: 10,
            borderRadius: 999,
            background: i <= index ? 'var(--ink)' : 'rgba(33,48,74,0.25)',
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </div>
  );
}

function priceHint(price: number, reference: number): string {
  // Narrow bands. The old ones only spoke up past 1.8x, so a price half again
  // as high as the going rate still read as "normal" and the player got no
  // warning until the sales came in.
  if (price <= reference * 0.6) return 'Very cheap. Crowds, but pennies on each one.';
  if (price <= reference * 0.85) return 'A bargain. You will be busy.';
  if (price >= reference * 1.6) return 'Very pricey. Expect a lot of people to walk on by.';
  if (price >= reference * 1.15) return 'On the dear side. Fewer customers, more from each.';
  return 'A normal price around here.';
}
