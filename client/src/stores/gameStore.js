import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  // Connection
  connected: false,
  playerIndex: null,
  playerId: null,
  roomId: null,
  error: null,

  // Room / Game state
  room: null,
  phase: 'lobby', // 'lobby' | 'playing' | 'finished'

  // UI state
  activeScreen: 'home', // 'home' | 'lobby' | 'game' | 'profile' | 'result'
  showResult: false,
  resultData: null,

  // User profile
  username: '',
  coins: 2500,
  gems: 120,
  avatarEmoji: '🎲',
  rank: 'Bronze',
  elo: 1200,
  totalGames: 0,
  wins: 0,
  losses: 0,

  // Match history
  matchHistory: [],

  // Chat
  chatMessages: [],

  // Reactions
  reactions: [],

  // Actions
  setConnected: (connected) => set({ connected }),
  setPlayerIndex: (index) => set({ playerIndex: index }),
  setPlayerId: (id) => set({ playerId: id }),
  setRoomId: (id) => set({ roomId: id }),
  setError: (error) => set({ error }),
  setRoom: (room) => set({ room, phase: room?.phase || 'lobby' }),
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  setUsername: (name) => set({ username: name }),

  setResultData: (data) => set({ showResult: true, resultData: data }),
  hideResult: () => set({ showResult: false, resultData: null }),

  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages, msg],
  })),

  addReaction: (reaction) => set((state) => ({
    reactions: [...state.reactions.slice(-15), reaction],
  })),

  removeReaction: (timestamp) => set((state) => ({
    reactions: state.reactions.filter(r => r.timestamp !== timestamp),
  })),

  updateCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
  updateGems: (amount) => set((state) => ({ gems: state.gems + amount })),

  addMatchToHistory: (match) => set((state) => ({
    matchHistory: [match, ...state.matchHistory].slice(0, 50),
  })),

  updateStats: (won) => set((state) => ({
    totalGames: state.totalGames + 1,
    wins: won ? state.wins + 1 : state.wins,
    losses: won ? state.losses : state.losses + 1,
    coins: won ? state.coins + 500 : state.coins + 100,
    elo: won ? state.elo + 25 : Math.max(0, state.elo - 15),
  })),

  reset: () => set({
    room: null,
    roomId: null,
    playerIndex: null,
    playerId: null,
    error: null,
    phase: 'lobby',
    chatMessages: [],
    showResult: false,
    resultData: null,
  }),
}));

export default useGameStore;
