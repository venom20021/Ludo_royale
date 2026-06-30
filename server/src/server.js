import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import GameManager from './GameManager.js';
import { initializeRuflo, shutdownRuflo } from './BotAI.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors({ origin: IS_PRODUCTION ? '*' : CLIENT_URL }));
app.use(express.json());

// Serve built client files in production
if (IS_PRODUCTION) {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: IS_PRODUCTION ? true : CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const gameManager = new GameManager();

// ─── Event Emitters ────────────────────────────────────────────────

function emitGameStateUpdate(roomId, action) {
  const room = gameManager.getRoom(roomId);
  if (!room) return;
  io.to(roomId).emit('game_state_update', {
    room: sanitizeRoom(room),
    action: action || 'update',
    currentPlayerIndex: room.gameState.currentPlayerIndex,
  });
}

function emitGameOver(roomId) {
  const room = gameManager.getRoom(roomId);
  if (!room) return;
  io.to(roomId).emit('game_over', {
    room: sanitizeRoom(room),
    winner: room.gameState.winner,
  });
}

// After a game state update, check if the turn should pass to a bot
function handlePostTurn(roomId) {
  const room = gameManager.getRoom(roomId);
  if (!room || room.phase !== 'playing') return;

  const currentIdx = room.gameState.currentPlayerIndex;
  const player = room.gameState.players[currentIdx];

  if (player && player.isBot) {
    // It's a bot's turn — schedule it (don't start human turn timer)
    gameManager.scheduleBotTurn(roomId);
  } else {
    // It's a human's turn — start turn timer
    gameManager.startTurnTimer(roomId);
  }
}

// Wire up turn timeout callback
gameManager.onTurnTimeout = (roomId) => {
  emitGameStateUpdate(roomId, 'auto_skip');

  const room = gameManager.getRoom(roomId);
  if (room) {
    if (room.phase === 'playing') {
      handlePostTurn(roomId);
    } else if (room.phase === 'finished') {
      gameManager.clearTurnTimer(roomId);
      emitGameOver(roomId);
    }
  }
};

// Wire up bot action callback
gameManager.onBotAction = (roomId, actionType) => {
  const room = gameManager.getRoom(roomId);
  if (!room) return;

  // Emit the game state update so clients see the bot's action
  emitGameStateUpdate(roomId, actionType);

  if (room.phase === 'finished') {
    gameManager.clearBotTimer(roomId);
    gameManager.clearTurnTimer(roomId);
    emitGameOver(roomId);
  } else if (room.phase === 'playing') {
    // After bot action, handle next turn
    handlePostTurn(roomId);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: gameManager.getRoomList().length });
});

// Get public room list
app.get('/api/rooms', (req, res) => {
  res.json(gameManager.getRoomList());
});

// Serve the SPA for all non-API, non-WebSocket routes (production)
if (IS_PRODUCTION) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/socket.io') || req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'));
  });
}

// --- Socket.IO Events ---

