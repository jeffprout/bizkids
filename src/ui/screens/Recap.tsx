import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../../engine/types';
import { TIERS } from '../../config/difficulty';
import { badgeById } from '../../config/milestones';
import { WEATHER_INFO } from '../../engine/calendar';
import { Confetti, Stars, dollars } from '../components/bits';
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

  useEffect(() => {
    if (celebrate) sfx.levelUp();
    else if (r.profit > 0) sfx.coin();
    else sfx.ouch();
  }, [celebrate, r.profit]);

  const overheads =
    r.rent + r.fixedCosts + r.wages + r.marketingSpend + r.interestPaid + r.lateFees;
  // Cash overheads exclude interest and fees, which leave with the loan payment.
  const overheadCash = r.rent + r.fixedCosts + r.wages + r.marketingSpend + r.lateFees;

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

      <h2 className="center">Week {r.week} results</h2>

      {r.forecastWasWrong && (
        <div className="card card-tight center" style={{ background: '#fff6e5' }}>
          <p style={{ margin: 0 }}>
            🌦️ Forecast said {WEATHER_INFO[r.forecast].label.toLowerCase()}. You got{' '}
            {WEATHER_INFO[r.weather].label.toLowerCase()}.
          </p>
        </div>
      )}

      <div className="recap-cols">
        <div className="card">
          <div className="ledger">
            <span>🥤 Cups sold</span>
            <span>{r.served}</span>
          </div>
          {r.sideUnits > 0 && tier.showFullPnL ? (
            <>
              <div className="ledger">
                <span>💰 Drink sales</span>
                <span className="in">{dollars(r.revenue - r.sideRevenue)}</span>
              </div>
              <div className="ledger">
                <span>🍭 Treats ({r.sideUnits})</span>
                <span className="in">{dollars(r.sideRevenue)}</span>
              </div>
            </>
          ) : (
            <div className="ledger">
              <span>💰 Sales</span>
              <span className="in">{dollars(r.revenue)}</span>
            </div>
          )}

          {tier.showFullPnL ? (
            <>
              <div className="ledger">
                <span>🍋 Cost of cups sold</span>
                <span className="out">-{dollars(r.cogs)}</span>
              </div>
              {r.spoilageCost > 0 && (
                <div className="ledger">
                  <span>🗑️ Thrown out ({r.spoilage})</span>
                  <span className="out">-{dollars(r.spoilageCost)}</span>
                </div>
              )}
              {r.stockLostCost > 0 && (
                <div className="ledger">
                  <span>💥 Stock lost ({r.stockLost})</span>
                  <span className="out">-{dollars(r.stockLostCost)}</span>
                </div>
              )}
              <div className="ledger" style={{ fontWeight: 800 }}>
                <span>Gross profit</span>
                <span className={r.grossProfit >= 0 ? 'in' : 'out'}>{dollars(r.grossProfit)}</span>
              </div>
              {r.fixedCosts > 0 && (
                <div className="ledger">
                  <span>🧊 Ice, cups &amp; permit</span>
                  <span className="out">-{dollars(r.fixedCosts)}</span>
                </div>
              )}
              {r.rent > 0 && (
                <div className="ledger">
                  <span>🏷️ Spot rent</span>
                  <span className="out">-{dollars(r.rent)}</span>
                </div>
              )}
              {r.wages > 0 && (
                <div className="ledger">
                  <span>🤝 Helper pay</span>
                  <span className="out">-{dollars(r.wages)}</span>
                </div>
              )}
              {r.marketingSpend > 0 && (
                <div className="ledger">
                  <span>📣 Advertising</span>
                  <span className="out">-{dollars(r.marketingSpend)}</span>
                </div>
              )}
              {r.interestPaid > 0 && (
                <div className="ledger">
                  <span>🏦 Loan interest</span>
                  <span className="out">-{dollars(r.interestPaid)}</span>
                </div>
              )}
              {r.lateFees > 0 && (
                <div className="ledger">
                  <span>⏰ Late fee</span>
                  <span className="out">-{dollars(r.lateFees)}</span>
                </div>
              )}
              {/* What this week's event cards actually cost or paid. It was being
                folded silently into profit, so choices felt free. */}
              {r.eventCash !== 0 && (
                <div className="ledger">
                  <span>{r.eventCash < 0 ? '⚡ What happened' : '⚡ Lucky break'}</span>
                  <span className={r.eventCash < 0 ? 'out' : 'in'}>
                    {r.eventCash < 0 ? '-' : ''}
                    {dollars(Math.abs(r.eventCash))}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="ledger">
              <span>💸 Money out</span>
              <span className="out">
                -
                {dollars(
                  r.cogs + r.spoilageCost + r.stockLostCost + overheads + Math.max(0, -r.eventCash),
                )}
              </span>
            </div>
          )}

          <div className="ledger total">
            <span>{r.profit >= 0 ? '🎉 Net profit' : '😬 Net loss'}</span>
            <span className={r.profit >= 0 ? 'in' : 'out'}>{dollars(r.profit)}</span>
          </div>
        </div>

        {/*
        Every dollar that moved, so the opening and closing balances actually
        reconcile. Profit and cash are different numbers — buying stock is the
        usual reason they disagree — and the player should be able to see why
        rather than being asked to take it on faith.
      */}
        <div className="card">
          <div className="ledger">
            <span>🏦 Bank at week start</span>
            <span>{dollars(r.cashStart)}</span>
          </div>
          <div className="ledger">
            <span>💰 Sales</span>
            <span className="in">+{dollars(r.revenue)}</span>
          </div>
          {r.suppliesBought > 0 && (
            <div className="ledger">
              <span>🛒 Supplies bought ({r.suppliesUnits})</span>
              <span className="out">-{dollars(r.suppliesBought)}</span>
            </div>
          )}
          {overheadCash > 0 && (
            <div className="ledger">
              <span>🏠 Rent &amp; running costs</span>
              <span className="out">-{dollars(overheadCash)}</span>
            </div>
          )}
          {r.eventCash !== 0 && (
            <div className="ledger">
              <span>⚡ What happened</span>
              <span className={r.eventCash < 0 ? 'out' : 'in'}>
                {r.eventCash < 0 ? '-' : '+'}
                {dollars(Math.abs(r.eventCash))}
              </span>
            </div>
          )}
          {r.loanPayment > 0 && (
            <div className="ledger">
              <span>💳 Loan payment</span>
              <span className="out">-{dollars(r.loanPayment)}</span>
            </div>
          )}
          {r.emergencyAdvance > 0 && (
            <div className="ledger">
              <span>🚨 Emergency advance</span>
              <span className="in">+{dollars(r.emergencyAdvance)}</span>
            </div>
          )}
          <div className="ledger total">
            <span>💵 Money in the bank</span>
            <span className={r.cashEnd > 0 ? 'in' : 'out'}>{dollars(r.cashEnd)}</span>
          </div>
        </div>
      </div>

      {/* Why profit and the bank balance disagree, in one line. */}
      {tier.showFullPnL && Math.abs(r.profit - r.cashChange) >= 1 && (
        <div className="card card-tight">
          <p style={{ margin: 0 }}>
            🧮 Profit says {dollars(r.profit)}, the bank moved {dollars(r.cashChange)}
            {r.suppliesUnits > r.served
              ? ' — you paid for stock you have not sold yet.'
              : ' — loan principal moves cash without being a cost.'}
          </p>
        </div>
      )}

      {/* What the event cards actually did, repeated here because the results
          screen is where the numbers are questioned. */}
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
      </div>

      {r.miniGoalMet && (
        <motion.div
          className="card card-tight center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          style={{ background: '#eafbe7' }}
        >
          <b>🎯 Weekly goal hit!</b>
        </motion.div>
      )}

      <div className="card card-tight">
        <p style={{ margin: 0 }}>🧑‍🏫 {r.coachLine}</p>
      </div>

      {r.bankerTalk && (
        <div className="card card-tight" style={{ background: '#fff1f1' }}>
          <p style={{ margin: 0 }}>
            🏦 The banker wants a word. Three rough weeks. Try a cheaper spot or a smaller order.
          </p>
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

      {goodStoppingPoint && (
        <p className="center muted">Good place to pause — your save is safe.</p>
      )}
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
