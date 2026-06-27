import React, { useState, useEffect } from 'react';
import { PLAYER_COLORS, PLAYER_EMOJIS, PLAYER_COUNT_OPTIONS } from '../constants.js';

export default function Lobby({ socket, onRoomJoined }) {
  const [playerName, setPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState(6);

  useEffect(() => {
    // Generate random fun name
    const adjectives = ['Swift', 'Bold', 'Epic', 'Lucky', 'Mighty', 'Brave', 'Clever', 'Fierce', 'Jolly', 'Noble'];
    const nouns = ['Gamer', 'Champion', 'Roller', 'Strategist', 'DiceMaster', 'Player', 'Pro', 'Wizard'];
    const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 100)}`;
    setPlayerName(name);
  }, []);

  // Listen for room_joined event
  useEffect(() => {
    if (!socket.socket) return;

    const handleRoomJoined = (data) => {
      setLoading(false);
      onRoomJoined(data.roomId, data.playerIndex);
    };

    const handleError = (data) => {
      setLoading(false);
      setError(data.message || 'An error occurred');
      setTimeout(() => setError(''), 3000);
    };

    socket.socket.on('room_joined', handleRoomJoined);
    socket.socket.on('error', handleError);

    return () => {
      socket.socket?.off('room_joined', handleRoomJoined);
      socket.socket?.off('error', handleError);
    };
  }, [socket.socket, onRoomJoined]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    setLoading(true);
    setError('');
    socket.createRoom(playerName.trim(), selectedPlayerCount);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinRoomId.trim() || !playerName.trim()) return;
    setLoading(true);
    setError('');
    socket.joinRoom(joinRoomId.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Connection status */}
      <div style={{
        position: 'fixed',
        top: 12,
        right: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(0,0,0,0.4)',
        padding: '6px 14px',
        borderRadius: 20,
        fontSize: 13,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: socket.connected ? '#2ecc71' : '#e74c3c',
          boxShadow: socket.connected ? '0 0 8px rgba(46,204,113,0.6)' : '0 0 8px rgba(231,76,60,0.6)',
        }} />
        {socket.connected ? 'Connected' : 'Connecting...'}
      </div>

      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: 40,
        animation: 'fadeIn 0.6s ease-out',
      }}>
        <div style={{
          fontSize: 64,
          marginBottom: 8,
          lineHeight: 1,
        }}>
          🎲
        </div>
        <h1 style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 48,
          background: 'linear-gradient(135deg, #f1c40f, #e67e22, #e74c3c, #9b59b6, #3498db, #2ecc71)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 4,
        }}>
          Ludo Royale
        </h1>
        <p style={{ color: '#888', fontSize: 16 }}>
          2–6 Player Multiplayer Ludo • Real-time • Low Latency
        </p>
      </div>

      {/* Main Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 440,
        animation: 'fadeIn 0.8s ease-out',
      }}>
        {/* Player Name */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: '#888',
            marginBottom: 8,
          }}>
            YOUR NAME
          </label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              color: '#fff',
              fontSize: 16,
              fontFamily: 'Nunito, sans-serif',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(241,196,15,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
          />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 24,
        }}>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 10,
              background: activeTab === 'create' ? 'rgba(241,196,15,0.2)' : 'transparent',
              color: activeTab === 'create' ? '#f1c40f' : '#888',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🏠 Create Room
          </button>
          <button
            onClick={() => setActiveTab('join')}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 10,
              background: activeTab === 'join' ? 'rgba(241,196,15,0.2)' : 'transparent',
              color: activeTab === 'join' ? '#f1c40f' : '#888',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🔗 Join Room
          </button>
        </div>

        {/* Create Room Form */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateRoom}>
            {/* Player Count Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: '#888',
                marginBottom: 10,
              }}>
                NUMBER OF PLAYERS
              </label>
              <div style={{
                display: 'flex',
                gap: 6,
              }}>
                {PLAYER_COUNT_OPTIONS.map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSelectedPlayerCount(count)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      border: selectedPlayerCount === count
                        ? '2px solid #f1c40f'
                        : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      background: selectedPlayerCount === count
                        ? 'rgba(241,196,15,0.15)'
                        : 'rgba(255,255,255,0.04)',
                      color: selectedPlayerCount === count ? '#f1c40f' : '#888',
                      fontSize: 15,
                      fontWeight: selectedPlayerCount === count ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 1 }}>
                      {['👥', '👥', '👫', '👩‍👩‍👧‍👦', '👨‍👩‍👧‍👧', '👨‍👩‍👧‍👦'][count - 2] || '👥'}
                    </div>
                    <div style={{ fontSize: 11 }}>
                      {count}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{
                marginTop: 6,
                fontSize: 11,
                color: '#666',
                textAlign: 'center',
              }}>
                Game starts when {selectedPlayerCount} players join
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !playerName.trim()}
              style={{
                width: '100%',
                padding: '14px 24px',
                border: 'none',
                borderRadius: 12,
                background: loading
                  ? 'rgba(241,196,15,0.3)'
                  : 'linear-gradient(135deg, #f1c40f, #e67e22)',
                color: '#fff',
                fontSize: 18,
                fontWeight: 800,
                cursor: loading || !playerName.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading || !playerName.trim() ? 0.6 : 1,
              }}
            >
              {loading ? 'Creating...' : `🎮 Create ${selectedPlayerCount}-Player Room`}
            </button>
          </form>
        )}

        {/* Join Room Form */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinRoom}>
            <div style={{ marginBottom: 16 }}>
              <input
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="Enter Room Code"
                maxLength={8}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: "'Fredoka One', cursive",
                  textAlign: 'center',
                  letterSpacing: 4,
                  outline: 'none',
                  textTransform: 'uppercase',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(241,196,15,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !joinRoomId.trim() || !playerName.trim()}
              style={{
                width: '100%',
                padding: '14px 24px',
                border: 'none',
                borderRadius: 12,
                background: loading
                  ? 'rgba(52,152,219,0.3)'
                  : 'linear-gradient(135deg, #3498db, #2ecc71)',
                color: '#fff',
                fontSize: 18,
                fontWeight: 800,
                cursor: loading || !joinRoomId.trim() || !playerName.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading || !joinRoomId.trim() || !playerName.trim() ? 0.6 : 1,
              }}
            >
              {loading ? 'Joining...' : '🔗 Join Game'}
            </button>
          </form>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            marginTop: 16,
            padding: '10px 16px',
            background: 'rgba(231,76,60,0.15)',
            border: '1px solid rgba(231,76,60,0.3)',
            borderRadius: 10,
            color: '#e74c3c',
            fontSize: 14,
            fontWeight: 600,
            animation: 'shake 0.5s',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Color Legend */}
      <div style={{
        marginTop: 32,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
        animation: 'fadeIn 1s ease-out',
      }}>
        {PLAYER_COLORS.map((color, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }} />
            <span>{PLAYER_EMOJIS[i]} Player {i + 1}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 40,
        textAlign: 'center',
        fontSize: 12,
        color: '#555',
      }}>
        Socket.IO • React • WebSocket • Low Latency
      </div>
    </div>
  );
}
