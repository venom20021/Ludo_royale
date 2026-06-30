// LudoBotAgent — A ruflo-powered AI bot player for Ludo
// Uses DecisionTransformer + A2C for move evaluation,
// MemoryService for game history, EventBus for agent communication

import rufloInfra, { encodeGameState, decodeAction, STATE_DIM, NUM_ACTIONS } from './index.js';

// Import game engine functions for making actual moves
import {
  moveToken,
  rollForPlayer,
  skipTurn,
} from '../GameEngine.js';

const BOT_DELAY_MS = 800;

// ─── Move Scoring (heuristic baseline) ─────────────────────────
// These serve as the baseline policy for the neural network

const SCORE = {
  CAPTURE: 100,
  REACH_HOME: 90,
  ENTER_HOME_STRETCH: 70,
  SAFE_SPOT_BONUS: 30,
  ENTER_FROM_HOME: 50,
  ADVANCE_FAR: 30,
  ADVANCE_MID: 20,
  ADVANCE_NEAR: 10,
};

// ─── Ruflo Bot Agent ────────────────────────────────────────────

class LudoBotAgent {
  constructor(playerIdx) {
    this.playerIdx = playerIdx;
    this.name = '';
    this.neuralEngine = null;
    this.lastState = null;
    this.lastAction = null;
    this.moveHistory = [];
    this.totalDecisions = 0;
    this.rufloAvailable = false;
  }

  /**
   * Initialize the agent with ruflo neural infrastructure
   */
  async initialize() {
    // Wait for ruflo infrastructure to be ready
    if (rufloInfra.initialized) {
      this.neuralEngine = rufloInfra.getNeuralEngine(this.playerIdx);
      this.rufloAvailable = this.neuralEngine !== null;
      this.name = this.neuralEngine?.name || `Bot ${this.playerIdx}`;
      console.log(`🤖 ${this.name} initialized (ruflo: ${this.rufloAvailable ? '✓' : '✗'})`);
    } else {
      // Infrastructure not ready - will use heuristic fallback
      this.rufloAvailable = false;
      this.name = `Bot ${this.playerIdx}`;
    }
  }

  /**
   * Execute a dice roll for this bot
   */
  executeRoll(state) {
    const result = rollForPlayer(state, this.playerIdx);
    if (!result.success) return result;

    // Store the roll event
    rufloInfra.storeGameEvent('roll', {
      playerIdx: this.playerIdx,
      diceValue: result.diceValue,
      timestamp: Date.now(),
    });

    return { ...result, newState: result.newState };
  }

  /**
   * Evaluate all possible moves and pick the best one
   * Uses ruflo DecisionTransformer if available, falls back to heuristic
   */
  executeMove(state) {
    if (state.turnPhase !== 'move') {
      return { success: false, error: 'Not in move phase.' };
    }

    const bestToken = this.evaluateBestMove(state);
    if (bestToken === null || bestToken === undefined) {
      // No valid moves — skip turn
      const newState = skipTurn(state);
      return { success: true, newState, skipped: true };
    }

    // Emit bot thinking event for observability
    rufloInfra.emitBotEvent('bot:thinking', {
      playerIdx: this.playerIdx,
      state: encodeGameState(state),
      decision: bestToken,
    });

    const result = moveToken(state, this.playerIdx, bestToken);
    if (!result.success) return result;

    // Store the move in game history
    this.moveHistory.push({
      state: encodeGameState(state),
      action: bestToken,
      timestamp: Date.now(),
    });

    // If ruflo is available, learn from the move
    if (this.rufloAvailable) {
      this.learnFromMove(state, bestToken, result);
    }

    return {
      success: true,
      newState: result.newState,
      tokenIdx: bestToken,
      reason: 'ruflo_decision',
    };
  }

  /**
   * Evaluate the best token to move using ruflo's neural engine + heuristic scoring
   */
  evaluateBestMove(state) {
    const player = state.players[this.playerIdx];
    if (!player) return null;
    const dice = state.diceValue;
    if (dice === null || dice === undefined) return null;

    let candidates = [];

    // Get valid moves with heuristic scores
    for (let t = 0; t < player.tokens.length; t++) {
      const score = this.scoreMove(state, this.playerIdx, t, player.tokens[t], dice);
      if (score > 0) {
        candidates.push({ tokenIdx: t, heuristicScore: score });
      }
    }

    if (candidates.length === 0) return null;

    // If ruflo neural engine is available, use it to refine scores
    if (this.rufloAvailable && this.neuralEngine) {
      candidates = this.refineWithNeural(state, candidates);
    }

    // Add small random bias for variety
    candidates.forEach(c => {
      c.finalScore = c.finalScore || c.heuristicScore;
      c.finalScore += Math.random() * 5;
    });

    // Sort by final score descending
    candidates.sort((a, b) => b.finalScore - a.finalScore);
    return candidates[0].tokenIdx;
  }

