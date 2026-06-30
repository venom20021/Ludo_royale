// Ruflo Agent System — powers AI bot players using the ruflo ecosystem
// Integrates @claude-flow/neural, @claude-flow/memory, and @claude-flow/shared
// Uses dynamic imports so missing packages don't crash the server

// ─── Constants ──────────────────────────────────────────────────

const MAX_PLAYERS = 6;
const TOKENS_PER_PLAYER = 4;
const STATE_DIM = 24 + 3; // 24 token states + currentPlayer + diceValue + turnPhase
const NUM_ACTIONS = TOKENS_PER_PLAYER; // 4 tokens to choose from
const BOT_NAMES = ['Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta', 'Bot Epsilon', 'Bot Omega'];

// ─── State Encoding ─────────────────────────────────────────────
// Convert game state into a flat array for the neural network

const TOKEN_HOME = -1;
const TOKEN_FINISH_BASE = 200;
const TRACK_SIZE = 60;
const HOME_STRETCH_LEN = 6;

function encodeTokenState(pos, playerIdx) {
  if (pos === TOKEN_HOME) return 0.0;
  if (pos >= 0 && pos < TRACK_SIZE) return 0.01 + (pos / TRACK_SIZE) * 0.97;
  if (pos >= 100 + playerIdx * 10 && pos < 100 + playerIdx * 10 + HOME_STRETCH_LEN) {
    const hsIdx = pos - (100 + playerIdx * 10);
    return 0.98 + (hsIdx / HOME_STRETCH_LEN) * 0.01;
  }
  if (pos === TOKEN_FINISH_BASE + playerIdx) return 1.0;
  return 0.5; // Unknown state
}

export function encodeGameState(gameState) {
  const state = new Float32Array(STATE_DIM);
  let idx = 0;

  // Encode each player's tokens
  for (let p = 0; p < MAX_PLAYERS; p++) {
    const player = gameState.players[p];
    for (let t = 0; t < TOKENS_PER_PLAYER; t++) {
      if (player && player.tokens[t] !== undefined) {
        state[idx] = encodeTokenState(player.tokens[t], p);
      } else {
        state[idx] = 0.5; // Neutral for non-existent players
      }
      idx++;
    }
  }

  // Current player index (normalized)
  state[idx++] = gameState.currentPlayerIndex / (MAX_PLAYERS - 1);

  // Dice value (normalized)
  const diceVal = gameState.diceValue !== null && gameState.diceValue !== undefined
    ? gameState.diceValue / 6
    : 0;
  state[idx++] = diceVal;

  // Turn phase: 0 = roll, 1 = move
  state[idx++] = gameState.turnPhase === 'move' ? 1.0 : 0.0;

  return state;
}

// Decode action index to token index
export function decodeAction(actionIdx) {
  return actionIdx; // Direct mapping: action 0-3 = token 0-3
}

// ─── Ruflo Infrastructure ───────────────────────────────────────

class RufloInfrastructure {
  constructor() {
    this.initialized = false;
    this.components = {
      neural: null,
      memory: null,
      shared: null,
    };
    this.eventBus = null;
    this.circuitBreaker = null;
    this.lifecycleManager = null;
    this.neuralEngines = new Map(); // playerIdx -> neural config
    this.memoryService = null;
    this.botAgents = new Map(); // playerIdx -> LudoBotAgent
  }

  async initialize() {
    if (this.initialized) return;
    console.log('🤖 Initializing Ruflo agent infrastructure...');

    try {
      // ─── Dynamic imports (fail gracefully if packages missing) ──
      const [neural, memory, shared] = await Promise.allSettled([
        this._safeImport('@claude-flow/neural'),
        this._safeImport('@claude-flow/memory'),
        this._safeImport('@claude-flow/shared'),
      ]);

      this.components.neural = neural.status === 'fulfilled' ? neural.value : null;
      this.components.memory = memory.status === 'fulfilled' ? memory.value : null;
      this.components.shared = shared.status === 'fulfilled' ? shared.value : null;

      if (this.components.neural) {
        console.log('   ✓ @claude-flow/neural loaded');
      } else {
        console.log('   ⚠ @claude-flow/neural unavailable (bots use heuristic fallback)');
      }
      if (this.components.memory) {
        console.log('   ✓ @claude-flow/memory loaded');
      }
      if (this.components.shared) {
        console.log('   ✓ @claude-flow/shared loaded');
      }

      // ─── Initialize shared infrastructure ─────────────────────
      this._initShared();
      this._initMemory();
      this._initNeuralEngines();

      this.initialized = true;
      console.log('✅ Ruflo agent infrastructure initialized');
      if (!this.components.neural) {
        console.log('   → Bot players will use heuristic AI (ruflo neural not available)');
      }
    } catch (err) {
      console.error('❌ Ruflo infrastructure error:', err.message);
      console.log('   → Falling back to heuristic AI for bot players');
      this.initialized = false;
    }
  }

  async _safeImport(moduleName) {
    try {
      return await import(moduleName);
    } catch (err) {
      return null; // Package not available
    }
  }

