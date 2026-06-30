import { v4 as uuidv4 } from 'uuid';
import {
  createInitialState,
  rollDice,
  rollForPlayer,
  moveToken,
  skipTurn,
  hasValidMoves,
} from './GameEngine.js';
import {
  executeBotRoll,
  executeBotMove,
  BOT_DELAY_MS,
} from './BotAI.js';

// Classic 4-color layout: Green (top-left), Yellow (top-right), Red (bottom-left), Blue (bottom-right)
const PLAYER_NAMES = ['Green', 'Yellow', 'Red', 'Blue', 'Purple', 'Orange'];
const PLAYER_COLORS = ['#2ecc71', '#f1c40f', '#e74c3c', '#3498db', '#9b59b6', '#e67e22'];
const PLAYER_EMOJIS = ['🟢', '🟡', '🔴', '🔵', '🟣', '🟠'];
const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

// Bot-specific data
const BOT_NAMES = ['🤖 Bot Alpha', '🤖 Bot Beta', '🤖 Bot Gamma', '🤖 Bot Delta', '🤖 Bot Epsilon', '🤖 Bot Omega'];
const BOT_SOCKET_PREFIX = 'bot-';

class GameManager {
  constructor() {
    this.rooms = new Map(); // roomId -> { id, players, gameState, phase }
    this.socketToRoom = new Map(); // socketId -> roomId
    this.socketToPlayer = new Map(); // socketId -> { roomId, playerIndex }
    this.turnTimers = new Map(); // roomId -> setTimeoutId
    this.botTimers = new Map(); // roomId -> setTimeoutId (for bot turn delays)
    this.onTurnTimeout = null; // callback(roomId) called when auto-action happens
    this.onBotAction = null; // callback(roomId, action) called when bot makes a move
  }

  createRoom(hostSocketId, hostName, maxPlayers = 6, gameMode = 'classic') {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    const gameState = createInitialState(gameMode);

    const room = {
      id: roomId,
      hostSocketId,
      maxPlayers,
      gameMode,
      gameState,
      phase: 'lobby', // 'lobby', 'playing', 'finished'
      createdAt: Date.now(),
      botCount: 0, // Track how many bots have been added
    };

    this.rooms.set(roomId, room);
    return roomId;
  }

