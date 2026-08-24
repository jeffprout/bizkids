import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Profile } from '../../storage/saves';
import { exportAll, importAll } from '../../storage/saves';
import { sfx } from '../sfx';
import { Choice } from '../components/bits';

const AVATARS = ['🦊', '🐼', '🐸', '🦄', '🐨', '🐙', '🦁', '🐝'];

export function Title({
  profiles,
  onPick,
  onCreate,
  onDelete,
  onImported,
}: {
  profiles: Profile[];
  onPick: (p: Profile) => void;
  onCreate: (name: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onImported: () => void;
}) {
  const [adding, setAdding] = useState(profiles.length === 0);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(AVATARS[0]);
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    const bundle = await exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bizkids-save-${new Date().toISOString().slice(0, 10)}.json`;
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

  return (
    <div className="stack">
      <motion.div
        className="center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 140, damping: 12 }}
      >
        <div style={{ fontSize: 64 }}>🍋</div>
        <h1>BizKids</h1>
        <p className="muted">Start a business. Run it. Sell it.</p>
      </motion.div>

      {!adding && (
        <div className="stack">
          {profiles.map((p) => (
            <div key={p.id} className="row" style={{ gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Choice
                  emoji={p.emoji}
                  title={p.name}
                  sub={p.lastRecap || 'New player — tap to begin'}
                  onClick={() => onPick(p)}
                />
              </div>
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
          />
          <div className="grid-3">
            {AVATARS.map((a) => (
              <button
                key={a}
                className={`choice ${emoji === a ? 'selected' : ''}`}
                style={{ justifyContent: 'center', fontSize: 30 }}
                onClick={() => {
                  sfx.tap();
                  setEmoji(a);
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <button
            className="btn btn-go"
            disabled={!name.trim()}
            onClick={() => {
              sfx.cheer();
              onCreate(name.trim(), emoji);
            }}
          >
            Let's go!
          </button>
          {profiles.length > 0 && (
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>
              Back
            </button>
          )}
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
      {note && <p className="center muted">{note}</p>}
    </div>
  );
}
