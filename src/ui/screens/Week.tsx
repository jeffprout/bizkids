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
  const [restock, setRestock] = useState(() => suggestRestock(state, biz, tier.restockStep, tier.unitCostScale));
  const [locationId, setLocationId] = useState(state.locationId);
  const [eventChoices, setEventChoices] = useState<Record<string, string>>({});
  const [buyMarketing, setBuyMarketing] = useState<string[]>([]);
  const [hireId, setHireId] = useState<string | undefined>();
  const [index, setIndex] = useState(0);

  const quality = biz.qualities.find((q) => q.id === qualityId) ?? biz.qualities[0];
  const location = biz.locations.find((l) => l.id === locationId) ?? biz.locations[0];

  // Younger players get a shorter menu. Which options each tier sees is config.
  const forTier = <T extends { tiers?: typeof state.tier[] }>(items: T[]) =>
    items.filter((i) => !i.tiers || i.tiers.includes(state.tier));
  const marketingOptions = forTier(biz.marketing);
  const employeeOptions = forTier(biz.employees);
  const facesRival = biz.rival.tiers.includes(state.tier);

  const unitCost = quality.unitCost * tier.unitCostScale;
  const supplyCost = Math.round(restock * unitCost * 100) / 100;
  // The stepper can never past what the player can pay for, so there is no way
  // to land on a disabled button with no obvious way out.
  const maxAffordable =
    unitCost > 0
      ? Math.floor(Math.floor(state.cash / unitCost) / tier.restockStep) * tier.restockStep
      : 600;
  const restockMax = Math.max(0, Math.min(600, maxAffordable));

  /**
   * The week's deck. Price and supplies are asked every week; the rest rotate so
   * a week stays short and no card nags. Extras are priority-ordered, because a
   * plain slice would silently drop the last ones forever.
   */
  const cards: CardId[] = useMemo(() => {
    const week = state.week;
    const stage2 = state.stage >= 2;

    const extras: CardId[] = [];
    if (week === 1 || week % 5 === 0) extras.push('location');
    if (stage2 && state.employees.length === 0 && week % 3 === 0) extras.push('hire');
    if (stage2 && week % 2 === 0) extras.push('marketing');
    if (stage2 && week % 4 === 2) extras.push('quality');

    const room = Math.max(0, tier.maxCards - 2);
    return [
      ...state.pendingEvents.map((e) => `event:${e.id}`),
      'price',
      'supplies',
      ...extras.slice(0, room),
      'ready',
    ];
  }, [state.pendingEvents, state.stage, state.employees.length, state.week, tier.maxCards]);

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
      restockUnits: Math.min(restock, restockMax),
      locationId,
      eventChoices,
      buyMarketing,
      hireEmployeeId: hireId,
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
            <h2>Buy supplies</h2>
            <Stepper
              value={Math.min(restock, restockMax)}
              min={0}
              max={restockMax}
              step={tier.restockStep}
              format={(v) => `${v}`}
              onChange={setRestock}
            />
            <p>
              {restock} cups costs <b>{dollars(supplyCost, true)}</b>
            </p>
            <p className="muted">
              You already have {state.inventory} cups ready.
              {state.lastResult ? ` Last week you sold ${state.lastResult.served}.` : ''}
            </p>
            <p className="muted">
              ⚠️ Forecast says {WEATHER_INFO[state.forecast].label.toLowerCase()} — forecasts are
              often wrong. Leftovers go bad.
            </p>
            {restock >= restockMax && restockMax > 0 && (
              <p className="muted">That is all you can buy this week.</p>
            )}
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

        {card === 'hire' && (
          <div className="card stack">
            <h2 className="center">Want a helper?</h2>
            {/* Say plainly what a helper buys, so hiring is a judgement call
                and not a guess. Rookie skips the arithmetic. */}
            {tier.showFullPnL && (
              <p className="muted center">
                You can serve {biz.soloCapacity} cups a week alone.
                {state.lastResult ? ` Last week ${state.lastResult.served} wanted one.` : ''}
              </p>
            )}
            {employeeOptions.map((e) => (
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
            <Choice
              emoji="🙅"
              title="Not yet"
              sub="Keep working alone."
              selected={!hireId}
              onClick={() => setHireId(undefined)}
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

      {index > 0 && !card.startsWith('event:') && (
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

/**
 * A helpful starting number so a kid is never staring at zero. If they sold out
 * last week the suggestion counts the customers they turned away, otherwise the
 * stand can never grow out of a stockout.
 */
function suggestRestock(
  state: GameState,
  biz: ReturnType<typeof getBusiness>,
  step: number,
  unitCostScale: number,
): number {
  // Look at the best of the last three weeks, not just the last one. A single
  // rained-out week would otherwise suggest ordering nothing, and a stand that
  // orders nothing sells nothing forever.
  const recent = state.history.slice(-3);
  const wanted = recent.length
    ? Math.max(20, ...recent.map((h) => h.served + h.lostToStockout))
    : 60;
  const want = Math.round((wanted * 1.15 - state.inventory) / step) * step;
  const quality = biz.qualities.find((q) => q.id === state.qualityId) ?? biz.qualities[0];
  const affordable = Math.floor(Math.floor(state.cash / (quality.unitCost * unitCostScale)) / step) * step;
  return Math.max(0, Math.min(400, want, affordable));
}
