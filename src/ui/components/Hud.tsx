import type { GameState } from '../../engine/types';
import { SEASON_INFO, WEATHER_INFO, temperatureFor } from '../../engine/calendar';
import { businessFor } from '../../config/businesses';
import { TIERS } from '../../config/difficulty';
import { valueBusiness } from '../../engine/valuation';
import { miniGoalText } from '../../config/milestones';
import { CashCounter, Stars, dollars } from './bits';
import { FINAL_WEEK } from '../../engine/simulateWeek';

/** Always on screen, always moving: money, stars, week, weather. */
export function Hud({
  state,
  showRival,
  onMenu,
  onGoals,
}: {
  state: GameState;
  showRival: boolean;
  onMenu: () => void;
  onGoals: () => void;
}) {
  const debt = state.loans.filter((l) => !l.paidOff).reduce((s, l) => s + l.balance, 0);

  // What the business would fetch right now. This is the long-term goal made
  // visible every week, instead of a number that only appears in week 50.
  const biz = businessFor(state.businessId, state.tier);
  const tier = TIERS[state.tier];
  const quality = biz.qualities.find((q) => q.id === state.qualityId) ?? biz.qualities[0];
  const worth = valueBusiness(state, {
    multipleLow: biz.valuationMultiple.low,
    multipleHigh: biz.valuationMultiple.high,
    inventoryUnitCost: quality.unitCost * tier.unitCostScale,
  }).offer;

  // The bar tracks the run, which is a real quantity, not a feel-good meter.
  const barPct = Math.max(2, Math.min(100, (state.week / FINAL_WEEK) * 100));

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="hud">
        <div className="hud-cell">
          <div className="hud-label">Money</div>
          <CashCounter value={state.cash} tickSound />
        </div>
        <div className="hud-cell">
          <div className="hud-label">Stars</div>
          <div className="hud-value">
            <Stars value={state.reputation} />
          </div>
        </div>
        <div className="hud-cell">
          <div className="hud-label">Week</div>
          <div className="hud-value">
            {state.week > FINAL_WEEK ? `${state.week} 🎉` : `${state.week}/${FINAL_WEEK}`}
          </div>
        </div>
        <div className="hud-cell">
          <button
            className="btn btn-ghost"
            style={{ width: '100%', minHeight: 44, padding: 4 }}
            onClick={onMenu}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* One wrapping row of context instead of three stacked ones, so the
          decision card stays above the fold. */}
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {/* The FORECAST, not the truth. Ordering against it is the bet. */}
        {/* The forecast, with a number attached. A nine-year-old knows what 48
            degrees feels like; "cloudy" on its own does not say whether it is a
            lemonade day or a cocoa one. Derived from the weather, so it is the
            same single bet, not a second one. */}
        <span className="pill">
          {WEATHER_INFO[state.forecast].emoji} {WEATHER_INFO[state.forecast].label}{' '}
          {temperatureFor(state.forecast, state.season)}°?
        </span>
        <span className="pill">
          {SEASON_INFO[state.season].emoji} {SEASON_INFO[state.season].label}
        </span>
        {debt > 0 && <span className="pill">🏦 owe {dollars(Math.round(debt))}</span>}
        {state.assetWeekly > 0 && (
          <span className="pill">📄 {dollars(state.assetWeekly)} lease</span>
        )}
        {showRival && <span className="pill">😼 rival ${state.rivalPrice.toFixed(2)}</span>}
        <button className="pill pill-btn" onClick={onGoals}>
          🎯 worth {dollars(Math.round(worth))} · goals
        </button>
        <span className="pill">
          🎯 {miniGoalText(state.miniGoal)}
          {state.miniGoalStreak > 0 && ` · 🔥 ${state.miniGoalStreak}`}
        </span>
      </div>

      <div className="bar" aria-label="Weeks played">
        <div className="bar-fill" style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}
