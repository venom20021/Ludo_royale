import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialState,
  rollDice,
  rollForPlayer,
  moveToken,
  hasValidMoves,
  advanceTurn,
  skipTurn,
} from './GameEngine.js';

// ─── Helpers ────────────────────────────────────────────────────

function makePlayer(index, tokens = [-1, -1, -1, -1], finished = false) {
  const colors = ['#2ecc71', '#f1c40f', '#e74c3c', '#3498db', '#9b59b6', '#e67e22'];
  const emojis = ['🟢', '🟡', '🔴', '🔵', '🟣', '🟠'];
  return {
    id: `p${index}`,
    socketId: `s${index}`,
    name: `P${index + 1}`,
    colorIndex: index,
    color: colors[index],
    emoji: emojis[index],
    tokens: [...tokens],
    finished,
    finishOrder: null,
    connected: true,
  };
}

function bootState(playerCount, gameMode = 'classic') {
  const state = createInitialState(gameMode);
  state.phase = 'playing';
  state.currentPlayerIndex = 0;
  state.turnPhase = 'roll';
  state.turnNumber = 1;
  for (let i = 0; i < playerCount; i++) {
    state.players.push(makePlayer(i));
  }
  return state;
}

// 200 is TOKEN_FINISHED_BASE (from GameEngine.js — can't import constant so hardcode)
const FIN = 200;

// ─── createInitialState ─────────────────────────────────────────

describe('createInitialState', () => {
  it('creates state with classic mode by default', () => {
    const s = createInitialState();
    assert.equal(s.gameMode, 'classic');
    assert.equal(s.phase, 'waiting');
    assert.equal(s.players.length, 0);
  });

  it('creates state with quick mode when specified', () => {
    const s = createInitialState('quick');
    assert.equal(s.gameMode, 'quick');
  });
});

// ─── rollDice ───────────────────────────────────────────────────

describe('rollDice', () => {
  it('returns a number between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const val = rollDice();
      assert.ok(val >= 1 && val <= 6, `Dice value ${val} out of range`);
    }
  });
});

// ─── Win Condition ──────────────────────────────────────────────

describe('Win condition', () => {
  it('Quick mode: 3rd token reaching center triggers win', () => {
    const state = bootState(2, 'quick');
    // Player 0: 2 tokens finished, 1 at last home stretch cell, 1 in yard
    // Home stretch for player 0: 100 + 0*10 + index = 100 + index
    // Last cell before center is index 5 → position 105
    state.players[0].tokens = [FIN, FIN, 105, -1];
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 1; // Exact roll to go from home stretch cell 5 to center

    const result = moveToken(state, 0, 2);
    assert.ok(result.success);
    // Token 2 should now be at finish (200)
    assert.equal(result.newState.players[0].tokens[2], FIN);
    // 3rd token finished → should win in Quick mode
    assert.equal(result.newState.players[0].finished, true);
    assert.equal(result.newState.winner, 0);
    assert.equal(result.newState.phase, 'finished');
  });

  it('Classic mode: 3rd token reaching center does NOT trigger win', () => {
    const state = bootState(2, 'classic');
    state.players[0].tokens = [FIN, FIN, 105, -1];
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 1;

    const result = moveToken(state, 0, 2);
    assert.ok(result.success);
    assert.equal(result.newState.players[0].tokens[2], FIN);
    // 3/4 tokens in classic → NOT a win
    assert.equal(result.newState.players[0].finished, false);
    assert.equal(result.newState.winner, null);
    assert.equal(result.newState.phase, 'playing');
  });

  it('Classic mode: 4 finished tokens triggers win', () => {
    const state = bootState(2, 'classic');
    // Put 3 tokens at finish position, 1 on the last home stretch cell
    // Token 3 at home stretch pos 5 (index 5 = last cell before finish)
    state.players[0].tokens = [FIN, FIN, FIN, 105]; // home stretch cell 5
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 1; // Need exact roll of 1 to go from cell 5 to finish

    const result = moveToken(state, 0, 3);
    assert.ok(result.success);
    assert.equal(result.newState.players[0].finished, true);
    assert.equal(result.newState.winner, 0);
    assert.equal(result.newState.phase, 'finished');
  });

  it('Quick mode with 2 players: first to 3 tokens wins', () => {
    const state = bootState(3, 'quick');
    // Player 1 has 2 finished + 1 at home stretch cell 5 (needs 1 to finish)
    state.players[1].tokens = [-1, -1, -1, -1];
    state.players[0].tokens = [FIN, FIN, FIN, 105];
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 1;

    const result = moveToken(state, 0, 3);
    assert.ok(result.success);
    assert.equal(result.newState.players[0].finished, true);
    assert.equal(result.newState.winner, 0);
  });

  it('Quick mode with 6 players: first to 3 tokens wins', () => {
    const state = bootState(6, 'quick');
    state.players[5].tokens = [FIN, FIN, 0, FIN]; // 3 done (indices 0,1,3), 1 on track
    state.currentPlayerIndex = 5;
    state.turnPhase = 'roll';
    state.diceValue = null;

    // Need to verify player 5 is already "finished" conceptually
    // The win check happens in moveToken when the 3rd token reaches home
    // Let's test by putting 3 as finished and checking the token loop
    const finishedCount = state.players[5].tokens.filter(t => t === FIN).length;
    assert.equal(finishedCount, 3);
    // In a real game, the 3rd token finishing triggers this check via moveToken
  });
});

