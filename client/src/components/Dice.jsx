import React, { useState, useEffect } from 'react';

const DICE_FACES = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

export default function Dice({
  value,
  rolling,
  canRoll,
  playerColor,
  onRoll,
  isMyTurn,
  turnPhase,
}) {
  const [animatingValue, setAnimatingValue] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (rolling) {
      setIsAnimating(true);
      const interval = setInterval(() => {
        setAnimatingValue(Math.floor(Math.random() * 6) + 1);
      }, 80);
      setTimeout(() => {
        clearInterval(interval);
        setAnimatingValue(value || 1);
        setIsAnimating(false);
      }, 600);
      return () => clearInterval(interval);
    } else if (value) {
      setAnimatingValue(value);
    }
  }, [value, rolling]);

  const displayValue = isAnimating ? animatingValue : (value || 1);
  const dots = DICE_FACES[displayValue] || DICE_FACES[1];
  const size = 80;
  const center = size / 2;
  const faceColor = playerColor || '#f1c40f';

  const handleClick = () => {
    if (canRoll && isMyTurn && turnPhase === 'roll' && !isAnimating) {
      onRoll();
    }
  };

  // 3D perspective transform
  const dice3DStyle = isAnimating ? {
    animation: 'diceRoll 0.6s ease-out',
  } : {};

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    }}>
      {/* Roll prompt */}
      {canRoll && isMyTurn && turnPhase === 'roll' && (
        <div style={{
          fontSize: 14,
          fontWeight: 800,
          color: faceColor,
          fontFamily: "'Fredoka One', cursive",
          textAlign: 'center',
          letterSpacing: 0.5,
          animation: 'pulse 1.5s infinite',
          textShadow: `0 0 20px ${faceColor}40`,
        }}>
          Tap to Roll!
        </div>
      )}

      {/* Dice container with 3D effect */}
      <div
        onClick={handleClick}
        style={{
          cursor: canRoll && isMyTurn && turnPhase === 'roll' ? 'pointer' : 'default',
          position: 'relative',
          width: 100,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer glow ring */}
        {canRoll && isMyTurn && turnPhase === 'roll' && (
          <div style={{
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${faceColor}33, transparent, ${faceColor}22)`,
            animation: 'pulseGlow 2s infinite',
          }} />
        )}

        <svg
          width={90}
          height={90}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            ...dice3DStyle,
            position: 'relative',
            zIndex: 1,
            filter: isAnimating
              ? 'drop-shadow(0 4px 12px rgba(255,255,255,0.2))'
              : 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
            transition: 'filter 0.3s, transform 0.15s',
            transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
          }}
          onMouseEnter={e => {
            if (canRoll && isMyTurn && turnPhase === 'roll') {
              e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* Dice body with neon gradient */}
          <defs>
            <linearGradient id="dice-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a3a" />
              <stop offset="100%" stopColor="#0d0d24" />
            </linearGradient>
            <radialGradient id="dice-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={faceColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={faceColor} stopOpacity="0" />
            </radialGradient>
            {/* Dot gradient */}
            <radialGradient id="dot-grad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor={faceColor} />
            </radialGradient>
          </defs>

          {/* Dice glow aura */}
          <rect
            x={-4}
            y={-4}
            width={size + 8}
            height={size + 8}
            rx={18}
            fill="url(#dice-glow)"
          />

          {/* Dice body */}
          <rect
            x={0}
            y={0}
            width={size}
            height={size}
            rx={14}
            fill="url(#dice-grad)"
            stroke={faceColor}
            strokeWidth={2.5}
            strokeOpacity={isAnimating ? 0.5 : 0.8}
          />

          {/* Dice border highlight */}
          <rect
            x={3}
            y={3}
            width={size - 6}
            height={size - 6}
            rx={12}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />

          {/* Inner shadow effect */}
          <rect
            x={2}
            y={2}
            width={size - 4}
            height={size - 4}
            rx={13}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
          />

          {/* Shake animation overlay */}
          {isAnimating && (
            <rect
              x={0}
              y={0}
              width={size}
              height={size}
              rx={14}
              fill="rgba(255,255,255,0.05)"
            >
              <animate
                attributeName="opacity"
                values="0.05;0.15;0.05"
                dur="0.1s"
                repeatCount="indefinite"
              />
            </rect>
          )}

          {/* Dots */}
          {dots.map(([dx, dy], i) => (
            <circle
              key={i}
              cx={center + dx * (size * 0.24)}
              cy={center + dy * (size * 0.24)}
              r={8}
              fill="url(#dot-grad)"
              opacity={isAnimating ? 0.6 : 0.95}
            />
          ))}

          {/* Dot shadows */}
          {dots.map(([dx, dy], i) => (
            <circle
              key={`shadow-${i}`}
              cx={center + dx * (size * 0.24) + 1}
              cy={center + dy * (size * 0.24) + 1}
              r={8}
              fill="rgba(0,0,0,0.3)"
              opacity={0.3}
            />
          ))}

          {/* Value indicator */}
          <text
            x={center}
            y={size - 8}
            textAnchor="middle"
            fill={faceColor}
            fontSize={11}
            fontWeight={800}
            fontFamily="'Fredoka One', cursive"
            opacity={0.4}
          >
            {displayValue}
          </text>
        </svg>
      </div>

      {/* Dice value display */}
      {value && !isAnimating && (
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          fontFamily: "'Fredoka One', cursive",
          textAlign: 'center',
        }}>
          {value === 6 && <span style={{ color: '#2ecc71', fontSize: 16 }}>🎉 Lucky 6!</span>}
          {value === 1 && <span>☝️ One</span>}
          {value === 2 && <span>✌️ Two</span>}
          {value === 3 && <span>🤟 Three</span>}
          {value === 4 && <span>🖐️ Four</span>}
          {value === 5 && <span>🖐️ Five</span>}
        </div>
      )}

      {/* Waiting state */}
      {!canRoll && isMyTurn && turnPhase === 'roll' && (
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
          fontWeight: 600,
        }}>
          Waiting for server...
        </div>
      )}
    </div>
  );
}
