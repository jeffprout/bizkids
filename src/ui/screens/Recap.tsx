import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../../engine/types';
import { TIERS } from '../../config/difficulty';
import { badgeById } from '../../config/milestones';
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
  }, [celebrate, r.profit]);

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

      <h2 className="center">Week {r.week} done!</h2>

      <div className="card">
        <div className="ledger">
          <span>🥤 Cups sold</span>
          <span>{r.served}</span>
        </div>
        <div className="ledger">
          <span>💰 Money in</span>
          <span className="in">{dollars(r.revenue)}</span>
        </div>

        {tier.showFullPnL ? (
          <>
            <div className="ledger">
              <span>🍋 Cups you made</span>
              <span className="out">-{dollars(r.cogs)}</span>
            </div>
            {r.spoilageCost > 0 && (
              <div className="ledger">
                <span>🗑️ Thrown out ({r.spoilage})</span>
                <span className="out">-{dollars(r.spoilageCost)}</span>
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
          </>
        ) : (
          <div className="ledger">
            <span>💸 Money out</span>
            <span className="out">
              -{dollars(r.cogs + r.spoilageCost + r.rent + r.wages + r.marketingSpend + r.interestPaid + r.lateFees)}
            </span>
          </div>
        )}

        <div className="ledger total">
          <span>{r.profit >= 0 ? '🎉 Profit' : '😬 Loss'}</span>
          <span className={r.profit >= 0 ? 'in' : 'out'}>{dollars(r.profit)}</span>
        </div>
      </div>

      {tier.showFullPnL && r.loanPayment > 0 && (
        <p className="muted center">
          You paid the bank {dollars(r.loanPayment)} — {dollars(r.interestPaid)} of that was
          interest.
        </p>
      )}

      <div className="row" style={{ justifyContent: 'space-around' }}>
        <span className="pill">
          <Stars value={r.reputationEnd} />
          {r.reputationEnd > r.reputationStart ? ' ⬆️' : r.reputationEnd < r.reputationStart ? ' ⬇️' : ''}
        </span>
        <span className="pill">🥤 {r.inventoryEnd} left</span>
        <span className="pill">🏦 {dollars(r.cashEnd)}</span>
      </div>

      {r.miniGoalMet && (
        <motion.div
          className="card card-tight center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          style={{ background: '#eafbe7' }}
        >
          <b>🎯 Goal smashed! +{dollars(r.miniGoalReward)}</b>
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
        <p className="center muted">Nice week to pause — your save is safe.</p>
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
              <h2>Stage {stage}!</h2>
              <p>Your stand got bigger. New choices unlocked.</p>
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
            Awesome!
          </button>
        </motion.div>
      </div>
    </>
  );
}