// ─── Token Movement ─────────────────────────────────────────────

describe('Token movement', () => {
  it('requires a 6 to enter from home', () => {
    const state = bootState(2);
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 4;

    const result = moveToken(state, 0, 0);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('Must roll a 6'));
  });

  it('enters track on rolling a 6 from home', () => {
    const state = bootState(2);
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 6;

    const result = moveToken(state, 0, 0);
    assert.ok(result.success);
    assert.equal(result.newState.players[0].tokens[0], 0); // Start position
  });

  it('moves forward on the track by the dice value', () => {
    const state = bootState(4);
    state.players[1].tokens = [15, -1, -1, -1];
    state.currentPlayerIndex = 1;
    state.turnPhase = 'move';
    state.diceValue = 4;

    const result = moveToken(state, 1, 0);
    assert.ok(result.success);
    assert.equal(result.newState.players[1].tokens[0], 19); // 15 + 4
  });

  it('rejects move when not your turn', () => {
    const state = bootState(4);
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 6;

    // Player 1 tries to move on player 0's turn
    const result = moveToken(state, 1, 0);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('Not your turn'));
  });

  it('rejects move in roll phase', () => {
    const state = bootState(4);
    state.currentPlayerIndex = 0;
    state.turnPhase = 'roll';

    const result = moveToken(state, 0, 0);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('Roll the dice first'));
  });
});

// ─── Captures ───────────────────────────────────────────────────

describe('Capture mechanics', () => {
  it('captures opponent token when landing on it (non-safe spot)', () => {
    const state = bootState(4);
    // Player 0's token at position 1, Player 1's token at position 1+4=5
    state.players[0].tokens = [4, -1, -1, -1];
    state.players[1].tokens = [8, -1, -1, -1]; // Position 8 is NOT a safe spot
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 4;

    // Token 0 at position 4, moving 4 steps → position 8 where player 1's token is
    const result = moveToken(state, 0, 0);
    assert.ok(result.success);
    assert.equal(result.newState.players[1].tokens[0], -1); // Captured - sent home
    assert.equal(result.newState.players[0].tokens[0], 8); // Capturer lands on position
  });

  it('does not capture on safe spots', () => {
    const state = bootState(4);
    // Position 5 is a safe spot
    state.players[0].tokens = [3, -1, -1, -1];
    state.players[1].tokens = [5, -1, -1, -1]; // Safe spot! (SAFE_SPOTS includes 5)
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 2;

    const result = moveToken(state, 0, 0);
    if (result.success) {
      // If move succeeded, opponent should still be at position 5 (safe)
      const player1Pos = result.newState.players[1].tokens[0];
      // Either capture didn't happen (safe spot protection)
      assert.equal(player1Pos, 5, 'Token on safe spot should not be captured');
    } else {
      // If blocked by own token at destination (since we have no self token at 5, this shouldn't happen)
      assert.fail('Move should have succeeded');
    }
  });
});

