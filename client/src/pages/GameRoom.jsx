import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Board from '../components/Board.jsx';
import Dice from '../components/Dice.jsx';
import GameChat from '../components/GameChat.jsx';
import MatchTimer from '../components/MatchTimer.jsx';
import PlayerCard from '../components/PlayerCard.jsx';
import ResultModal from '../components/ResultModal.jsx';
import EmojiReactionPicker, { FloatingReactions } from '../components/EmojiReactionPicker.jsx';
import useGameStore from '../stores/gameStore.js';
import {
  tokenIsHome,
  tokenIsOnTrack,
  tokenIsOnHomeStretch,
  tokenIsFinished,
} from '../constants.js';

export default function GameRoom({ socket, onLeave }) {
  const room = useGameStore((s) => s.room);
  const playerIndex = useGameStore((s) => s.playerIndex);
  const connected = useGameStore((s) => s.connected);
  const [rolling, setRolling] = useState(false);
  const [selectableTokens, setSelectableTokens] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const isMyTurn = room?.gameState?.currentPlayerIndex === playerIndex;
  const turnPhase = room?.gameState?.turnPhase || 'roll';
  const diceValue = room?.gameState?.diceValue;
  const players = room?.gameState?.players || [];
  const gamePhase = room?.phase || 'lobby';
  const winner = room?.gameState?.winner;
  const isHost = playerIndex === 0;
  const turnStartTime = room?.gameState?.turnStartTime;

  const turnNumber = room?.gameState?.turnNumber;

  // Valid moves
  useEffect(() => {
    if (!isMyTurn || turnPhase !== 'move' || !diceValue || !players[playerIndex]) {
      setSelectableTokens(null);
      return;
    }

    const myTokens = players[playerIndex].tokens;
    const validTokens = [];
    const dice = diceValue;

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
      if (tokenIsFinished(pos, playerIndex)) return;
      const selfOccupied = getSelfOccupied(tIdx);

      if (tokenIsHome(pos) && dice === 6) {
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
          const newPos = (pos + dice) % 60;
          if (!selfOccupied.has(newPos)) {
            validTokens.push({ playerIdx: playerIndex, tokenIdx: tIdx });
          }
        } else if (dice === distanceToEntry) {
          const hsPos = 100 + playerIndex * 10;
          if (!selfOccupied.has(hsPos)) {
            validTokens.push({ playerIdx: playerIndex, tokenIdx: tIdx });
          }
        } else {
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
          const newHsPos = 100 + playerIndex * 10 + hsIndex + dice;
          if (!selfOccupied.has(newHsPos)) {
            validTokens.push({ playerIdx: playerIndex, tokenIdx: tIdx });
          }
        } else if (dice === remaining) {
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
    if (socket.rollDice) socket.rollDice();
    setTimeout(() => setRolling(false), 700);
  }, [isMyTurn, turnPhase, socket]);

  const handleTokenClick = useCallback((pIdx, tIdx) => {
    if (!isMyTurn || turnPhase !== 'move' || pIdx !== playerIndex) return;
    if (socket.moveToken) socket.moveToken(tIdx);
    setSelectableTokens(null);
  }, [isMyTurn, turnPhase, playerIndex, socket]);

  const handleStartGame = useCallback(() => {
    if (socket.startGame) socket.startGame();
  }, [socket]);

  const handleCopyRoomId = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const winnerPlayer = winner !== null && winner !== undefined ? players[winner] : null;
  const currentPlayer = players[room?.gameState?.currentPlayerIndex];

  // Lobby state
  if (gamePhase === 'lobby') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col relative z-10 p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLeave}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60"
          >
            ←
          </motion.button>
          <div className="text-center">
            <h1 className="text-xl font-display gradient-text">Ludo Royale</h1>
          </div>
          <div className="w-10" />
        </div>

        {/* Room Code */}
        <div className="glass rounded-2xl p-5 text-center mb-6">
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Room Code</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyRoomId}
            className="text-4xl font-display text-yellow-400 tracking-[0.15em] mb-2
              px-6 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20
              hover:bg-yellow-500/10 transition-all"
          >
            {room?.id || '------'}
          </motion.button>
          <p className="text-xs text-white/30">Tap to copy</p>
        </div>

        {/* Players list */}
        <div className="glass rounded-2xl p-5 flex-1 mb-6">
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">
            Players ({players.length}/{room?.maxPlayers || 4})
          </p>
          <div className="space-y-2.5">
            {players.map((p, i) => {
              const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
              const emojis = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: `${colors[i]}22`, border: `1px solid ${colors[i]}44` }}>
                      {emojis[i]}
                    </div>
                    <p className="text-sm font-bold text-white">{p.name}</p>
                  </div>
                  {p.connected !== false && (
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(46,204,113,0.6)]" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Start & Share */}
        <div className="space-y-3">
          <button
            onClick={handleCopyRoomId}
            className="w-full py-4 rounded-2xl font-bold text-white font-body glass border border-white/10
              hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            📋 Share Invite
          </button>
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={players.length < 2}
              className={`w-full py-4 rounded-2xl font-bold text-white font-body text-lg transition-all
                ${players.length >= 2
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_8px_30px_rgba(241,196,15,0.35)] hover:shadow-[0_12px_40px_rgba(241,196,15,0.5)]'
                  : 'bg-white/5 text-white/40 cursor-not-allowed'}`}
            >
              🎮 {players.length >= 2 ? 'Start Game' : `Need ${2 - players.length} more...`}
            </button>
          ) : (
            <div className="text-center py-4 text-sm text-yellow-400/60 font-semibold glass rounded-2xl">
              Waiting for host to start...
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Result Modal
  if (gamePhase === 'finished' && winnerPlayer) {
    return (
      <div className="min-h-screen relative z-10">
        {/* Board visible behind - dimmed */}
        <div style={{ opacity: 0.3, pointerEvents: 'none' }} className="scale-90">
          {renderGameBoard()}
        </div>
        <ResultModal
          onPlayAgain={onLeave}
          onHome={onLeave}
          resultData={{ winner: true, turns: room?.gameState?.turnNumber || 0 }}
        />
      </div>
    );
  }

  // Game Board Content
  const renderGameBoard = () => {
    return (
      <div className="min-h-screen flex flex-col relative z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLeave}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm text-white/50"
          >
            ✕
          </motion.button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30 font-semibold">Match:</span>
            <span
              onClick={handleCopyRoomId}
              className="text-sm font-display text-yellow-400/70 tracking-wider cursor-pointer"
            >
              #{room?.id?.slice(0, 4)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_6px_rgba(46,204,113,0.6)]' : 'bg-red-500'}`} />
            <EmojiReactionPicker sendReaction={socket.sendReaction} />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowChat(!showChat)}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm"
            >
              💬
            </motion.button>
          </div>
        </div>

        {/* Player Cards — positioned cards for 2-4 players, compact strip for 5-6 */}
        {players.length <= 4 ? (
          players.map((p, i) => (
            <PlayerCard
              key={i}
              player={p}
              playerIndex={i}
              currentPlayerIndex={room?.gameState?.currentPlayerIndex}
              totalPlayers={players.length}
            />
          ))
        ) : (
          <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto">
            {players.map((p, i) => {
              const isCurrent = i === room?.gameState?.currentPlayerIndex;
              const color = p.color;
              const finishedCount = p.tokens.filter(t => tokenIsFinished(t, i)).length;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-300
                    ${isCurrent ? 'border' : 'border border-white/5 opacity-70'}`}
                  style={{
                    background: isCurrent ? `${color}18` : 'rgba(255,255,255,0.03)',
                    borderColor: isCurrent ? `${color}44` : undefined,
                  }}
                >
                  <span className="text-xs">{p.emoji}</span>
                  <span className="text-[10px] font-bold text-white truncate max-w-[40px]">{p.name}</span>
                  <span className="text-[9px] text-white/40">🏆{finishedCount}/4</span>
                  {p.connected === false && <span className="text-[9px]">❌</span>}
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Board */}
        <div className="flex-1 flex flex-col items-center justify-center px-3 py-2">
          <div className="w-full max-w-[500px] glass rounded-2xl p-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
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

          {/* Timer bar */}
          <MatchTimer
            turnStartTime={turnStartTime}
            turnNumber={turnNumber}
            gamePhase={gamePhase}
          />

          {/* Dice & Controls */}
          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
            <Dice
              value={diceValue}
              rolling={rolling}
              canRoll={gamePhase === 'playing'}
              playerColor={players[playerIndex]?.color}
              onRoll={handleRollDice}
              isMyTurn={isMyTurn}
              turnPhase={turnPhase}
            />

            {isMyTurn && turnPhase === 'move' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-bold"
              >
                {selectableTokens && selectableTokens.length > 0
                  ? `Tap a highlighted token to move`
                  : 'No valid moves'}
              </motion.div>
            )}

            {isMyTurn && diceValue === 6 && turnPhase === 'move' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 font-display text-sm"
              >
                🎉 Extra Turn!
              </motion.div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <GameChat
          show={showChat}
          onClose={() => setShowChat(false)}
          onSendMessage={(msg) => socket.sendMessage?.(msg)}
        />

        {/* Turn status bar at bottom */}
        {gamePhase === 'playing' && currentPlayer && (
          <div className="safe-bottom px-4 pb-3">
            <div
              className="glass rounded-2xl py-3 px-5 text-center"
              style={{ borderColor: `${currentPlayer.color}33`, borderWidth: 1 }}
            >
              <p className="text-sm font-bold" style={{ color: currentPlayer.color }}>
                {currentPlayer.emoji} {isMyTurn ? 'Your Turn' : `${currentPlayer.name}'s Turn`}
                {diceValue !== null && ` • Rolled ${diceValue}`}
              </p>
            </div>
          </div>
        )}

        {/* Floating reactions overlay */}
        <FloatingReactions />

        {/* Not connected banner */}
        {!connected && (
          <div className="fixed top-0 left-0 right-0 z-50 py-2.5 px-4 bg-red-500/20 border-b border-red-500/30 text-red-400 text-sm font-bold text-center">
            🔴 Disconnected. Reconnecting...
          </div>
        )}
      </div>
    );
  }

  return renderGameBoard();
}
