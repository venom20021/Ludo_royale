import { v4 as uuidv4 } from 'uuid';

// --- Constants ---
const TRACK_SIZE = 60;
const HOME_STRETCH_LENGTH = 6;
const TOKENS_PER_PLAYER = 4;

const TOKEN_HOME = -1;
const TOKEN_FINISHED_BASE = 200;

const START_POS = [0, 10, 20, 30, 40, 50];
const HOME_ENTRY = [56, 6, 16, 26, 36, 46];

const SAFE_SPOTS = new Set([0, 10, 20, 30, 40, 50, 5, 15, 25, 35, 45, 55]);

// --- Helper Functions ---
function isOnTrack(pos) { return pos >= 0 && pos < TRACK_SIZE; }
function isOnHomeStretch(pos, playerIdx) {
  const base = 100 + playerIdx * 10;
  return pos >= base && pos < base + HOME_STRETCH_LENGTH;
}
function isFinished(pos, playerIdx) { return pos === TOKEN_FINISHED_BASE + playerIdx; }
function isHome(pos) { return pos === TOKEN_HOME; }
function isSafe(pos) { return SAFE_SPOTS.has(pos); }

function makeHomeStretchPos(playerIdx, hsIndex) {
  return 100 + playerIdx * 10 + hsIndex;
}

function getHomeStretchIndex(absPos, playerIdx) {
  return absPos - (100 + playerIdx * 10);
}

// Forward movement on the track
function moveOnTrack(currentPos, steps) {
  return (currentPos + steps) % TRACK_SIZE;
}

// Calculate forward distance from pos to target on the track (clockwise)
function forwardDistance(from, to) {
  if (from <= to) return to - from;
  return TRACK_SIZE - from + to;
}

// --- Initial State ---
export function createInitialState(gameMode = 'classic') {
  return {
    players: [],
    currentPlayerIndex: 0,
    diceValue: null,
    phase: 'waiting', // 'waiting', 'playing', 'finished'
    winner: null,
    consecutiveSixes: 0,
    turnPhase: 'roll', // 'roll', 'move'
    turnStartTime: null, // Date.now() when current turn phase started
    log: [],
    turnNumber: 0,
    gameMode, // 'classic' (4 tokens to win) or 'quick' (3 tokens to win)
  };
}

// --- Dice ---
export function rollDice(playerIdx) {
  // Player 6 (index 5, Orange) never rolls a 6 - use 1-5 range
  if (playerIdx === 5) {
    return Math.floor(Math.random() * 5) + 1; // 1-5 only
  }
  return Math.floor(Math.random() * 6) + 1;
}

// --- Core Game Logic ---

// Get all positions occupied by opponents of the given player
function getOccupiedPositions(state, playerIdx) {
  const occupied = new Map(); // position -> { playerIdx, tokenIdx }
  for (let i = 0; i < state.players.length; i++) {
    if (i === playerIdx) continue;
    state.players[i].tokens.forEach((pos, tIdx) => {
      if (isOnTrack(pos)) {
        occupied.set(pos, { playerIdx: i, tokenIdx: tIdx });
      }
    });
  }
  return occupied;
}

// Get positions occupied by the player's own tokens (excluding the one being moved)
function getSelfOccupiedPositions(state, playerIdx, excludeTokenIdx) {
  const occupied = new Set();
  state.players[playerIdx].tokens.forEach((pos, tIdx) => {
    if (tIdx === excludeTokenIdx) return;
    if (isOnTrack(pos)) occupied.add(pos);
    if (isOnHomeStretch(pos, playerIdx)) occupied.add(pos);
  });
  return occupied;
}

