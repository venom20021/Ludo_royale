import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../stores/gameStore.js';

export default function GameChat({ show, onClose, onSendMessage }) {
  const chatMessages = useGameStore((s) => s.chatMessages);

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (input?.value.trim()) {
      onSendMessage(input.value.trim());
      input.value = '';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 bottom-0 w-72 z-30 glass-strong border-l border-white/10 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <span className="text-sm font-bold text-white">💬 Chat</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 text-sm hover:bg-white/10 transition-all"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-white/20 text-center py-8">No messages yet</p>
            ) : (
              chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="glass rounded-xl p-2.5"
                >
                  <p className="text-xs font-bold" style={{ color: msg.playerColor || '#ccc' }}>
                    {msg.playerEmoji} {msg.playerName}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">{msg.message}</p>
                </motion.div>
              ))
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-white/5">
            <input
              name="chatInput"
              placeholder="Type..."
              maxLength={200}
              className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none font-body focus:border-yellow-500/30 focus:bg-white/10 transition-all"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-yellow-500/15 text-yellow-400 font-bold hover:bg-yellow-500/25 transition-all"
            >
              ➤
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
