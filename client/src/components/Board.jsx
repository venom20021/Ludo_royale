import React, { useMemo } from 'react';
import {
  TRACK_SIZE,
  HOME_STRETCH_LENGTH,
  TOKENS_PER_PLAYER,
  PLAYER_COLORS,
  PLAYER_COLORS_LIGHT,
  BOARD_SIZE,
  BOARD_CENTER,
  tokenIsHome,
  tokenIsOnTrack,
  tokenIsOnHomeStretch,
  tokenIsFinished,
  getTrackCellPositions,
  getHomeStretchPositions,
  getHomeBasePositions,
  getHexVertices,
  START_POS,
  HOME_ENTRY,
} from '../constants.js';

export default function Board({
  players,
  currentPlayerIndex,
  diceValue,
  turnPhase,
  playerIndex,
  onTokenClick,
  selectableTokens,
}) {
  const trackCells = useMemo(() => getTrackCellPositions(250), []);
  const hexVertices = useMemo(() => getHexVertices(330), []);

  // Check if token is clickable
  const isTokenSelectable = (pIdx, tIdx) => {
    return selectableTokens && selectableTokens.some(
      s => s.playerIdx === pIdx && s.tokenIdx === tIdx
    );
  };

  // Get ring highlight color for a track position
  const getTrackCellColor = (pos) => {
    // Color the cells near each player's start position
    for (let i = 0; i < 6; i++) {
      const start = START_POS[i];
      const end = (start + 2) % TRACK_SIZE;
      if (pos === start || pos === (start + 1) % TRACK_SIZE || pos === (start + 2) % TRACK_SIZE) {
        return PLAYER_COLORS_LIGHT[players[i]?.colorIndex ?? i];
      }
      // Also color around home entry
      const entry = HOME_ENTRY[i];
      if (pos === entry || pos === (entry - 1 + TRACK_SIZE) % TRACK_SIZE) {
        return PLAYER_COLORS_LIGHT[players[i]?.colorIndex ?? i];
      }
    }
    return 'rgba(200, 200, 200, 0.15)';
  };

  // Get relative position of a player's home base area
  const getHomeBase = (pIdx) => {
    const angle = (Math.PI / 2) - (pIdx * Math.PI / 3);
    const radius = 330;
    return {
      x: BOARD_CENTER.x + radius * Math.cos(angle),
      y: BOARD_CENTER.y - radius * Math.sin(angle),
    };
  };

  // Render home base areas (colored zones with token starting positions)
  const renderHomeBases = () => {
    return players.map((player, pIdx) => {
      const base = getHomeBase(pIdx);
      const positions = getHomeBasePositions(pIdx);
      const isCurrent = pIdx === currentPlayerIndex;
      const color = player.color || PLAYER_COLORS[player.colorIndex];

      return (
        <g key={`home-${pIdx}`}>
          {/* Home base circle */}
          <circle
            cx={base.x}
            cy={base.y}
            r={55}
            fill={color}
            fillOpacity={0.15}
            stroke={isCurrent ? color : 'rgba(255,255,255,0.2)'}
            strokeWidth={isCurrent ? 2.5 : 1}
            strokeDasharray={isCurrent ? 'none' : '4 4'}
          />
          <circle
            cx={base.x}
            cy={base.y}
            r={45}
            fill={color}
            fillOpacity={0.08}
            stroke={isCurrent ? color : 'rgba(255,255,255,0.15)'}
            strokeWidth={1}
          />

          {/* Player name label */}
          <text
            x={base.x}
            y={base.y - 48}
            textAnchor="middle"
            fill={color}
            fontSize={11}
            fontWeight={700}
            fontFamily="Nunito, sans-serif"
          >
            {player.emoji} {player.name}
          </text>

          {/* Token slots in home base */}
          {positions.map((pos, tIdx) => {
            const posState = player.tokens[tIdx];
            const tokenAtHome = tokenIsHome(posState);
            const isSelectable = isTokenSelectable(pIdx, tIdx);
            const isFinished = tokenIsFinished(posState, pIdx);

            return (
              <g key={`slot-${pIdx}-${tIdx}`}>
                {/* Empty slot */}
                {tokenAtHome && !isSelectable && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={12}
                    fill="rgba(255,255,255,0.05)"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}
                {/* Token on home base */}
                {tokenAtHome && isSelectable && (
                  <g
                    onClick={() => onTokenClick?.(pIdx, tIdx)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={14}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={2}
                      opacity={0.9}
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={16}
                      fill="none"
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth={2}
                      opacity={0.6}
                    >
                      <animate
                        attributeName="r"
                        values="16;19;16"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.6;0.2;0.6"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <text
                      x={pos.x}
                      y={pos.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={12}
                      fontWeight={800}
                    >
                      {tIdx + 1}
                    </text>
                  </g>
                )}
                {/* Finished tokens */}
                {isFinished && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={10}
                    fill={color}
                    opacity={0.3}
                  />
                )}
              </g>
            );
          })}

          {/* Finished count */}
          {player.tokens.filter(t => tokenIsFinished(t, pIdx)).length > 0 && (
            <text
              x={base.x}
              y={base.y + 58}
              textAnchor="middle"
              fill={color}
              fontSize={12}
              fontWeight={600}
            >
              ✅ {player.tokens.filter(t => tokenIsFinished(t, pIdx)).length}/{TOKENS_PER_PLAYER}
            </text>
          )}
        </g>
      );
    });
  };

  // Render the main track cells
  const renderTrack = () => {
    return trackCells.map((cell, idx) => {
      const isStart = START_POS.includes(idx);
      const isSafe = [0, 10, 20, 30, 40, 50, 5, 15, 25, 35, 45, 55].includes(idx);
      const radius = isStart ? 10 : isSafe ? 9 : 8;

      return (
        <g key={`track-${idx}`}>
          {/* Cell background */}
          <rect
            x={cell.x - radius}
            y={cell.y - radius}
            width={radius * 2}
            height={radius * 2}
            rx={3}
            fill={getTrackCellColor(idx)}
            stroke={isStart ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}
            strokeWidth={isStart ? 1.5 : 0.5}
          />
          {/* Safe spot marker */}
          {isSafe && (
            <text
              x={cell.x}
              y={cell.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={8}
            >
              ⭐
            </text>
          )}
          {/* Position number (small) */}
          {idx % 5 === 0 && (
            <text
              x={cell.x}
              y={cell.y + radius + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.15)"
              fontSize={7}
              fontFamily="monospace"
            >
              {idx}
            </text>
          )}
        </g>
      );
    });
  };

  // Render tokens on the board
  const renderTokens = () => {
    return players.map((player, pIdx) => {
      return player.tokens.map((pos, tIdx) => {
        if (tokenIsHome(pos)) return null; // Rendered in home base
        if (tokenIsFinished(pos, pIdx)) return null; // Rendered in home base

        const color = player.color || PLAYER_COLORS[player.colorIndex];
        const isSelectable = isTokenSelectable(pIdx, tIdx);
        let x, y;

        if (tokenIsOnTrack(pos)) {
          const cell = trackCells[pos];
          x = cell.x;
          y = cell.y;
        } else if (tokenIsOnHomeStretch(pos, pIdx)) {
          const hsPositions = getHomeStretchPositions(pIdx);
          const hsIndex = pos - (100 + pIdx * 10);
          x = hsPositions[hsIndex].x;
          y = hsPositions[hsIndex].y;
        } else {
          return null;
        }

        const tokenRadius = isSelectable ? 12 : 10;

        return (
          <g
            key={`token-${pIdx}-${tIdx}`}
            onClick={() => isSelectable && onTokenClick?.(pIdx, tIdx)}
            style={{ cursor: isSelectable ? 'pointer' : 'default' }}
          >
            {/* Token shadow */}
            <circle
              cx={x + 1}
              cy={y + 1}
              r={tokenRadius}
              fill="rgba(0,0,0,0.3)"
            />
            {/* Token body */}
            <circle
              cx={x}
              cy={y}
              r={tokenRadius}
              fill={color}
              stroke={isSelectable ? '#fff' : 'rgba(255,255,255,0.4)'}
              strokeWidth={isSelectable ? 2.5 : 1.5}
              opacity={0.95}
            />
            {/* Token highlight */}
            <circle
              cx={x - 2}
              cy={y - 2}
              r={tokenRadius * 0.35}
              fill="rgba(255,255,255,0.3)"
            />
            {/* Token number */}
            <text
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize={isSelectable ? 12 : 10}
              fontWeight={800}
              fontFamily="sans-serif"
            >
              {tIdx + 1}
            </text>
            {/* Selection glow */}
            {isSelectable && (
              <circle
                cx={x}
                cy={y}
                r={tokenRadius + 4}
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={2}
                opacity={0.6}
              >
                <animate
                  attributeName="r"
                  values={`${tokenRadius + 4};${tokenRadius + 8};${tokenRadius + 4}`}
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.6;0.1;0.6"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>
        );
      });
    });
  };

  // Render home stretches
  const renderHomeStretches = () => {
    return players.map((player, pIdx) => {
      const hsPositions = getHomeStretchPositions(pIdx);
      const color = player.color || PLAYER_COLORS[player.colorIndex];
      const entry = HOME_ENTRY[pIdx];
      const entryCell = trackCells[entry];

      // Home stretch entry marker
      return (
        <g key={`hs-${pIdx}`}>
          {/* Path from entry to home stretch */}
          <line
            x1={entryCell.x}
            y1={entryCell.y}
            x2={BOARD_CENTER.x}
            y2={BOARD_CENTER.y}
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.15}
            strokeDasharray="4 4"
          />
          {/* Home stretch cells */}
          {hsPositions.map((pos, i) => (
            <rect
              key={`hs-cell-${pIdx}-${i}`}
              x={pos.x - 7}
              y={pos.y - 7}
              width={14}
              height={14}
              rx={3}
              fill={color}
              fillOpacity={i === 0 ? 0.15 : 0.08}
              stroke={color}
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
          ))}
          {/* Home stretch label */}
          <text
            x={BOARD_CENTER.x - 5}
            y={BOARD_CENTER.y + 2}
            textAnchor="end"
            dominantBaseline="middle"
            fill={color}
            fontSize={8}
            opacity={0.4}
          >
            {player.emoji}
          </text>
        </g>
      );
    });
  };

  // Render center area
  const renderCenter = () => {
    return (
      <g>
        {/* Center hexagon */}
        <polygon
          points={
            Array.from({ length: 6 }, (_, i) => {
              const angle = (Math.PI / 2) - (i * Math.PI / 3);
              const r = 30;
              return `${BOARD_CENTER.x + r * Math.cos(angle)},${BOARD_CENTER.y - r * Math.sin(angle)}`;
            }).join(' ')
          }
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />
        <text
          x={BOARD_CENTER.x}
          y={BOARD_CENTER.y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize={16}
          fontFamily="sans-serif"
        >
          🏆
        </text>
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      style={{
        width: '100%',
        maxWidth: 600,
        height: 'auto',
        filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))',
      }}
    >
      {/* Board background */}
      <rect
        x={0}
        y={0}
        width={BOARD_SIZE}
        height={BOARD_SIZE}
        rx={20}
        fill="#1a1a2e"
      />

      {/* Board border */}
      <rect
        x={5}
        y={5}
        width={BOARD_SIZE - 10}
        height={BOARD_SIZE - 10}
        rx={18}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={1}
      />

      {/* Outer hexagon ring */}
      <polygon
        points={
          hexVertices.map(v => `${v.x},${v.y}`).join(' ')
        }
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />

      {/* Center */}
      {renderCenter()}

      {/* Home stretches */}
      {renderHomeStretches()}

      {/* Track cells */}
      {renderTrack()}

      {/* Home bases */}
      {renderHomeBases()}

      {/* Tokens on track/home stretch */}
      {renderTokens()}

      {/* Turn indicator */}
      {players[currentPlayerIndex] && (
        <text
          x={BOARD_SIZE / 2}
          y={BOARD_SIZE - 15}
          textAnchor="middle"
          fill={players[currentPlayerIndex].color || '#fff'}
          fontSize={13}
          fontWeight={700}
          opacity={0.6}
        >
          {players[currentPlayerIndex].emoji} {players[currentPlayerIndex].name}'s Turn
          {diceValue !== null && ` • Rolled: ${diceValue}`}
        </text>
      )}
    </svg>
  );
}
