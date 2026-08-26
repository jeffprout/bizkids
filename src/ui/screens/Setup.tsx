import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Tier } from '../../engine/types';
import type { FinancingChoice } from '../../engine/newGame';
import { BUSINESSES, getBusiness } from '../../config/businesses';
import { TIERS } from '../../config/difficulty';
import { totalInterestFor, weeklyPaymentFor } from '../../engine/loans';
import { Choice, dollars } from '../components/bits';
import { sfx } from '../sfx';

type Step = 'business' | 'tier' | 'asset' | 'money';

export function Setup({
  playerName,
  runOutdated,
  onStart,
  onBack,
}: {
  playerName: string;
  runOutdated?: boolean;
  onStart: (businessId: string, tier: Tier, financing: FinancingChoice) => void;
  onBack: () => void;
}) {
  const catalogue = Object.values(BUSINESSES);
  const [businessId, setBusinessId] = useState(catalogue[0].id);
  const [step, setStep] = useState<Step>(catalogue.length > 1 ? 'business' : 'tier');
  const [tier, setTier] = useState<Tier>('pro');
  const [assetId, setAssetId] = useState<string | undefined>();
  const [loanIds, setLoanIds] = useState<string[]>([]);

  const biz = getBusiness(businessId);
  const tiersOffered = (['rookie', 'pro', 'tycoon'] as Tier[]).filter(
    (t) => biz.loanOffers[t]?.length,
  );
  const assets = biz.assetOptions;
  const asset = assets?.find((a) => a.id === assetId);

  const savings = biz.savings[tier];
  // What it costs to open depends on how the core asset is acquired.
  const startup = asset ? asset.upfront[tier] : biz.startupCost[tier];
  const offers = biz.loanOffers[tier] ?? [];
  const borrowed = loanIds.reduce(
    (s, id) => s + (offers.find((o) => o.id === id)?.principal ?? 0),
    0,
  );
  const cushion = savings + borrowed - startup;
  const weeklyDebt = loanIds.reduce((s, id) => {
    const o = offers.find((x) => x.id === id);
    return s + (o ? weeklyPaymentFor(o) : 0);
  }, 0);

  /** Where the Next button goes, skipping steps a business does not have. */
  const goForward = () => {
    sfx.tap();
    if (step === 'business') setStep('tier');
    else if (step === 'tier') setStep(assets ? 'asset' : 'money');
    else setStep('money');
  };
  const goBack = () => {
    if (step === 'money') setStep(assets ? 'asset' : 'tier');
    else if (step === 'asset') setStep('tier');
    else if (step === 'tier' && catalogue.length > 1) setStep('business');
    else onBack();
  };

  if (step === 'business') {
    return (
      <Panel title={`${playerName} — what will you run?`}>
        {runOutdated && <Outdated />}
        {catalogue.map((b) => (
          <Choice
            key={b.id}
            emoji={b.emoji}
            title={b.name}
            sub={b.tagline}
            selected={businessId === b.id}
            onClick={() => {
              setBusinessId(b.id);
              // Levels and acquisition routes belong to a business, so anything
              // chosen for the last one has to be let go of.
              setAssetId(undefined);
              setLoanIds([]);
              const next = getBusiness(b.id);
              if (!next.loanOffers[tier]?.length) setTier('pro');
            }}
          />
        ))}
        <button className="btn btn-go" onClick={goForward}>
          Next ➡️
        </button>
        <button className="btn btn-ghost" onClick={goBack}>
          Back
        </button>
      </Panel>
    );
  }

  if (step === 'tier') {
    return (
      <Panel title={`${playerName} — pick your level`}>
        {runOutdated && catalogue.length === 1 && <Outdated />}
        {tiersOffered.map((t) => (
          <Choice
            key={t}
            emoji={TIERS[t].emoji}
            title={`${TIERS[t].name} · ${TIERS[t].ages}`}
            sub={TIERS[t].blurb}
            selected={tier === t}
            onClick={() => {
              setTier(t);
              setLoanIds([]);
            }}
          />
        ))}
        <div className="card card-tight center">
          <div style={{ fontSize: 44 }}>{biz.emoji}</div>
          <h3>{biz.name}</h3>
          <p className="muted">Build it up over 50 weeks, then sell it for as much as you can.</p>
        </div>
        <button className="btn btn-go" onClick={goForward}>
          Next ➡️
        </button>
        <button className="btn btn-ghost" onClick={goBack}>
          Back
        </button>
      </Panel>
    );
  }

  if (step === 'asset' && assets) {
    return (
      <Panel title={`How will you get the ${biz.name.toLowerCase()}?`}>
        {/* The three columns that matter, said once at the top, because the
            whole decision is a comparison and the cheapest is not the best. */}
        <p className="muted center" style={{ margin: 0 }}>
          Pay more now, or pay later, or never own it at all.
        </p>
        {assets.map((a) => {
          const facts = [
            // The count IS the number of shut weeks. Saying "opens in 5" beside a
              // blurb promising four weeks shut made the same fact contradict itself.
              a.weeksToOpen > 0 ? `shut for ${a.weeksToOpen} weeks` : 'opens right away',
            a.weeklyPayment[tier] > 0
              ? `${dollars(a.weeklyPayment[tier])} every week`
              : `worth about ${dollars(a.equity[tier])} at the end`,
            a.conditionRange ? 'condition unknown' : '',
          ].filter(Boolean);
          return (
            <Choice
              key={a.id}
              emoji={a.emoji}
              title={`${a.name} · ${dollars(a.upfront[tier])}`}
              sub={`${facts.join(' · ')}. ${a.blurb}`}
              selected={assetId === a.id}
              onClick={() => {
                setAssetId(a.id);
                setLoanIds([]);
              }}
            />
          );
        })}
        <button className="btn btn-go" disabled={!assetId} onClick={goForward}>
          {assetId ? 'Next ➡️' : 'Pick one to carry on'}
        </button>
        <button className="btn btn-ghost" onClick={goBack}>
          Back
        </button>
      </Panel>
    );
  }

  return (
    <Panel title="How will you pay for it?">
      <div className="card">
        <div className="ledger">
          <span>{asset ? `${asset.emoji} ${asset.name}` : '🧰 Opening costs'}</span>
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
          <span>Money to start with</span>
          <span className={cushion >= 0 ? 'in' : 'out'}>{dollars(cushion)}</span>
        </div>
      </div>

      {/* A refit spends weeks before it earns a penny, and those weeks are paid
          for out of this cushion. Saying so here is the difference between a
          lesson and an ambush. */}
      {asset && asset.weeksToOpen > 0 && (
        <div className="card card-tight" style={{ background: '#fff6e5' }}>
          <p style={{ margin: 0 }}>
            🔧 The refit takes {asset.weeksToOpen} weeks. You pay rent and loans through all of
            them, and sell nothing.
          </p>
        </div>
      )}
      {asset && asset.weeklyPayment[tier] > 0 && (
        <div className="card card-tight" style={{ background: '#fff6e5' }}>
          <p style={{ margin: 0 }}>
            📄 The lease is {dollars(asset.weeklyPayment[tier])} a week for the whole run, and you
            own nothing at the end.
          </p>
        </div>
      )}

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
          onStart(businessId, tier, {
            loanIds,
            savingsUsed: savings,
            locationId: biz.locations[0].id,
            assetId,
          });
        }}
      >
        {cushion < 0 ? 'Not enough money yet' : 'Open for business'}
      </button>
      <button className="btn btn-ghost" onClick={goBack}>
        Back
      </button>
    </Panel>
  );
}

function Outdated() {
  return (
    <div className="card card-tight" style={{ background: '#fff6e5' }}>
      <p style={{ margin: 0 }}>
        🔄 The game was updated, so your old run could not be carried over. Your trophies are still
        on the shelf.
      </p>
    </div>
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