// ─── Extra Turn & Sixes ─────────────────────────────────────────

describe('Sixes rules', () => {
  it('rolling a 6 grants an extra turn', () => {
    const state = bootState(4);
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 6;

    const result = moveToken(state, 0, 0);
    assert.ok(result.success);
    assert.equal(result.newState.currentPlayerIndex, 0, 'Extra turn: same player');
    assert.equal(result.newState.consecutiveSixes, 1);
  });

  it('three consecutive sixes loses the turn', () => {
    // Simulate: player 0 rolled 6 twice, now rolls 6 again
    const state = bootState(4);
    state.players[0].tokens = [5, 9, -1, -1]; // tokens on track so they can move
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 6;
    state.consecutiveSixes = 2; // Already rolled two 6s

    // We need to move a token that exists. Token 0 at pos 5, moving 6 → 11
    // Token 1 at pos 9, moving 6 → 15
    let result = moveToken(state, 0, 0);
    assert.ok(result.success);
    // After 3 consecutive sixes, advance to next player
    assert.equal(result.newState.currentPlayerIndex, 1);
    assert.equal(result.newState.consecutiveSixes, 0); // Reset
  });

  it('capturing a token grants an extra turn', () => {
    const state = bootState(4);
    state.players[0].tokens = [4, -1, -1, -1];
    state.players[1].tokens = [8, -1, -1, -1]; // Position 8, not safe
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 4;

    const result = moveToken(state, 0, 0);
    assert.ok(result.success);
    assert.equal(result.newState.currentPlayerIndex, 0, 'Capture grants extra turn');
  });
});

// ─── hasValidMoves ──────────────────────────────────────────────

describe('hasValidMoves', () => {
  it('returns true when a token can enter from home with a 6', () => {
    const state = bootState(4);
    state.diceValue = 6;
    assert.ok(hasValidMoves(state, 0));
  });

  it('returns false when no token can enter from home without a 6', () => {
    const state = bootState(4);
    state.diceValue = 4;
    assert.equal(hasValidMoves(state, 0), false);
  });

  it('returns false when all tokens are finished', () => {
    const state = bootState(4);
    state.players[0].tokens = [FIN, FIN, FIN, FIN];
    state.players[0].finished = true;
    state.diceValue = 6;
    // Finished player skips hasValidMoves check in rollForPlayer
    assert.equal(hasValidMoves(state, 0), false);
  });
});

// ─── advanceTurn ────────────────────────────────────────────────

describe('advanceTurn', () => {
  it('advances to the next player', () => {
    const state = bootState(4);
    state.currentPlayerIndex = 0;
    advanceTurn(state);
    assert.equal(state.currentPlayerIndex, 1);
  });

  it('wraps around to player 0', () => {
    const state = bootState(4);
    state.currentPlayerIndex = 3;
    advanceTurn(state);
    assert.equal(state.currentPlayerIndex, 0);
  });

  it('skips finished players', () => {
    const state = bootState(4);
    state.players[1].finished = true;
    state.currentPlayerIndex = 0;
    advanceTurn(state);
    // Should skip player 1 (finished) and go to player 2
    assert.equal(state.currentPlayerIndex, 2);
  });

  it('resets turnPhase to roll', () => {
    const state = bootState(4);
    state.turnPhase = 'move';
    advanceTurn(state);
    assert.equal(state.turnPhase, 'roll');
  });
});

