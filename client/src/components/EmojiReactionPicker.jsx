import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../stores/gameStore.js';

const EMOJIS = ['😄', '🎉', '😢', '👍', '👎', '🔥', '😱', '💀', '🙌', '❤️'];

export default function EmojiReactionPicker({ sendReaction }) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleEmojiClick = (emoji) => {
    sendReaction(emoji);
    setIsOpen(false);
  };

  return (
    <div ref={pickerRef} className="relative">
      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg hover:bg-white/10 transition-all"
      >
        😊
      </motion.button>

      {/* Picker popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-full right-0 mb-2 z-40"
          >
            <div className="glass-strong rounded-2xl p-3 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] min-w-[200px]">
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2 px-1">
                Send Reaction
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEmojiClick(emoji)}
                    className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-lg transition-all"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Floating reaction display component
export function FloatingReactions() {
  const reactions = useGameStore((state) => state.reactions);
  const players = useGameStore((state) => state.room?.gameState?.players || []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((reaction) => {
          const player = players[reaction.playerIndex];
          const color = player?.color || '#fff';
          return (
            <motion.div
              key={reaction.timestamp}
              initial={{
                opacity: 1,
                y: 0,
                x: Math.random() * 200 - 100 + window.innerWidth / 2 - 100,
                scale: 0.5,
              }}
              animate={{
                opacity: 0,
                y: -200,
                scale: 1.2,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute bottom-1/3 left-1/2"
              style={{ marginLeft: -30 }}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {reaction.emoji}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${color}33`, color, border: `1px solid ${color}44` }}
                >
                  {reaction.playerName}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
