import React from 'react';
import {
  PLAYER_COLORS,
  PLAYER_NAMES,
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
  const getTokenStatus = (pos, pIdx) => {
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
        color: '#666',
        marginBottom: 4,
      }}>
        Players
      </div>

      {players.map((player, pIdx) => {
        const color = player.color || PLAYER_COLORS[player.colorIndex];
        const isCurrent = pIdx === currentPlayerIndex;
        const isMe = pIdx === playerIndex;
        const activeTokens = player.tokens.filter(t => !tokenIsHome(t) && !tokenIsFinished(t, pIdx)).length;
        const finishedTokens = player.tokens.filter(t => tokenIsFinished(t, pIdx)).length;

        return (
          <div
            key={pIdx}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: isCurrent
                ? `linear-gradient(135deg, ${color}22, ${color}11)`
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isCurrent ? color + '44' : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.3s',
              opacity: player.finished ? 0.5 : 1,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Active turn indicator */}
            {isCurrent && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: color,
                boxShadow: `0 0 8px ${color}`,
              }} />
            )}

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
                <span style={{ fontSize: 18 }}>{player.emoji}</span>
                <div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: isMe ? color : '#ccc',
                  }}>
                    {player.name}
                    {isMe && <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>(You)</span>}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#666',
                    marginTop: 1,
                  }}>
                    {finishedTokens}/{TOKENS_PER_PLAYER} home
                    {!player.connected && <span style={{ color: '#e74c3c', marginLeft: 6 }}>❌ Disconnected</span>}
                  </div>
                </div>
              </div>

              {/* Token status */}
              <div style={{
                display: 'flex',
                gap: 3,
                alignItems: 'center',
              }}>
                {player.tokens.map((pos, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      fontSize: 11,
                      opacity: tokenIsFinished(pos, pIdx) ? 0.5 : 1,
                      filter: tokenIsFinished(pos, pIdx) ? 'grayscale(0.5)' : 'none',
                    }}
                    title={`Token ${tIdx + 1}: ${getTokenStatus(pos, pIdx)}`}
                  >
                    {getTokenStatus(pos, pIdx)}
                  </span>
                ))}
              </div>
            </div>

            {/* Active player dice info */}
            {isCurrent && diceValue !== null && (
              <div style={{
                marginTop: 6,
                fontSize: 12,
                fontWeight: 600,
                color,
              }}>
                🎲 Rolled: {diceValue}
                {turnPhase === 'move' && ' — Move a token!'}
              </div>
            )}

            {/* Turn indicator */}
            {isCurrent && players.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                fontSize: 10,
                color,
                fontWeight: 800,
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
