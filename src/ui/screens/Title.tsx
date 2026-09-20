import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Profile } from '../../storage/saves';
import { exportAll, importAll } from '../../storage/saves';
import { isFourDigitPin, pinMatches } from '../../storage/pin';
import { sfx } from '../sfx';
import { Choice } from '../components/bits';
import { BrandArt } from '../components/BrandArt';

/**
 * A player is marked by the initial of their own name rather than a picked
 * animal. The badge grid was the most obviously young thing on the first screen,
 * and a monogram costs nobody a decision they did not want to make.
 *
 * Profiles made before this keep whatever they chose — the field is the same.
 */
const monogramFor = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

export function Title({
  profiles,
  onPick,
  onCreate,
  onLock,
  onDelete,
  onImported,
  onAdmin,
}: {
  profiles: Profile[];
  onPick: (p: Profile) => void;
  onCreate: (name: string, emoji: string, pin: string) => void;
  onLock: (p: Profile, pin: string) => void;
  onDelete: (id: string) => void;
  onImported: () => void;
  onAdmin?: () => void;
}) {
  const [adding, setAdding] = useState(profiles.length === 0);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [unlocking, setUnlocking] = useState<Profile | null>(null);
  const [locking, setLocking] = useState<Profile | null>(null);
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const adminTaps = useRef(0);
  const adminTapTimer = useRef<number | null>(null);

  async function doExport() {
    const bundle = await exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boss-mode-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    try {
      const res = await importAll(JSON.parse(await file.text()));
      setNote(res.message);
      if (res.ok) onImported();
    } catch {
      setNote('That file would not open.');
    }
  }

  function resetForm() {
    setAdding(false);
    setUnlocking(null);
    setLocking(null);
    setName('');
    setPin('');
    setPinAgain('');
    setNote('');
  }

  return (
    <div className="stack">
      <motion.div
        className="center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <BrandArt />
        <h1 style={{ marginTop: 4 }}>Boss Mode</h1>
        <p className="muted">Start a business. Run it. Sell it.</p>
      </motion.div>

      {!adding && !unlocking && !locking && (
        <div className="stack">
          {profiles.map((p) => (
            <div key={p.id} className="row" style={{ gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Choice
                  emoji={p.emoji}
                  title={p.name}
                  sub={p.lastRecap || 'No run yet — tap to start one'}
                  onClick={() => {
                    sfx.tap();
                    if (p.pinHash) {
                      setUnlocking(p);
                      setPin('');
                      setNote('');
                    } else {
                      onPick(p);
                    }
                  }}
                />
              </div>
              {!p.pinHash && (
                <button
                  className="btn btn-ghost"
                  aria-label={`Add a PIN for ${p.name}`}
                  onClick={() => {
                    sfx.tap();
                    setLocking(p);
                    setPin('');
                    setPinAgain('');
                    setNote('');
                  }}
                >
                  🔒
                </button>
              )}
              <button
                className="btn btn-ghost"
                aria-label={`Delete ${p.name}`}
                onClick={() => {
                  if (confirm(`Delete ${p.name} and their save?`)) onDelete(p.id);
                }}
              >
                🗑️
              </button>
            </div>
          ))}
          <button
            className="btn btn-primary"
            onClick={() => {
              sfx.tap();
              setAdding(true);
              setName('');
              setPin('');
              setPinAgain('');
              setNote('');
            }}
          >
            ➕ New player
          </button>
        </div>
      )}

      {adding && (
        <div className="card stack">
          <h3>Who is playing?</h3>
          <input
            className="choice"
            style={{ fontSize: 20, fontWeight: 800 }}
            placeholder="Your name"
            maxLength={14}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
          <p className="muted center" style={{ margin: 0 }}>
            Pick a 4-digit PIN so nobody else opens your game on this device.
          </p>
          <PinPad value={pin} onChange={setPin} label="PIN" />
          <PinPad value={pinAgain} onChange={setPinAgain} label="Type it again" />
          {note && <p className="center muted">{note}</p>}
          <button
            className="btn btn-go"
            disabled={!name.trim() || !isFourDigitPin(pin) || !isFourDigitPin(pinAgain)}
            onClick={() => {
              if (pin !== pinAgain) {
                setNote('Those did not match. Try again.');
                setPin('');
                setPinAgain('');
                return;
              }
              sfx.cheer();
              onCreate(name.trim(), monogramFor(name), pin);
            }}
          >
            Start
          </button>
          {profiles.length > 0 && (
            <button className="btn btn-ghost" onClick={resetForm}>
              Back
            </button>
          )}
        </div>
      )}

      {unlocking && (
        <div className="card stack">
          <h3>Hi {unlocking.name}</h3>
          <p className="muted center" style={{ margin: 0 }}>
            Type your PIN to open this game.
          </p>
          <PinPad
            value={pin}
            onChange={async (next) => {
              setPin(next);
              if (next.length < 4) return;
              if (await pinMatches(unlocking.id, next, unlocking.pinHash)) {
                sfx.cheer();
                onPick(unlocking);
              } else {
                sfx.ouch();
                setNote('Wrong PIN.');
                setPin('');
              }
            }}
            label="PIN"
          />
          {note && <p className="center muted">{note}</p>}
          <p className="muted center" style={{ margin: 0, fontSize: 13 }}>
            Forgot it? Delete this player and make a new one.
          </p>
          <button className="btn btn-ghost" onClick={resetForm}>
            Back
          </button>
        </div>
      )}

      {locking && (
        <div className="card stack">
          <h3>Lock {locking.name}</h3>
          <p className="muted center" style={{ margin: 0 }}>
            Pick a 4-digit PIN. It stays on this device — this is not an account.
          </p>
          <PinPad value={pin} onChange={setPin} label="PIN" />
          <PinPad value={pinAgain} onChange={setPinAgain} label="Type it again" />
          {note && <p className="center muted">{note}</p>}
          <button
            className="btn btn-go"
            disabled={!isFourDigitPin(pin) || !isFourDigitPin(pinAgain)}
            onClick={() => {
              if (pin !== pinAgain) {
                setNote('Those did not match. Try again.');
                setPin('');
                setPinAgain('');
                return;
              }
              sfx.cheer();
              onLock(locking, pin);
              resetForm();
            }}
          >
            Lock it
          </button>
          <button className="btn btn-ghost" onClick={resetForm}>
            Back
          </button>
        </div>
      )}

      <div className="btn-row center" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={doExport}>
          💾 Save to file
        </button>
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          📂 Load a file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
      </div>
      {note && !adding && !unlocking && !locking && <p className="center muted">{note}</p>}
      <p
        className="center muted"
        style={{ fontSize: 12 }}
        onClick={() => {
          if (!onAdmin) return;
          adminTaps.current += 1;
          if (adminTapTimer.current) window.clearTimeout(adminTapTimer.current);
          adminTapTimer.current = window.setTimeout(() => {
            adminTaps.current = 0;
          }, 900);
          if (adminTaps.current >= 5) {
            adminTaps.current = 0;
            onAdmin();
          }
        }}
      >
        build {typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'}
      </p>
    </div>
  );
}

function PinPad({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0'];
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="muted center" style={{ fontSize: 13 }}>
        {label}
      </div>
      <div className="pin-dots" aria-label={label} aria-valuenow={value.length} aria-valuemax={4}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < value.length ? 'on' : ''} />
        ))}
      </div>
      <div className="pin-pad">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className="btn"
            aria-label={k === 'back' ? 'Delete' : k}
            onClick={() => {
              sfx.tap();
              if (k === 'back') onChange(value.slice(0, -1));
              else if (value.length < 4) onChange(value + k);
            }}
          >
            {k === 'back' ? '⌫' : k}
          </button>
        ))}
      </div>
    </div>
  );
}