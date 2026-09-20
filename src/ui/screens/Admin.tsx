import { useState } from 'react';
import type { PlayStats } from '../../analytics/model';
import { BUSINESSES } from '../../config/businesses';
import { ALL_EVENTS } from '../../config/events';
import { TIERS } from '../../config/difficulty';

function pct(n: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function nameOfBusiness(id: string): string {
  return BUSINESSES[id]?.name ?? id;
}

function nameOfTier(id: string): string {
  return TIERS[id as keyof typeof TIERS]?.name ?? id;
}

function nameOfAsset(id: string): string {
  if (id === 'none') return 'Lemonade stand (no truck)';
  for (const b of Object.values(BUSINESSES)) {
    const asset = b.assetOptions?.find((a) => a.id === id);
    if (asset) return asset.name;
  }
  return id;
}

function nameOfSpot(key: string): string {
  const [biz, loc] = key.split(':');
  const spot = BUSINESSES[biz]?.locations.find((l) => l.id === loc);
  return spot ? `${BUSINESSES[biz].name} · ${spot.name}` : key;
}

function nameOfQuality(key: string): string {
  const [biz, q] = key.split(':');
  const item = BUSINESSES[biz]?.qualities.find((x) => x.id === q);
  return item ? `${BUSINESSES[biz].name} · ${item.name}` : key;
}

function nameOfChoice(key: string): string {
  const split = key.lastIndexOf(':');
  const eventId = key.slice(0, split);
  const choiceId = key.slice(split + 1);
  const event = ALL_EVENTS.find((e) => e.id === eventId);
  const choice = event?.choices.find((c) => c.id === choiceId);
  if (!event || !choice) return key;
  return `${event.title} · ${choice.label}`;
}

function Bars({
  counts,
  label,
}: {
  counts: Record<string, number>;
  label: (id: string) => string;
}) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <p className="muted">Nothing yet.</p>;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {rows.map(([id, n]) => (
        <div key={id}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <span>{label(id)}</span>
            <strong>
              {pct(n, total)} · {n}
            </strong>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: pct(n, total) }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Admin({ onBack }: { onBack: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<PlayStats | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; stats?: PlayStats };
      if (!res.ok || !data.ok || !data.stats) {
        setError(data.message || 'Could not open stats.');
        setStats(null);
      } else {
        setStats(data.stats);
      }
    } catch {
      setError('Could not reach the stats box.');
      setStats(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1 className="center">How people play</h1>
      <p className="muted center">
        Counts only. No names, no PIN, no money. This is not on the player screens.
      </p>

      {!stats && (
        <div className="card stack">
          <input
            className="choice"
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load();
            }}
            autoComplete="off"
          />
          {error && <p className="muted center">{error}</p>}
          <button className="btn btn-go" disabled={!password || busy} onClick={() => void load()}>
            Open
          </button>
        </div>
      )}

      {stats && (
        <>
          <div className="card stack">
            <h2>Runs started · {stats.starts}</h2>
            <Bars counts={stats.byBusiness} label={nameOfBusiness} />
          </div>
          <div className="card stack">
            <h2>Level</h2>
            <Bars counts={stats.byTier} label={nameOfTier} />
          </div>
          <div className="card stack">
            <h2>How they got the truck</h2>
            <Bars counts={stats.byAsset} label={nameOfAsset} />
          </div>
          <div className="card stack">
            <h2>Weeks played · {stats.weeks}</h2>
            <p className="muted">Where they parked</p>
            <Bars counts={stats.byLocation} label={nameOfSpot} />
            <p className="muted">What they sold</p>
            <Bars counts={stats.byQuality} label={nameOfQuality} />
            <p className="muted">Helper that week</p>
            <Bars counts={stats.hired} label={(id) => (id === 'yes' ? 'Had help' : 'Worked alone')} />
            <p className="muted">Extra on the loan</p>
            <Bars
              counts={stats.extraLoan}
              label={(id) => (id === 'yes' ? 'Paid extra' : 'Kept the schedule')}
            />
          </div>
          <div className="card stack">
            <h2>Cards they picked</h2>
            <Bars counts={stats.choices} label={nameOfChoice} />
          </div>
          <div className="card stack">
            <h2>Sold the business · {stats.sold}</h2>
            <Bars counts={stats.soldByBusiness} label={nameOfBusiness} />
            <p className="muted">When they sold</p>
            <Bars counts={stats.soldByWeek} label={(id) => `Week ${id}`} />
            {stats.starts > 0 && (
              <p className="muted">
                {pct(stats.sold, stats.starts)} of starts have sold so far.
              </p>
            )}
          </div>
          <button className="btn" onClick={() => void load()} disabled={busy}>
            Refresh
          </button>
        </>
      )}

      <button className="btn btn-ghost" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
