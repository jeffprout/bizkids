import { useState } from 'react';
import './ui/theme.css';
import { useGame } from './state/useGame';
import { Title } from './ui/screens/Title';
import { Setup } from './ui/screens/Setup';
import { Week } from './ui/screens/Week';
import { RunWeek } from './ui/screens/RunWeek';
import { Recap } from './ui/screens/Recap';
import { Sell } from './ui/screens/Sell';
import { Trophies } from './ui/screens/Trophies';
import { FEATURES } from './config/edition';
import { exportAll } from './storage/saves';
import { sfx } from './ui/sfx';

export default function App() {
  const game = useGame();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!game.ready) {
    return (
      <div className="app center">
        <div style={{ fontSize: 56, marginTop: '30vh' }}>🍋</div>
      </div>
    );
  }

  const { profile, state, screen } = game;

  return (
    <div className="app">
      {screen === 'title' && (
        <Title
          profiles={game.profiles}
          onPick={(p) => void game.chooseProfile(p)}
          onCreate={(name, emoji) =>
            void game.createProfile(name, emoji).then(() => game.setScreen('setup'))
          }
          onDelete={(id) => void game.removeProfile(id)}
          onImported={() => void game.refreshProfiles()}
        />
      )}

      {screen === 'setup' && profile && (
        <Setup
          runOutdated={game.runOutdated}
          playerName={profile.name}
          onStart={(tier, financing) => void game.startRun(tier, financing)}
          onBack={() => game.setScreen('title')}
        />
      )}

      {screen === 'week' && state && (
        <Week
          state={state}
          onEndWeek={(d) => void game.endWeek(d)}
          onMenu={() => setMenuOpen(true)}
        />
      )}

      {screen === 'run' && state?.lastResult && (
        <RunWeek state={state} onDone={() => game.setScreen('recap')} />
      )}

      {screen === 'recap' && state?.lastResult && (
        <Recap
          state={state}
          onNext={() => game.setScreen('week')}
          onSell={() => game.setScreen('sell')}
        />
      )}

      {screen === 'sell' && state && (
        <Sell
          state={state}
          onSell={() => void game.sellBusiness()}
          onKeepPlaying={() => game.setScreen('week')}
        />
      )}

      {screen === 'trophies' && profile && (
        <Trophies profile={profile} onBack={() => game.setScreen(state ? 'week' : 'title')} />
      )}

      {menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)}>
          <div
            className="card stack"
            style={{ maxWidth: 380, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="center">Menu</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                sfx.tap();
                void game.toggleSound();
              }}
            >
              {profile?.soundOn ? '🔊 Sound is on' : '🔇 Sound is off'}
            </button>
            <button
              className="btn"
              onClick={() => {
                setMenuOpen(false);
                game.setScreen('trophies');
              }}
            >
              🏆 Trophy shelf
            </button>
            {state && state.week > 8 && (
              <button
                className="btn"
                onClick={() => {
                  setMenuOpen(false);
                  game.setScreen('sell');
                }}
              >
                💼 Ask for an offer
              </button>
            )}
            {FEATURES.fileExport && (
              <button
                className="btn"
                onClick={async () => {
                  const bundle = await exportAll();
                  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'bizkids-save.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                💾 Save to a file
              </button>
            )}
            <button
              className="btn"
              onClick={() => {
                setMenuOpen(false);
                game.setScreen('title');
              }}
            >
              👋 Switch player
            </button>
            <button className="btn btn-go" onClick={() => setMenuOpen(false)}>
              Keep playing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