io.on('connection', (socket) => {
  console.log(`🔗 Client connected: ${socket.id}`);

  // --- Create Room ---
  socket.on('create_room', ({ playerName, maxPlayers, gameMode } = {}) => {
    try {
      const roomId = gameManager.createRoom(socket.id, playerName, maxPlayers || 6, gameMode || 'classic');
      const result = gameManager.joinRoom(roomId, socket.id, playerName || 'Host');

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      socket.join(roomId);
      const room = gameManager.getRoom(roomId);

      socket.emit('room_joined', {
        roomId,
        playerIndex: result.playerIndex,
        room: sanitizeRoom(room),
      });

      // If game was already started, start turn timer
      if (room.phase === 'playing') {
        gameManager.startTurnTimer(roomId);
      }

      console.log(`🏠 Room created: ${roomId} by ${playerName || 'Host'}`);
    } catch (err) {
      console.error('Error creating room:', err);
      socket.emit('error', { message: 'Failed to create room.' });
    }
  });

  // --- Join Room ---
  socket.on('join_room', ({ roomId, playerName } = {}) => {
    try {
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required.' });
        return;
      }

      const result = gameManager.joinRoom(roomId.toUpperCase(), socket.id, playerName);

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      socket.join(roomId.toUpperCase());
      const room = gameManager.getRoom(roomId.toUpperCase());

      // Notify the joining player
      socket.emit('room_joined', {
        roomId: roomId.toUpperCase(),
        playerIndex: result.playerIndex,
        room: sanitizeRoom(room),
      });

      // Broadcast updated players to the whole room
      io.to(roomId.toUpperCase()).emit('room_update', {
        room: sanitizeRoom(room),
      });

      console.log(`👋 ${playerName || 'Player'} joined room ${roomId.toUpperCase()}`);
    } catch (err) {
      console.error('Error joining room:', err);
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  // --- Set Game Mode ---
  socket.on('set_game_mode', ({ gameMode } = {}) => {
    try {
      const roomId = gameManager.getPlayerRoom(socket.id);
      if (!roomId) {
        socket.emit('error', { message: 'You are not in a room.' });
        return;
      }

      const result = gameManager.setGameMode(roomId, socket.id, gameMode);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      const room = gameManager.getRoom(roomId);
      io.to(roomId).emit('room_update', { room: sanitizeRoom(room) });
      console.log(`🎮 Game mode changed to ${gameMode} in room ${roomId}`);
    } catch (err) {
      console.error('Error setting game mode:', err);
      socket.emit('error', { message: 'Failed to set game mode.' });
    }
  });

  // --- Leave Room ---
  socket.on('leave_room', () => {
    try {
      const roomId = gameManager.getPlayerRoom(socket.id);
      if (!roomId) {
        socket.emit('error', { message: 'You are not in a room.' });
        return;
      }

      const room = gameManager.leaveRoom(socket.id);
      socket.leave(roomId);

      if (room) {
        const sanitized = sanitizeRoom(room);
        io.to(roomId).emit('room_update', { room: sanitized });
        gameManager.clearTurnTimer(roomId);

        // Check if game should end
        if (room.phase === 'playing') {
          const connectedPlayers = room.gameState.players.filter(p => p.connected);
          if (connectedPlayers.length < 2) {
            room.phase = 'finished';
            room.gameState.phase = 'finished';
            io.to(room.id).emit('game_over', {
              room: sanitized,
              reason: 'Not enough players.',
            });
          }
        }
      }

      console.log(`🚪 ${socket.id} left room ${roomId}`);
    } catch (err) {
      console.error('Error leaving room:', err);
      socket.emit('error', { message: 'Failed to leave room.' });
    }
  });

  // --- Start Game ---
  socket.on('start_game', () => {
    try {
      const roomId = gameManager.getPlayerRoom(socket.id);
      if (!roomId) {
        socket.emit('error', { message: 'You are not in a room.' });
        return;
      }

      const result = gameManager.startGame(roomId, socket.id);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      const room = gameManager.getRoom(roomId);
      io.to(roomId).emit('game_started', {
        room: sanitizeRoom(room),
      });

      // Check if first player is a bot and schedule accordingly
      handlePostTurn(roomId);

      console.log(`🎮 Game started in room ${roomId}`);
    } catch (err) {
      console.error('Error starting game:', err);
      socket.emit('error', { message: 'Failed to start game.' });
    }
  });

  // --- Roll Dice ---
  socket.on('roll_dice', () => {
    try {
      const roomId = gameManager.getPlayerRoom(socket.id);
      if (!roomId) {
        socket.emit('error', { message: 'You are not in a room.' });
        return;
      }

      const result = gameManager.handleRollDice(roomId, socket.id);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      const room = gameManager.getRoom(roomId);
      io.to(roomId).emit('game_state_update', {
        room: sanitizeRoom(room),
        action: 'roll',
        currentPlayerIndex: room.gameState.currentPlayerIndex,
      });

      // Handle turn transition (bot or human)
      gameManager.clearTurnTimer(roomId);
      if (room.phase === 'playing') {
        handlePostTurn(roomId);
      }
    } catch (err) {
      console.error('Error rolling dice:', err);
      socket.emit('error', { message: 'Failed to roll dice.' });
    }
  });

  // --- Move Token ---
  socket.on('move_token', ({ tokenIdx } = {}) => {
    try {
      if (tokenIdx === undefined || tokenIdx === null) {
        socket.emit('error', { message: 'Token index is required.' });
        return;
      }

      const roomId = gameManager.getPlayerRoom(socket.id);
      if (!roomId) {
        socket.emit('error', { message: 'You are not in a room.' });
        return;
      }

      const result = gameManager.handleMoveToken(roomId, socket.id, tokenIdx);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      const room = gameManager.getRoom(roomId);
      io.to(roomId).emit('game_state_update', {
        room: sanitizeRoom(room),
        action: 'move',
        currentPlayerIndex: room.gameState.currentPlayerIndex,
        moveResult: {
          playerIdx: room.gameState.players.findIndex(p => p.socketId === socket.id),
          tokenIdx,
        },
      });

      // Handle turn transition (bot or human)
      gameManager.clearTurnTimer(roomId);
      if (room.phase === 'playing') {
        handlePostTurn(roomId);
      }

      // If game finished, emit game_over
      if (room.phase === 'finished') {
        gameManager.clearTurnTimer(roomId);
        gameManager.clearBotTimer(roomId);
        emitGameOver(roomId);
      }
    } catch (err) {
      console.error('Error moving token:', err);
      socket.emit('error', { message: 'Failed to move token.' });
    }
  });

  // --- Get Room Info ---
  socket.on('get_room_info', ({ roomId } = {}) => {
    try {
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required.' });
        return;
      }
      const room = gameManager.getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found.' });
        return;
      }
      socket.emit('room_update', { room: sanitizeRoom(room) });
    } catch (err) {
      console.error('Error getting room info:', err);
      socket.emit('error', { message: 'Failed to get room info.' });
    }
  });

  // --- Send Chat Message ---
  socket.on('chat_message', ({ roomId, message } = {}) => {
    try {
      if (!message || message.trim().length === 0) return;

      // Allow roomId from event payload or lookup from socket
      const chatRoomId = roomId || gameManager.getPlayerRoom(socket.id);
      if (!chatRoomId) return;

      const mapping = gameManager.socketToPlayer.get(socket.id);
      if (!mapping) return;

      const room = gameManager.getRoom(chatRoomId);
      if (!room) return;

      const player = room.gameState.players[mapping.playerIndex];
      if (!player) return;

      io.to(chatRoomId).emit('chat_message', {
        playerName: player.name,
        playerColor: player.color,
        playerEmoji: player.emoji,
        message: message.trim(),
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  // --- Send Reaction ---
  socket.on('send_reaction', ({ roomId, emoji } = {}) => {
    try {
      if (!emoji || !roomId) return;

      const mapping = gameManager.socketToPlayer.get(socket.id);
      if (!mapping) return;

      const room = gameManager.getRoom(roomId);
      if (!room) return;

      const player = room.gameState.players[mapping.playerIndex];
      if (!player) return;

      // Broadcast reaction to all players in the room (including sender)
      io.to(roomId).emit('player_reaction', {
        playerName: player.name,
        playerColor: player.color,
        playerEmoji: player.emoji,
        playerIndex: mapping.playerIndex,
        emoji,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Error sending reaction:', err);
    }
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    try {
      console.log(`❌ Client disconnected: ${socket.id}`);
      const room = gameManager.handleDisconnect(socket.id);

      if (room) {
        const sanitized = sanitizeRoom(room);
        io.to(room.id).emit('room_update', { room: sanitized });
        io.to(room.id).emit('player_disconnected', {
          socketId: socket.id,
          message: 'A player has disconnected.',
        });

        // Clear turn timer
        gameManager.clearTurnTimer(room.id);

        // Check if game should end
        if (room.phase === 'playing') {
          const connectedPlayers = room.gameState.players.filter(p => p.connected);
          if (connectedPlayers.length < 2) {
            room.phase = 'finished';
            room.gameState.phase = 'finished';
            io.to(room.id).emit('game_over', {
              room: sanitized,
              reason: 'Not enough players.',
            });
          }
        }
      }
    } catch (err) {
      console.error('Error handling disconnect:', err);
    }
  });

  // --- Rejoin Room (on reconnection) ---
  socket.on('rejoin_room', ({ roomId, playerId } = {}) => {
    try {
      if (!roomId || !playerId) return;

      const room = gameManager.getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found.' });
        return;
      }

      const player = room.gameState.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit('error', { message: 'Player not found.' });
        return;
      }

      // Update socket mapping
      player.socketId = socket.id;
      player.connected = true;
      gameManager.socketToRoom.set(socket.id, roomId);
      gameManager.socketToPlayer.set(socket.id, { roomId, playerIndex: room.gameState.players.indexOf(player) });

      socket.join(roomId);

      socket.emit('room_joined', {
        roomId,
        playerIndex: room.gameState.players.indexOf(player),
        room: sanitizeRoom(room),
      });

      io.to(roomId).emit('room_update', { room: sanitizeRoom(room) });
    } catch (err) {
      console.error('Error rejoining room:', err);
    }
  });
});

function sanitizeRoom(room) {
  if (!room) return null;
  return {
    id: room.id,
    phase: room.phase,
    maxPlayers: room.maxPlayers,
    gameMode: room.gameMode,
    gameState: {
      players: room.gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        colorIndex: p.colorIndex,
        color: p.color,
        emoji: p.emoji,
        tokens: [...p.tokens],
        finished: p.finished,
        finishOrder: p.finishOrder,
        connected: p.connected,
        isBot: p.isBot || false,
      })),
      currentPlayerIndex: room.gameState.currentPlayerIndex,
      diceValue: room.gameState.diceValue,
      phase: room.gameState.phase,
      winner: room.gameState.winner,
      consecutiveSixes: room.gameState.consecutiveSixes,
      turnPhase: room.gameState.turnPhase,
      turnNumber: room.gameState.turnNumber,
      turnStartTime: room.gameState.turnStartTime,
      log: room.gameState.log.slice(-50), // Keep last 50 log entries
    },
    createdAt: room.createdAt,
  };
}

// Initialize ruflo agent infrastructure, then start the server
async function startServer() {
  // Initialize ruflo agent system (non-blocking - falls back gracefully)
  await initializeRuflo();

  httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║     🎲 Ludo Royale Server 🎲        ║
║──────────────────────────────────────║
║  Port: ${PORT}                        ║
║  WebSocket: socket.io                ║
║  Players: 6 per game                 ║
║  AI Bots: ruflo agents               ║
╚══════════════════════════════════════╝
  `);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  await shutdownRuflo();
  httpServer.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down...');
  await shutdownRuflo();
  httpServer.close();
  process.exit(0);
});

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
