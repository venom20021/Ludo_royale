import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import useGameStore from '../stores/gameStore.js';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

const quickActions = [
  { icon: '📖', label: 'How to Play', color: 'from-blue-500 to-cyan-500' },
  { icon: '🛒', label: 'Store', color: 'from-purple-500 to-pink-500' },
  { icon: '🏆', label: 'Ranking', color: 'from-yellow-500 to-orange-500' },
  { icon: '🎯', label: 'Missions', color: 'from-green-500 to-emerald-500' },
];

const navItems = [
  { icon: '🏠', label: 'Home', active: true },
  { icon: '👤', label: 'Profile', active: false },
  { icon: '📋', label: 'History', active: false },
  { icon: '⚙️', label: 'Settings', active: false },
];

export default function Home({ onCreateRoom, onJoinRoom }) {
  const { username, coins, gems } = useGameStore();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinError, setJoinError] = useState('');
  const [showRules, setShowRules] = useState(false);

  const handleJoinSubmit = () => {
    const code = joinRoomId.trim().toUpperCase();
    if (!code) {
      setJoinError('Please enter a room code');
      return;
    }
    if (code.length < 4) {
      setJoinError('Room code is too short');
      return;
    }
    setJoinError('');
    setShowJoinModal(false);
    onJoinRoom(code, username || 'Player');
    setJoinRoomId('');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen flex flex-col relative z-10"
    >
      {/* Top Navigation */}
      <motion.div variants={itemVariants} className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <Avatar emoji="🎲" size="md" active />
          <div>
            <p className="text-white font-bold text-sm">{username || 'Player'}</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(46,204,113,0.6)]" />
              <span className="text-[11px] text-green-400/70 font-semibold">Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-sm">🪙</span>
            <span className="text-yellow-400 font-bold text-sm">{coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
            <span className="text-sm">💎</span>
            <span className="text-purple-400 font-bold text-sm">{gems}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg"
          >
            🔔
          </motion.button>
        </div>
      </motion.div>

      {/* Center Logo & CTA */}
      <motion.div variants={itemVariants} className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* 3D Ludo Logo */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative mb-4"
        >
          <div className="text-8xl filter drop-shadow-[0_20px_40px_rgba(241,196,15,0.3)]">
            🎲
          </div>
          {/* Glow behind */}
          <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full -z-10 scale-150" />
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-5xl font-display gradient-text mb-2 text-shadow-glow"
        >
          Ludo Royale
        </motion.h1>
        <motion.p variants={itemVariants} className="text-white/30 font-semibold text-sm mb-10">
          2–6 Player Multiplayer • Real-time • Low Latency
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={itemVariants} className="w-full max-w-sm space-y-3.5">
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              useGameStore.getState().setUsername(username || 'Player');
              onCreateRoom(username || 'Player', 4);
            }}
            className="w-full py-4 rounded-2xl font-bold text-white text-lg font-body tracking-wide
              bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500
              shadow-[0_8px_30px_rgba(241,196,15,0.35)]
              hover:shadow-[0_12px_40px_rgba(241,196,15,0.5)]
              transition-all duration-200
              flex items-center justify-center gap-3"
          >
            <span className="text-2xl">⚡</span>
            Quick Play
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              useGameStore.getState().setUsername(username || 'Player');
              onCreateRoom(username || 'Player', 4);
            }}
            className="w-full py-4 rounded-2xl font-bold text-white text-lg font-body tracking-wide
              bg-gradient-to-r from-blue-600 to-purple-600
              shadow-[0_8px_30px_rgba(52,152,219,0.3)]
              hover:shadow-[0_12px_40px_rgba(52,152,219,0.45)]
              transition-all duration-200
              flex items-center justify-center gap-3"
          >
            <span className="text-2xl">👥</span>
            Play With Friends
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowJoinModal(true)}
            className="w-full py-4 rounded-2xl font-bold text-white text-lg font-body tracking-wide
              bg-gradient-to-r from-green-500 to-emerald-600
              shadow-[0_8px_30px_rgba(46,204,113,0.3)]
              hover:shadow-[0_12px_40px_rgba(46,204,113,0.45)]
              transition-all duration-200
              flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🔒</span>
            Private Room
          </motion.button>
        </motion.div>

        {/* Quick Shortcuts */}
        <motion.div variants={itemVariants} className="grid grid-cols-4 gap-3 w-full max-w-sm mt-10">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.label === 'How to Play' ? () => setShowRules(true) : undefined}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl glass"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-lg shadow-lg`}>
                {action.icon}
              </div>
              <span className="text-[11px] text-white/50 font-bold">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom Navigation */}
      <motion.div variants={itemVariants} className="safe-bottom">
        <div className="flex items-center justify-around px-6 py-3 mx-4 mb-3 rounded-2xl glass-strong">
          {navItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.label === 'Profile') {
                  useGameStore.getState().setActiveScreen('profile');
                }
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200
                ${item.active ? 'text-yellow-400' : 'text-white/30 hover:text-white/60'}`}
            >
              <span className={`text-xl ${item.active ? 'drop-shadow-[0_0_8px_rgba(241,196,15,0.5)]' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* How to Play Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-surface to-surface-light p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />

                {/* Header */}
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">📖</div>
                  <h2 className="text-2xl font-display text-white">How to Play Ludo</h2>
                  <p className="text-xs text-white/40 mt-1">Classic rules for 2–6 players</p>
                </div>

                <div className="space-y-5">
                  {/* Objective */}
                  <div className="glass rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-yellow-400 mb-2">🎯 Objective</h3>
                    <p className="text-xs text-white/60 leading-relaxed">
                      Be the first player to move all 4 of your tokens from your home base (yard)
                      around the board and into the center (home). The first player to get all
                      tokens home wins!
                    </p>
                  </div>

                  {/* Starting the Game */}
                  <div className="glass rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-yellow-400 mb-2">🎲 Starting the Game</h3>
                    <ul className="space-y-2 text-xs text-white/60 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">1.</span>
                        <span>Each player chooses a color and places their 4 tokens in their home base (yard).</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">2.</span>
                        <span>Players take turns rolling a single die. The highest roller goes first, then play proceeds clockwise.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">3.</span>
                        <span>To move a token out of your yard onto the track, you must roll a <strong className="text-white">6</strong>.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Movement */}
                  <div className="glass rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-yellow-400 mb-2">🔄 Movement</h3>
                    <ul className="space-y-2 text-xs text-white/60 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>Roll the die and move one of your tokens forward by the number shown.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>Tokens move clockwise along the track. Each player enters the track at their colored start position.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>You must use the exact number rolled — if no token can move that distance, your turn is skipped.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Capturing */}
                  <div className="glass rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-yellow-400 mb-2">⚡ Capturing</h3>
                    <ul className="space-y-2 text-xs text-white/60 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>Land on an opponent's token? <strong className="text-white">Capture it!</strong> Their token is sent back to their home base.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>Capturing a token gives you an <strong className="text-white">extra turn</strong>!</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span><strong className="text-white">Safe spots</strong> (marked with ⭐) protect tokens from being captured.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>Two tokens cannot occupy the same cell — you cannot move to a spot occupied by your own token.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Six Rules */}
                  <div className="glass rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-yellow-400 mb-2">🔢 Rolling a 6</h3>
                    <ul className="space-y-2 text-xs text-white/60 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>Rolling a 6 gives you an <strong className="text-white">extra turn</strong>!</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>A 6 is required to move a token from your yard onto the start position.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>Roll <strong className="text-red-400">three consecutive 6s</strong> and your turn is forfeited — loose your turn!</span>
                      </li>
                    </ul>
                  </div>

                  {/* Home Stretch & Winning */}
                  <div className="glass rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-yellow-400 mb-2">🏁 Home Stretch & Winning</h3>
                    <ul className="space-y-2 text-xs text-white/60 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>After circling the board, tokens enter your colored <strong className="text-white">home stretch</strong> (the path leading to the center).</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>A token must reach the center with an <strong className="text-white">exact roll</strong> — overshooting is not allowed.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-400 shrink-0">•</span>
                        <span>The <strong className="text-white">first player</strong> to get all 4 tokens to the center wins the game!</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Close */}
                <button
                  onClick={() => setShowRules(false)}
                  className="w-full mt-6 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-600 shadow-[0_8px_25px_rgba(52,152,219,0.3)] hover:shadow-[0_12px_35px_rgba(52,152,219,0.45)] transition-all duration-200"
                >
                  Got it! 🎲
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Room Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-full max-w-sm"
            >
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-surface to-surface-light p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
                
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="text-xl font-display text-white mb-2">Join Private Room</h2>
                <p className="text-sm text-white/50 mb-6">
                  Enter the 6-8 character room code shared by the host
                </p>

                <div className="mb-5">
                  <input
                    value={joinRoomId}
                    onChange={e => {
                      setJoinRoomId(e.target.value.toUpperCase());
                      setJoinError('');
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') handleJoinSubmit(); }}
                    placeholder="ROOM CODE"
                    maxLength={8}
                    autoFocus
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border-2 border-white/10 text-white text-2xl font-display text-center tracking-[0.2em] outline-none
                      focus:border-green-500/50 focus:bg-white/10 transition-all duration-200 placeholder:text-white/20"
                    style={{ fontFamily: "'Fredoka One', cursive" }}
                  />
                  {joinError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400 mt-2 font-semibold"
                    >
                      ⚠️ {joinError}
                    </motion.p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinRoomId('');
                      setJoinError('');
                    }}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white/60 border border-white/10 hover:bg-white/5 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinSubmit}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-[0_8px_25px_rgba(46,204,113,0.3)] hover:shadow-[0_12px_35px_rgba(46,204,113,0.45)] transition-all duration-200"
                  >
                    Join
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
