import React from 'react';
import {
  PLAYER_COLORS,
  TOKENS_PER_PLAYER,
  tokenIsHome,
  tokenIsOnTrack,
  tokenIsOnHomeStretch,
  tokenIsFinished,
} from '../constants.js';

export default function PlayerPanel({
  players,
  currentPlayerIndex,
  playerIndex,
  diceValue,
  turnPhase,
}) {
  const getTokenStatusIcon = (pos, pIdx) => {
    if (tokenIsHome(pos)) return '🏠';
    if (tokenIsOnTrack(pos)) return '📍';
    if (tokenIsOnHomeStretch(pos, pIdx)) return '🏁';
    if (tokenIsFinished(pos, pIdx)) return '✅';
    return '❓';
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        color: 'rgba(255,255,255,0.3)',
        marginBottom: 4,
        padding: '0 4px',
      }}>
        Players
      </div>

      {players.map((player, pIdx) => {
        const color = player.color || PLAYER_COLORS[player.colorIndex];
        const isCurrent = pIdx === currentPlayerIndex;
        const isMe = pIdx === playerIndex;
        const homeCount = player.tokens.filter(t => tokenIsHome(t)).length;
        const trackCount = player.tokens.filter(t => tokenIsOnTrack(t)).length;
        const hsCount = player.tokens.filter(t => tokenIsOnHomeStretch(t, pIdx)).length;
        const finishedCount = player.tokens.filter(t => tokenIsFinished(t, pIdx)).length;
        const progressPercent = (finishedCount / TOKENS_PER_PLAYER) * 100;

        return (
          <div
            key={pIdx}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: isCurrent
                ? `linear-gradient(135deg, ${color}18, ${color}08)`
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isCurrent ? color + '33' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.3s ease',
              opacity: player.finished ? 0.5 : 1,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Active turn indicator bar */}
            {isCurrent && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: `linear-gradient(180deg, ${color}, ${color}88)`,
                boxShadow: `0 0 8px ${color}`,
                borderRadius: '0 2px 2px 0',
              }} />
            )}

            {/* Progress bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'rgba(255,255,255,0.04)',
            }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${color}66, ${color})`,
                borderRadius: '0 2px 0 0',
                transition: 'width 0.5s ease',
                boxShadow: progressPercent > 0 ? `0 0 6px ${color}` : 'none',
              }} />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              {/* Player info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{
                  fontSize: 18,
                  filter: isCurrent ? 'none' : 'grayscale(0.3)',
                }}>
                  {player.emoji}
                </span>
                <div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: isMe ? color : isCurrent ? '#eee' : 'rgba(255,255,255,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {player.name}
                    {player.isBot && <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: '#a0a0ff',
                      background: 'rgba(100,100,255,0.15)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      letterSpacing: 0.5,
                    }}>🤖 BOT</span>}
                    {isMe && <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: color,
                      background: `${color}22`,
                      padding: '2px 6px',
                      borderRadius: 4,
                      letterSpacing: 0.5,
                    }}>YOU</span>}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.3)',
                    marginTop: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span>🏠 {finishedCount}/{TOKENS_PER_PLAYER} home</span>
                    {!player.connected && (
                      <span style={{ color: '#ff6b6b' }}>❌ Disconnected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Token status indicators */}
              <div style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
              }}>
                {player.tokens.map((pos, tIdx) => {
                  const isDone = tokenIsFinished(pos, pIdx);
                  return (
                    <span
                      key={tIdx}
                      style={{
                        fontSize: 12,
                        opacity: isDone ? 0.4 : 0.8,
                        filter: isDone ? 'grayscale(0.5)' : 'none',
                        transition: 'all 0.3s',
                      }}
                      title={`Token ${tIdx + 1}: ${getTokenStatusIcon(pos, pIdx)}`}
                    >
                      {isDone ? '✅' : '⚪'}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Token phase breakdown */}
            {isCurrent && (
              <div style={{
                marginTop: 8,
                display: 'flex',
                gap: 8,
                fontSize: 11,
                color: 'rgba(255,255,255,0.35)',
              }}>
                <span>🏠 {homeCount}</span>
                <span>📍 {trackCount}</span>
                <span>🏁 {hsCount}</span>
                <span>✅ {finishedCount}</span>
              </div>
            )}

            {/* Active player dice info */}
            {isCurrent && diceValue !== null && (
              <div style={{
                marginTop: 6,
                padding: '6px 10px',
                background: `${color}15`,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                color: color,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                🎲 Rolled: {diceValue}
                {turnPhase === 'move' && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>Move a token!</span>}
              </div>
            )}

            {/* Turn indicator */}
            {isCurrent && players.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 8,
                right: 10,
                fontSize: 9,
                color: color,
                fontWeight: 800,
                fontFamily: "'Fredoka One', cursive",
                letterSpacing: 1,
                opacity: 0.8,
              }}>
                ● TURN
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
