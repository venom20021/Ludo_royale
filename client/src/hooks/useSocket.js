import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || '';

export default function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [error, setError] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [turnTimer, setTurnTimer] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = s;

    s.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('connect_error', (err) => {
      setError('Connection error: ' + err.message);
    });

    s.on('room_joined', (data) => {
      setRoomId(data.roomId);
      setPlayerIndex(data.playerIndex);
      setRoom(data.room);
      if (data.room?.gameState?.players?.[data.playerIndex]) {
        setPlayerId(data.room.gameState.players[data.playerIndex].id);
      }
      setError(null);
    });

    s.on('room_update', (data) => {
      setRoom(data.room);
    });

    s.on('game_started', (data) => {
      setRoom(data.room);
    });

    s.on('game_state_update', (data) => {
      setRoom(data.room);
      setTurnTimer(Date.now());
    });

    s.on('game_over', (data) => {
      setRoom(data.room);
    });

    s.on('chat_message', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    s.on('player_disconnected', (data) => {
      // Room update will handle state
    });

    s.on('error', (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName, maxPlayers = 6) => {
    if (socketRef.current) {
      socketRef.current.emit('create_room', { playerName, maxPlayers });
    }
  }, []);

  const joinRoom = useCallback((roomId, playerName) => {
    if (socketRef.current) {
      socketRef.current.emit('join_room', { roomId, playerName });
    }
  }, []);

  const startGame = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('start_game');
    }
  }, []);

  const rollDice = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('roll_dice');
    }
  }, []);

  const moveToken = useCallback((tokenIdx) => {
    if (socketRef.current) {
      socketRef.current.emit('move_token', { tokenIdx });
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', { message });
    }
  }, []);

  const leaveRoom = useCallback(() => {
    setRoom(null);
    setRoomId(null);
    setPlayerIndex(null);
    setPlayerId(null);
    setChatMessages([]);
    if (socketRef.current) {
      socketRef.current.disconnect();
      // Reconnect to be able to join another room
      socketRef.current.connect();
    }
  }, []);

  return {
    socket,
    connected,
    room,
    playerIndex,
    playerId,
    roomId,
    error,
    chatMessages,
    turnTimer,
    createRoom,
    joinRoom,
    startGame,
    rollDice,
    moveToken,
    sendMessage,
    leaveRoom,
    setError,
  };
}