  /**
   * Use ruflo's DecisionTransformer to refine move scores
   */
  refineWithNeural(state, candidates) {
    const encodedState = encodeGameState(state);

    try {
      let dtScore = null;
      let a2cScore = null;

      // Try DecisionTransformer
      if (this.neuralEngine.decisionTransformer) {
        try {
          const dtAction = this.neuralEngine.decisionTransformer.getAction(encodedState);
          if (dtAction !== undefined && dtAction !== null) {
            dtScore = dtAction;
          }
        } catch (e) {
          // DT evaluation failed, continue without it
        }
      }

      // Try A2C
      if (this.neuralEngine.a2c) {
        try {
          const a2cAction = this.neuralEngine.a2c.getAction(encodedState);
          if (a2cAction !== undefined && a2cAction !== null) {
            a2cScore = a2cAction;
          }
        } catch (e) {
          // A2C evaluation failed, continue without it
        }
      }

      // Blend neural scores with heuristic scores
      return candidates.map(c => {
        let neuralBonus = 0;

        // If DT recommends this action, give bonus
        if (dtScore !== null && dtScore === c.tokenIdx) {
          neuralBonus += 25;
        }

        // If A2C recommends this action, give bonus
        if (a2cScore !== null && a2cScore === c.tokenIdx) {
          neuralBonus += 20;
        }

        // If both recommend the same action, give extra bonus
        if (dtScore !== null && a2cScore !== null && dtScore === a2cScore && dtScore === c.tokenIdx) {
          neuralBonus += 15;
        }

        return {
          ...c,
          finalScore: c.heuristicScore + neuralBonus,
          neuralBoosted: neuralBonus > 0,
        };
      });
    } catch (err) {
      // Neural refinement failed - fall back to heuristic scores
      return candidates.map(c => ({ ...c, finalScore: c.heuristicScore }));
    }
  }

  /**
   * Learn from the result of a move (reinforcement learning)
   */
  learnFromMove(stateBefore, actionIdx, resultAfter) {
    if (!this.neuralEngine) return;

    const stateEncoded = encodeGameState(stateBefore);
    this.totalDecisions++;

    // Calculate reward based on outcome
    let reward = 0;
    if (resultAfter.captured) {
      reward += 10; // Capture is good
    }
    if (resultAfter.gotExtraTurn) {
      reward += 5; // Extra turn is good
    }
    if (resultAfter.success) {
      reward += 1; // Any valid move is slightly positive
    }

    // Store experience for A2C learning
    if (this.neuralEngine.a2c) {
      try {
        this.neuralEngine.a2c.addExperience(
          stateEncoded,
          actionIdx,
          reward,
          stateEncoded, // Simplified: use same state as next state
          false // Not done
        );
      } catch (e) {
        // Learning failure is non-critical
      }
    }

    // Track experience replay
    this.neuralEngine.experienceReplay.push({
      state: stateEncoded,
      action: actionIdx,
      reward,
      timestamp: Date.now(),
    });

    // Limit replay buffer size
    if (this.neuralEngine.experienceReplay.length > 500) {
      this.neuralEngine.experienceReplay = this.neuralEngine.experienceReplay.slice(-500);
    }
  }

  /**
   * Called when the bot wins a game - positive reinforcement
   */
  rewardWin() {
    if (!this.neuralEngine) return;
    this.neuralEngine.winCount++;
    this.neuralEngine.gameCount++;

    // Future: batch update neural network weights on win
    rufloInfra.emitBotEvent('bot:won', {
      playerIdx: this.playerIdx,
      name: this.name,
      totalDecisions: this.totalDecisions,
    });
  }

  /**
   * Called when the bot loses - negative reinforcement
   */
  rewardLoss() {
    if (!this.neuralEngine) return;
    this.neuralEngine.gameCount++;

    rufloInfra.emitBotEvent('bot:lost', {
      playerIdx: this.playerIdx,
      name: this.name,
      totalDecisions: this.totalDecisions,
    });
  }