// Check if a player has any valid moves
export function hasValidMoves(state, playerIdx) {
  const player = state.players[playerIdx];
  if (!player) return false;
  const dice = state.diceValue;

  for (let t = 0; t < player.tokens.length; t++) {
    const pos = player.tokens[t];
    if (isFinished(pos, playerIdx)) continue;

    if (isHome(pos)) {
      // Need a 6 to enter — but check self-blocking at start position
      if (dice === 6) {
        const selfOccupied = getSelfOccupiedPositions(state, playerIdx, t);
        if (!selfOccupied.has(START_POS[playerIdx])) {
          return true;
        }
      }
      continue;
    }

    if (isOnTrack(pos)) {
      const distanceToEntry = forwardDistance(pos, HOME_ENTRY[playerIdx]);
      const selfOccupied = getSelfOccupiedPositions(state, playerIdx, t);

      if (dice < distanceToEntry) {
        // Moving on the track — check if destination is blocked by own token
        const newPos = moveOnTrack(pos, dice);
        if (!selfOccupied.has(newPos)) {
          return true;
        }
      } else if (dice === distanceToEntry) {
        // Exactly at home stretch entry — enters home stretch
        // Check if home stretch cell 0 is blocked by own token
        const hsPos = makeHomeStretchPos(playerIdx, 0);
        if (!selfOccupied.has(hsPos)) {
          return true;
        }
      } else {
        // dice > distanceToEntry - overshoot into home stretch
        const overshoot = dice - distanceToEntry;
        if (overshoot <= HOME_STRETCH_LENGTH) {
          const hsPos = makeHomeStretchPos(playerIdx, overshoot - 1);
          if (!selfOccupied.has(hsPos)) {
            return true;
          }
        }
      }
    }

    if (isOnHomeStretch(pos, playerIdx)) {
      const hsIndex = getHomeStretchIndex(pos, playerIdx);
      const remaining = HOME_STRETCH_LENGTH - hsIndex;
      if (dice <= remaining) {
        const newHsIndex = hsIndex + dice;
        if (newHsIndex < HOME_STRETCH_LENGTH) {
          // Check if destination home stretch cell is blocked by own token
          const hsPos = makeHomeStretchPos(playerIdx, newHsIndex);
          const selfOccupied = getSelfOccupiedPositions(state, playerIdx, t);
          if (!selfOccupied.has(hsPos)) {
            return true;
          }
        } else {
          // Reaching home (center) — always valid, no blocking
          return true;
        }
      }
    }
  }

  return false;
}

