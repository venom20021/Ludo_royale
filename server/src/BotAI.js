// BotAI — powers AI bot players for Ludo Royale
// Uses ruflo agent system: @claude-flow/neural (DecisionTransformer + A2C) for decisions,
// @claude-flow/memory for game state persistence, @claude-flow/shared for infrastructure.
// Falls back to heuristic scoring if ruflo agents are unavailable.

import LudoBotAgent, { BOT_DELAY_MS } from './ruflo/LudoBotAgent.js';
import rufloInfra from './ruflo/index.js';

// ─── Bot Agent Pool ─────────────────────────────────────────────
// Agents are created lazily when bots are first used

const botAgents = new Map(); // playerIdx -> LudoBotAgent

function getOrCreateAgent(playerIdx) {
  if (!botAgents.has(playerIdx)) {
    const agent = new LudoBotAgent(playerIdx);
    agent.initialize().catch(err => {
      console.warn(`⚠️ Ruflo agent init failed for player ${playerIdx}:`, err.message);
    });
    botAgents.set(playerIdx, agent);
  }
  return botAgents.get(playerIdx);
}

// ─── Initialize ruflo infrastructure ────────────────────────────

// Called once when the server starts
export async function initializeRuflo() {
  try {
    await rufloInfra.initialize();
    console.log('🤖 Ruflo agent system ready');
    return true;
  } catch (err) {
    console.warn('⚠️ Ruflo agent system unavailable, using heuristic fallback:', err.message);
    return false;
  }
}

// ─── Bot Action: Roll Dice ───────────────────────────────────────

export function executeBotRoll(state, playerIdx) {
  const agent = getOrCreateAgent(playerIdx);
  return agent.executeRoll(state);
}

// ─── Bot Action: Choose and Execute Best Move ────────────────────

export function executeBotMove(state, playerIdx) {
  const agent = getOrCreateAgent(playerIdx);
  return agent.executeMove(state);
}

// ─── Lifecycle Events ───────────────────────────────────────────

export function notifyBotWin(playerIdx) {
  const agent = botAgents.get(playerIdx);
  if (agent) agent.rewardWin();
}

export function notifyBotLoss(playerIdx) {
  const agent = botAgents.get(playerIdx);
  if (agent) agent.rewardLoss();
}

export async function shutdownRuflo() {
  await rufloInfra.shutdown();
  botAgents.clear();
}

export { BOT_DELAY_MS };
