export const TRACK_SIZE = 60;
export const HOME_STRETCH_LENGTH = 6;
export const TOKENS_PER_PLAYER = 4;
export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;
export const PLAYER_COUNT_OPTIONS = [2, 3, 4, 5, 6];

export const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
export const PLAYER_COLORS_LIGHT = ['#fadbd8', '#d4e6f1', '#d5f5e3', '#fef9e7', '#e8daef', '#fdebd0'];
export const PLAYER_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];
export const PLAYER_EMOJIS = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];

// Player i enters the track at START_POS[i]
// After going around the track, player i enters home stretch at HOME_ENTRY[i]
export const START_POS = [0, 10, 20, 30, 40, 50];
export const HOME_ENTRY = [56, 6, 16, 26, 36, 46];

// Token state encoding
export const TOKEN_HOME = -1;
export const TOKEN_FINISHED_BASE = 200;

export function tokenIsHome(pos) { return pos === TOKEN_HOME; }
export function tokenIsOnTrack(pos) { return pos >= 0 && pos < TRACK_SIZE; }
export function tokenIsOnHomeStretch(pos, playerIdx) {
  const base = 100 + playerIdx * 10;
  return pos >= base && pos < base + HOME_STRETCH_LENGTH;
}
export function tokenIsFinished(pos, playerIdx) {
  return pos === TOKEN_FINISHED_BASE + playerIdx;
}
export function getTokenStateLabel(pos, playerIdx) {
  if (tokenIsHome(pos)) return '🏠 Home';
  if (tokenIsOnTrack(pos)) return `📍 Track ${pos}`;
  if (tokenIsOnHomeStretch(pos, playerIdx)) return `🏁 Stretch ${pos - (100 + playerIdx * 10)}`;
  if (tokenIsFinished(pos, playerIdx)) return '✅ Finished';
  return '❓ Unknown';
}

// Safe spots where tokens cannot be captured
export const SAFE_SPOTS = new Set([0, 10, 20, 30, 40, 50, 5, 15, 25, 35, 45, 55]);

// Check if a main track position is a safe spot
export function isSafeSpot(pos) {
  return SAFE_SPOTS.has(pos);
}

// Convert home stretch position (0-5) to absolute encoded position for a player
export function homeStretchToAbs(playerIdx, hsPos) {
  return 100 + playerIdx * 10 + hsPos;
}

// Convert absolute encoded home stretch position to (playerIdx, hsPos)
export function absToHomeStretch(absPos) {
  const playerIdx = Math.floor((absPos - 100) / 10);
  const hsPos = (absPos - 100) % 10;
  return { playerIdx, hsPos };
}

// --- Board SVG Layout ---
// 6-player hexagonal board
// Center at (450, 450), radius ~280 for the track ring
export const BOARD_SIZE = 900;
export const BOARD_CENTER = { x: 450, y: 450 };

// Hexagon vertices (outer ring where home bases are)
export function getHexVertices(radius = 330) {
  const cx = BOARD_CENTER.x;
  const cy = BOARD_CENTER.y;
  const vertices = [];
  // Start from top (90° in standard math) and go clockwise
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 2) - (i * Math.PI / 3);
    vertices.push({
      x: cx + radius * Math.cos(angle),
      y: cy - radius * Math.sin(angle),
    });
  }
  return vertices;
}

// Track cell positions (60 cells on a hexagonal ring)
export function getTrackCellPositions(radius = 250) {
  const cx = BOARD_CENTER.x;
  const cy = BOARD_CENTER.y;
  const vertices = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 2) - (i * Math.PI / 3);
    vertices.push({
      x: cx + radius * Math.cos(angle),
      y: cy - radius * Math.sin(angle),
    });
  }

  const positions = [];
  // For each side of the hexagon (6 sides, 10 cells each = 60 cells)
  for (let side = 0; side < 6; side++) {
    const from = vertices[side];
    const to = vertices[(side + 1) % 6];
    for (let j = 0; j < 10; j++) {
      const t = j / 10;
      // Slightly offset from the exact vertex to make cells distinct
      const offset = (j === 0) ? 0.02 : (j === 9) ? 0.98 : t;
      positions.push({
        x: from.x + (to.x - from.x) * offset,
        y: from.y + (to.y - from.y) * offset,
        side,
        index: side * 10 + j,
      });
    }
  }
  return positions;
}

// Home stretch cell positions (6 cells per player, going from track toward center)
export function getHomeStretchPositions(playerIdx) {
  const cx = BOARD_CENTER.x;
  const cy = BOARD_CENTER.y;
  const trackRadius = 250;

  // Entry point on the track
  const entryPos = HOME_ENTRY[playerIdx];
  const entryCell = getTrackCellPositions(trackRadius)[entryPos];

  // Direction from entry point toward center
  const dx = cx - entryCell.x;
  const dy = cy - entryCell.y;

  const positions = [];
  for (let i = 0; i < HOME_STRETCH_LENGTH; i++) {
    const t = (i + 1) / (HOME_STRETCH_LENGTH + 1);
    positions.push({
      x: entryCell.x + dx * t,
      y: entryCell.y + dy * t,
      index: i,
    });
  }
  return positions;
}

// Home base positions (where the 4 tokens sit initially)
export function getHomeBasePositions(playerIdx) {
  const cx = BOARD_CENTER.x;
  const cy = BOARD_CENTER.y;
  const outerRadius = 340;

  // The home base for each player is near the vertex
  const angle = (Math.PI / 2) - (playerIdx * Math.PI / 3);
  const baseX = cx + outerRadius * Math.cos(angle);
  const baseY = cy - outerRadius * Math.sin(angle);

  // 4 tokens arranged in a small square
  const offset = 30;
  return [
    { x: baseX - offset, y: baseY - offset },
    { x: baseX + offset, y: baseY - offset },
    { x: baseX - offset, y: baseY + offset },
    { x: baseX + offset, y: baseY + offset },
  ];
}

// Get the SVG coordinates for a token given its position
export function getTokenPosition(tokenPos, playerIdx) {
  if (tokenIsHome(tokenPos)) {
    const homePositions = getHomeBasePositions(playerIdx);
    // We'll need to know which token index this is - handle in the component
    return homePositions;
  }

  if (tokenIsOnTrack(tokenPos)) {
    const trackCells = getTrackCellPositions(250);
    return trackCells[tokenPos];
  }

  if (tokenIsOnHomeStretch(tokenPos, playerIdx)) {
    const hsPositions = getHomeStretchPositions(playerIdx);
    const hsIndex = tokenPos - (100 + playerIdx * 10);
    return hsPositions[hsIndex];
  }

  if (tokenIsFinished(tokenPos, playerIdx)) {
    // Completed tokens sit near the center
    const angle = (Math.PI / 2) - (playerIdx * Math.PI / 3);
    return {
      x: BOARD_CENTER.x + 20 * Math.cos(angle),
      y: BOARD_CENTER.y - 20 * Math.sin(angle),
    };
  }

  return BOARD_CENTER;
}
