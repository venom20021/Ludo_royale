import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TRACK_SIZE,
  HOME_STRETCH_LENGTH,
  TOKENS_PER_PLAYER,
  PLAYER_COLORS,
  BOARD_SIZE,
  BOARD_CENTER,
  tokenIsHome,
  tokenIsOnTrack,
  tokenIsOnHomeStretch,
  tokenIsFinished,
  getTrackCellPositions,
  getHomeStretchPositions,
  getHomeBasePositions,
  getPolygonVertices,
  getNumBoardSides,
  START_POS,
  HOME_ENTRY,
} from '../constants.js';

const GLOW_FILTER_ID = 'board-glow';
const TOKEN_FILTER_ID = 'token-shadow';
const TOKEN_SPRING = { type: 'spring', stiffness: 300, damping: 22, mass: 0.6 };
const CAPTURE_ANIM_DURATION = 1200;

export default function Board({
  players,
  currentPlayerIndex,
  diceValue,
  turnPhase,
  playerIndex,
  onTokenClick,
  selectableTokens,
}) {
  const numSides = useMemo(() => getNumBoardSides(players.length), [players.length]);
  const trackCells = useMemo(() => getTrackCellPositions(numSides, 240), [numSides]);
  const polyVertices = useMemo(() => getPolygonVertices(numSides, 320), [numSides]);
  const outerPoly = useMemo(() => getPolygonVertices(numSides, 430), [numSides]);

  // Capture animation state
  const [captureEffects, setCaptureEffects] = useState([]);
  const [finishedEffects, setFinishedEffects] = useState([]);
  const [victoryEffects, setVictoryEffects] = useState([]);
  const prevPlayersRef = useRef(null);

  // Detect captures AND finished tokens by comparing old vs new token positions
  useEffect(() => {
    if (!prevPlayersRef.current || !trackCells) {
      prevPlayersRef.current = JSON.parse(JSON.stringify(players));
      return;
    }

    const prevPlayers = prevPlayersRef.current;
    const newCaptureEffects = [];
    const newFinishedEffects = [];

    for (let pIdx = 0; pIdx < players.length; pIdx++) {
      const prevTokens = prevPlayers[pIdx]?.tokens || [];

      for (let tIdx = 0; tIdx < players[pIdx].tokens.length; tIdx++) {
        const oldPos = prevTokens[tIdx];
        const newPos = players[pIdx].tokens[tIdx];

        // Token was on track (0-59) and is now home (-1) → captured!
        if (oldPos !== undefined && oldPos >= 0 && oldPos < TRACK_SIZE && newPos === -1) {
          const cell = trackCells[oldPos];
          if (!cell) continue;

          const color = players[pIdx]?.color || PLAYER_COLORS[players[pIdx]?.colorIndex ?? pIdx];

          // Animate at the captured token's old position
          const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          newCaptureEffects.push({
            id: `cap-${pIdx}-${tIdx}-${uid}`,
            x: cell.x,
            y: cell.y,
            color,
            type: 'captured',
          });

          // Also animate the capturer at the same position
          if (currentPlayerIndex !== undefined && currentPlayerIndex !== null) {
            const cp = players[currentPlayerIndex];
            if (cp) {
              const capturerColor = cp.color || PLAYER_COLORS[cp.colorIndex];
              newCaptureEffects.push({
                id: `capr-${currentPlayerIndex}-${uid}`,
                x: cell.x,
                y: cell.y,
                color: capturerColor,
                type: 'capturer',
              });
            }
          }
        }

        // Token just finished (reached home) → celebration!
        const justFinished = oldPos !== undefined &&
          !tokenIsFinished(oldPos, pIdx) &&
          tokenIsFinished(newPos, pIdx);
        
        if (justFinished) {
          const color = players[pIdx]?.color || PLAYER_COLORS[players[pIdx]?.colorIndex ?? pIdx];
          const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          
          // Pre-compute confetti particles for stable animation
          const confetti = Array.from({ length: 8 }, (_, i) => ({
            angle: (i * 45 + Math.random() * 20) * (Math.PI / 180),
            dist: 50 + Math.random() * 90,
            r: 2 + Math.random() * 3,
            delay: 0.05 + i * 0.04,
            color: [color, '#f1c40f', '#fff', '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'][i % 8],
          }));
          
          // Pre-compute star positions for stable animation
          const stars = [
            { emoji: '⭐', x: -28, fontSize: 18 },
            { emoji: '✨', x: 2, fontSize: 16 },
            { emoji: '🎉', x: 30, fontSize: 20 },
          ];
          
          newFinishedEffects.push({
            id: `fin-${pIdx}-${tIdx}-${uid}`,
            cx: BOARD_CENTER.x,
            cy: BOARD_CENTER.y,
            color,
            playerName: players[pIdx]?.name || `P${pIdx + 1}`,
            emoji: players[pIdx]?.emoji || '🎲',
            tokenNumber: tIdx + 1,
            confetti,
            stars,
          });
        }
      }
    }

    // Detect if a player just won (all tokens finished)
    for (let pIdx = 0; pIdx < players.length; pIdx++) {
      const prevPlayer = prevPlayers[pIdx];
      const currentPlayer = players[pIdx];
      if (!prevPlayer || !currentPlayer) continue;

      const prevAllFinished = prevPlayer.finished || prevPlayer.tokens.every((t, ti) => tokenIsFinished(t, pIdx));
      const currentAllFinished = currentPlayer.finished || currentPlayer.tokens.every(t => tokenIsFinished(t, pIdx));

      if (!prevAllFinished && currentAllFinished) {
        const color = currentPlayer.color || PLAYER_COLORS[currentPlayer.colorIndex];
        const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        // Pre-compute large confetti burst for victory
        const confetti = Array.from({ length: 24 }, (_, i) => ({
          angle: (i * 15 + Math.random() * 10) * (Math.PI / 180),
          dist: 60 + Math.random() * 140,
          r: 2 + Math.random() * 4,
          delay: Math.random() * 0.5,
          color: [color, '#f1c40f', '#fff', '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#feca57', '#00d2d3'][i % 10],
        }));

        // Pre-compute floating victory emojis
        const floatingEmojis = ['🏆', '👑', '🎉', '🎊', '✨', '⭐', '🌟', '💫'].map((emoji, i) => ({
          emoji,
          x: -70 + i * 20 + Math.random() * 10,
          fontSize: 16 + Math.random() * 12,
          delay: 0.1 + i * 0.08,
        }));

        setVictoryEffects([{  // Replace any existing victory with new one
          id: `victory-${pIdx}-${uid}`,
          cx: BOARD_CENTER.x,
          cy: BOARD_CENTER.y,
          color,
          playerName: currentPlayer.name || `P${pIdx + 1}`,
          emoji: currentPlayer.emoji || '🎲',
          confetti,
          floatingEmojis,
        }]);
      }
    }

    if (newCaptureEffects.length > 0) {
      const ids = newCaptureEffects.map(e => e.id);
      setCaptureEffects(prev => [...prev, ...newCaptureEffects]);
      setTimeout(() => {
        setCaptureEffects(prev => prev.filter(e => !ids.includes(e.id)));
      }, CAPTURE_ANIM_DURATION);
    }

    if (newFinishedEffects.length > 0) {
      const ids = newFinishedEffects.map(e => e.id);
      setFinishedEffects(prev => [...prev, ...newFinishedEffects]);
      setTimeout(() => {
        setFinishedEffects(prev => prev.filter(e => !ids.includes(e.id)));
      }, 2000);
    }

    prevPlayersRef.current = JSON.parse(JSON.stringify(players));
  }, [players, trackCells, currentPlayerIndex]);

  // Auto-clear victory effects after 4 seconds
  useEffect(() => {
    if (victoryEffects.length === 0) return;
    const timer = setTimeout(() => setVictoryEffects([]), 4000);
    return () => clearTimeout(timer);
  }, [victoryEffects]);

  const isTokenSelectable = (pIdx, tIdx) => {
    return selectableTokens && selectableTokens.some(
      s => s.playerIdx === pIdx && s.tokenIdx === tIdx
    );
  };

  const getTrackCellColor = (pos) => {
    for (let i = 0; i < players.length; i++) {
      const start = START_POS[i];
      const end = (start + 2) % TRACK_SIZE;
      if (pos === start || pos === (start + 1) % TRACK_SIZE || pos === (start + 2) % TRACK_SIZE) {
        const color = players[i]?.color || PLAYER_COLORS[players[i]?.colorIndex ?? i];
        return color;
      }
      const entry = HOME_ENTRY[i];
      if (pos === entry || pos === (entry - 1 + TRACK_SIZE) % TRACK_SIZE) {
        const color = players[i]?.color || PLAYER_COLORS[players[i]?.colorIndex ?? i];
        return color;
      }
    }
    return null;
  };

  const getHomeBase = (pIdx) => {
    const angle = (Math.PI / 2) - (pIdx * 2 * Math.PI / numSides);
    const radius = 330;
    return {
      x: BOARD_CENTER.x + radius * Math.cos(angle),
      y: BOARD_CENTER.y - radius * Math.sin(angle),
    };
  };

  // Check if a track cell belongs to a player's starting zone (3 exit cells)
  const getPlayerZoneIndex = (pos) => {
    for (let i = 0; i < players.length; i++) {
      const start = START_POS[i];
      const end = (start + 2) % TRACK_SIZE;
      if (pos === start || pos === (start + 1) % TRACK_SIZE || pos === (start + 2) % TRACK_SIZE) {
        return i;
      }
      const entry = HOME_ENTRY[i];
      if (pos === entry || pos === (entry - 1 + TRACK_SIZE) % TRACK_SIZE) {
        return i;
      }
    }
    return -1;
  };

  const renderSVGFilters = () => (
    <defs>
      <filter id={GLOW_FILTER_ID} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={TOKEN_FILTER_ID} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.35" />
      </filter>
      <filter id="star-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur" />
        <feOffset dx="0" dy="4" />
        <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadow-diff" />
        <feFlood floodColor="#000" floodOpacity="0.35" />
        <feComposite in2="shadow-diff" operator="in" />
        <feComposite in2="SourceGraphic" operator="over" />
      </filter>

      {/* Arm zone gradients - colored wedges from center */}
      {players.map((player, pIdx) => {
        const color = player.color || PLAYER_COLORS[player.colorIndex];
        return (
          <radialGradient key={`arm-grad-${pIdx}`} id={`arm-grad-${pIdx}`} cx="50%" cy="50%" r="70%">
            <stop offset="30%" stopColor={color} stopOpacity="0.18" />
            <stop offset="70%" stopColor={color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        );
      })}

      {/* Home base gradients */}
      {players.map((player, pIdx) => {
        const color = player.color || PLAYER_COLORS[player.colorIndex];
        return (
          <linearGradient key={`home-top-${pIdx}`} id={`home-top-${pIdx}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.08" />
          </linearGradient>
        );
      })}

      {/* Token gradients */}
      {players.map((player, pIdx) => {
        const color = player.color || PLAYER_COLORS[player.colorIndex];
        return (
          <radialGradient key={`token-grad-${pIdx}`} id={`token-grad-${pIdx}`} cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="25%" stopColor={color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </radialGradient>
        );
      })}
    </defs>
  );

  const renderArmZones = () => {
    return players.map((player, pIdx) => {
      const v1 = polyVertices[pIdx];
      const v2 = polyVertices[(pIdx + 1) % numSides];
      const points = `${BOARD_CENTER.x},${BOARD_CENTER.y} ${v1.x},${v1.y} ${v2.x},${v2.y}`;
      return (
        <polygon
          key={`arm-${pIdx}`}
          points={points}
          fill={`url(#arm-grad-${pIdx})`}
        />
      );
    });
  };

  const renderBoardFrame = () => {
    return (
      <g>
        {/* Outer frame - dark glass */}
        <rect
          x={-10}
          y={-10}
          width={BOARD_SIZE + 20}
          height={BOARD_SIZE + 20}
          rx={24}
          fill="#12122a"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={2}
        />
        {/* Frame glow edge */}
        <rect
          x={-6}
          y={-6}
          width={BOARD_SIZE + 12}
          height={BOARD_SIZE + 12}
          rx={22}
          fill="none"
          stroke="rgba(241,196,15,0.08)"
          strokeWidth={1}
        />
        {/* Dark board surface with subtle radial gradient */}
        <rect
          x={18}
          y={18}
          width={BOARD_SIZE - 36}
          height={BOARD_SIZE - 36}
          rx={16}
          fill="#0d0d24"
        />
        {/* Surface vignette */}
        <ellipse
          cx={BOARD_CENTER.x}
          cy={BOARD_CENTER.y}
          rx={360}
          ry={360}
          fill="none"
          stroke="rgba(88,51,239,0.08)"
          strokeWidth={80}
          opacity={0.4}
        />
        {/* Subtle grid pattern */}
        <ellipse
          cx={BOARD_CENTER.x}
          cy={BOARD_CENTER.y}
          rx={340}
          ry={340}
          fill="none"
          stroke="rgba(255,255,255,0.02)"
          strokeWidth={1}
          strokeDasharray="4 8"
        />
      </g>
    );
  };

  const renderCenter = () => {
    const centerR = 55;
    const innerR = 22;

    return (
      <g>
        {/* Center circle */}
        <circle
          cx={BOARD_CENTER.x}
          cy={BOARD_CENTER.y}
          r={centerR}
          fill="#1a1a3a"
          stroke="rgba(241,196,15,0.2)"
          strokeWidth={1.5}
        />

        {/* Colored triangles in the center */}
        {players.map((player, pIdx) => {
          const angle1 = (Math.PI / 2) - (pIdx * 2 * Math.PI / numSides);
          const angle2 = (Math.PI / 2) - ((pIdx + 1) * 2 * Math.PI / numSides);
          const color = player.color || PLAYER_COLORS[player.colorIndex];
          const pts = [
            `${BOARD_CENTER.x + innerR * Math.cos(angle1)},${BOARD_CENTER.y - innerR * Math.sin(angle1)}`,
            `${BOARD_CENTER.x},${BOARD_CENTER.y}`,
            `${BOARD_CENTER.x + innerR * Math.cos(angle2)},${BOARD_CENTER.y - innerR * Math.sin(angle2)}`,
            `${BOARD_CENTER.x + centerR * 0.7 * Math.cos((angle1 + angle2) / 2)},${BOARD_CENTER.y - centerR * 0.7 * Math.sin((angle1 + angle2) / 2)}`,
          ];
          return (
            <polygon
              key={`center-tri-${pIdx}`}
              points={pts.join(' ')}
              fill={color}
              fillOpacity={0.25}
              stroke={color}
              strokeWidth={0.5}
              strokeOpacity={0.4}
            />
          );
        })}

        {/* Center inner polygon with trophy */}
        <polygon
          points={
            Array.from({ length: numSides }, (_, i) => {
              const angle = (Math.PI / 2) - (i * 2 * Math.PI / numSides);
              return `${BOARD_CENTER.x + innerR * Math.cos(angle)},${BOARD_CENTER.y - innerR * Math.sin(angle)}`;
            }).join(' ')
          }
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(241,196,15,0.15)"
          strokeWidth={1}
        />

        <text
          x={BOARD_CENTER.x}
          y={BOARD_CENTER.y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={18}
        >
          🏆
        </text>

        {/* Center ring */}
        <circle
          cx={BOARD_CENTER.x}
          cy={BOARD_CENTER.y}
          r={centerR}
          fill="none"
          stroke="rgba(241,196,15,0.1)"
          strokeWidth={1}
        />
      </g>
    );
  };

  const renderHomeBases = () => {
    return players.map((player, pIdx) => {
      const base = getHomeBase(pIdx);
      const positions = getHomeBasePositions(pIdx, numSides);
      const isCurrent = pIdx === currentPlayerIndex;
      const color = player.color || PLAYER_COLORS[player.colorIndex];

      // For the home base square, compute a bounding box around the 4 token positions
      const tokenSize = 28;
      const padding = 18;
      const minX = Math.min(...positions.map(p => p.x)) - tokenSize - padding;
      const maxX = Math.max(...positions.map(p => p.x)) + tokenSize + padding;
      const minY = Math.min(...positions.map(p => p.y)) - tokenSize - padding;
      const maxY = Math.max(...positions.map(p => p.y)) + tokenSize + padding;
      const hbW = maxX - minX;
      const hbH = maxY - minY;

      return (
        <g key={`home-${pIdx}`}>
          {/* Home base rounded rectangle (yard) */}
          <rect
            x={minX}
            y={minY}
            width={hbW}
            height={hbH}
            rx={12}
            fill={`url(#home-top-${pIdx})`}
            stroke={isCurrent ? color : 'rgba(0,0,0,0.08)'}
            strokeWidth={isCurrent ? 2.5 : 1}
            fillOpacity={0.9}
          />
          {/* Inner border */}
          <rect
            x={minX + 4}
            y={minY + 4}
            width={hbW - 8}
            height={hbH - 8}
            rx={9}
            fill="none"
            stroke={color}
            strokeWidth={0.5}
            strokeOpacity={0.2}
          />

          {/* Grid lines (dashed) inside yard */}
          <line
            x1={minX + 6}
            y1={minY + hbH / 2}
            x2={maxX - 6}
            y2={minY + hbH / 2}
            stroke={color}
            strokeWidth={0.5}
            strokeOpacity={0.15}
            strokeDasharray="3 3"
          />
          <line
            x1={minX + hbW / 2}
            y1={minY + 6}
            x2={minX + hbW / 2}
            y2={maxY - 6}
            stroke={color}
            strokeWidth={0.5}
            strokeOpacity={0.15}
            strokeDasharray="3 3"
          />

          {/* Player label */}
          <text
            x={base.x}
            y={minY - 14}
            textAnchor="middle"
            fill={color}
            fontSize={11}
            fontWeight={800}
            fontFamily="Nunito, sans-serif"
            opacity={0.9}
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
                  <>
                    <rect
                      x={pos.x - 13}
                      y={pos.y - 13}
                      width={26}
                      height={26}
                      rx={6}
                      fill="rgba(0,0,0,0.04)"
                      stroke="rgba(0,0,0,0.1)"
                      strokeWidth={0.5}
                      strokeDasharray="2 2"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(0,0,0,0.15)"
                      fontSize={9}
                      fontWeight={700}
                    >
                      {tIdx + 1}
                    </text>
                  </>
                )}
                {/* Token on home - idle */}
                {!tokenAtHome && !isFinished && (
                  <rect
                    x={pos.x - 13}
                    y={pos.y - 13}
                    width={26}
                    height={26}
                    rx={6}
                    fill="rgba(0,0,0,0.02)"
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth={0.5}
                    strokeDasharray="2 2"
                  />
                )}
                {/* Token present in yard */}
                {tokenAtHome && isSelectable && (
                  <g
                    onClick={() => onTokenClick?.(pIdx, tIdx)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={14}
                      fill={`url(#token-grad-${pIdx})`}
                      stroke="#fff"
                      strokeWidth={2.5}
                      filter={`url(#${GLOW_FILTER_ID})`}
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={17}
                      fill="none"
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth={2}
                    >
                      <animate
                        attributeName="r"
                        values="17;21;17"
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.6;0.1;0.6"
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      cx={pos.x - 3}
                      cy={pos.y - 3}
                      r={5}
                      fill="rgba(255,255,255,0.4)"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={11}
                      fontWeight={800}
                    >
                      {tIdx + 1}
                    </text>
                  </g>
                )}
                {tokenAtHome && !isSelectable && (
                  <g>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={11}
                      fill={`url(#token-grad-${pIdx})`}
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth={1.5}
                      filter={`url(#${TOKEN_FILTER_ID})`}
                      opacity={0.75}
                    />
                    <circle
                      cx={pos.x - 2}
                      cy={pos.y - 2}
                      r={4}
                      fill="rgba(255,255,255,0.25)"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={9}
                      fontWeight={800}
                    >
                      {tIdx + 1}
                    </text>
                  </g>
                )}
                {/* Finished token indicator */}
                {isFinished && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={8}
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
              y={maxY + 18}
              textAnchor="middle"
              fill={color}
              fontSize={12}
              fontWeight={700}
              opacity={0.8}
            >
              ✅ {player.tokens.filter(t => tokenIsFinished(t, pIdx)).length}/{TOKENS_PER_PLAYER}
            </text>
          )}
        </g>
      );
    });
  };

  const renderTrack = () => {
    return trackCells.map((cell, idx) => {
      const isStart = START_POS.includes(idx);
      const isSafe = [0, 10, 20, 30, 40, 50, 5, 15, 25, 35, 45, 55].includes(idx);
      const zoneIdx = getPlayerZoneIndex(idx);
      const zoneColor = zoneIdx >= 0 ? (players[zoneIdx]?.color || PLAYER_COLORS[players[zoneIdx]?.colorIndex ?? zoneIdx]) : null;
      const size = 17;
      const halfSize = size / 2;

      // Determine cell background
      let bgFill = '#faf6ed';
      let borderColor = '#d4c9b0';
      let borderWidth = 0.5;
      let cellOpacity = 0.85;

      if (zoneColor) {
        bgFill = zoneColor;
        cellOpacity = isStart ? 0.25 : 0.12;
        if (isStart) {
          borderColor = zoneColor;
          borderWidth = 1.5;
        }
      }

      return (
        <g key={`track-${idx}`}>
          {/* Cell background */}
          <rect
            x={cell.x - halfSize}
            y={cell.y - halfSize}
            width={size}
            height={size}
            rx={3}
      fill={zoneColor || '#1a1a3a'}
      fillOpacity={cellOpacity}
      stroke={borderColor}
      strokeWidth={borderWidth}
      strokeOpacity={zoneColor ? 0.6 : 0.15}
          />

          {/* Inner border for colored zones */}
          {zoneColor && (
            <rect
              x={cell.x - halfSize + 2}
              y={cell.y - halfSize + 2}
              width={size - 4}
              height={size - 4}
              rx={2}
              fill="none"
              stroke={zoneColor}
              strokeWidth={0.5}
              strokeOpacity={0.15}
            />
          )}

          {/* Star marker - Start positions get gold stars */}
          {isStart && (
            <text
              x={cell.x}
              y={cell.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={zoneColor || '#f1c40f'}
              fontSize={9}
              filter="url(#star-glow)"
            >
              ⭐
            </text>
          )}

          {/* Star marker - Safe spots */}
          {isSafe && !isStart && (
            <text
              x={cell.x}
              y={cell.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(0,0,0,0.15)"
              fontSize={7}
            >
              ⭐
            </text>
          )}
        </g>
      );
    });
  };

  const renderTokens = () => {
    return players.map((player, pIdx) => {
      return player.tokens.map((pos, tIdx) => {
        if (tokenIsHome(pos)) return null;
        if (tokenIsFinished(pos, pIdx)) return null;

        const color = player.color || PLAYER_COLORS[player.colorIndex];
        const isSelectable = isTokenSelectable(pIdx, tIdx);
        let x, y;

        if (tokenIsOnTrack(pos)) {
          const cell = trackCells[pos];
          x = cell.x;
          y = cell.y;
        } else if (tokenIsOnHomeStretch(pos, pIdx)) {
          const hsPositions = getHomeStretchPositions(pIdx, numSides);
          const hsIndex = pos - (100 + pIdx * 10);
          x = hsPositions[hsIndex].x;
          y = hsPositions[hsIndex].y;
        } else {
          return null;
        }

        const radius = isSelectable ? 11 : 9;

        return (
          <g
            key={`token-${pIdx}-${tIdx}`}
            onClick={() => isSelectable && onTokenClick?.(pIdx, tIdx)}
            style={{ cursor: isSelectable ? 'pointer' : 'default' }}
          >
            {/* Token group with spring animation */}
            <g>
              {/* Shadow */}
              <motion.circle
                r={radius}
                fill="rgba(0,0,0,0.3)"
                filter={`url(#${TOKEN_FILTER_ID})`}
                initial={false}
                animate={{ cx: x + 1.5, cy: y + 2, r: radius }}
                transition={TOKEN_SPRING}
              />

              {/* Token body */}
              <motion.circle
                r={radius}
                fill={`url(#token-grad-${pIdx})`}
                stroke={isSelectable ? '#fff' : 'rgba(255,255,255,0.35)'}
                strokeWidth={isSelectable ? 2.5 : 1.5}
                initial={false}
                animate={{ cx: x, cy: y, r: radius }}
                transition={TOKEN_SPRING}
              >
                {isSelectable && (
                  <animate
                    attributeName="r"
                    values={`${radius};${radius + 2};${radius}`}
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                )}
              </motion.circle>

              {/* Specular highlight */}
              <motion.circle
                r={radius * 0.35}
                fill="rgba(255,255,255,0.35)"
                initial={false}
                animate={{ cx: x - 2.5, cy: y - 2.5, r: radius * 0.35 }}
                transition={TOKEN_SPRING}
              />

              {/* Token number */}
              <motion.text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={isSelectable ? 10 : 8}
                fontWeight={800}
                fontFamily="sans-serif"
                initial={false}
                animate={{ x, y: y + 1 }}
                transition={TOKEN_SPRING}
              >
                {tIdx + 1}
              </motion.text>

              {/* Selection ring */}
              {isSelectable && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 6}
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                >
                  <animate
                    attributeName="r"
                    values={`${radius + 6};${radius + 10};${radius + 6}`}
                    dur="1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0.15;0.8"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          </g>
        );
      });
    });
  };

  const renderHomeStretches = () => {
    return players.map((player, pIdx) => {
      const hsPositions = getHomeStretchPositions(pIdx, numSides);
      const color = player.color || PLAYER_COLORS[player.colorIndex];
      const entry = HOME_ENTRY[pIdx];
      const entryCell = trackCells[entry];

      return (
        <g key={`hs-${pIdx}`}>
          {/* Home stretch path background */}
          <line
            x1={entryCell.x}
            y1={entryCell.y}
            x2={BOARD_CENTER.x}
            y2={BOARD_CENTER.y}
            stroke={color}
            strokeWidth={20}
            strokeOpacity={0.1}
          />
          <line
            x1={entryCell.x}
            y1={entryCell.y}
            x2={BOARD_CENTER.x}
            y2={BOARD_CENTER.y}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.2}
            strokeDasharray="4 5"
          />

          {/* Home stretch cells */}
          {hsPositions.map((pos, i) => {
            const cellSize = i === 0 ? 13 : 12;

            return (
              <g key={`hs-cell-${pIdx}-${i}`}>
                <rect
                  x={pos.x - cellSize / 2}
                  y={pos.y - cellSize / 2}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={color}
                  fillOpacity={i === 0 ? 0.2 : 0.12}
                  stroke={color}
                  strokeWidth={0.5}
                  strokeOpacity={0.3}
                />
                <text
                  x={pos.x}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={color}
                  fontSize={5.5}
                  opacity={0.4}
                  fontWeight={600}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}

          {/* Entry arrow */}
          <text
            x={(entryCell.x + BOARD_CENTER.x) / 2}
            y={(entryCell.y + BOARD_CENTER.y) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontSize={8}
            opacity={0.2}
          >
            ▶
          </text>
        </g>
      );
    });
  };

  // Compute outer polygon for arm zone clipping
  const outerPolyPoints = outerPoly.map(v => `${v.x},${v.y}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      style={{
        width: '100%',
        maxWidth: 580,
        height: 'auto',
        filter: 'drop-shadow(0 8px 40px rgba(0,0,0,0.6))',
      }}
    >
      {renderSVGFilters()}

      {/* Board frame */}
      {renderBoardFrame()}

      {/* Colored arm zones */}
      <clipPath id="board-clip">
        <polygon points={outerPolyPoints} />
      </clipPath>
      <g clipPath="url(#board-clip)">
        {renderArmZones()}
      </g>

      {/* Center area */}
      {renderCenter()}

      {/* Home stretches (under track) */}
      {renderHomeStretches()}

      {/* Track cells */}
      {renderTrack()}

      {/* Track ring border */}
      <polygon
        points={
          getPolygonVertices(numSides, 255).map(v => `${v.x},${v.y}`).join(' ')
        }
        fill="none"
        stroke="rgba(241,196,15,0.15)"
        strokeWidth={0.5}
        opacity={0.3}
      />

      {/* Home bases */}
      {renderHomeBases()}

      {/* Tokens on track/home stretch */}
      {renderTokens()}

      {/* Capture animation effects */}
      <AnimatePresence>
        {captureEffects.map(effect => (
          <g key={effect.id}>
            {effect.type === 'capturer' && (
              <>
                <motion.circle
                  cx={effect.x}
                  cy={effect.y}
                  r={0}
                  fill="none"
                  stroke={effect.color}
                  strokeWidth={3}
                  strokeOpacity={0.9}
                  initial={{ r: 0, opacity: 0.9 }}
                  animate={{ r: 30, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
                <motion.circle
                  cx={effect.x}
                  cy={effect.y}
                  r={0}
                  fill="none"
                  stroke={effect.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  initial={{ r: 0, opacity: 0.5 }}
                  animate={{ r: 45, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                />
                <motion.circle
                  cx={effect.x}
                  cy={effect.y}
                  r={10}
                  fill={effect.color}
                  initial={{ opacity: 0.8, scale: 0.3 }}
                  animate={{ opacity: 0, scale: 3 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
                <motion.text
                  x={effect.x}
                  y={effect.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={20}
                  fontWeight={900}
                  initial={{ opacity: 1, scale: 0.3, y: effect.y }}
                  animate={{ opacity: 0, scale: 2.2, y: effect.y - 18 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                  ⚡
                </motion.text>
              </>
            )}
            {effect.type === 'captured' && (
              <>
                <motion.circle
                  cx={effect.x}
                  cy={effect.y}
                  r={8}
                  fill="#ff4444"
                  initial={{ opacity: 0.6, scale: 0.2 }}
                  animate={{ opacity: 0, scale: 2.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
                <motion.circle
                  cx={effect.x}
                  cy={effect.y}
                  r={0}
                  fill="none"
                  stroke="#ff4444"
                  strokeWidth={2}
                  initial={{ r: 0, opacity: 0.7 }}
                  animate={{ r: 24, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
                <motion.text
                  x={effect.x}
                  y={effect.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={18}
                  initial={{ opacity: 1, scale: 0.4, y: effect.y }}
                  animate={{ opacity: 0, scale: 1.8, y: effect.y - 15 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  💥
                </motion.text>
              </>
            )}
          </g>
        ))}
      </AnimatePresence>

      {/* Victory celebration animation - when a player wins all tokens home */}
      <AnimatePresence>
        {victoryEffects.map(effect => (
          <g key={effect.id}>
            {/* Massive golden expanding shockwave 1 */}
            <motion.circle
              cx={effect.cx}
              cy={effect.cy}
              r={0}
              fill="none"
              stroke="#f1c40f"
              strokeWidth={4}
              strokeOpacity={0.9}
              initial={{ r: 0, opacity: 0.9 }}
              animate={{ r: 160, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            {/* Large golden ring 2 */}
            <motion.circle
              cx={effect.cx}
              cy={effect.cy}
              r={0}
              fill="none"
              stroke="#f1c40f"
              strokeWidth={2}
              strokeOpacity={0.6}
              initial={{ r: 0, opacity: 0.6 }}
              animate={{ r: 240, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
            />
            {/* Player-colored massive burst */}
            <motion.circle
              cx={effect.cx}
              cy={effect.cy}
              r={20}
              fill={effect.color}
              initial={{ opacity: 0.7, scale: 0.3 }}
              animate={{ opacity: 0, scale: 6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* White center flash */}
            <motion.circle
              cx={effect.cx}
              cy={effect.cy}
              r={12}
              fill="#fff"
              initial={{ opacity: 1, scale: 0.1 }}
              animate={{ opacity: 0, scale: 3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            {/* Victory confetti burst (24 particles) */}
            {effect.confetti.map((p, i) => (
              <motion.circle
                key={`vconf-${i}`}
                cx={effect.cx}
                cy={effect.cy}
                r={p.r}
                fill={p.color}
                initial={{ opacity: 1, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  x: Math.cos(p.angle) * p.dist,
                  y: Math.sin(p.angle) * p.dist,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: p.delay }}
              />
            ))}
            {/* Floating victory emojis rising up */}
            {effect.floatingEmojis.map((s, i) => (
              <motion.text
                key={`vemoji-${i}`}
                x={effect.cx + s.x}
                y={effect.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={s.fontSize}
                initial={{ opacity: 1, y: effect.cy }}
                animate={{ opacity: 0, y: effect.cy - 80 - i * 20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: s.delay }}
              >
                {s.emoji}
              </motion.text>
            ))}
            {/* Crown drop animation */}
            <motion.text
              x={effect.cx}
              y={effect.cy - 90}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={32}
              initial={{ opacity: 0, y: effect.cy - 150 }}
              animate={{ opacity: [0, 1, 1, 1], y: [effect.cy - 150, effect.cy - 90, effect.cy - 85, effect.cy - 90] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut', times: [0, 0.3, 0.45, 0.6] }}
            >
              👑
            </motion.text>
            {/* Grand winner announcement */}
            <motion.text
              x={effect.cx}
              y={effect.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={effect.color}
              fontSize={20}
              fontWeight={900}
              fontFamily="Nunito, sans-serif"
              filter="url(#star-glow)"
              initial={{ opacity: 0, scale: 0.3, y: effect.cy }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.2, 1.1, 0.9], y: effect.cy - 50 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: 'easeOut', times: [0, 0.15, 0.5, 1] }}
            >
              🏆 {effect.emoji} {effect.playerName} Wins!
            </motion.text>
          </g>
        ))}
      </AnimatePresence>

      {/* Token reached home celebration animation */}
      <AnimatePresence>
        {finishedEffects.map(effect => (
          <g key={effect.id}>
            {/* Golden expanding shockwave */}
            <motion.circle
              cx={effect.cx}
              cy={effect.cy}
              r={0}
              fill="none"
              stroke="#f1c40f"
              strokeWidth={3}
              strokeOpacity={0.8}
              initial={{ r: 0, opacity: 0.8 }}
              animate={{ r: 80, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* Second golden ring */}
            <motion.circle
              cx={effect.cx}
              cy={effect.cy}
              r={0}
              fill="none"
              stroke="#f1c40f"
              strokeWidth={1.5}
              strokeOpacity={0.5}
              initial={{ r: 0, opacity: 0.5 }}
              animate={{ r: 130, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
            />
            {/* Player-colored inner burst */}
            <motion.circle
              cx={effect.cx}
              cy={effect.cy}
              r={15}
              fill={effect.color}
              initial={{ opacity: 0.6, scale: 0.2 }}
              animate={{ opacity: 0, scale: 4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            {/* White flash */}
            <motion.circle
              cx={effect.cx}
              cy={effect.cy}
              r={10}
              fill="#fff"
              initial={{ opacity: 0.9, scale: 0.1 }}
              animate={{ opacity: 0, scale: 2.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
            {/* Confetti particles flying outward (pre-computed for stable animation) */}
            {effect.confetti.map((p, i) => (
              <motion.circle
                key={`conf-${i}`}
                cx={effect.cx}
                cy={effect.cy}
                r={p.r}
                fill={p.color}
                initial={{ opacity: 1, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  x: Math.cos(p.angle) * p.dist,
                  y: Math.sin(p.angle) * p.dist,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: p.delay }}
              />
            ))}
            {/* Rising star/sparkle (pre-computed for stable animation) */}
            {effect.stars.map((s, i) => (
              <motion.text
                key={`star-${i}`}
                x={effect.cx + s.x}
                y={effect.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={s.fontSize}
                initial={{ opacity: 1, y: effect.cy }}
                animate={{ opacity: 0, y: effect.cy - 40 - i * 25 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 + i * 0.15 }}
              >
                {s.emoji}
              </motion.text>
            ))}
            {/* Player announcement text rising and fading */}
            <motion.text
              x={effect.cx}
              y={effect.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={effect.color}
              fontSize={16}
              fontWeight={900}
              fontFamily="Nunito, sans-serif"
              initial={{ opacity: 0, scale: 0.5, y: effect.cy + 10 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.1, 1, 0.8], y: effect.cy - 40 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut', times: [0, 0.15, 0.6, 1] }}
            >
              {effect.emoji} Token {effect.tokenNumber} Reached Home!
            </motion.text>
          </g>
        ))}
      </AnimatePresence>

      {/* Winner display */}
      {players.find(p => p.finished && p.tokens.every(t => tokenIsFinished(t, players.indexOf(p)))) && (
        <text
          x={BOARD_CENTER.x}
          y={BOARD_CENTER.y + 52}
          textAnchor="middle"
          fill="#d4a017"
          fontSize={13}
          fontWeight={800}
          fontFamily="'Fredoka One', cursive"
          opacity={0.9}
        >
          🏆 Winner!
        </text>
      )}

      {/* Turn indicator */}
      {players[currentPlayerIndex] && (
        <g>
          <rect
            x={BOARD_CENTER.x - 170}
            y={BOARD_SIZE - 32}
            width={340}
            height={24}
            rx={12}
            fill="rgba(0,0,0,0.06)"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={0.5}
          />
          <text
            x={BOARD_CENTER.x}
            y={BOARD_SIZE - 17}
            textAnchor="middle"
            fill={players[currentPlayerIndex].color}
            fontSize={12}
            fontWeight={800}
            fontFamily="Nunito, sans-serif"
          >
            {players[currentPlayerIndex].emoji} {players[currentPlayerIndex].name}'s Turn
            {diceValue !== null && ` • Rolled ${diceValue}`}
          </text>
        </g>
      )}
    </svg>
  );
}
