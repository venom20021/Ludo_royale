import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useGameStore from '../stores/gameStore.js';

export default function useSocket() {
  const socketRef = useRef(null);
  const {
    setConnected,
    setPlayerIndex,
    setPlayerId,
    setRoomId,
    setRoom,
    setError,
    addChatMessage,
    setActiveScreen,
    reset,
    updateCoins,
    addMatchToHistory,
    username,
    roomId,
    playerIndex,
  } = useGameStore();

  // Connect
  useEffect(() => {
    const s = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = s;

    s.on('connect', () => {
      setConnected(true);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('connect_error', () => {
      setConnected(false);
    });

    // Room joined — update store data and navigate to lobby if on home screen
    s.on('room_joined', (data) => {
      setPlayerIndex(data.playerIndex);
      if (data.room?.gameState?.players?.[data.playerIndex]) {
        setPlayerId(data.room.gameState.players[data.playerIndex].id);
      }
      setRoomId(data.roomId);
      setRoom(data.room);
      // Navigate to lobby if we're still on the home screen (e.g., joined via Private Room)
      const store = useGameStore.getState();
      if (store.activeScreen === 'home') {
        store.setActiveScreen('lobby');
      }
    });

    // Room update (from server's room_update) — when another player joins/leaves
    s.on('room_update', (data) => {
      setRoom(data.room);
    });

    // Game started
    s.on('game_started', (data) => {
      setRoom(data.room);
    });

    // Game state update — unwrap nested room object
    s.on('game_state_update', (data) => {
      if (data.room) setRoom(data.room);
    });

    // Error
    s.on('error', (data) => {
      setError(data.message || 'An error occurred');
      setTimeout(() => setError(null), 3000);
    });

    // Chat
    s.on('chat_message', (data) => {
      addChatMessage(data);
    });

    // Player disconnected
    s.on('player_disconnected', (data) => {
      // room_update event carries the actual room data; this is just a notification
      if (data.room) {
        setRoom(data.room);
      }
    });

    // Player reaction
    s.on('player_reaction', (data) => {
      // Add to reaction queue in the store
      const store = useGameStore.getState();
      store.addReaction(data);
      // Auto-remove after 2.5 seconds
      setTimeout(() => {
        useGameStore.getState().removeReaction(data.timestamp);
      }, 2500);
    });

    // Game over (matches server's game_over event)
    s.on('game_over', (data) => {
      if (data.room) setRoom(data.room);
      const winnerIdx = data.winner ?? data.room?.gameState?.winner;
      const isWinner = winnerIdx === useGameStore.getState().playerIndex;
      if (isWinner) {
        updateCoins(500);
      } else {
        updateCoins(100);
      }
      addMatchToHistory({
        id: Date.now(),
        won: isWinner,
        players: data.room?.gameState?.players?.length || 0,
        date: new Date().toISOString(),
      });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Actions
  const createRoom = useCallback((playerName, maxPlayers = 6, gameMode = 'classic') => {
    socketRef.current?.emit('create_room', { playerName, maxPlayers, gameMode });
  }, []);

  const joinRoom = useCallback((roomId, playerName) => {
    socketRef.current?.emit('join_room', { roomId, playerName });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave_room');
    reset();
    setActiveScreen('home');
  }, [reset]);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start_game');
  }, []);

  const rollDice = useCallback(() => {
    socketRef.current?.emit('roll_dice');
  }, []);

  const moveToken = useCallback((tokenIdx) => {
    socketRef.current?.emit('move_token', { tokenIdx });
  }, []);

  const setGameMode = useCallback((gameMode) => {
    socketRef.current?.emit('set_game_mode', { gameMode });
  }, []);

  const sendMessage = useCallback((message) => {
    if (message.trim() && roomId) {
      socketRef.current?.emit('chat_message', { roomId, message: message.trim() });
    }
  }, [roomId]);

  const sendReaction = useCallback((emoji) => {
    if (roomId) {
      socketRef.current?.emit('send_reaction', { roomId, emoji });
    }
  }, [roomId]);

  return {
    socket: socketRef,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    rollDice,
    moveToken,
    setGameMode,
    sendMessage,
    sendReaction,
  };
}
