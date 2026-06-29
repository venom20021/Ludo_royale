import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import useGameStore from '../stores/gameStore.js';
import { PLAYER_COLORS, PLAYER_EMOJIS } from '../constants.js';

export default function InviteRoom({ onBack, onStartGame, onSetGameMode }) {
  const { room, playerIndex } = useGameStore();
  const players = room?.gameState?.players || [];
  const isHost = playerIndex === 0;
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleCopyCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
    }
  };

  const handleLeave = () => {
    setShowLeaveConfirm(true);
  };

  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    onBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col p-5 relative z-10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60"
        >
          ←
        </motion.button>
        <div>
          <h1 className="text-xl font-display text-white">Game Room</h1>
          <p className="text-xs text-white/40 font-semibold">{players.length}/{room?.maxPlayers || 4} players</p>
        </div>
      </div>

      {/* Invite Code Card */}
      <Card glow glowColor={players.length >= 2 ? 'green' : 'yellow'} className="text-center mb-6">
        <p className="text-sm text-white/40 font-semibold mb-3 uppercase tracking-wider">Room Code</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopyCode}
          className="text-4xl font-display text-yellow-400 tracking-[0.15em] mb-2
            px-6 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20
            hover:bg-yellow-500/10 transition-all duration-200"
        >
          {room?.id || '------'}
        </motion.button>
        <p className="text-xs text-white/30 mt-1">Tap to copy & share with friends</p>
      </Card>

      {/* Game Mode Select */}
      <Card className="mb-6">
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-3">Game Mode</p>
        <div className="flex gap-2">
          {['Classic', 'Quick'].map((mode) => {
            const modeKey = mode.toLowerCase();
            const isSelected = (room?.gameMode || 'classic') === modeKey;
            const canChange = isHost && room?.phase === 'lobby';
            return (
              <button
                key={mode}
                disabled={!canChange}
                onClick={() => canChange && onSetGameMode?.(modeKey)}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200
                  ${isSelected
                    ? modeKey === 'quick'
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                      : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 shadow-[0_0_15px_rgba(241,196,15,0.1)]'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/60'}
                  ${!canChange ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-lg">{mode === 'Classic' ? '🎲' : '⚡'}</span>
                  <span>{mode}</span>
                  {modeKey === 'quick' && (
                    <span className="text-[9px] font-semibold opacity-60">3 tokens to win</span>
                  )}
                  {modeKey === 'classic' && (
                    <span className="text-[9px] font-semibold opacity-60">4 tokens to win</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {isHost && room?.phase === 'lobby' && (
          <p className="text-xs text-white/30 font-semibold mt-2 text-center">
            {room?.gameMode === 'quick'
              ? '⚡ Quick mode: First to get 3 tokens home wins!'
              : '🎲 Classic mode: First to get all 4 tokens home wins!'
            }
          </p>
        )}
      </Card>

      {/* Max Players - Improved visibility */}
      <Card className="mb-6">
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-3">
          👥 Max Players
        </p>
        <div className="grid grid-cols-5 gap-2.5">
          {[2, 3, 4, 5, 6].map((count) => {
            const isSelected = room?.maxPlayers === count;
            const playerIcons = ['👥', '👥', '👫', '👩‍👩‍👧‍👦', '👨‍👩‍👧‍👦'][count - 2] || '👥';
            return (
              <button
                key={count}
                onClick={() => {}}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl font-bold text-sm transition-all duration-200
                  ${isSelected
                    ? 'bg-gradient-to-b from-yellow-500/25 to-yellow-500/10 text-yellow-300 border-2 border-yellow-400/50 shadow-[0_0_20px_rgba(241,196,15,0.25)] scale-105'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70 hover:border-white/20'}`}
              >
                <span className="text-lg">{playerIcons}</span>
                <span className="text-lg font-display font-bold">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-center">
          <span className="text-xs text-white/30 font-semibold">
            {room?.maxPlayers ? `Game starts when ${room.maxPlayers} players join` : 'Select player count'}
          </span>
        </div>
      </Card>

      {/* Connected Players */}
      <Card className="flex-1 mb-6">
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-3">Players in Room</p>
        <div className="space-y-2.5">
          {players.length === 0 && (
            <p className="text-sm text-white/20 text-center py-4">Waiting for players...</p>
          )}
          {players.map((p, i) => {
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{ background: `${PLAYER_COLORS[i]}22`, border: `1px solid ${PLAYER_COLORS[i]}44` }}
                  >
                    {PLAYER_EMOJIS[i]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{p.name}</p>
                    <p className="text-[10px] text-white/30">
                      {i === 0 ? '👑 Host' : `Player ${i + 1}`}
                    </p>
                  </div>
                </div>
                {p.connected !== false && (
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(46,204,113,0.6)]" />
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          icon="📋"
          onClick={handleCopyCode}
        >
          Share Invite
        </Button>
        {isHost ? (
          <Button
            variant="success"
            fullWidth
            size="lg"
            icon="🎮"
            disabled={players.length < 2}
            onClick={onStartGame}
          >
            {players.length >= 2 ? 'Start Game' : `Need ${2 - players.length} more player${2 - players.length !== 1 ? 's' : ''}`}
          </Button>
        ) : (
          <div className="text-center py-3 text-sm text-yellow-400/60 font-semibold glass rounded-xl">
            Waiting for host to start...
          </div>
        )}

        {/* Leave Room */}
        <Button
          variant="ghost"
          fullWidth
          size="md"
          icon="🚪"
          onClick={handleLeave}
        >
          Leave Room
        </Button>
      </div>

      {/* Leave Room Confirmation Dialog */}
      {showLeaveConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full max-w-sm"
          >
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-surface to-surface-light p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
              <div className="text-5xl mb-4">🚪</div>
              <h2 className="text-xl font-display text-white mb-2">Leave Room?</h2>
              <p className="text-sm text-white/50 mb-6">
                You'll be removed from the room and return to the home screen.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white/60 border border-white/10 hover:bg-white/5 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeave}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-orange-600 shadow-[0_8px_25px_rgba(231,76,60,0.3)] hover:shadow-[0_12px_35px_rgba(231,76,60,0.45)] transition-all duration-200"
                >
                  Leave
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
