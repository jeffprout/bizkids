import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../../engine/types';
import { getBusiness } from '../../config/businesses/lemonade';
import { valueBusiness } from '../../engine/valuation';
import { Confetti, dollars } from '../components/bits';
import { sfx } from '../sfx';

/**
 * The endgame. A buyer values the business the way buyers really do: a multiple
 * of yearly earnings, plus what you own, minus what you owe.
 */
export function Sell({
  state,
  onSell,
  onKeepPlaying,
}: {
  state: GameState;
  onSell: () => void;
  onKeepPlaying: () => void;
}) {
  const biz = getBusiness(state.businessId);
  const quality = biz.qualities.find((q) => q.id === state.qualityId) ?? biz.qualities[0];
  const v = valueBusiness(state, {
    multipleLow: biz.valuationMultiple.low,
    multipleHigh: biz.valuationMultiple.high,
    inventoryUnitCost: quality.unitCost,
  });
  const [sold, setSold] = useState(false);

  if (sold) {
    return (
      <>
        <Confetti pieces={90} />
        <motion.div
          className="stack center"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 12 }}
        >
          <div style={{ fontSize: 72 }}>💼</div>
          <h1>Sold!</h1>
          <h2>{dollars(v.offer)}</h2>
          <p>You built a business and sold it. That is the whole game.</p>
          <button
            className="btn btn-go"
            onClick={() => {
              sfx.cheer();
              onSell();
            }}
          >
            🏆 To the trophy shelf
          </button>
        </motion.div>
      </>
    );
  }

  return (
    <div className="stack">
      <div className="center">
        <div style={{ fontSize: 56 }}>🤝</div>
        <h2>Someone wants to buy your stand.</h2>
      </div>

      <div className="card">
        <div className="ledger">
          <span>📈 Profit each week</span>
          <span>{dollars(v.avgWeeklyProfit)}</span>
        </div>
        <div className="ledger">
          <span>🗓️ Averaged over</span>
          <span>{v.weeksCounted} weeks</span>
        </div>
        <div className="ledger">
          <span>📅 That is a year of</span>
          <span>{dollars(v.annualProfit)}</span>
        </div>
        <div className="ledger">
          <span>✖️ Times a multiple of</span>
          <span>{v.multiple.toFixed(2)}</span>
        </div>
        <div className="ledger">
          <span>💡 Business is worth</span>
          <span className="in">{dollars(v.goodwill)}</span>
        </div>
        <div className="ledger">
          <span>🧰 Plus your gear</span>
          <span className="in">{dollars(v.equipmentValue)}</span>
        </div>
        <div className="ledger">
          <span>🥤 Plus your supplies</span>
          <span className="in">{dollars(v.inventoryValue)}</span>
        </div>
        <div className="ledger">
          <span>🏦 Plus your cash</span>
          <span className="in">{dollars(v.cash)}</span>
        </div>
        {v.debtPayoff > 0 && (
          <div className="ledger">
            <span>💳 Minus what you owe</span>
            <span className="out">-{dollars(v.debtPayoff)}</span>
          </div>
        )}
        <div className="ledger total">
          <span>The offer</span>
          <span className="in">{dollars(v.offer)}</span>
        </div>
      </div>

      <div className="card card-tight stack" style={{ gap: 4 }}>
        {v.reasons.map((reason, i) => (
          <p key={i} style={{ margin: 0 }}>
            {reason.effect === 'raises the offer' ? '⬆️' : '⬇️'} {reason.label} — {reason.effect}.
          </p>
        ))}
      </div>

      <button
        className="btn btn-go"
        onClick={() => {
          sfx.levelUp();
          setSold(true);
        }}
      >
        💰 Sell it!
      </button>
      <button className="btn btn-ghost" onClick={onKeepPlaying}>
        Not yet — keep running it
      </button>
    </div>
  );
}
