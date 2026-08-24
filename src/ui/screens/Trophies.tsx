import type { Profile } from '../../storage/saves';
import { BADGES } from '../../config/milestones';
import { dollars } from '../components/bits';

export function Trophies({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  return (
    <div className="stack">
      <h2 className="center">
        {profile.emoji} {profile.name}'s shelf
      </h2>

      <div className="grid-3">
        {BADGES.map((b) => {
          const earned = profile.badges.includes(b.id);
          return (
            <div key={b.id} className={`badge-tile ${earned ? '' : 'locked'}`}>
              <span style={{ fontSize: 32 }}>{earned ? b.emoji : '🔒'}</span>
              <b style={{ fontSize: 13 }}>{b.name}</b>
            </div>
          );
        })}
      </div>

      <h3 className="center">Best sales</h3>
      {profile.highScores.length === 0 && (
        <p className="center muted">Sell a business to get on the board.</p>
      )}
      {profile.highScores.slice(0, 5).map((h, i) => (
        <div key={i} className="card card-tight row-between">
          <span>
            {i + 1}. 🍋 {h.tier}
          </span>
          <b>{dollars(h.soldFor)}</b>
        </div>
      ))}

      <button className="btn btn-go" onClick={onBack}>
        ⬅️ Back
      </button>
    </div>
  );
}
