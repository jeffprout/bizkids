import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../../engine/types';
import { getBusiness } from '../../config/businesses/lemonade';
import { TIERS } from '../../config/difficulty';
import { valueBusiness } from '../../engine/valuation';
import { Confetti, ExplainToggle, LedgerRow, dollars } from '../components/bits';
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
    inventoryUnitCost: quality.unitCost * TIERS[state.tier].unitCostScale,
  });
  const [sold, setSold] = useState(false);
  const [ex, setEx] = useState(false);

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
        <LedgerRow
          label="📈 Profit each week"
          amount={dollars(v.avgWeeklyProfit)}
          explainId="avgWeeklyProfit"
          showExplain={ex}
        />
        <LedgerRow label="🗓️ Averaged over" amount={`${v.weeksCounted} weeks`} showExplain={ex} />
        <LedgerRow
          label="📅 That is a year of"
          amount={dollars(v.annualProfit)}
          explainId="annualProfit"
          showExplain={ex}
        />
        <LedgerRow
          label="✖️ Times a multiple of"
          amount={v.multiple.toFixed(2)}
          explainId="multiple"
          showExplain={ex}
        />
        <LedgerRow
          label="💡 Business is worth"
          amount={dollars(v.goodwill)}
          tone="in"
          explainId="goodwill"
          showExplain={ex}
        />
        <LedgerRow
          label="🧰 Plus your gear"
          amount={dollars(v.equipmentValue)}
          tone="in"
          explainId="equipmentValue"
          showExplain={ex}
        />
        <LedgerRow
          label="🥤 Plus your supplies"
          amount={dollars(v.inventoryValue)}
          tone="in"
          showExplain={ex}
        />
        <LedgerRow label="🏦 Plus your cash" amount={dollars(v.cash)} tone="in" showExplain={ex} />
        {v.debtPayoff > 0 && (
          <LedgerRow
            label="💳 Minus what you owe"
            amount={`-${dollars(v.debtPayoff)}`}
            tone="out"
            explainId="debtPayoff"
            showExplain={ex}
          />
        )}
        <LedgerRow
          label="The offer"
          amount={dollars(v.offer)}
          tone="in"
          explainId="offer"
          showExplain={ex}
          bold
        />
      </div>

      <ExplainToggle on={ex} onToggle={() => setEx((val) => !val)} />

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