// Try to move a token. Returns { success, newState, error? }
export function moveToken(state, playerIdx, tokenIdx) {
  if (state.phase !== 'playing') {
    return { success: false, error: 'Game is not in playing phase.' };
  }
  if (state.turnPhase !== 'move') {
    return { success: false, error: 'Not in move phase. Roll the dice first.' };
  }
  if (state.currentPlayerIndex !== playerIdx) {
    return { success: false, error: 'Not your turn.' };
  }

  const player = state.players[playerIdx];
  if (!player) {
    return { success: false, error: 'Player not found.' };
  }

  const dice = state.diceValue;
  if (dice === null || dice === undefined) {
    return { success: false, error: 'No dice value. Roll first.' };
  }

  const tokenPos = player.tokens[tokenIdx];
  if (tokenPos === undefined) {
    return { success: false, error: 'Invalid token index.' };
  }

  if (isFinished(tokenPos, playerIdx)) {
    return { success: false, error: 'This token has already finished.' };
  }

  let newState = JSON.parse(JSON.stringify(state));
  const newPlayer = newState.players[playerIdx];
  let moveDescription = '';
  let captured = false;
  let gotExtraTurn = false;

  // Self-blocking check: compute the destination before moving
  if (isHome(tokenPos)) {
    // Enter from home - need a 6
    if (dice !== 6) {
      return { success: false, error: 'Must roll a 6 to enter from home.' };
    }
    
    // Check self-blocking at start position
    const selfOccupied = getSelfOccupiedPositions(newState, playerIdx, tokenIdx);
    if (selfOccupied.has(START_POS[playerIdx])) {
      return { success: false, error: 'Cannot move: start position blocked by your own token.' };
    }
    
    newPlayer.tokens[tokenIdx] = START_POS[playerIdx];
    moveDescription = `🎲 Rolled 6 — Token ${tokenIdx + 1} enters the track at start position.`;

    // Check if landing on opponent at start position
    const occupied = getOccupiedPositions(newState, playerIdx);
    if (occupied.has(START_POS[playerIdx]) && !isSafe(START_POS[playerIdx])) {
      const target = occupied.get(START_POS[playerIdx]);
      newState.players[target.playerIdx].tokens[target.tokenIdx] = TOKEN_HOME;
      captured = true;
      moveDescription += ` Captured ${PLAYER_NAMES[target.playerIdx]}'s token! 💥`;
    }
  } else if (isOnTrack(tokenPos)) {
    const distanceToEntry = forwardDistance(tokenPos, HOME_ENTRY[playerIdx]);

    if (dice < distanceToEntry) {
      // Move on track
      const newPos = moveOnTrack(tokenPos, dice);
      
      // Check self-blocking at destination
      const selfOccupied = getSelfOccupiedPositions(newState, playerIdx, tokenIdx);
      if (selfOccupied.has(newPos)) {
        return { success: false, error: 'Cannot move: destination blocked by your own token.' };
      }
      
      newPlayer.tokens[tokenIdx] = newPos;
      moveDescription = `Moved Token ${tokenIdx + 1} from ${tokenPos} to ${newPos}.`;

      // Check for captures
      if (!isSafe(newPos)) {
        const occupied = getOccupiedPositions(newState, playerIdx);
        if (occupied.has(newPos)) {
          const target = occupied.get(newPos);
          newState.players[target.playerIdx].tokens[target.tokenIdx] = TOKEN_HOME;
          captured = true;
          moveDescription += ` Captured ${PLAYER_NAMES[target.playerIdx]}'s token! 💥`;
        }
      }
    } else if (dice === distanceToEntry) {
      // Reach home stretch entry - enter home stretch
      const hsPos = makeHomeStretchPos(playerIdx, 0);
      
      // Check self-blocking in home stretch cell 0
      const selfOccupied = getSelfOccupiedPositions(newState, playerIdx, tokenIdx);
      if (selfOccupied.has(hsPos)) {
        return { success: false, error: 'Cannot move: home stretch blocked by your own token.' };
      }
      
      newPlayer.tokens[tokenIdx] = hsPos;
      moveDescription = `Moved Token ${tokenIdx + 1} into home stretch! 🏁`;

      // Check for captures at the entry point (the last main track position)
      if (!isSafe(HOME_ENTRY[playerIdx])) {
        const occupied = getOccupiedPositions(newState, playerIdx);
        if (occupied.has(HOME_ENTRY[playerIdx])) {
          const target = occupied.get(HOME_ENTRY[playerIdx]);
          newState.players[target.playerIdx].tokens[target.tokenIdx] = TOKEN_HOME;
          captured = true;
          moveDescription += ` Captured ${PLAYER_NAMES[target.playerIdx]}'s token at entry! 💥`;
        }
      }
    } else {
      // dice > distanceToEntry
      // Enter home stretch and move further
      const overshoot = dice - distanceToEntry;
      if (overshoot <= HOME_STRETCH_LENGTH) {
        const hsPos = makeHomeStretchPos(playerIdx, overshoot - 1);
        
        // Check self-blocking in destination home stretch cell
        const selfOccupied = getSelfOccupiedPositions(newState, playerIdx, tokenIdx);
        if (selfOccupied.has(hsPos)) {
          return { success: false, error: 'Cannot move: home stretch blocked by your own token.' };
        }
        
        newPlayer.tokens[tokenIdx] = hsPos;
        moveDescription = `Moved Token ${tokenIdx + 1} to home stretch position ${overshoot}. 🏁`;
      } else {
        return { success: false, error: 'Cannot move: would overshoot home.' };
      }
    }
  } else if (isOnHomeStretch(tokenPos, playerIdx)) {
    const hsIndex = getHomeStretchIndex(tokenPos, playerIdx);
    const remaining = HOME_STRETCH_LENGTH - hsIndex;

    if (dice < remaining) {
      const newHsIndex = hsIndex + dice;
      const hsPos = makeHomeStretchPos(playerIdx, newHsIndex);
      
      // Check self-blocking in destination home stretch cell
      const selfOccupied = getSelfOccupiedPositions(newState, playerIdx, tokenIdx);
      if (selfOccupied.has(hsPos)) {
        return { success: false, error: 'Cannot move: home stretch blocked by your own token.' };
      }
      
      newPlayer.tokens[tokenIdx] = hsPos;
      moveDescription = `Moved Token ${tokenIdx + 1} to home stretch position ${newHsIndex + 1}. 🏁`;
    } else if (dice === remaining) {
      // Reach the center! (Always valid — no blocking at the center)
      newPlayer.tokens[tokenIdx] = TOKEN_FINISHED_BASE + playerIdx;
      moveDescription = `Token ${tokenIdx + 1} reached home! 🎉`;

      // Check if enough tokens finished (4 for classic, 3 for quick)
      const finishedCount = newPlayer.tokens.filter(p => isFinished(p, playerIdx)).length;
      const tokensToWin = newState.gameMode === 'quick' ? 3 : 4;
      if (finishedCount >= tokensToWin) {
        newPlayer.finished = true;
        if (!newState.winner) {
          newState.winner = playerIdx;
          newState.phase = 'finished';
          moveDescription += ` ${PLAYER_NAMES[playerIdx]} wins the game! 🏆`;
        }
      }
    } else {
      return { success: false, error: 'Need exact roll to reach home.' };
    }
  }

  // Handle turn advancement
  // Rules: roll a 6 → extra turn (unless 3 consecutive sixes = lose turn)
  //        capture a token → extra turn
  //        otherwise → advance to next player
  let shouldAdvanceTurn = true;

  if (dice === 6) {
    newState.consecutiveSixes++;
    if (newState.consecutiveSixes >= 3) {
      moveDescription += ' Three consecutive sixes! Turn lost. ❌';
      // shouldAdvanceTurn stays true
    } else {
      shouldAdvanceTurn = false;
      gotExtraTurn = true;
      moveDescription += ' Rolled a 6 — extra turn! 🔄';
    }
  } else {
    newState.consecutiveSixes = 0;
    if (captured) {
      shouldAdvanceTurn = false;
      moveDescription += ' Captured a token — extra turn! 🔄';
    }
    // else: shouldAdvanceTurn stays true (normal move, advance turn)
  }

  if (shouldAdvanceTurn) {
    advanceTurn(newState);
  }

  // Log the move
  newState.log.push({
    turn: newState.turnNumber,
    playerIdx,
    playerName: PLAYER_NAMES[playerIdx],
    emoji: PLAYER_EMOJIS[playerIdx],
    diceValue: dice,
    description: moveDescription,
    timestamp: Date.now(),
  });

  newState.diceValue = null;
  newState.turnPhase = 'roll';

  // Check for game end (all but one player finished, or winner declared)
  if (newState.phase !== 'finished') {
    checkGameEnd(newState);
  }

  return { success: true, newState, captured, gotExtraTurn };
}

