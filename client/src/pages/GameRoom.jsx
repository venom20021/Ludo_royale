import React, { useState, useEffect, useCallback, useRef } from 'react';
import Board from '../components/Board.jsx';
import Dice from '../components/Dice.jsx';
import PlayerPanel from '../components/PlayerPanel.jsx';
import GameLog from '../components/GameLog.jsx';
import { PLAYER_COLORS, TOKENS_PER_PLAYER, tokenIsHome, tokenIsOnTrack, tokenIsOnHomeStretch, tokenIsFinished } from '../constants.js';

const TURN_TIMEOUT = 30; // seconds

export default function GameRoom({ socket, onLeave }) {
  const { room, playerIndex, connected, error, chatMessages, sendMessage, rollDice, moveToken, startGame } = socket;

  const [rolling, setRolling] = useState(false);
  const [selectableTokens, setSelectableTokens] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [showPlayers, setShowPlayers] = useState(true);
  const [showLog, setShowLog] = useState(true);
  const chatEndRef = useRef(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Determine if it's my turn
  const isMyTurn = room?.gameState?.currentPlayerIndex === playerIndex;
  const turnPhase = room?.gameState?.turnPhase || 'roll';
  const diceValue = room?.gameState?.diceValue;
  const players = room?.gameState?.players || [];
  const gameLog = room?.gameState?.log || [];
  const gamePhase = room?.phase || 'lobby';
  const winner = room?.gameState?.winner;
  const isHost = playerIndex === 0; // First player is host

  // Turn timer
  const turnStartTime = room?.gameState?.turnStartTime;
  const [remainingSeconds, setRemainingSeconds] = useState(TURN_TIMEOUT);

  useEffect(() => {
    if (!turnStartTime || gamePhase !== 'playing') {
      setRemainingSeconds(TURN_TIMEOUT);
      return;
    }

    const updateTimer = () => {
      const elapsed = (Date.now() - turnStartTime) / 1000;
      const remaining = Math.max(0, TURN_TIMEOUT - elapsed);
      setRemainingSeconds(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [turnStartTime, gamePhase, room?.gameState?.turnNumber]);

  // Calculate selectable tokens when it's my turn and in move phase
  useEffect(() => {
    if (!isMyTurn || turnPhase !== 'move' || !diceValue || !players[playerIndex]) {
      setSelectableTokens(null);
      return;
    }

    const myTokens = players[playerIndex].tokens;
    const validTokens = [];
    const dice = diceValue;

    // Build set of positions occupied by own tokens (excluding each token being considered)
    const getSelfOccupied = (excludeIdx) => {
      const occupied = new Set();
      myTokens.forEach((p, ti) => {
        if (ti === excludeIdx) return;
        if (tokenIsOnTrack(p)) occupied.add(p);
        if (tokenIsOnHomeStretch(p, playerIndex)) occupied.add(p);
      });
      return occupied;
    };

    myTokens.forEach((pos, tIdx) => {
      // Skip finished tokens
      if (tokenIsFinished(pos, playerIndex)) return;

      const selfOccupied = getSelfOccupied(tIdx);

      if (tokenIsHome(pos) && dice === 6) {
        // Enter from home — check self-blocking at start position
        const startPos = [0, 10, 20, 30, 40, 50][playerIndex];
        if (!selfOccupied.has(startPos)) {
          validTokens.push({ playerIdx: playerIndex, tokenIdx: tIdx });
        }
        return;
      }

      if (tokenIsOnTrack(pos)) {
        const entry = [56, 6, 16, 26, 36, 46][playerIndex];
        const distanceToEntry = (entry >= pos) ? entry - pos : (60 - pos + entry);

        if (dice < distanceToEntry) {
          // Moving on track — check if destination blocked by own token
          const newPos = (pos + dice) % 60;
          if (!selfOccupied.has(newPos)) {
            validTokens.push({ playerIdx: playerIndex, tokenIdx: tIdx });
          }
        } else if (dice === distanceToEntry) {
          // Entering home stretch — check if HS cell 0 is blocked
          const hsPos = 100 + playerIndex * 10;
          if (!selfOccupied.has(hsPos)) {
            validTokens.push({ playerIdx: playerIndex, tokenIdx: tIdx });
          }
        } else {
          // Overshoot into home stretch
          const overshoot = dice - distanceToEntry;
          if (overshoot <= 6) {
            const hsPos = 100 + playerIndex * 10 + (overshoot - 1);
            if (!selfOccupied.has(hsPos)) {
              validTokens.push({ playerIdx: playerIndex, tokenIdx: tIdx });
            }
          }
        }
        return;
      }

      if (tokenIsOnHomeStretch(pos, playerIndex)) {
        const hsIndex = pos - (100 + playerIndex * 10);
        const remaining = 6 - hsIndex;
        if (dice < remaining) {
          // Moving on home stretch — check if destination blocked by own token
          const newHsPos = 100 + playerIndex * 10 + hsIndex + dice;
          if (!selfOccupied.has(newHsPos)) {
            validTokens.push({ playerIdx: playerIndex, tokenIdx: tIdx });
          }
        } else if (dice === remaining) {
          // Reaching home — always valid
          validTokens.push({ playerIdx: playerIndex, tokenIdx: tIdx });
        }
        return;
      }
    });

    setSelectableTokens(validTokens.length > 0 ? validTokens : null);
  }, [isMyTurn, turnPhase, diceValue, players, playerIndex]);

  const handleRollDice = useCallback(() => {
    if (!isMyTurn || turnPhase !== 'roll') return;
    setRolling(true);
    rollDice();
    setTimeout(() => setRolling(false), 700);
  }, [isMyTurn, turnPhase, rollDice]);

  const handleTokenClick = useCallback((pIdx, tIdx) => {
    if (!isMyTurn || turnPhase !== 'move' || pIdx !== playerIndex) return;
    moveToken(tIdx);
    setSelectableTokens(null);
  }, [isMyTurn, turnPhase, playerIndex, moveToken]);

  const handleStartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleCopyRoomId = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  // Winner info
  const winnerPlayer = winner !== null && winner !== undefined ? players[winner] : null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      maxWidth: 1200,
      margin: '0 auto',
      width: '100%',
    }}>
      {/* Connection bar */}
      {!connected && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(231,76,60,0.15)',
          border: '1px solid rgba(231,76,60,0.3)',
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 13,
          color: '#e74c3c',
          textAlign: 'center',
          fontWeight: 600,
        }}>
          🔴 Disconnected from server. Attempting to reconnect...
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 24px',
          background: 'rgba(231,76,60,0.9)',
          borderRadius: 12,
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          zIndex: 100,
          animation: 'fadeIn 0.3s ease-out',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {error}
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        {/* Room info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <button
            onClick={onLeave}
            style={{
              padding: '8px 14px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              color: '#888',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ← Leave
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 13, color: '#888' }}>Room:</span>
            <span
              onClick={handleCopyRoomId}
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: 16,
                color: '#f1c40f',
                cursor: 'pointer',
                letterSpacing: 2,
                padding: '4px 10px',
                background: 'rgba(241,196,15,0.1)',
                borderRadius: 6,
                border: '1px solid rgba(241,196,15,0.2)',
              }}
              title="Click to copy"
            >
              {room?.id || '------'}
            </span>
            {showCopied && (
              <span style={{ fontSize: 11, color: '#2ecc71', fontWeight: 600 }}>
                Copied! 📋
              </span>
            )}
          </div>
        </div>

        {/* Game title */}
        <div style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 18,
          background: 'linear-gradient(135deg, #f1c40f, #e67e22)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Ludo Royale
        </div>

        {/* Toggle buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setShowPlayers(!showPlayers)}
            style={{
              padding: '6px 12px',
              border: `1px solid rgba(255,255,255,${showPlayers ? '0.2' : '0.05'})`,
              borderRadius: 6,
              background: showPlayers ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: '#888',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            👥 Players
          </button>
          <button
            onClick={() => setShowLog(!showLog)}
            style={{
              padding: '6px 12px',
              border: `1px solid rgba(255,255,255,${showLog ? '0.2' : '0.05'})`,
              borderRadius: 6,
              background: showLog ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: '#888',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📜 Log
          </button>
        </div>
      </div>

      {/* Main game area */}
      <div style={{
        display: 'flex',
        gap: 12,
        flex: 1,
        flexWrap: 'wrap',
      }}>
        {/* Left sidebar - Player panel */}
        {showPlayers && (
          <div style={{
            width: 220,
            minWidth: 200,
            flexShrink: 0,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: 12,
            }}>
              <PlayerPanel
                players={players}
                currentPlayerIndex={room?.gameState?.currentPlayerIndex}
                playerIndex={playerIndex}
                diceValue={diceValue}
                turnPhase={turnPhase}
              />

              {/* Start button (host only) */}
              {gamePhase === 'lobby' && isHost && (
                <button
                  onClick={handleStartGame}
                  disabled={players.length < 2}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: '12px 20px',
                    border: 'none',
                    borderRadius: 10,
                    background: players.length >= 2
                      ? 'linear-gradient(135deg, #2ecc71, #27ae60)'
                      : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: players.length >= 2 ? 'pointer' : 'not-allowed',
                    opacity: players.length >= 2 ? 1 : 0.5,
                    transition: 'all 0.2s',
                  }}
                >
                  🎮 Start Game ({players.length}/{room.maxPlayers || 6} players)
                </button>
              )}

              {/* Waiting for host */}
              {gamePhase === 'lobby' && !isHost && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 16px',
                  background: 'rgba(241,196,15,0.08)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#f1c40f',
                  textAlign: 'center',
                  fontWeight: 600,
                }}>
                  Waiting for host to start the game...
                </div>
              )}

              {/* Game in progress */}
              {gamePhase === 'playing' && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 16px',
                  background: 'rgba(46,204,113,0.08)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#2ecc71',
                  textAlign: 'center',
                  fontWeight: 600,
                }}>
                  🎲 Turn {room?.gameState?.turnNumber || 1}
                  <br />
                  <span style={{ fontSize: 11, color: '#888' }}>
                    {players[room?.gameState?.currentPlayerIndex]?.emoji}{' '}
                    {players[room?.gameState?.currentPlayerIndex]?.name}'s turn
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Center - Board */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 300,
        }}>
          {/* Board */}
          <div style={{
            width: '100%',
            maxWidth: 600,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 8,
            overflow: 'hidden',
          }}>
            <Board
              players={players}
              currentPlayerIndex={room?.gameState?.currentPlayerIndex}
              diceValue={diceValue}
              turnPhase={turnPhase}
              playerIndex={playerIndex}
              onTokenClick={handleTokenClick}
              selectableTokens={selectableTokens}
            />
          </div>

          {/* Turn Timer Bar */}
          {gamePhase === 'playing' && (
            <div style={{
              width: '100%',
              maxWidth: 600,
              marginTop: 8,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                {/* Timer track */}
                <div style={{
                  flex: 1,
                  height: 6,
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{
                    width: `${Math.max(0, (remainingSeconds / TURN_TIMEOUT) * 100)}%`,
                    height: '100%',
                    background: remainingSeconds > 10
                      ? '#2ecc71'
                      : remainingSeconds > 5
                        ? '#f1c40f'
                        : '#e74c3c',
                    borderRadius: 3,
                    transition: 'width 0.2s linear, background 0.5s ease',
                    boxShadow: remainingSeconds < 5
                      ? '0 0 8px rgba(231,76,60,0.5)'
                      : 'none',
                  }} />
                </div>
                {/* Timer text */}
                <div style={{
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: "'Fredoka One', cursive",
                  color: remainingSeconds > 10
                    ? '#2ecc71'
                    : remainingSeconds > 5
                      ? '#f1c40f'
                      : '#e74c3c',
                  minWidth: 32,
                  textAlign: 'center',
                  transition: 'color 0.5s ease',
                }}>
                  {Math.ceil(remainingSeconds)}s
                </div>
              </div>
            </div>
          )}

          {/* Dice area */}
          <div style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}>
            <Dice
              value={diceValue}
              rolling={rolling}
              canRoll={gamePhase === 'playing'}
              playerColor={players[playerIndex]?.color}
              onRoll={handleRollDice}
              isMyTurn={isMyTurn}
              turnPhase={turnPhase}
            />

            {/* Move instructions */}
            {isMyTurn && turnPhase === 'move' && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(241,196,15,0.08)',
                borderRadius: 10,
                border: '1px solid rgba(241,196,15,0.15)',
                fontSize: 13,
                fontWeight: 600,
                color: '#f1c40f',
                animation: 'pulse 2s infinite',
              }}>
                {selectableTokens && selectableTokens.length > 0
                  ? `Click a highlighted token to move (${selectableTokens.length} available)`
                  : 'No valid moves!'}
              </div>
            )}

            {/* Extra turn indicator */}
            {isMyTurn && diceValue === 6 && turnPhase === 'move' && (
              <div style={{
                padding: '8px 14px',
                background: 'rgba(46,204,113,0.1)',
                borderRadius: 8,
                fontSize: 12,
                color: '#2ecc71',
                fontWeight: 700,
                animation: 'bounce 1s infinite',
              }}>
                🎉 Extra Turn!
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - Chat & Log */}
        {showLog && (
          <div style={{
            width: 240,
            minWidth: 200,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {/* Game log */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                color: '#666',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                📜 Game Log
              </div>
              <GameLog log={gameLog} playerIndex={playerIndex} />
            </div>

            {/* Chat */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              overflow: 'hidden',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 160,
            }}>
              <div style={{
                padding: '10px 14px',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                color: '#666',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                💬 Chat
              </div>

              {/* Chat messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 10px',
                maxHeight: 160,
              }}>
                {chatMessages.length === 0 ? (
                  <div style={{
                    color: '#555',
                    fontSize: 12,
                    textAlign: 'center',
                    padding: 20,
                    fontStyle: 'italic',
                  }}>
                    No messages yet
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} style={{
                      marginBottom: 6,
                      animation: 'fadeIn 0.3s ease-out',
                    }}>
                      <div style={{
                        fontSize: 12,
                        color: msg.playerColor || '#ccc',
                        fontWeight: 700,
                      }}>
                        {msg.playerEmoji} {msg.playerName}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: '#aaa',
                        marginLeft: 4,
                        wordBreak: 'break-word',
                      }}>
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <form
                onSubmit={handleChatSubmit}
                style={{
                  display: 'flex',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={200}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: '#ccc',
                    fontSize: 12,
                    outline: 'none',
                    fontFamily: 'Nunito, sans-serif',
                  }}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  style={{
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: chatInput.trim() ? '#f1c40f' : '#444',
                    cursor: chatInput.trim() ? 'pointer' : 'default',
                    fontSize: 16,
                  }}
                >
                  ➤
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Game Over Modal */}
      {gamePhase === 'finished' && winnerPlayer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            border: '2px solid rgba(241,196,15,0.3)',
            borderRadius: 24,
            padding: '40px 48px',
            textAlign: 'center',
            maxWidth: 400,
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.6s ease-out',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
            <h2 style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: 32,
              color: winnerPlayer.color || '#f1c40f',
              marginBottom: 8,
            }}>
              {winnerPlayer.emoji} {winnerPlayer.name} Wins!
            </h2>
            <p style={{
              color: '#888',
              fontSize: 14,
              marginBottom: 24,
            }}>
              Congratulations! All tokens home in {room?.gameState?.turnNumber || 0} turns.
            </p>
            <button
              onClick={onLeave}
              style={{
                padding: '12px 32px',
                border: 'none',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f1c40f, #e67e22)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Players inline on smaller screens or when sidebar hidden */}
      {!showPlayers && (
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {players.map((p, i) => (
            <div key={i} style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: i === room?.gameState?.currentPlayerIndex
                ? `${p.color}22`
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === room?.gameState?.currentPlayerIndex ? p.color + '44' : 'rgba(255,255,255,0.06)'}`,
              fontSize: 12,
              fontWeight: 600,
              color: i === playerIndex ? '#fff' : '#888',
            }}>
              {p.emoji} {p.name}
              {p.tokens.filter(t => tokenIsFinished(t, i)).length === TOKENS_PER_PLAYER && ' ✅'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
