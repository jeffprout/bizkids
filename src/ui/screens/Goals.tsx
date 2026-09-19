import type { GameState } from '../../engine/types';
import { businessFor } from '../../config/businesses';
import { TIERS } from '../../config/difficulty';
import { BADGES, miniGoalText } from '../../config/milestones';
import { valueBusiness } from '../../engine/valuation';
import { FINAL_WEEK } from '../../engine/simulateWeek';
import { LedgerRow, Stars, dollars } from '../components/bits';

/**
 * What you are actually playing for, at three timescales: this week, the next
 * stage, and the sale. Without this the long game is invisible until week 50
 * and every decision feels like it is only about the current week.
 */
export function Goals({
  state,
  badges,
  onBack,
}: {
  state: GameState;
  badges: string[];
  onBack: () => void;
}) {
  const biz = businessFor(state.businessId, state.tier);
  const tier = TIERS[state.tier];
  const quality = biz.qualities.find((q) => q.id === state.qualityId) ?? biz.qualities[0];
  const v = valueBusiness(state, {
    multipleLow: biz.valuationMultiple.low,
    multipleHigh: biz.valuationMultiple.high,
    inventoryUnitCost: quality.unitCost * tier.unitCostScale,
  });

  const weeksLeft = Math.max(0, FINAL_WEEK - state.week + 1);
  const nextStage = biz.stageUps.find((s) => s.stage > state.stage);
  const earned = BADGES.filter((b) => badges.includes(b.id));
  const nextTrophies = BADGES.filter((b) => !badges.includes(b.id)).slice(0, 3);

  const pct = (have: number, need: number) => Math.max(0, Math.min(100, (have / need) * 100));

  return (
    <div className="stack">
      <div className="center">
        <h2 style={{ margin: '2px 0' }}>🎯 What you are playing for</h2>
        <p className="muted" style={{ margin: 0 }}>
          Build the {biz.placeName} up over {FINAL_WEEK} weeks, then <b>sell it for as much as you can</b>. A
          business is worth what it earns.
        </p>
      </div>

      <div className="goals-cols">
        {/* The long game. */}
        <div className="card">
          <h3>💼 The sale · {weeksLeft} weeks to go</h3>
          {/* Whole dollars, matching the HUD. A headline, not a column to add up. */}
          <LedgerRow
            label="If you sold today"
            amount={dollars(Math.round(v.offer))}
            tone="in"
            bold
          />
          <div className="bar" style={{ marginTop: 8 }}>
            <div className="bar-fill" style={{ width: `${pct(state.week, FINAL_WEEK)}%` }} />
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            Week {Math.min(state.week, FINAL_WEEK)} of {FINAL_WEEK}
          </p>
          {v.reasons.slice(0, 3).map((reason, i) => (
            <p key={i} className="muted" style={{ margin: '2px 0' }}>
              {reason.effect === 'raises the offer' ? '⬆️' : '⬇️'} {reason.label} — {reason.effect}.
            </p>
          ))}
        </div>

        {/* The medium game. */}
        <div className="card">
          {nextStage ? (
            <>
              <h3>🚀 Next: Stage {nextStage.stage}</h3>
              <p className="muted">Unlocks a helper, advertising and {biz.sideNoun}s.</p>
              <LedgerRow
                label="Total sales"
                amount={`${dollars(state.totals.revenue)} of ${dollars(nextStage.minTotalRevenue)}`}
              />
              <div className="bar">
                <div
                  className="bar-fill"
                  style={{
                    width: `${pct(state.totals.revenue, nextStage.minTotalRevenue)}%`,
                  }}
                />
              </div>
              <div style={{ height: 8 }} />
              <LedgerRow
                label="Reputation"
                amount={
                  <span>
                    <Stars value={state.reputation} /> of {nextStage.minReputation}
                  </span>
                }
              />
              <div className="bar">
                <div
                  className="bar-fill"
                  style={{
                    width: `${pct(state.reputation, nextStage.minReputation)}%`,
                  }}
                />
              </div>
              {state.week < nextStage.minWeek && (
                <p className="muted" style={{ marginTop: 6 }}>
                  Opens in week {nextStage.minWeek}.
                </p>
              )}
            </>
          ) : (
            <>
              <h3>🚀 Stage {state.stage}</h3>
              <p className="muted">
                Everything is unlocked. Now make it worth as much as you can by the sale.
              </p>
            </>
          )}
        </div>

        {/* The short game. */}
        <div className="card card-tight">
          <h3>📅 This week</h3>
          <p style={{ margin: '4px 0' }}>
            {(state.weeksToOpen ?? 0) > 0
              ? 'Closed this week. Goals wait until you open.'
              : `${miniGoalText(state.miniGoal)}${state.miniGoalStreak > 0 ? ` · ${state.miniGoalStreak} in a row` : ''}`}
          </p>
        </div>

        <div className="card">
          <h3>
            🏆 Trophies · {earned.length} of {BADGES.length}
          </h3>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {earned.map((b) => (
              <span key={b.id} className="pill" title={b.blurb}>
                {b.emoji} {b.name}
              </span>
            ))}
          </div>
          {nextTrophies.length > 0 && (
            <>
              <p className="muted" style={{ marginTop: 8, marginBottom: 4 }}>
                Still to win:
              </p>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {nextTrophies.map((b) => (
                  <span key={b.id} className="pill" style={{ opacity: 0.6 }} title={b.blurb}>
                    🔒 {b.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <button className="btn btn-go" onClick={onBack}>
        ⬅️ Back to the {biz.placeName}
      </button>
    </div>
  );
}
