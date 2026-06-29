import { motion } from 'framer-motion';
import { TOKENS_PER_PLAYER, tokenIsFinished } from '../constants.js';

export default function PlayerCard({ player, playerIndex, currentPlayerIndex, totalPlayers }) {
  // For 5-6 players, the GameRoom renders a compact horizontal strip instead
  if (totalPlayers >= 5) {
    return null;
  }

  const POSITIONS = [
    { top: 60, left: 8 },
    { top: 60, right: 8 },
    { bottom: 90, left: 8 },
    { bottom: 90, right: 8 },
  ];

  const pos = POSITIONS[playerIndex];
  if (!pos) return null;

  const color = player.color;
  const isCurrent = playerIndex === currentPlayerIndex;
  const finishedCount = player.tokens.filter(t => tokenIsFinished(t, playerIndex)).length;

  return (
    <div className="absolute pointer-events-auto" style={pos}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: playerIndex * 0.1 }}
        className={`glass rounded-2xl p-3 min-w-[120px] transition-all duration-300
          ${isCurrent ? 'shadow-[0_0_20px_rgba(255,255,255,0.1)]' : ''}`}
        style={{
          borderColor: isCurrent ? `${color}66` : 'rgba(255,255,255,0.06)',
          borderWidth: 1,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{
              background: `${color}22`,
              border: `1px solid ${color}44`,
            }}
          >
            {player.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate max-w-[80px]">{player.name}</p>
            <p className="text-[10px] text-white/40">🏆 {finishedCount}/{TOKENS_PER_PLAYER}</p>
          </div>
        </div>
        {/* Progress mini bar */}
        <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(finishedCount / TOKENS_PER_PLAYER) * 100}%`,
              background: `linear-gradient(90deg, ${color}66, ${color})`,
            }}
          />
        </div>
        {isCurrent && (
          <div className="mt-1.5 text-center">
            <span className="text-[9px] font-bold tracking-wider" style={{ color }}>● YOUR TURN</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