  // ─── Heuristic Move Scoring ──────────────────────────────────
  // Used as the baseline policy. Neural network refines these scores.

  scoreMove(state, playerIdx, tokenIdx, pos, dice) {
    // Use the same constants as BotAI.js
    const TOKEN_HOME = -1;
    const TOKEN_FINISHED_BASE = 200;
    const TRACK_SIZE = 60;
    const HOME_STRETCH_LENGTH = 6;
    const START_POS = [0, 10, 20, 30, 40, 50];
    const HOME_ENTRY = [56, 6, 16, 26, 36, 46];
    const SAFE_SPOTS = new Set([0, 10, 20, 30, 40, 50, 5, 15, 25, 35, 45, 55]);

    if (pos === TOKEN_HOME) {
      if (dice !== 6) return 0;
      const startPos = START_POS[playerIdx];
      if (isSelfOccupied(state, playerIdx, tokenIdx, startPos)) return 0;
      let score = SCORE.ENTER_FROM_HOME;
      const opponentAtStart = findOpponentAt(state, playerIdx, startPos);
      if (opponentAtStart !== null && !SAFE_SPOTS.has(startPos)) {
        score += SCORE.CAPTURE;
      }
      return score;
    }

    if (pos >= 0 && pos < TRACK_SIZE) {
      const distanceToEntry = forwardDistance(pos, HOME_ENTRY[playerIdx], TRACK_SIZE);
      if (dice < distanceToEntry) {
        const newPos = moveOnTrack(pos, dice, TRACK_SIZE);
        if (isSelfOccupied(state, playerIdx, tokenIdx, newPos)) return 0;
        let score = dice >= 6 ? SCORE.ADVANCE_FAR : dice <= 2 ? SCORE.ADVANCE_NEAR : SCORE.ADVANCE_MID;
        if (SAFE_SPOTS.has(newPos)) score += SCORE.SAFE_SPOT_BONUS;
        const opponentAtDest = findOpponentAt(state, playerIdx, newPos);
        if (opponentAtDest !== null && !SAFE_SPOTS.has(newPos)) score += SCORE.CAPTURE;
        return score;
      }
      if (dice === distanceToEntry) {
        const hsPos = 100 + playerIdx * 10;
        if (isSelfOccupied(state, playerIdx, tokenIdx, hsPos)) return 0;
        return SCORE.ENTER_HOME_STRETCH;
      }
      const overshoot = dice - distanceToEntry;
      if (overshoot > 0 && overshoot <= HOME_STRETCH_LENGTH) {
        const hsPos = 100 + playerIdx * 10 + (overshoot - 1);
        if (isSelfOccupied(state, playerIdx, tokenIdx, hsPos)) return 0;
        return SCORE.ENTER_HOME_STRETCH + (overshoot * 5);
      }
      return 0;
    }

    if (pos >= 100 + playerIdx * 10 && pos < 100 + playerIdx * 10 + HOME_STRETCH_LENGTH) {
      const hsIndex = pos - (100 + playerIdx * 10);
      const remaining = HOME_STRETCH_LENGTH - hsIndex;
      if (dice < remaining) {
        const newHsIndex = hsIndex + dice;
        const hsPos = 100 + playerIdx * 10 + newHsIndex;
        if (isSelfOccupied(state, playerIdx, tokenIdx, hsPos)) return 0;
        return SCORE.ENTER_HOME_STRETCH + (newHsIndex * 8);
      }
      if (dice === remaining) return SCORE.REACH_HOME;
      return 0;
    }

    return 0;
  }
}

// ─── Static Helper Functions ────────────────────────────────────

function forwardDistance(from, to, trackSize) {
  if (from <= to) return to - from;
  return trackSize - from + to;
}

function moveOnTrack(currentPos, steps, trackSize) {
  return (currentPos + steps) % trackSize;
}

function isSelfOccupied(state, playerIdx, excludeTokenIdx, position) {
  return state.players[playerIdx].tokens.some((pos, tIdx) =>
    tIdx !== excludeTokenIdx && pos === position
  );
}

function findOpponentAt(state, playerIdx, position) {
  for (let i = 0; i < state.players.length; i++) {
    if (i === playerIdx) continue;
    const oppTokenIdx = state.players[i].tokens.indexOf(position);
    if (oppTokenIdx !== -1) return { playerIdx: i, tokenIdx: oppTokenIdx };
  }
  return null;
}

export default LudoBotAgent;
export { BOT_DELAY_MS };
