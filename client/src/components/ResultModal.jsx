import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Button from './ui/Button.jsx';
import useGameStore from '../stores/gameStore.js';

export default function ResultModal({ onPlayAgain, onHome }) {
  const { resultData, username } = useGameStore();
  const isWinner = resultData?.winner;

  // Generate stable confetti positions
  const confettiItems = useMemo(() => {
    if (!isWinner) return [];
    const emojis = ['🎉', '✨', '🌟', '🎊', '💫', '⭐', '💥', '🏆'];
    return Array.from({ length: 12 }, (_, i) => ({
      emoji: emojis[i % emojis.length],
      x: Math.random() * 320,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
    }));
  }, [isWinner]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-sm"
      >
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-surface to-surface-light p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          {/* Top accent */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isWinner ? 'from-yellow-400 to-orange-500' : 'from-gray-500 to-gray-600'}`} />

          {/* Winner Confetti */}
          {isWinner && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {confettiItems.map((item, i) => (
                <motion.span
                  key={i}
                  className="absolute text-2xl"
                  initial={{ y: -20, x: item.x, opacity: 1 }}
                  animate={{ y: 400, opacity: 0, rotate: 720 }}
                  transition={{ duration: item.duration, delay: item.delay, repeat: Infinity }}
                >
                  {item.emoji}
                </motion.span>
              ))}
            </div>
          )}

          {/* Icon */}
          <motion.div
            animate={isWinner ? { y: [0, -10, 0], rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-7xl mb-4"
          >
            {isWinner ? '🏆' : '💔'}
          </motion.div>

          <h2 className={`text-3xl font-display mb-2 ${isWinner ? 'text-yellow-400' : 'text-white/60'}`}>
            {isWinner ? 'Victory!' : 'Defeat'}
          </h2>

          <p className="text-sm text-white/40 mb-6">
            {isWinner
              ? `All tokens home! ${username || 'Player'} takes the crown! 👑`
              : `Better luck next time, ${username || 'Player'}!`}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-xs text-white/30 font-semibold">Turns</p>
              <p className="text-xl font-display text-white">{resultData?.turns || 42}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-xs text-white/30 font-semibold">Elo</p>
              <p className={`text-xl font-display ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {isWinner ? '+25' : '-15'}
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-xs text-white/30 font-semibold">Reward</p>
              <p className="text-xl font-display text-yellow-400">🪙 {isWinner ? '500' : '100'}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <Button variant="primary" fullWidth size="lg" icon="🔄" onClick={onPlayAgain}>
              Play Again
            </Button>
            <Button variant="ghost" fullWidth size="md" icon="🏠" onClick={onHome}>
              Home
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
