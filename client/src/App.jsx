import React, { useState } from 'react';
import useSocket from './hooks/useSocket.js';
import Lobby from './pages/Lobby.jsx';
import GameRoom from './pages/GameRoom.jsx';

export default function App() {
  const socket = useSocket();
  const [view, setView] = useState('lobby'); // 'lobby' or 'game'

  const handleRoomJoined = (roomId, playerIndex) => {
    setView('game');
  };

  const handleLeaveRoom = () => {
    socket.leaveRoom();
    setView('lobby');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {view === 'lobby' ? (
        <Lobby
          socket={socket}
          onRoomJoined={handleRoomJoined}
        />
      ) : (
        <GameRoom
          socket={socket}
          onLeave={handleLeaveRoom}
        />
      )}
    </div>
  );
}