// Roll dice for the current player
export function rollForPlayer(state, playerIdx) {
  if (state.phase !== 'playing') {
    return { success: false, error: 'Game is not in playing phase.' };
  }
  if (state.turnPhase !== 'roll') {
    return { success: false, error: 'Already rolled. Move a token.' };
  }
  if (state.currentPlayerIndex !== playerIdx) {
    return { success: false, error: 'Not your turn.' };
  }

  const diceValue = rollDice(playerIdx);
  const newState = JSON.parse(JSON.stringify(state));
  newState.diceValue = diceValue;
  newState.turnPhase = 'move';

  newState.log.push({
    turn: newState.turnNumber,
    playerIdx,
    playerName: PLAYER_NAMES[playerIdx],
    emoji: PLAYER_EMOJIS[playerIdx],
    diceValue,
    description: `🎲 Rolled a ${diceValue}!`,
    timestamp: Date.now(),
  });

  // Check if any valid move exists
  if (!hasValidMoves(newState, playerIdx)) {
    newState.log.push({
      turn: newState.turnNumber,
      playerIdx,
      playerName: PLAYER_NAMES[playerIdx],
      emoji: PLAYER_EMOJIS[playerIdx],
      diceValue,
      description: `No valid moves. Turn skipped. ⏭️`,
      timestamp: Date.now(),
    });
    newState.diceValue = null;
    newState.turnPhase = 'roll';
    advanceTurn(newState);
  } else {
    // Set turnStartTime for the move phase timer
    newState.turnStartTime = Date.now();
  }

  return { success: true, newState, diceValue };
}

export function advanceTurn(state) {
  state.consecutiveSixes = 0;
  state.turnNumber++;
  state.turnStartTime = Date.now();

  // Find next player who hasn't finished
  const playerCount = state.players.length;
  if (playerCount === 0) return;
  
  let nextPlayer = (state.currentPlayerIndex + 1) % playerCount;
  let attempts = 0;
  
  // Guard against infinite loop: at most check all players twice
  while (state.players[nextPlayer]?.finished && attempts < playerCount * 2) {
    nextPlayer = (nextPlayer + 1) % playerCount;
    attempts++;
  }

  state.currentPlayerIndex = nextPlayer;
  state.diceValue = null;
  state.turnPhase = 'roll';
}

// Auto-skip the current turn (used when turn timer expires)
export function skipTurn(state) {
  const newState = JSON.parse(JSON.stringify(state));
  const playerIdx = newState.currentPlayerIndex;
  
  newState.log.push({
    turn: newState.turnNumber,
    playerIdx,
    playerName: PLAYER_NAMES[playerIdx],
    emoji: PLAYER_EMOJIS[playerIdx],
    diceValue: newState.diceValue,
    description: `⏰ Timeout! Turn skipped.`,
    timestamp: Date.now(),
  });
  
  newState.diceValue = null;
  newState.turnPhase = 'roll';
  advanceTurn(newState);
  return newState;
}

function checkGameEnd(state) {
  const activePlayers = state.players.filter(p => !p.finished).length;
  // If only one player left who hasn't finished, they win
  // Or if someone reached max tokens home (handled in moveToken)
  if (activePlayers <= 1) {
    state.phase = 'finished';
    // Find the last remaining player as winner (if no winner yet)
    if (!state.winner) {
      const lastPlayer = state.players.findIndex(p => !p.finished);
      if (lastPlayer !== -1) {
        state.winner = lastPlayer;
      }
    }
  }
}

// --- Constants used in this module ---
// Classic 4-color layout: Green (top-left), Yellow (top-right), Red (bottom-left), Blue (bottom-right)
const PLAYER_NAMES = ['Green', 'Yellow', 'Red', 'Blue', 'Purple', 'Orange'];
const PLAYER_EMOJIS = ['🟢', '🟡', '🔴', '🔵', '🟣', '🟠'];
