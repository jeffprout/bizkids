import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { explain } from '../../config/glossary';
import { sfx } from '../sfx';

export const dollars = (n: number, cents = false): string => {
  const abs = Math.abs(n);
  const rounded = Math.round(abs * 100) / 100;
  // Odd cents are always shown, whatever the size of the number. Hiding them on
  // the big lines and showing them on the small ones made ledger columns fail to
  // add up on screen, which is fatal in a game about reading a ledger.
  // Grouped thousands. A lemonade stand never needed them; a food truck at
  // $24000 is unreadable without, and this game is meant to be read.
  const body =
    cents || !Number.isInteger(rounded)
      ? rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : rounded.toLocaleString('en-US');
  return `${n < 0 ? '-' : ''}$${body}`;
};

/** The money counter is a character: it ticks, it pops, it makes noise. */
export function CashCounter({
  value,
  cents = false,
  tickSound = false,
  durationMs = 900,
}: {
  value: number;
  cents?: boolean;
  tickSound?: boolean;
  durationMs?: number;
}) {
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;
    setFlash(b > a ? 'up' : 'down');
    let lastBeep = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = a + (b - a) * eased;
      setShown(next);
      if (tickSound && now - lastBeep > 90 && t < 1) {
        lastBeep = now;
        if (b > a) sfx.coin();
      }
      if (t < 1) raf.current = requestAnimationFrame(step);
      else {
        from.current = b;
        setShown(b);
        window.setTimeout(() => setFlash(null), 500);
      }
    };
    raf.current = requestAnimationFrame(step);

    // Browsers pause animation frames in a hidden or backgrounded tab. Without
    // this the counter would sit at the old number forever, so land it anyway.
    const settle = window.setTimeout(() => {
      cancelAnimationFrame(raf.current);
      from.current = b;
      setShown(b);
    }, durationMs + 300);

    return () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(settle);
    };
  }, [value, durationMs, tickSound]);

  return (
    <span className={`hud-value ${flash ? `flash-${flash}` : ''}`}>{dollars(shown, cents)}</span>
  );
}

export function Stars({ value }: { value: number }) {
  const full = Math.floor(value + 0.001);
  const half = value - full >= 0.5;
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {'⭐'.repeat(full)}
      {half ? '✨' : ''}
    </span>
  );
}

/** Full-screen confetti burst. Pure CSS transforms, no library. */
export function Confetti({ pieces = 60 }: { pieces?: number }) {
  const colors = ['#16181e', '#c4453c', '#1f7a4c', '#5d7388', '#c9a227'];
  const items = useRef(
    Array.from({ length: pieces }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.8 + Math.random() * 1.4,
      rotate: Math.random() * 720 - 360,
      color: colors[i % colors.length],
    })),
  ).current;

  return (
    <>
      {items.map((p, i) => (
        <motion.div
          key={i}
          className="confetti-piece"
          style={{ left: `${p.left}%`, background: p.color }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: '105vh', rotate: p.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </>
  );
}

/** Big tappable choice row. Never depends on hover. */
export function Choice({
  emoji,
  title,
  sub,
  selected,
  onClick,
  disabled,
}: {
  emoji: string;
  title: string;
  sub?: string;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`choice ${selected ? 'selected' : ''}`}
      onClick={() => {
        sfx.tap();
        onClick();
      }}
      disabled={disabled}
    >
      <span className="emoji">{emoji}</span>
      <span>
        <span style={{ fontWeight: 800 }}>{title}</span>
        {sub && (
          <>
            <br />
            <span className="sub">{sub}</span>
          </>
        )}
      </span>
    </button>
  );
}

export function Stepper({
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v * 100) / 100));
  return (
    <div className="stepper">
      <button
        aria-label="Less"
        onClick={() => {
          sfx.tap();
          onChange(clamp(value - step));
        }}
        disabled={value <= min}
      >
        −
      </button>
      <span className="value">{format(value)}</span>
      <button
        aria-label="More"
        onClick={() => {
          sfx.tap();
          onChange(clamp(value + step));
        }}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}

/**
 * One line of a ledger, optionally explainable.
 *
 * Explanations are revealed by tapping, never by hovering — the app has to work
 * the same on an iPad and a Chromebook as on a mouse. The `title` attribute is a
 * free bonus for desktop, not the mechanism.
 */
export function LedgerRow({
  label,
  amount,
  tone,
  explainId,
  showExplain,
  bold,
}: {
  label: React.ReactNode;
  amount: React.ReactNode;
  tone?: 'in' | 'out';
  explainId?: string;
  showExplain?: boolean;
  bold?: boolean;
}) {
  const entry = explainId ? explain(explainId) : undefined;
  return (
    <>
      <div className={`ledger${bold ? ' total' : ''}`} title={entry?.plain}>
        <span>
          {label}
          {entry && (
            <span className="ledger-q" aria-hidden="true">
              ?
            </span>
          )}
        </span>
        <span className={tone}>{amount}</span>
      </div>
      {showExplain && entry && <p className="ledger-note">{entry.plain}</p>}
    </>
  );
}

/** The one control that turns every explanation on this screen on or off. */
export function ExplainToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className="btn btn-ghost"
      aria-expanded={on}
      onClick={() => {
        sfx.tap();
        onToggle();
      }}
    >
      {on ? '✕ Hide explanations' : '❓ What do these mean?'}
    </button>
  );
}
