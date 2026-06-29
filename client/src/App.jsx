import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useSocket from './hooks/useSocket.js';
import useGameStore from './stores/gameStore.js';
import Home from './pages/Home.jsx';
import InviteRoom from './pages/InviteRoom.jsx';
import GameRoom from './pages/GameRoom.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  const socket = useSocket();
  const { activeScreen, setActiveScreen, setUsername, username, reset } = useGameStore();

  const handleCreateRoom = useCallback((playerName, maxPlayers, gameMode) => {
    setUsername(playerName);
    socket.createRoom(playerName, maxPlayers, gameMode);
    setActiveScreen('lobby');
  }, [socket, setUsername, setActiveScreen]);

  const handleJoinRoom = useCallback((roomId, playerName) => {
    setUsername(playerName);
    socket.joinRoom(roomId, playerName);
  }, [socket, setUsername]);

  const handleLeaveGame = useCallback(() => {
    socket.leaveRoom();
    setActiveScreen('home');
  }, [socket, setActiveScreen]);

  const handleStartGame = useCallback(() => {
    socket.startGame();
  }, [socket]);

  const handleSetGameMode = useCallback((gameMode) => {
    socket.setGameMode(gameMode);
  }, [socket]);

  // Listen for game_started to navigate from lobby to game
  useEffect(() => {
    const s = socket.socket?.current;
    if (!s) return;

    const handleGameStarted = () => setActiveScreen('game');

    s.on('game_started', handleGameStarted);

    return () => {
      s.off('game_started', handleGameStarted);
    };
  }, [socket.socket, setActiveScreen]);

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatePresence mode="wait">
        {activeScreen === 'home' && (
          <Home
            key="home"
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}
        {activeScreen === 'lobby' && (
          <InviteRoom
            key="lobby"
            onBack={handleLeaveGame}
            onStartGame={handleStartGame}
            onSetGameMode={handleSetGameMode}
          />
        )}
        {activeScreen === 'game' && (
          <GameRoom
            key="game"
            socket={socket}
            onLeave={handleLeaveGame}
          />
        )}
        {activeScreen === 'profile' && (
          <Profile
            key="profile"
            onBack={() => setActiveScreen('home')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
