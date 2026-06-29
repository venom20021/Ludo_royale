import React, { useRef, useEffect } from 'react';

export default function GameLog({ log, playerIndex }) {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  if (!log || log.length === 0) {
    return (
      <div style={{
        padding: 24,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.2)',
        fontSize: 13,
        fontStyle: 'italic',
      }}>
        Game log will appear here...
      </div>
    );
  }

  return (
    <div style={{
      maxHeight: 240,
      overflowY: 'auto',
      padding: '6px 4px',
    }}>
      {log.map((entry, idx) => {
        const isSystem = entry.playerIdx === -1;
        const isMe = entry.playerIdx === playerIndex;

        return (
          <div
            key={idx}
            style={{
              padding: '6px 10px',
              marginBottom: 3,
              borderRadius: 8,
              background: isSystem
                ? 'rgba(255,255,255,0.02)'
                : isMe
                  ? 'rgba(241,196,15,0.06)'
                  : 'transparent',
              borderLeft: `3px solid ${
                isSystem
                  ? 'rgba(255,255,255,0.08)'
                  : isMe
                    ? '#f1c40f'
                    : 'transparent'
              }`,
              animation: 'fadeIn 0.3s ease-out',
              fontSize: 12,
              lineHeight: 1.4,
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              {/* Turn number badge */}
              <span style={{
                color: 'rgba(255,255,255,0.2)',
                fontSize: 9,
                fontWeight: 700,
                minWidth: 20,
                fontFamily: 'monospace',
                background: 'rgba(255,255,255,0.04)',
                padding: '1px 4px',
                borderRadius: 4,
                textAlign: 'center',
              }}>
                T{entry.turn}
              </span>

              {/* Entry content */}
              <span style={{
                color: isSystem
                  ? 'rgba(255,255,255,0.4)'
                  : isMe
                    ? '#ddd'
                    : 'rgba(255,255,255,0.55)',
                flex: 1,
                fontWeight: isMe ? 600 : 400,
              }}>
                {entry.description}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={logEndRef} />
    </div>
  );
}
