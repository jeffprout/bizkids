import type { GameState } from '../../engine/types';
import { SEASON_INFO, WEATHER_INFO } from '../../engine/calendar';
import { miniGoalText } from '../../config/milestones';
import { CashCounter, Stars } from './bits';
import { FINAL_WEEK } from '../../engine/simulateWeek';

/** Always on screen, always moving: money, stars, week, weather. */
export function Hud({ state, onMenu }: { state: GameState; onMenu: () => void }) {
  const debt = state.loans.filter((l) => !l.paidOff).reduce((s, l) => s + l.balance, 0);
  const netWorth = state.cash + state.equipmentValue - debt;
  // The bar is a feel-good progress meter, not an accounting figure.
  const barPct = Math.max(2, Math.min(100, (netWorth / 400) * 100));

  return (
    <div className="stack" style={{ gap: 8 }}>
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

      <div className="row" style={{ gap: 8 }}>
        <span className="pill">
          {WEATHER_INFO[state.weather].emoji} {WEATHER_INFO[state.weather].label}
        </span>
        <span className="pill">
          {SEASON_INFO[state.season].emoji} {SEASON_INFO[state.season].label}
        </span>
        {debt > 0 && <span className="pill">🏦 owe ${Math.round(debt)}</span>}
      </div>

      <div className="bar" aria-label="Net worth">
        <div className="bar-fill" style={{ width: `${barPct}%` }} />
      </div>

      <div className="pill" style={{ alignSelf: 'flex-start' }}>
        🎯 {miniGoalText(state.miniGoal)}
        {state.miniGoalStreak > 0 && ` · 🔥 ${state.miniGoalStreak}`}
      </div>
    </div>
  );
}
