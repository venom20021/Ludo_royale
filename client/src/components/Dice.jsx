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
  const size = 70;
  const dotSize = 9;
  const center = size / 2;
  const faceColor = playerColor || '#f1c40f';

  const handleClick = () => {
    if (canRoll && isMyTurn && turnPhase === 'roll' && !isAnimating) {
      onRoll();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Roll button */}
      {canRoll && isMyTurn && turnPhase === 'roll' && (
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: faceColor,
          animation: 'pulse 1.5s infinite',
          textAlign: 'center',
        }}>
          Tap to roll! 🎲
        </div>
      )}

      {/* Dice SVG */}
      <svg
        width={90}
        height={90}
        viewBox={`0 0 ${size} ${size}`}
        onClick={handleClick}
        style={{
          cursor: canRoll ? 'pointer' : 'default',
          filter: isAnimating
            ? 'drop-shadow(0 2px 8px rgba(255,255,255,0.3))'
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          transition: 'filter 0.3s',
          transform: isAnimating ? 'rotate(10deg)' : 'none',
          animation: isAnimating ? 'shake 0.1s infinite' : 'none',
        }}
      >
        {/* Dice body */}
        <rect
          x={0}
          y={0}
          width={size}
          height={size}
          rx={10}
          fill={isAnimating ? '#2c3e50' : '#1a1a2e'}
          stroke={faceColor}
          strokeWidth={2}
          strokeOpacity={0.8}
        />
        {/* Dice border highlight */}
        <rect
          x={2}
          y={2}
          width={size - 4}
          height={size - 4}
          rx={8}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />

        {/* Dots */}
        {dots.map(([dx, dy], i) => (
          <circle
            key={i}
            cx={center + dx * (size * 0.25)}
            cy={center + dy * (size * 0.25)}
            r={dotSize}
            fill="#fff"
            opacity={0.9}
          />
        ))}

        {/* Value text (for larger numbers) */}
        <text
          x={center}
          y={center + size * 0.35}
          textAnchor="middle"
          fill={faceColor}
          fontSize={11}
          fontWeight={800}
          opacity={0.5}
        >
          {displayValue}
        </text>
      </svg>

      {/* Dice value display */}
      {value && !isAnimating && (
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#888',
          fontFamily: "'Fredoka One', cursive",
        }}>
          {value === 6 && '🎉 Lucky 6!'}
          {value === 1 && '☝️ One'}
          {value === 2 && '✌️ Two'}
          {value === 3 && '🤟 Three'}
          {value === 4 && '🖐️ Four'}
          {value === 5 && '🖐️ Five'}
        </div>
      )}

      {/* Turn info */}
      {!canRoll && isMyTurn && turnPhase === 'roll' && (
        <div style={{
          fontSize: 12,
          color: '#888',
          textAlign: 'center',
        }}>
          Waiting for server...
        </div>
      )}
    </div>
  );
}
