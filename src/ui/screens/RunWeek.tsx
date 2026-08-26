import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameState } from '../../engine/types';
import { WEATHER_INFO, temperatureFor } from '../../engine/calendar';
import { StandArt } from '../components/StandArt';
import { CashCounter } from '../components/bits';
import { sfx } from '../sfx';

/**
 * The week playing out. Customers walk up, the counter ticks, the weather plays
 * overhead. Never a static results table.
 */
export function RunWeek({ state, onDone }: { state: GameState; onDone: () => void }) {
  const r = state.lastResult!;
  const [phase, setPhase] = useState(0);
  const [servedShown, setServedShown] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase(1), 400),
      window.setTimeout(() => setPhase(2), 1500),
      window.setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Count the cups up over about a second and a half.
  useEffect(() => {
    if (phase < 1) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1500);
      setServedShown(Math.round(r.served * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // Animation frames stop in a backgrounded tab; make sure the number lands.
    const settle = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      setServedShown(r.served);
    }, 1800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [phase, r.served]);

  useEffect(() => {
    if (phase === 2 && r.profit < 0) sfx.ouch();
  }, [phase, r.profit]);

  return (
    <div className="stack">
      <div className="center">
        <h2>
          Week {r.week} {WEATHER_INFO[r.weather].emoji}
        </h2>
        <p className="muted">
          {WEATHER_INFO[r.weather].label}, {temperatureFor(r.weather, r.season)}°
          {r.forecastWasWrong && ` — not the ${WEATHER_INFO[r.forecast].label.toLowerCase()} they promised`}
        </p>
      </div>

      <StandArt
        stage={state.stage}
        weather={r.weather}
        reputation={r.reputationEnd}
        hasEmployee={state.employees.length > 0}
        hasSign={state.marketing.some((m) => m.channelId === 'sign')}
        customers={phase >= 1 ? Math.min(6, Math.ceil(r.served / 25)) : 0}
        animateCustomers
      />

      <div className="card center">
        <div className="hud-label">Cups sold</div>
        <div style={{ fontSize: 46, fontWeight: 800 }}>{servedShown}</div>
        {r.sideUnits > 0 && phase >= 1 && (
          <div className="pill" style={{ marginBottom: 4 }}>
            🍭 {r.sideUnits} treats too
          </div>
        )}
        <div className="hud-label">Money</div>
        <div style={{ fontSize: 30 }}>
          <CashCounter value={phase >= 2 ? r.cashEnd : r.cashStart} tickSound durationMs={1200} />
        </div>
      </div>

      <AnimatePresence>
        {phase >= 1 &&
          r.eventLines.map((line, i) => (
            <motion.div
              key={i}
              className="card card-tight"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * i }}
            >
              <p style={{ margin: 0 }}>
                {line.emoji} {line.text}
              </p>
            </motion.div>
          ))}
      </AnimatePresence>

      {phase >= 3 && (
        <motion.button
          className="btn btn-go"
          // Rises into place rather than growing into it. Scaling a button
          // shrinks its tap target while the animation runs — 48px of button
          // renders at 38 under scale(0.8), below the 44px floor — and if the
          // animation is ever interrupted it stays that way. Moving it keeps
          // the target the full size at every frame.
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => {
            sfx.tap();
            onDone();
          }}
        >
          See the numbers ➡️
        </motion.button>
      )}
      {phase < 3 && (
        <button className="btn btn-ghost" onClick={() => setPhase(3)}>
          Skip ⏭️
        </button>
      )}
    </div>
  );
}