  _initShared() {
    try {
      const shared = this.components.shared;
      if (!shared) return;

      if (shared.EventBus) {
        this.eventBus = new shared.EventBus('ludo-bot-swarm');
        this.eventBus.setMaxListeners(20);
      }

      if (shared.CircuitBreaker) {
        this.circuitBreaker = new shared.CircuitBreaker({
          failureThreshold: 3,
          resetTimeout: 10000,
          name: 'ludo-bot-decision',
        });
      }

      if (shared.LifecycleManager) {
        this.lifecycleManager = new shared.LifecycleManager({
          healthCheckInterval: 30000,
        });
      }
    } catch (err) {
      console.warn('⚠️ Shared infra init warning:', err.message);
    }
  }

  _initMemory() {
    try {
      const memory = this.components.memory;
      if (!memory) return;

      const MemoryServiceClass = memory.UnifiedMemoryService || memory.MemoryService;
      if (MemoryServiceClass) {
        this.memoryService = new MemoryServiceClass({
          namespace: 'ludo-bots',
        });
      }
    } catch (err) {
      console.warn('⚠️ Memory service init warning:', err.message);
    }
  }

  _initNeuralEngines() {
    const neural = this.components.neural;
    if (!neural) {
      // Still create placeholder entries so the agent system works heuristically
      for (let pIdx = 0; pIdx < MAX_PLAYERS; pIdx++) {
        this.neuralEngines.set(pIdx, { playerIdx: pIdx, name: BOT_NAMES[pIdx] });
      }
      return;
    }

    for (let pIdx = 0; pIdx < MAX_PLAYERS; pIdx++) {
      try {
        const engine = this._createNeuralEngine(neural, pIdx);
        this.neuralEngines.set(pIdx, engine);
      } catch (err) {
        // Individual engine failure - use basic engine stub
        this.neuralEngines.set(pIdx, {
          playerIdx: pIdx,
          name: BOT_NAMES[pIdx] || `Bot ${pIdx}`,
          decisionTransformer: null,
          a2c: null,
          patternLearner: null,
          experienceReplay: [],
          winCount: 0,
          gameCount: 0,
        });
      }
    }
  }

  _createNeuralEngine(neural, playerIdx) {
    return {
      playerIdx,
      name: BOT_NAMES[playerIdx] || `Bot ${playerIdx}`,
      decisionTransformer: this._createDecisionTransformer(neural),
      a2c: this._createA2C(neural),
      patternLearner: this._createPatternLearner(neural),
      experienceReplay: [],
      winCount: 0,
      gameCount: 0,
    };
  }

  _createDecisionTransformer(neural) {
    try {
      const createFn = neural.createDecisionTransformer;
      if (!createFn) return null;
      return createFn({
        stateDim: STATE_DIM,
        numActions: NUM_ACTIONS,
        embeddingDim: 64,
        hiddenDim: 128,
        numLayers: 3,
        contextLength: 10,
        learningRate: 0.001,
      });
    } catch (err) {
      return null;
    }
  }

  _createA2C(neural) {
    try {
      const createFn = neural.createA2C;
      if (!createFn) return null;
      return createFn({
        inputDim: STATE_DIM,
        numActions: NUM_ACTIONS,
        hiddenDim: 64,
        learningRate: 0.0005,
        gamma: 0.99,
        entropyCoef: 0.01,
      });
    } catch (err) {
      return null;
    }
  }

  _createPatternLearner(neural) {
    try {
      const createFn = neural.createPatternLearner;
      if (!createFn) return null;
      return createFn({
        patternSize: STATE_DIM,
        maxPatterns: 100,
      });
    } catch (err) {
      return null;
    }
  }

  // ─── Public Methods ───────────────────────────────────────────

  getNeuralEngine(playerIdx) {
    return this.neuralEngines.get(playerIdx) || null;
  }

  async storeGameEvent(roomId, eventData) {
    if (!this.memoryService || !this.initialized) return;
    try {
      // MemoryService is best-effort - wrap in try/catch
      if (typeof this.memoryService.set === 'function') {
        await this.memoryService.set(`game:${roomId}:${Date.now()}`, eventData);
      } else if (typeof this.memoryService.store === 'function') {
        await this.memoryService.store(eventData, `game:${roomId}`);
      }
    } catch (err) {
      // Memory store failures are non-critical
    }
  }

  emitBotEvent(eventName, data) {
    if (!this.eventBus || !this.initialized) return;
    try {
      if (typeof this.eventBus.emit === 'function') {
        this.eventBus.emit(eventName, data);
      }
    } catch (err) {
      // Event bus failures are non-critical
    }
  }

  async shutdown() {
    if (!this.initialized) return;
    console.log('🛑 Shutting down Ruflo infrastructure...');
    if (this.lifecycleManager && typeof this.lifecycleManager.shutdown === 'function') {
      try { await this.lifecycleManager.shutdown(); } catch (e) { /* ignore */ }
    }
    if (this.eventBus && typeof this.eventBus.removeAllListeners === 'function') {
      try { this.eventBus.removeAllListeners(); } catch (e) { /* ignore */ }
    }
    this.neuralEngines.clear();
    this.initialized = false;
    console.log('✅ Ruflo infrastructure shut down');
  }
}

// ─── Singleton ──────────────────────────────────────────────────
const rufloInfra = new RufloInfrastructure();

export default rufloInfra;
export { STATE_DIM, NUM_ACTIONS, MAX_PLAYERS, TOKENS_PER_PLAYER };