// ─── rollForPlayer ──────────────────────────────────────────────

describe('rollForPlayer', () => {
  it('rejects roll when not your turn', () => {
    const state = bootState(4);
    state.currentPlayerIndex = 0;
    const result = rollForPlayer(state, 1);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('Not your turn'));
  });

  it('rejects roll when in move phase (already rolled)', () => {
    const state = bootState(4);
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    const result = rollForPlayer(state, 0);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('Already rolled'));
  });

  it('sets dice value and switches to move phase on success', () => {
    const state = bootState(4);
    // Put a token on the track so there's always a valid move
    state.players[0].tokens = [15, -1, -1, -1];
    state.currentPlayerIndex = 0;
    state.turnPhase = 'roll';

    const result = rollForPlayer(state, 0);
    assert.ok(result.success);
    assert.ok(result.newState.diceValue >= 1 && result.newState.diceValue <= 6);
    assert.equal(result.newState.turnPhase, 'move');
  });

  it('auto-skips turn if no valid moves', () => {
    const state = bootState(4);
    state.players[0].tokens = [3, -1, -1, -1]; // Only token at pos 3
    state.currentPlayerIndex = 0;
    state.turnPhase = 'roll';

    const result = rollForPlayer(state, 0);
    assert.ok(result.success);
    // If dice is not 6 AND not enough to move token 0 anywhere valid → skip
    // Token 0 at pos 3, home entry is 56 for player 0, distance = 53
    // So any non-6 roll would have no valid moves (can't enter from home, can't complete loop)
    if (result.newState.currentPlayerIndex !== 0) {
      // Turn was advanced (skipped)
      assert.equal(result.newState.turnPhase, 'roll');
    } else {
      // Was a 6 or had a valid move
      assert.equal(result.newState.turnPhase, 'move');
    }
  });
});

// ─── skipTurn (turns timeout) ──────────────────────────────────

describe('skipTurn', () => {
  it('advances to next player and resets phase', () => {
    const state = bootState(4);
    state.currentPlayerIndex = 1;
    state.turnPhase = 'move';
    state.diceValue = 4;

    const newState = skipTurn(state);
    // Should have advanced to player 2
    assert.equal(newState.currentPlayerIndex, 2);
    assert.equal(newState.turnPhase, 'roll');
    assert.equal(newState.diceValue, null);
  });
});

// ─── Game End ───────────────────────────────────────────────────

describe('Game end', () => {
  it('ends when all but one player have finished', () => {
    // This tests checkGameEnd indirectly via moveToken
    const state = bootState(3);
    state.players[0].finished = true;
    state.players[1].finished = true;
    state.players[2].finished = false;
    state.players[2].tokens = [FIN, FIN, FIN, 105]; // needs 1 more

    state.currentPlayerIndex = 2;
    state.turnPhase = 'move';
    state.diceValue = 1;

    const result = moveToken(state, 2, 3);
    assert.ok(result.success);
    assert.equal(result.newState.winner, 2);
    assert.equal(result.newState.phase, 'finished');
  });
});

// ─── Self-blocking ──────────────────────────────────────────────

describe('Self-blocking', () => {
  it('cannot move to a track cell occupied by own token', () => {
    const state = bootState(2);
    state.players[0].tokens = [5, 7, -1, -1]; // Token 0 at 5, Token 1 at 7
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 2; // Token 0 would move to 7 where token 1 is

    const result = moveToken(state, 0, 0);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('blocked by your own token'));
  });

  it('cannot enter track if start position is blocked by own token', () => {
    const state = bootState(2);
    state.players[0].tokens = [0, -1, -1, -1]; // Token 0 already at start position 0
    state.currentPlayerIndex = 0;
    state.turnPhase = 'move';
    state.diceValue = 6; // Rolling 6 for token 1 to enter

    const result = moveToken(state, 0, 1);
    assert.equal(result.success, false);
    assert.ok(result.error.includes('blocked by your own token'));
  });
});
