import React, { useRef, useEffect } from 'react';

export default function GameLog({ log, playerIndex }) {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  if (!log || log.length === 0) {
    return (
      <div style={{
        padding: 20,
        textAlign: 'center',
        color: '#555',
        fontSize: 13,
        fontStyle: 'italic',
      }}>
        Game log will appear here...
      </div>
    );
  }

  return (
    <div style={{
      maxHeight: 200,
      overflowY: 'auto',
      padding: '8px 4px',
    }}>
      {log.map((entry, idx) => (
        <div
          key={idx}
          style={{
            padding: '6px 10px',
            marginBottom: 4,
            borderRadius: 8,
            background: entry.playerIdx === -1
              ? 'rgba(255,255,255,0.03)'
              : entry.playerIdx === playerIndex
                ? 'rgba(241,196,15,0.05)'
                : 'transparent',
            borderLeft: `3px solid ${entry.playerIdx === -1 ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
            animation: 'fadeIn 0.3s ease-out',
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
          }}>
            <span style={{
              color: '#555',
              fontSize: 10,
              fontWeight: 600,
              minWidth: 24,
              fontFamily: 'monospace',
            }}>
              T{entry.turn}
            </span>
            <span style={{
              color: '#888',
              flex: 1,
            }}>
              {entry.description}
            </span>
          </div>
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  );
}
