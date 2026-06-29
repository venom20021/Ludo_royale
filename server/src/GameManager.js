import { v4 as uuidv4 } from 'uuid';
import {
  createInitialState,
  rollDice,
  rollForPlayer,
  moveToken,
  skipTurn,
  hasValidMoves,
} from './GameEngine.js';

// Classic 4-color layout: Green (top-left), Yellow (top-right), Red (bottom-left), Blue (bottom-right)
const PLAYER_NAMES = ['Green', 'Yellow', 'Red', 'Blue', 'Purple', 'Orange'];
const PLAYER_COLORS = ['#2ecc71', '#f1c40f', '#e74c3c', '#3498db', '#9b59b6', '#e67e22'];
const PLAYER_EMOJIS = ['🟢', '🟡', '🔴', '🔵', '🟣', '🟠'];
const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

class GameManager {
  constructor() {
    this.rooms = new Map(); // roomId -> { id, players, gameState, phase }
    this.socketToRoom = new Map(); // socketId -> roomId
    this.socketToPlayer = new Map(); // socketId -> { roomId, playerIndex }
    this.turnTimers = new Map(); // roomId -> setTimeoutId
    this.onTurnTimeout = null; // callback(roomId) called when auto-action happens
  }

  createRoom(hostSocketId, hostName, maxPlayers = 6) {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    const gameState = createInitialState();

    const room = {
      id: roomId,
      hostSocketId,
      maxPlayers,
      gameState,
      phase: 'lobby', // 'lobby', 'playing', 'finished'
      createdAt: Date.now(),
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
    };

    room.gameState.players.push(player);
    this.socketToRoom.set(socketId, roomId);
    this.socketToPlayer.set(socketId, { roomId, playerIndex });

    return { success: true, room, playerIndex };
  }

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
    const hasConnected = room.gameState.players.some(p => p.connected);
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

    const playerCount = room.gameState.players.length;
    if (playerCount < MIN_PLAYERS) {
      return { success: false, error: `Need at least ${MIN_PLAYERS} players to start.` };
    }
    if (playerCount > room.maxPlayers) {
      return { success: false, error: `Room is full (max ${room.maxPlayers} players).` };
    }

    room.phase = 'playing';
    room.gameState.phase = 'playing';
    room.gameState.currentPlayerIndex = 0;
    room.gameState.turnNumber = 1;
    room.gameState.turnPhase = 'roll';
    room.gameState.turnStartTime = Date.now();

    // Log game start
    room.gameState.log.push({
      turn: 0,
      playerIdx: -1,
      playerName: 'Game',
      emoji: '🎮',
      diceValue: null,
      description: `Game started with ${playerCount} players! First turn: ${PLAYER_NAMES[0]}`,
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
    const room = this.leaveRoom(socketId);
    return room;
  }
}

export default GameManager;
