import { motion } from 'framer-motion';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import useGameStore from '../stores/gameStore.js';

const stats = [
  { label: 'Total Games', value: 'totalGames', icon: '🎮' },
  { label: 'Wins', value: 'wins', icon: '🏆' },
  { label: 'Win Rate', value: 'winRate', icon: '📊' },
  { label: 'Elo', value: 'elo', icon: '⭐' },
];

export default function Profile({ onBack }) {
  const { username, coins, gems, elo, totalGames, wins, losses, rank } = useGameStore();
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const statValues = { totalGames, wins, winRate, elo };

  const ranks = [
    { name: 'Bronze', color: 'from-amber-700 to-amber-500', emoji: '🥉', minElo: 0 },
    { name: 'Silver', color: 'from-gray-400 to-gray-300', emoji: '🥈', minElo: 1400 },
    { name: 'Gold', color: 'from-yellow-500 to-yellow-400', emoji: '🥇', minElo: 1600 },
    { name: 'Platinum', color: 'from-cyan-500 to-blue-500', emoji: '💎', minElo: 1800 },
    { name: 'Diamond', color: 'from-purple-500 to-pink-500', emoji: '🔮', minElo: 2000 },
    { name: 'Legend', color: 'from-red-500 to-orange-500', emoji: '👑', minElo: 2200 },
  ];

  const currentRank = ranks.filter(r => elo >= r.minElo).pop() || ranks[0];

  // Mock match history
  const matches = [
    { id: 1, won: true, players: 4, date: '2h ago', eloChange: '+25' },
    { id: 2, won: false, players: 6, date: '5h ago', eloChange: '-15' },
    { id: 3, won: true, players: 4, date: '1d ago', eloChange: '+25' },
    { id: 4, won: true, players: 5, date: '2d ago', eloChange: '+25' },
    { id: 5, won: false, players: 4, date: '3d ago', eloChange: '-15' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col relative z-10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-5">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60"
        >
          ←
        </motion.button>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col items-center px-5 pb-6">
        <div className="relative mb-4">
          <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${currentRank.color} p-0.5 shadow-[0_0_30px_rgba(241,196,15,0.2)]`}>
            <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-4xl">
              🎲
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-surface border-2 border-brand-dark flex items-center justify-center text-sm shadow-lg">
            {currentRank.emoji}
          </div>
        </div>
        <h2 className="text-2xl font-display text-white mb-1">{username || 'Player'}</h2>
        <Badge color="yellow" size="md">
          {currentRank.emoji} {currentRank.name} • {elo} Elo
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 px-5 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-3 text-center">
            <div className="text-lg mb-1">{stat.icon}</div>
            <div className="text-white font-bold text-lg font-display">{statValues[stat.value]}</div>
            <div className="text-[10px] text-white/40 font-semibold">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Coins & Gems */}
      <div className="flex gap-3 px-5 mb-6">
        <div className="flex-1 glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-xl">🪙</div>
          <div>
            <p className="text-xs text-white/40 font-semibold">Coins</p>
            <p className="text-white font-bold text-lg font-display">{coins.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex-1 glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-xl">💎</div>
          <div>
            <p className="text-xs text-white/40 font-semibold">Gems</p>
            <p className="text-white font-bold text-lg font-display">{gems}</p>
          </div>
        </div>
      </div>

      {/* Match History */}
      <div className="flex-1 px-5 pb-24">
        <h3 className="text-sm text-white/40 font-bold uppercase tracking-wider mb-3">Match History</h3>
        <div className="space-y-2">
          {matches.map((match) => (
            <div key={match.id} className="glass rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{match.won ? '🏆' : '💔'}</span>
                <div>
                  <p className="text-sm font-bold text-white">
                    {match.won ? 'Victory' : 'Defeat'}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {match.players} players • {match.date}
                  </p>
                </div>
              </div>
              <span className={`font-bold text-sm ${match.won ? 'text-green-400' : 'text-red-400'}`}>
                {match.eloChange}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
