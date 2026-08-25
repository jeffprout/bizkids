import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Tier } from '../../engine/types';
import type { FinancingChoice } from '../../engine/newGame';
import { LEMONADE } from '../../config/businesses/lemonade';
import { TIERS } from '../../config/difficulty';
import { totalInterestFor, weeklyPaymentFor } from '../../engine/loans';
import { Choice, dollars } from '../components/bits';
import { sfx } from '../sfx';

type Step = 'tier' | 'money';

export function Setup({
  playerName,
  runOutdated,
  onStart,
  onBack,
}: {
  playerName: string;
  runOutdated?: boolean;
  onStart: (tier: Tier, financing: FinancingChoice) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<Step>('tier');
  const [tier, setTier] = useState<Tier>('pro');
  const [loanIds, setLoanIds] = useState<string[]>([]);

  const biz = LEMONADE;
  const savings = biz.savings[tier];
  const startup = biz.startupCost[tier];
  const offers = biz.loanOffers[tier];
  const borrowed = loanIds.reduce(
    (s, id) => s + (offers.find((o) => o.id === id)?.principal ?? 0),
    0,
  );
  const cushion = savings + borrowed - startup;
  const weeklyDebt = loanIds.reduce((s, id) => {
    const o = offers.find((x) => x.id === id);
    return s + (o ? weeklyPaymentFor(o) : 0);
  }, 0);

  if (step === 'tier') {
    return (
      <Panel title={`${playerName} — pick your level`}>
        {runOutdated && (
          <div className="card card-tight" style={{ background: '#fff6e5' }}>
            <p style={{ margin: 0 }}>
              🔄 The game was updated, so your old run could not be carried over. Your trophies
              are still on the shelf.
            </p>
          </div>
        )}
        {(['rookie', 'pro'] as Tier[]).map((t) => (
          <Choice
            key={t}
            emoji={TIERS[t].emoji}
            title={`${TIERS[t].name} · ${TIERS[t].ages}`}
            sub={TIERS[t].blurb}
            selected={tier === t}
            onClick={() => setTier(t)}
          />
        ))}
        <div className="card card-tight center">
          <div style={{ fontSize: 44 }}>🍋</div>
          <h3>Lemonade Stand</h3>
          <p className="muted">{biz.tagline}</p>
        </div>
        <button
          className="btn btn-go"
          onClick={() => {
            sfx.tap();
            setStep('money');
          }}
        >
          Next ➡️
        </button>
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
      </Panel>
    );
  }

  return (
    <Panel title="How will you pay for it?">
      <div className="card">
        <div className="ledger">
          <span>🧰 Your stand costs</span>
          <span className="out">{dollars(startup)}</span>
        </div>
        <div className="ledger">
          <span>🐷 Your savings</span>
          <span className="in">{dollars(savings)}</span>
        </div>
        <div className="ledger">
          <span>🏦 Borrowed</span>
          <span className="in">{dollars(borrowed)}</span>
        </div>
        <div className="ledger total">
          <span>Left for supplies</span>
          <span className={cushion >= 0 ? 'in' : 'out'}>{dollars(cushion)}</span>
        </div>
      </div>

      <p className="muted center">Tap a loan to add it. Or use only your savings.</p>

      {offers.map((o) => {
        const selected = loanIds.includes(o.id);
        const total = o.principal + totalInterestFor(o);
        return (
          <Choice
            key={o.id}
            emoji={o.emoji}
            title={`${o.lender} · borrow ${dollars(o.principal)}`}
            sub={`${dollars(weeklyPaymentFor(o), true)}/week for ${o.termWeeks} weeks · pay back ${dollars(total)} total`}
            selected={selected}
            onClick={() =>
              setLoanIds((ids) => (selected ? ids.filter((i) => i !== o.id) : [...ids, o.id]))
            }
          />
        );
      })}

      {loanIds.length > 0 && (
        <div className="card card-tight">
          <p style={{ margin: 0 }}>
            🗓️ You will pay <b>{dollars(weeklyDebt, true)}</b> every week.
          </p>
        </div>
      )}

      <button
        className="btn btn-go"
        disabled={cushion < 0}
        onClick={() => {
          sfx.cheer();
          // Where to set up is the first card of week 1 and every week after,
          // so setup does not ask it too. This is only the starting default.
          onStart(tier, {
            loanIds,
            savingsUsed: savings,
            locationId: biz.locations[0].id,
          });
        }}
      >
        {cushion < 0 ? 'Not enough money yet' : 'Open for business'}
      </button>
      <button className="btn btn-ghost" onClick={() => setStep('tier')}>
        Back
      </button>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      className="stack"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <h2 className="center">{title}</h2>
      {children}
    </motion.div>
  );
}