  joinRoom(roomId, socketId, playerName) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found.' };
    }
    if (room.phase === 'playing') {
      return { success: false, error: 'Game already in progress.' };
    }
    if (room.phase === 'finished') {
      return { success: false, error: 'Game already finished.' };
    }
    if (room.gameState.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full.' };
    }

    const playerIndex = room.gameState.players.length;
    const player = {
      id: uuidv4(),
      socketId,
      name: playerName || `Player ${playerIndex + 1}`,
      colorIndex: playerIndex,
      color: PLAYER_COLORS[playerIndex],
      emoji: PLAYER_EMOJIS[playerIndex],
      tokens: Array(4).fill(-1), // All tokens at home
      finished: false,
      finishOrder: null,
      connected: true,
      isBot: false, // Human player
    };

    room.gameState.players.push(player);
    this.socketToRoom.set(socketId, roomId);
    this.socketToPlayer.set(socketId, { roomId, playerIndex });

    return { success: true, room, playerIndex };
  }

  // ─── Bot Management ──────────────────────────────────────────────

  fillBotSlots(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const currentCount = room.gameState.players.length;
    const targetCount = room.maxPlayers;

    for (let i = currentCount; i < targetCount; i++) {
      const playerIndex = i;
      const botId = `${BOT_SOCKET_PREFIX}${roomId}-${playerIndex}-${Date.now()}`;
      const botName = BOT_NAMES[playerIndex % BOT_NAMES.length];

      const botPlayer = {
        id: uuidv4(),
        socketId: botId,
        name: botName,
        colorIndex: playerIndex,
        color: PLAYER_COLORS[playerIndex],
        emoji: PLAYER_EMOJIS[playerIndex],
        tokens: Array(4).fill(-1),
        finished: false,
        finishOrder: null,
        connected: true,
        isBot: true,
      };

      room.gameState.players.push(botPlayer);
      room.botCount++;

      // Also register in socket mappings so the bot can be looked up
      this.socketToRoom.set(botId, roomId);
      this.socketToPlayer.set(botId, { roomId, playerIndex });
    }
  }

  isBotPlayer(roomId, playerIdx) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.gameState.players[playerIdx];
    return player && player.isBot === true;
  }

  getBotSocketId(roomId, playerIdx) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const player = room.gameState.players[playerIdx];
    if (!player || !player.isBot) return null;
    return player.socketId;
  }

  // Execute a bot's turn (roll or move)
  executeBotTurn(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'playing') return null;

    const currentIdx = room.gameState.currentPlayerIndex;
    const player = room.gameState.players[currentIdx];
    if (!player || !player.isBot) return null;

    const turnPhase = room.gameState.turnPhase;
    let actionType;

    if (turnPhase === 'roll') {
      // Bot rolls the dice
      const result = executeBotRoll(room.gameState, currentIdx);
      if (!result.success) return null;
      room.gameState = result.newState;
      actionType = 'bot_roll';
    } else if (turnPhase === 'move') {
      // Bot chooses and executes the best move
      const result = executeBotMove(room.gameState, currentIdx);
      if (!result.success) return null;
      room.gameState = result.newState;
      actionType = 'bot_move';
    } else {
      return null;
    }

    // Check for game finished
    if (room.gameState.phase === 'finished') {
      room.phase = 'finished';
      this.clearTurnTimer(roomId);
      this.clearBotTimer(roomId);
    }

    // Notify via bot action callback
    if (this.onBotAction) {
      this.onBotAction(roomId, actionType);
    }

    return { actionType };
  }

  // Schedule a bot's next action with a delay
  scheduleBotTurn(roomId) {
    this.clearBotTimer(roomId);

    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'playing') return;

    const currentIdx = room.gameState.currentPlayerIndex;
    const player = room.gameState.players[currentIdx];
    if (!player || !player.isBot) return;

    const timerId = setTimeout(() => {
      this.clearBotTimer(roomId);

      // Execute the bot turn
      const result = this.executeBotTurn(roomId);
      if (!result) return;

      // If game is still playing and the new current player is also a bot, schedule again
      const roomNow = this.rooms.get(roomId);
      if (roomNow && roomNow.phase === 'playing') {
        const newIdx = roomNow.gameState.currentPlayerIndex;
        const newPlayer = roomNow.gameState.players[newIdx];
        if (newPlayer && newPlayer.isBot) {
          this.scheduleBotTurn(roomId);
        }
      }
    }, BOT_DELAY_MS);

    this.botTimers.set(roomId, timerId);
  }

  clearBotTimer(roomId) {
    const existing = this.botTimers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      this.botTimers.delete(roomId);
    }
  }

  isBotTurnPending(roomId) {
    return this.botTimers.has(roomId);
  }

  // ─── Existing Methods ───────────────────────────────────────────

  leaveRoom(socketId) {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return null;

    const { roomId } = mapping;
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerIdx = room.gameState.players.findIndex(p => p.socketId === socketId);
    if (playerIdx !== -1) {
      room.gameState.players[playerIdx].connected = false;
    }

    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);

    // If no connected players left, remove room after a delay
    const hasConnected = room.gameState.players.some(p => p.connected && !p.isBot);
    if (!hasConnected) {
      setTimeout(() => {
        this.rooms.delete(roomId);
      }, 300000); // 5 minutes cleanup
    }

    return room;
  }

  startGame(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found.' };
    if (room.phase !== 'lobby') return { success: false, error: 'Game already started.' };
    if (room.hostSocketId !== socketId) return { success: false, error: 'Only the host can start the game.' };

    // Fill empty slots with bots before starting
    this.fillBotSlots(roomId);

    const playerCount = room.gameState.players.length;
    if (playerCount < MIN_PLAYERS) {
      return { success: false, error: `Need at least ${MIN_PLAYERS} players to start.` };
    }
    if (playerCount > room.maxPlayers) {
      return { success: false, error: `Room is full (max ${room.maxPlayers} players).` };
    }

    room.phase = 'playing';
    room.gameState.phase = 'playing';
    room.gameState.gameMode = room.gameMode;
    room.gameState.currentPlayerIndex = 0;
    room.gameState.turnNumber = 1;
    room.gameState.turnPhase = 'roll';
    room.gameState.turnStartTime = Date.now();

    // Log game start
    const botCount = room.gameState.players.filter(p => p.isBot).length;
    const humanCount = playerCount - botCount;
    const description = botCount > 0
      ? `Game started with ${humanCount} human + ${botCount} bot player(s)! First turn: ${PLAYER_NAMES[0]}`
      : `Game started with ${playerCount} players! First turn: ${PLAYER_NAMES[0]}`;

    room.gameState.log.push({
      turn: 0,
      playerIdx: -1,
      playerName: 'Game',
      emoji: '🎮',
      diceValue: null,
      description,
      timestamp: Date.now(),
    });

    return { success: true, room };
  }

  handleRollDice(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found.' };

    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return { success: false, error: 'Player not in game.' };

    const result = rollForPlayer(room.gameState, mapping.playerIndex);
    if (!result.success) return result;

    room.gameState = result.newState;
    return { success: true, room };
  }

  handleMoveToken(roomId, socketId, tokenIdx) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found.' };

    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return { success: false, error: 'Player not in game.' };

    const result = moveToken(room.gameState, mapping.playerIndex, tokenIdx);
    if (!result.success) return result;

    room.gameState = result.newState;

    // Update room phase
    if (room.gameState.phase === 'finished') {
      room.phase = 'finished';
    }

    return { success: true, room };
  }

  // --- Turn Timer ---

  startTurnTimer(roomId) {
    this.clearTurnTimer(roomId);
    
    // If the current player is a bot, don't start a turn timer
    // Bot turns are handled by scheduleBotTurn instead
    const room = this.rooms.get(roomId);
    if (room && room.phase === 'playing') {
      const currentIdx = room.gameState.currentPlayerIndex;
      const player = room.gameState.players[currentIdx];
      if (player && player.isBot) {
        return; // Bots don't need turn timers; they use bot timers
      }
    }
    
    const timerId = setTimeout(() => {
      this.handleTurnTimeout(roomId);
    }, 30000); // 30 seconds per turn
    
    this.turnTimers.set(roomId, timerId);
  }

  clearTurnTimer(roomId) {
    const existing = this.turnTimers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      this.turnTimers.delete(roomId);
    }
  }

  handleTurnTimeout(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'playing') return;

    this.clearTurnTimer(roomId);

    if (room.gameState.turnPhase === 'roll') {
      // Auto-roll the dice for the current player
      const result = rollForPlayer(room.gameState, room.gameState.currentPlayerIndex);
      if (result.success) {
        room.gameState = result.newState;
      }
    } else if (room.gameState.turnPhase === 'move') {
      // Auto-skip the turn
      const result = skipTurn(room.gameState);
      room.gameState = result;
    }

    // Update room phase
    if (room.gameState.phase === 'finished') {
      room.phase = 'finished';
      this.clearTurnTimer(roomId);
    }

    // Notify via callback
    if (this.onTurnTimeout) {
      this.onTurnTimeout(roomId);
    }
  }

  setGameMode(roomId, socketId, gameMode) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found.' };
    if (room.phase !== 'lobby') return { success: false, error: 'Cannot change mode after game starts.' };
    if (room.hostSocketId !== socketId) return { success: false, error: 'Only the host can change game mode.' };
    if (gameMode !== 'classic' && gameMode !== 'quick') return { success: false, error: 'Invalid game mode.' };

    room.gameMode = gameMode;
    return { success: true, room };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  getPlayerRoom(socketId) {
    return this.socketToRoom.get(socketId) || null;
  }

  getRoomList() {
    const rooms = [];
    for (const [id, room] of this.rooms) {
      if (room.phase === 'lobby') {
        rooms.push({
          id,
          playerCount: room.gameState.players.length,
          maxPlayers: room.maxPlayers,
          hostName: room.gameState.players[0]?.name || 'Unknown',
          createdAt: room.createdAt,
        });
      }
    }
    return rooms;
  }

  // Remove disconnected players from rooms
  handleDisconnect(socketId) {
    // Don't process bot disconnects as leaves
    if (socketId.startsWith(BOT_SOCKET_PREFIX)) {
      return null;
    }
    const room = this.leaveRoom(socketId);
    return room;
  }
}

export default GameManager;
