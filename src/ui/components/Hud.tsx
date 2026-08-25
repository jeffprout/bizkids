import type { GameState } from '../../engine/types';
import { SEASON_INFO, WEATHER_INFO } from '../../engine/calendar';
import { miniGoalText } from '../../config/milestones';
import { CashCounter, Stars } from './bits';
import { FINAL_WEEK } from '../../engine/simulateWeek';

/** Always on screen, always moving: money, stars, week, weather. */
export function Hud({
  state,
  showRival,
  onMenu,
}: {
  state: GameState;
  showRival: boolean;
  onMenu: () => void;
}) {
  const debt = state.loans.filter((l) => !l.paidOff).reduce((s, l) => s + l.balance, 0);
  const netWorth = state.cash + state.equipmentValue - debt;
  // The bar is a feel-good progress meter, not an accounting figure.
  const barPct = Math.max(2, Math.min(100, (netWorth / 400) * 100));

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
        <span className="pill">
          {WEATHER_INFO[state.forecast].emoji} {WEATHER_INFO[state.forecast].label}?
        </span>
        <span className="pill">
          {SEASON_INFO[state.season].emoji} {SEASON_INFO[state.season].label}
        </span>
        {debt > 0 && <span className="pill">🏦 owe ${Math.round(debt)}</span>}
        {showRival && <span className="pill">😼 rival ${state.rivalPrice.toFixed(2)}</span>}
        <span className="pill">
          🎯 {miniGoalText(state.miniGoal)}
          {state.miniGoalStreak > 0 && ` · 🔥 ${state.miniGoalStreak}`}
        </span>
      </div>

      <div className="bar" aria-label="Net worth">
        <div className="bar-fill" style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}
