import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState, WeekDecisions } from '../../engine/types';
import { getBusiness } from '../../config/businesses/lemonade';
import { TIERS } from '../../config/difficulty';
import { Hud } from '../components/Hud';
import { StandArt } from '../components/StandArt';
import { WEATHER_INFO } from '../../engine/calendar';
import { Choice, Stepper, dollars } from '../components/bits';
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
}: {
  state: GameState;
  onEndWeek: (d: WeekDecisions) => void;
  onMenu: () => void;
}) {
  const biz = getBusiness(state.businessId);
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
  const [hireId, setHireId] = useState<string | undefined>();
  const [fireStaff, setFireStaff] = useState(false);
  const [sideProductId, setSideProductId] = useState<string | null>(state.sideProductId);
  const [index, setIndex] = useState(0);

  const quality = biz.qualities.find((q) => q.id === qualityId) ?? biz.qualities[0];
  const location = biz.locations.find((l) => l.id === locationId) ?? biz.locations[0];

  // Younger players get a shorter menu. Which options each tier sees is config.
  const forTier = <T extends { tiers?: typeof state.tier[] }>(items: T[]) =>
    items.filter((i) => !i.tiers || i.tiers.includes(state.tier));
  const marketingOptions = forTier(biz.marketing);
  const sideOptions = forTier(biz.sideProducts);
  const employeeOptions = forTier(biz.employees);
  const facesRival = biz.rival.tiers.includes(state.tier);

  const unitCost = quality.unitCost * tier.unitCostScale;

  // The stepper can never past what the player can pay for, so there is no way
  // to land on a disabled button with no obvious way out.
  const maxAffordable =
    unitCost > 0
      ? Math.floor(Math.floor(state.cash / unitCost) / tier.restockStep) * tier.restockStep
      : 600;
  const restockMax = Math.max(0, Math.min(600, maxAffordable));

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
    const lostMoneyLastWeek = (state.lastResult?.profit ?? 0) < 0;

    const extras: CardId[] = [];
    // Staffing surfaces when there is something to decide: nobody hired yet, or
    // a losing week that a wage might be the reason for.
    if (stage2 && (state.employees.length === 0 || lostMoneyLastWeek)) extras.push('staff');
    if (stage2) extras.push('marketing');
    if (stage2) extras.push('treats');
    if (stage2 && week % 2 === 0) extras.push('quality');

    const room = Math.max(0, tier.maxCards - 3);
    const offset = extras.length ? week % extras.length : 0;
    const rotated = [...extras.slice(offset), ...extras.slice(0, offset)];

    return [
      ...state.pendingEvents.map((e) => `event:${e.id}`),
      'location',
      'price',
      ...rotated.slice(0, room),
      'supplies',
      'ready',
    ];
  }, [
    state.pendingEvents,
    state.stage,
    state.employees.length,
    state.week,
    state.lastResult,
    tier.maxCards,
  ]);

  /**
   * How much stock to suggest, given everything decided so far this week.
   * Advertising raises demand; a helper raises how many cups you can physically
   * hand over. Both land before the supplies card, so both count here.
   */
  const suggestedRestock = useMemo(() => {
    const recent = state.history.slice(-3);
    // Best of the last three weeks, so one rained-out week does not suggest
    // ordering nothing — a stand that orders nothing sells nothing forever.
    const baseline = recent.length
      ? Math.max(20, ...recent.map((h) => h.served + h.lostToStockout))
      : 60;

    const lift = buyMarketing.reduce(
      (sum, id) => sum + (biz.marketing.find((m) => m.id === id)?.boost ?? 0),
      0,
    );

    const keptStaff = fireStaff ? [] : state.employees;
    const hired = hireId ? biz.employees.find((e) => e.id === hireId) : undefined;
    const capacity =
      biz.soloCapacity +
      keptStaff.reduce((sum, e) => sum + e.capacityBonus, 0) +
      (hired?.capacityBonus ?? 0);

    const want = Math.min(baseline * (1 + lift), capacity);
    const need = Math.round((want - state.inventory) / tier.restockStep) * tier.restockStep;
    return Math.max(0, Math.min(restockMax, need));
  }, [
    state.history,
    state.inventory,
    state.employees,
    buyMarketing,
    hireId,
    fireStaff,
    biz,
    tier.restockStep,
    restockMax,
  ]);

  const restockUnits = restockTouched ? Math.min(restock, restockMax) : suggestedRestock;
  const supplyCost = Math.round(restockUnits * unitCost * 100) / 100;
  const capacityAfter =
    biz.soloCapacity +
    (fireStaff ? 0 : state.employees.reduce((sum, e) => sum + e.capacityBonus, 0)) +
    (hireId ? (biz.employees.find((e) => e.id === hireId)?.capacityBonus ?? 0) : 0);

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
      qualityId,
      restockUnits,
      locationId,
      eventChoices,
      buyMarketing,
      hireEmployeeId: hireId,
      fireEmployee: fireStaff,
      sideProductId,
    });
  }

  return (
    <div className="stack">
      <Hud state={state} showRival={facesRival} onMenu={onMenu} />
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
            <h2>How much per cup?</h2>
            <Stepper
              value={price}
              min={tier.minPrice}
              max={tier.maxPrice}
              step={tier.priceStep}
              format={(v) => dollars(v, true)}
              onChange={setPrice}
            />
            <p className="muted">{priceHint(price, biz.referencePrice[state.tier])}</p>
            {facesRival && (
              <p className="muted">
                😼 The stand across the street charges ${state.rivalPrice.toFixed(2)}.
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
              {restockUnits} cups costs <b>{dollars(supplyCost, true)}</b>
            </p>
            {/* Everything needed to size the order — last week's numbers, the
                capacity, and anything decided earlier this week — as chips
                rather than a stack of sentences, so the card clears the fold. */}
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span className="pill">🥤 {state.inventory} left over</span>
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
              {hireId && <span className="pill">🤝 helper serves more</span>}
              {fireStaff && <span className="pill">👋 no helper, serve fewer</span>}
              {restockUnits >= restockMax && restockMax > 0 && (
                <span className="pill">💳 all you can afford</span>
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
            <h2 className="center">What goes in the cup?</h2>
            {biz.qualities.map((q) => (
              <Choice
                key={q.id}
                emoji={q.emoji}
                title={`${q.name} · ${dollars(q.unitCost * tier.unitCostScale, true)} a cup`}
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
            {biz.locations.map((l) => (
              <Choice
                key={l.id}
                emoji={l.emoji}
                title={l.name}
                sub={l.blurb}
                selected={locationId === l.id}
                onClick={() => setLocationId(l.id)}
              />
            ))}
            <button className="btn btn-go" onClick={next}>
              Next ➡️
            </button>
          </div>
        )}

        {card === 'staff' && (
          <div className="card stack">
            <h2 className="center">{state.employees.length ? 'Your helper' : 'Want a helper?'}</h2>
            {/* Say plainly what a helper buys, so hiring is a judgement call
                and not a guess. Rookie skips the arithmetic. */}
            {tier.showFullPnL && (
              <p className="muted center">
                You can serve {biz.soloCapacity} cups a week alone.
                {state.lastResult ? ` Last week ${state.lastResult.served} wanted one.` : ''}
              </p>
            )}
            {state.employees.length === 0 &&
              employeeOptions.map((e) => (
              <Choice
                key={e.id}
                emoji={e.emoji}
                title={`${e.name} · ${dollars(e.weeklyWage)} a week`}
                sub={e.quirk}
                selected={hireId === e.id}
                disabled={state.cash < e.weeklyWage}
                onClick={() => setHireId(e.id)}
              />
            ))}
            {state.employees.map((e) => (
              <Choice
                key={e.id}
                emoji={fireStaff ? '👋' : e.emoji}
                title={fireStaff ? `Let ${e.name} go` : `Keep ${e.name} · ${dollars(e.weeklyWage)} a week`}
                sub={
                  fireStaff
                    ? 'No more wages, but you serve fewer cups.'
                    : 'Tap to let them go and stop the wages.'
                }
                selected={!fireStaff}
                onClick={() => setFireStaff((f) => !f)}
              />
            ))}
            {state.employees.length === 0 && (
              <Choice
                emoji="🙅"
                title="Not yet"
                sub="Keep working alone."
                selected={!hireId}
                onClick={() => setHireId(undefined)}
              />
            )}
            <button className="btn btn-go" onClick={next}>
              Next ➡️
            </button>
          </div>
        )}

        {card === 'treats' && (
          <div className="card stack">
            <h2 className="center">Sell a treat too?</h2>
            <p className="muted center">Sold to people already buying a drink.</p>
            {state.lastResult && state.lastResult.sideUnits > 0 && (
              <p className="muted center">
                Last week {state.lastResult.sideUnits} of your {state.lastResult.served} customers
                added one.
              </p>
            )}
            {sideOptions.map((sp) => {
              const margin = (sp.price - sp.unitCost * tier.unitCostScale).toFixed(2);
              return (
                <Choice
                  key={sp.id}
                  emoji={sp.emoji}
                  title={`${sp.name} · ${dollars(sp.price, true)}`}
                  // Kept to one line so four options still fit a phone screen.
                  sub={`keep $${margin} each · ${Math.round(sp.attachRate * 100)}% take one`}
                  selected={sideProductId === sp.id}
                  onClick={() => setSideProductId(sp.id)}
                />
              );
            })}
            <Choice
              emoji="🚫"
              title="Just drinks"
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
              <span className="pill">💲 {dollars(price, true)} a cup</span>
              <span className="pill">🥤 {state.inventory + restock} cups</span>
              <span className="pill">
                {location.emoji} {location.name}
              </span>
            </div>
            <button className="btn btn-go" onClick={finish}>
              ▶️ Open the stand!
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
        {event.choices.map((c) => (
          <Choice
            key={c.id}
            emoji="👉"
            title={c.label}
            selected={chosen[event.id] === c.id}
            onClick={() => onChoose(event.id, c.id)}
          />
        ))}
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
  if (price <= reference * 0.6) return 'Cheap! Lots of customers, less money each.';
  if (price >= reference * 1.8) return 'Pricey. Fewer customers, more money each.';
  return 'A normal price around here.';
}

