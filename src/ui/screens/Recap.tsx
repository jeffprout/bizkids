import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../../engine/types';
import { TIERS } from '../../config/difficulty';
import { badgeById } from '../../config/milestones';
import { WEATHER_INFO } from '../../engine/calendar';
import { Confetti, ExplainToggle, LedgerRow, Stars, dollars } from '../components/bits';
import { sfx } from '../sfx';

export function Recap({
  state,
  onNext,
  onSell,
}: {
  state: GameState;
  onNext: () => void;
  onSell: () => void;
}) {
  const r = state.lastResult!;
  const tier = TIERS[state.tier];
  const celebrate = r.newBadges.length > 0 || r.stagedUp;
  const [showCelebration, setShowCelebration] = useState(celebrate);
  // Off by default so the screen stays short. One tap explains every line.
  const [ex, setEx] = useState(false);

  useEffect(() => {
    if (celebrate) sfx.levelUp();
    else if (r.profit > 0) sfx.coin();
    else sfx.ouch();
  }, [celebrate, r.profit]);

  const overheads =
    r.rent + r.fixedCosts + r.wages + r.marketingSpend + r.interestPaid + r.lateFees;
  // Cash overheads exclude interest and fees, which leave with the loan payment.
  const overheadCash = r.rent + r.fixedCosts + r.wages + r.marketingSpend + r.lateFees;

  // Name the card that took the money. A lumped "What happened -$30" with two
  // cards on screen leaves the player unable to tell which one did it. Only
  // split when the parts add back to the total the ledger is balanced on —
  // a card that hands over stock is booked as supplies, not as an event cost.
  const cashEvents = r.eventLines.filter((l) => l.cash !== 0);
  const splitsReconcile =
    cashEvents.length > 1 &&
    Math.abs(cashEvents.reduce((sum, l) => sum + l.cash, 0) - r.eventCash) < 0.005;
  const eventRows = splitsReconcile
    ? cashEvents.map((l) => ({ label: `${l.emoji} ${l.title}`, cash: l.cash }))
    : r.eventCash !== 0
      ? [
          {
            label:
              cashEvents.length === 1
                ? `${cashEvents[0].emoji} ${cashEvents[0].title}`
                : r.eventCash < 0
                  ? '⚡ What happened'
                  : '⚡ Lucky break',
            cash: r.eventCash,
          },
        ]
      : [];

  // The two reasons profit and cash ever differ. Stock consumed but paid for in
  // an earlier week pushes cash above profit; stock bought and not yet sold
  // pushes it below. Loan principal leaves the bank without being an expense.
  const inventorySwing = r.cogs + r.spoilageCost + r.stockLostCost - r.suppliesBought;
  const principalPaid = r.loanPayment - r.interestPaid;

  // A gentle nudge to stop, never a nag and never a timer.
  const goodStoppingPoint = state.week % 4 === 1 && state.week > 1;

  return (
    <div className="stack">
      {showCelebration && (
        <Celebration
          stagedUp={r.stagedUp}
          stage={state.stage}
          badges={r.newBadges}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* The heading carries the forecast miss rather than a card of its own —
          it is one short line and the results screen is the tightest we have. */}
      <div className="center">
        <h2>Week {r.week} results</h2>
        {r.forecastWasWrong && (
          <p className="muted" style={{ margin: 0 }}>
            🌦️ Forecast said {WEATHER_INFO[r.forecast].label.toLowerCase()}, you got{' '}
            {WEATHER_INFO[r.weather].label.toLowerCase()}
          </p>
        )}
      </div>

      <div className="recap-cols">
        <div className="card">
          <LedgerRow label="🥤 Cups sold" amount={r.served} explainId="cupsSold" showExplain={ex} />
          {r.sideUnits > 0 && (
            <LedgerRow
              label="🍭 Treats sold"
              amount={r.sideUnits}
              explainId="treatsSold"
              showExplain={ex}
            />
          )}

          {r.sideUnits > 0 && tier.showFullPnL ? (
            <>
              <LedgerRow
                label="💰 Drink sales"
                amount={dollars(r.revenue - r.sideRevenue)}
                tone="in"
                explainId="drinkSales"
                showExplain={ex}
              />
              <LedgerRow
                label="🍭 Treat sales"
                amount={dollars(r.sideRevenue)}
                tone="in"
                explainId="treatSales"
                showExplain={ex}
              />
            </>
          ) : (
            <LedgerRow
              label="💰 Sales"
              amount={dollars(r.revenue)}
              tone="in"
              explainId="sales"
              showExplain={ex}
            />
          )}

          {tier.showFullPnL ? (
            <>
              {/* Revenue is split by product, so cost has to be too — otherwise
                  "cost of cups sold" quietly contains the candy and neither
                  line's margin means anything. */}
              <LedgerRow
                label={`🍋 Cost of cups sold (${dollars(r.avgUnitCost, true)} each)`}
                amount={`-${dollars(r.cogs - r.sideCogs)}`}
                tone="out"
                explainId="cogs"
                showExplain={ex}
              />
              {r.sideCogs > 0 && (
                <LedgerRow
                  label="🍭 Cost of treats sold"
                  amount={`-${dollars(r.sideCogs)}`}
                  tone="out"
                  explainId="treatCogs"
                  showExplain={ex}
                />
              )}
              {r.spoilageCost > 0 && (
                <LedgerRow
                  label={`🗑️ Thrown out (${r.spoilage})`}
                  amount={`-${dollars(r.spoilageCost)}`}
                  tone="out"
                  explainId="spoilage"
                  showExplain={ex}
                />
              )}
              {r.stockLostCost > 0 && (
                <LedgerRow
                  label={`💥 Stock lost (${r.stockLost})`}
                  amount={`-${dollars(r.stockLostCost)}`}
                  tone="out"
                  explainId="stockLost"
                  showExplain={ex}
                />
              )}
              <LedgerRow
                label="Gross profit"
                amount={dollars(r.grossProfit)}
                tone={r.grossProfit >= 0 ? 'in' : 'out'}
                explainId="grossProfit"
                showExplain={ex}
              />
              {r.fixedCosts > 0 && (
                <LedgerRow
                  label="🧊 Running costs (ice, cups, permit)"
                  amount={`-${dollars(r.fixedCosts)}`}
                  tone="out"
                  explainId="fixedCosts"
                  showExplain={ex}
                />
              )}
              {r.rent > 0 && (
                <LedgerRow
                  label="🏷️ Spot rent"
                  amount={`-${dollars(r.rent)}`}
                  tone="out"
                  explainId="rent"
                  showExplain={ex}
                />
              )}
              {r.wages > 0 && (
                <LedgerRow
                  label="🤝 Helper pay"
                  amount={`-${dollars(r.wages)}`}
                  tone="out"
                  explainId="wages"
                  showExplain={ex}
                />
              )}
              {r.marketingSpend > 0 && (
                <LedgerRow
                  label="📣 Advertising"
                  amount={`-${dollars(r.marketingSpend)}`}
                  tone="out"
                  explainId="marketing"
                  showExplain={ex}
                />
              )}
              {r.interestPaid > 0 && (
                <LedgerRow
                  label="🏦 Loan interest"
                  amount={`-${dollars(r.interestPaid)}`}
                  tone="out"
                  explainId="interest"
                  showExplain={ex}
                />
              )}
              {r.lateFees > 0 && (
                <LedgerRow
                  label="⏰ Late fee"
                  amount={`-${dollars(r.lateFees)}`}
                  tone="out"
                  explainId="lateFee"
                  showExplain={ex}
                />
              )}
              {eventRows.map((row) => (
                <LedgerRow
                  key={`pl-${row.label}`}
                  label={row.label}
                  amount={`${row.cash < 0 ? '-' : ''}${dollars(Math.abs(row.cash))}`}
                  tone={row.cash < 0 ? 'out' : 'in'}
                  explainId="eventCash"
                  showExplain={ex}
                />
              ))}
            </>
          ) : (
            <LedgerRow
              label="💸 Money out"
              amount={`-${dollars(
                r.cogs + r.spoilageCost + r.stockLostCost + overheads + Math.max(0, -r.eventCash),
              )}`}
              tone="out"
            />
          )}

          <LedgerRow
            label={r.profit >= 0 ? '🎉 Net profit' : '😬 Net loss'}
            amount={dollars(r.profit)}
            tone={r.profit >= 0 ? 'in' : 'out'}
            explainId="netProfit"
            showExplain={ex}
            bold
          />
        </div>

        {/*
          Every dollar that moved, so the opening and closing balances actually
          reconcile. Profit and cash are different numbers — buying stock is the
          usual reason they disagree.
        */}
        <div className="card">
          <LedgerRow
            label="🏦 Bank at week start"
            amount={dollars(r.cashStart)}
            explainId="bankStart"
            showExplain={ex}
          />
          <LedgerRow
            label="💰 Sales"
            amount={`+${dollars(r.revenue)}`}
            tone="in"
            explainId="sales"
            showExplain={ex}
          />
          {r.suppliesBought > 0 && (
            <LedgerRow
              label={`🛒 Supplies bought (${r.suppliesUnits})`}
              amount={`-${dollars(r.suppliesBought)}`}
              tone="out"
              explainId="suppliesBought"
              showExplain={ex}
            />
          )}
          {overheadCash > 0 && (
            <LedgerRow
              label="🏠 Spot rent & running costs"
              amount={`-${dollars(overheadCash)}`}
              tone="out"
              explainId="overheadCash"
              showExplain={ex}
            />
          )}
          {eventRows.map((row) => (
            <LedgerRow
              key={`cash-${row.label}`}
              label={row.label}
              amount={`${row.cash < 0 ? '-' : '+'}${dollars(Math.abs(row.cash))}`}
              tone={row.cash < 0 ? 'out' : 'in'}
              explainId="eventCash"
              showExplain={ex}
            />
          ))}
          {r.loanPayment > 0 && (
            <LedgerRow
              label="💳 Loan payment"
              amount={`-${dollars(r.loanPayment)}`}
              tone="out"
              explainId="loanPayment"
              showExplain={ex}
            />
          )}
          {r.emergencyAdvance > 0 && (
            <LedgerRow
              label="🚨 Emergency advance"
              amount={`+${dollars(r.emergencyAdvance)}`}
              tone="in"
              explainId="emergencyAdvance"
              showExplain={ex}
            />
          )}
          <LedgerRow
            label="💵 Money in the bank"
            amount={dollars(r.cashEnd)}
            tone={r.cashEnd > 0 ? 'in' : 'out'}
            explainId="bankEnd"
            showExplain={ex}
            bold
          />
        </div>

        {/*
          Why profit and the bank disagree, as an actual bridge rather than a
          guess. The identity is exact:
            bank moved = profit + (cost of stock used - stock bought)
                                - loan principal repaid + any advance
          It is the third ledger, so it lives in the same grid as the other two
          and lines up beside them when the window is wide and short.
        */}
        {tier.showFullPnL && Math.abs(r.profit - r.cashChange) >= 0.5 && (
          <div className="card card-tight recap-bridge">
            <LedgerRow
              label="🧮 Profit"
              amount={dollars(r.profit, true)}
              tone={r.profit >= 0 ? 'in' : 'out'}
              explainId="netProfit"
              showExplain={ex}
            />
            {Math.abs(inventorySwing) >= 0.005 && (
              <LedgerRow
                label={
                  inventorySwing > 0 ? '🥤 Sold stock bought earlier' : '🥤 Bought stock not sold yet'
                }
                amount={`${inventorySwing > 0 ? '+' : '-'}${dollars(Math.abs(inventorySwing), true)}`}
                tone={inventorySwing > 0 ? 'in' : 'out'}
                explainId="inventorySwing"
                showExplain={ex}
              />
            )}
            {principalPaid >= 0.005 && (
              <LedgerRow
                label="🏦 Loan principal repaid"
                amount={`-${dollars(principalPaid, true)}`}
                tone="out"
                explainId="principalRepaid"
                showExplain={ex}
              />
            )}
            {r.emergencyAdvance > 0 && (
              <LedgerRow
                label="🚨 Emergency advance"
                amount={`+${dollars(r.emergencyAdvance, true)}`}
                tone="in"
                explainId="emergencyAdvance"
                showExplain={ex}
              />
            )}
            <LedgerRow
              label="💵 Bank moved"
              amount={`${r.cashChange >= 0 ? '+' : '-'}${dollars(Math.abs(r.cashChange), true)}`}
              tone={r.cashChange >= 0 ? 'in' : 'out'}
              explainId="bankMoved"
              showExplain={ex}
              bold
            />
          </div>
        )}
      </div>

      <ExplainToggle on={ex} onToggle={() => setEx((v) => !v)} />

      {r.eventLines.length > 0 && (
        <div className="card card-tight stack" style={{ gap: 4 }}>
          {r.eventLines.map((line, i) => (
            <p key={i} style={{ margin: 0 }}>
              {line.emoji} {line.text}
            </p>
          ))}
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-around', flexWrap: 'wrap' }}>
        <span className="pill">
          <Stars value={r.reputationEnd} />
          {r.reputationEnd > r.reputationStart
            ? ' ⬆️'
            : r.reputationEnd < r.reputationStart
              ? ' ⬇️'
              : ''}
        </span>
        <span className="pill">🥤 {r.inventoryEnd} left</span>
        {r.lostToStockout > 0 && <span className="pill">🚫 {r.lostToStockout} turned away</span>}
        {r.lostToRival > 0 && <span className="pill">😼 {r.lostToRival} went to the rival</span>}
        {/* The weekly goal joins the other chips rather than claiming a card of
            its own. It still pops, and it costs a line instead of a block —
            which is the difference between fitting a small phone and not. */}
        {r.miniGoalMet && (
          <motion.span
            className="pill"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            style={{ background: '#eafbe7', fontWeight: 700 }}
          >
            🎯 Weekly goal hit!
          </motion.span>
        )}
      </div>

      {/* One piece of advice, not two. When the banker speaks the coach is
          saying the same thing in weaker words, and a bad week is exactly the
          week with the most rows to get through already. */}
      {r.bankerTalk ? (
        <div className="card card-tight" style={{ background: '#fff1f1' }}>
          <p style={{ margin: 0 }}>
            🏦 The banker wants a word. Three rough weeks. Try a cheaper spot or a smaller order.
          </p>
        </div>
      ) : (
        <div className="card card-tight">
          <p style={{ margin: 0 }}>🧑‍🏫 {r.coachLine}</p>
        </div>
      )}

      {state.offerAvailable ? (
        <button className="btn btn-go" onClick={onSell}>
          💼 A buyer is here!
        </button>
      ) : (
        <button className="btn btn-go" onClick={onNext}>
          ▶️ Start week {state.week}
        </button>
      )}

      {goodStoppingPoint && <p className="center muted">Good place to pause — your save is safe.</p>}
    </div>
  );
}

function Celebration({
  stagedUp,
  stage,
  badges,
  onClose,
}: {
  stagedUp: boolean;
  stage: number;
  badges: string[];
  onClose: () => void;
}) {
  return (
    <>
      <Confetti />
      <div className="overlay" onClick={onClose}>
        <motion.div
          className="card center stack"
          initial={{ scale: 0.6, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 12 }}
          style={{ maxWidth: 380 }}
        >
          {stagedUp && (
            <>
              <div style={{ fontSize: 64 }}>🚀</div>
              <h2>Stage {stage}</h2>
              <p>Your stand grew. New decisions unlocked.</p>
            </>
          )}
          {badges.map((id) => {
            const b = badgeById(id);
            if (!b) return null;
            return (
              <div key={id}>
                <div style={{ fontSize: 56 }}>{b.emoji}</div>
                <h3>{b.name}</h3>
                <p className="muted">{b.blurb}</p>
              </div>
            );
          })}
          <button className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </motion.div>
      </div>
    </>
  );
}
