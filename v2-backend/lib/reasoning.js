// Reasoning layer: the ONLY file that imports @anthropic-ai/sdk.
// See PHASE-E.md § "Reasoning module" — swapping models later means editing
// this file and nothing else.

import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'insight-v1.md');

const MODEL = process.env.REASONING_MODEL || 'claude-sonnet-5';
const MAX_TOKENS = Number(process.env.REASONING_MAX_TOKENS) || 1024;
const TIMEOUT_MS = Number(process.env.REASONING_TIMEOUT_MS) || 30000;

// Prompt is read once at first use, then cached.
let promptCache = null;

async function loadPrompt() {
  if (promptCache) return promptCache;
  const raw = await readFile(PROMPT_PATH, 'utf8');
  if (!raw.includes('{{BUNDLE_JSON}}')) {
    throw new ReasoningError('CONFIG', 'Prompt template is missing {{BUNDLE_JSON}} placeholder');
  }
  promptCache = raw;
  return raw;
}

// Lazy client — avoid constructing it at import time so tests / probes can
// import this module without an API key present.
let clientCache = null;
function getClient() {
  if (clientCache) return clientCache;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ReasoningError('CONFIG', 'ANTHROPIC_API_KEY is not set');
  }
  clientCache = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return clientCache;
}

export class ReasoningError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'ReasoningError';
    this.code = code;
    Object.assign(this, extra);
  }
}

/**
 * Generate an insight from a context bundle.
 * @param {object} bundle - See lib/contextBundle.js
 * @returns {Promise<{text: string, model: string, promptTokens: number, completionTokens: number}>}
 */
export async function getInsight(bundle) {
  if (!bundle) throw new ReasoningError('BAD_INPUT', 'bundle is required');

  const promptTemplate = await loadPrompt();
  const bundleJson = JSON.stringify(bundle, null, 2);
  const userContent = promptTemplate.replace('{{BUNDLE_JSON}}', bundleJson);

  const client = getClient();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let message;
  try {
    message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: userContent }],
      },
      { signal: controller.signal }
    );
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ReasoningError('TIMEOUT', `Reasoning call exceeded ${TIMEOUT_MS}ms`);
    }
    const status = err.status || err.response?.status;
    throw new ReasoningError('UPSTREAM', err.message || 'Unknown upstream error', { status });
  } finally {
    clearTimeout(timeoutId);
  }

  // Extract text from response content blocks. Sonnet returns an array of blocks;
  // for a plain messages.create call, expect a single text block.
  const textBlocks = (message.content || []).filter((b) => b.type === 'text');
  if (textBlocks.length === 0) {
    throw new ReasoningError('UPSTREAM', 'No text content in reasoning response');
  }
  const text = textBlocks.map((b) => b.text).join('\n\n').trim();

  return {
    text,
    model: message.model || MODEL,
    promptTokens: message.usage?.input_tokens ?? 0,
    completionTokens: message.usage?.output_tokens ?? 0,
  };
}

/**
 * Startup health check. Verifies the prompt loads and the client can be
 * constructed. Does NOT make a network call — that would be wasteful on
 * every restart. A failed getInsight() at runtime will still surface.
 */
export async function checkReasoningHealth() {
  await loadPrompt();
  getClient();
  return { model: MODEL, promptPath: PROMPT_PATH };
}