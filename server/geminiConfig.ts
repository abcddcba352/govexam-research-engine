import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

import {
  ModelCapabilityTier,
  ModelTierFallbackPolicy,
  TestMode,
} from '../src/types.ts';

// Server-side configurable environment variable for Gemini model
export const GEMINI_PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.1-flash-lite';
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';

export const QUALITY_TIER_MODELS: readonly string[] = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
];

export const ECONOMY_TIER_MODELS: readonly string[] = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash-lite',
];

export interface ModelResolutionOptions {
  test_mode?: TestMode | string;
  requested_model?: string;
  fallback_policy?: ModelTierFallbackPolicy;
  is_quality_tier_available?: boolean;
}

export interface ModelResolutionResult {
  model_id: string;
  tier: ModelCapabilityTier;
  fallback_applied: boolean;
  downgrade_reason?: string;
  strict_audit_required: boolean;
}

/**
 * Resolves the Gemini model according to capability tiers:
 * - FULL_LENGTH: Requires QUALITY_TIER. Does NOT silently downgrade to ECONOMY_TIER.
 *   If quality tier is unavailable:
 *     - If policy is STOP_AND_REPORT: throws error reporting quality models exhausted.
 *     - If policy is ALLOW_ECONOMY_FALLBACK_WITH_STRICT_AUDIT: allows economy tier with strict audit flag.
 * - SUBJECT_WISE / TOPIC_WISE / CUSTOM_PRACTICE: May use ECONOMY_TIER directly.
 */
export function resolveExecutionModel(options: ModelResolutionOptions = {}): ModelResolutionResult {
  const policy: ModelTierFallbackPolicy = options.fallback_policy ||
    (process.env.MODEL_TIER_FALLBACK_POLICY as ModelTierFallbackPolicy) ||
    'ALLOW_ECONOMY_FALLBACK_WITH_STRICT_AUDIT';

  const requestedModel = options.requested_model || process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.8-flash';
  const isFullLength = options.test_mode === 'FULL_LENGTH';
  const isCustomOrPractice = options.test_mode === 'CUSTOM_PRACTICE' ||
    options.test_mode === 'SUBJECT_WISE' ||
    options.test_mode === 'TOPIC_WISE';

  const isQualityAvailable = options.is_quality_tier_available !== undefined
    ? options.is_quality_tier_available
    : true;

  // Custom or practice modes may use economy models directly
  if (isCustomOrPractice && (ECONOMY_TIER_MODELS.includes(requestedModel) || process.env.USE_ECONOMY_TIER === 'true')) {
    const selectedEconomy = ECONOMY_TIER_MODELS.includes(requestedModel) ? requestedModel : 'gemini-3.1-flash-lite';
    return {
      model_id: selectedEconomy,
      tier: 'ECONOMY_TIER',
      fallback_applied: false,
      strict_audit_required: false,
    };
  }

  // If requested model is a quality model and quality tier is available
  if (QUALITY_TIER_MODELS.includes(requestedModel) && isQualityAvailable) {
    return {
      model_id: requestedModel,
      tier: 'QUALITY_TIER',
      fallback_applied: false,
      strict_audit_required: false,
    };
  }

  // If quality tier is requested or required (e.g. FULL_LENGTH) but quality tier models are unavailable:
  if (isFullLength || QUALITY_TIER_MODELS.includes(requestedModel)) {
    if (policy === 'STOP_AND_REPORT') {
      throw new Error(
        `[MODEL_TIER_POLICY: STOP_AND_REPORT] Official FULL_LENGTH generation requires QUALITY_TIER models (${QUALITY_TIER_MODELS.join(', ')}). All configured quality models are unavailable. Silent downgrade is blocked by administrator policy.`
      );
    }

    // Policy: ALLOW_ECONOMY_FALLBACK_WITH_STRICT_AUDIT
    const economyModel = 'gemini-3.1-flash-lite';
    return {
      model_id: economyModel,
      tier: 'ECONOMY_TIER',
      fallback_applied: true,
      downgrade_reason: `Quality tier models unavailable (${QUALITY_TIER_MODELS.join(', ')}). Permitted fallback to ${economyModel} under administrator policy ALLOW_ECONOMY_FALLBACK_WITH_STRICT_AUDIT.`,
      strict_audit_required: true,
    };
  }

  return {
    model_id: requestedModel,
    tier: (ECONOMY_TIER_MODELS.includes(requestedModel) ? 'ECONOMY_TIER' : 'QUALITY_TIER') as ModelCapabilityTier,
    fallback_applied: false,
    strict_audit_required: false,
  };
}

export function getPrimaryModel(): string {
  return process.env.FINE_TUNED_MODEL_ID || process.env.CUSTOM_GEMINI_MODEL || process.env.GEMINI_PRIMARY_MODEL || GEMINI_PRIMARY_MODEL;
}

export function getFallbackModel(): string {
  return process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite';
}

export function getCandidateModels(): string[] {
  const primary = getPrimaryModel();
  const fallback = getFallbackModel();
  const candidates = [
    primary,
    fallback,
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash'
  ];
  return [...new Set(candidates.filter(Boolean))];
}

export type ThinkingTask =
  | 'EXAM_IDENTIFICATION'
  | 'FORMATTING'
  | 'RESEARCH_SYNTHESIS'
  | 'PYQ_ANALYSIS'
  | 'EXAM_INTELLIGENCE'
  | 'BLUEPRINT_GENERATION'
  | 'QUESTION_GENERATION'
  | 'DIFFICULT_QUESTION_VALIDATION'
  | 'INDEPENDENT_ANSWER_VALIDATION'
  | 'AMBIGUITY_REVIEW'
  | 'TRANSLATION'
  | 'FINAL_MOCK_AUDIT';

export type ThinkingLevelSetting = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Maps the functional task to the model thinking level per system rules:
 * - Exam identification → LOW
 * - Simple formatting/classification → LOW
 * - Research synthesis → MEDIUM
 * - Previous-year-paper analysis → HIGH
 * - Exam Intelligence creation → HIGH
 * - Blueprint generation → HIGH
 * - Question generation → MEDIUM or HIGH (default HIGH for accuracy)
 * - Difficult question validation → HIGH
 * - Final mock audit → HIGH
 */
export function getThinkingLevelForTask(task: ThinkingTask): ThinkingLevelSetting {
  switch (task) {
    case 'EXAM_IDENTIFICATION':
    case 'FORMATTING':
      return 'LOW';
    case 'RESEARCH_SYNTHESIS':
      return 'MEDIUM';
    case 'QUESTION_GENERATION':
      return 'HIGH';
    case 'PYQ_ANALYSIS':
    case 'EXAM_INTELLIGENCE':
    case 'BLUEPRINT_GENERATION':
    case 'DIFFICULT_QUESTION_VALIDATION':
    case 'FINAL_MOCK_AUDIT':
    default:
      return 'HIGH';
  }
}

/**
 * Returns thinkingConfig object compatible with Gemini 3.8 Flash in @google/genai
 */
export function getThinkingConfig(level: ThinkingLevelSetting) {
  let sdkLevel: ThinkingLevel;
  if (level === 'LOW') {
    sdkLevel = ThinkingLevel.LOW;
  } else if (level === 'MEDIUM') {
    sdkLevel = ThinkingLevel.MEDIUM;
  } else {
    sdkLevel = ThinkingLevel.HIGH;
  }

  return {
    thinkingLevel: sdkLevel,
  };
}

/**
 * Initializes GoogleGenAI client with standard user agent header
 */
// ---------------------------------------------------------------------------
// ADMIN GEMINI API KEY POOL & ROTATION SYSTEM
// ---------------------------------------------------------------------------

export interface AdminGeminiKeyRecord {
  id: string;
  key: string;
  label?: string;
  masked_key: string;
  status: 'ACTIVE' | 'RATE_LIMITED' | 'INVALID' | 'DISABLED';
  added_at: string;
  last_used_at?: string;
  success_count: number;
  failure_count: number;
  last_error?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const ADMIN_KEYS_FILE = path.join(DATA_DIR, 'gemini_api_keys.json');

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

export function getAdminGeminiKeys(): AdminGeminiKeyRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ADMIN_KEYS_FILE)) {
      const raw = fs.readFileSync(ADMIN_KEYS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[GeminiConfig] Failed to read admin Gemini keys:', err);
  }
  return [];
}

export function saveAdminGeminiKeys(keys: AdminGeminiKeyRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ADMIN_KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8');
  } catch (err) {
    console.error('[GeminiConfig] Failed to persist admin Gemini keys:', err);
  }
}

export function addAdminGeminiKey(rawKey: string, label?: string): AdminGeminiKeyRecord {
  const cleanKey = (rawKey || '').trim();
  if (!cleanKey || cleanKey.length < 15) {
    throw new Error('Invalid Gemini API Key format. Google API keys typically start with "AIzaSy" and are at least 30 characters long.');
  }

  const existing = getAdminGeminiKeys();
  const foundIndex = existing.findIndex(k => k.key === cleanKey);

  const newRecord: AdminGeminiKeyRecord = {
    id: foundIndex >= 0 ? existing[foundIndex].id : `gkey_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    key: cleanKey,
    label: label?.trim() || (foundIndex >= 0 ? existing[foundIndex].label : `Key ${existing.length + 1}`),
    masked_key: maskApiKey(cleanKey),
    status: 'ACTIVE',
    added_at: foundIndex >= 0 ? existing[foundIndex].added_at : new Date().toISOString(),
    last_used_at: undefined,
    success_count: foundIndex >= 0 ? existing[foundIndex].success_count : 0,
    failure_count: 0
  };

  if (foundIndex >= 0) {
    existing[foundIndex] = newRecord;
  } else {
    existing.unshift(newRecord);
  }

  saveAdminGeminiKeys(existing);
  return newRecord;
}

export function deleteAdminGeminiKey(idOrKey: string): boolean {
  const existing = getAdminGeminiKeys();
  const filtered = existing.filter(k => k.id !== idOrKey && k.key !== idOrKey);
  if (filtered.length !== existing.length) {
    saveAdminGeminiKeys(filtered);
    return true;
  }
  return false;
}

/**
 * Merges all configured keys from admin storage and environment variables
 */
export function getAllGeminiApiKeys(): string[] {
  const adminKeys = getAdminGeminiKeys().filter(k => k.status !== 'DISABLED').map(k => k.key);
  const rawEnvKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_EXTRA_KEYS ? process.env.GEMINI_EXTRA_KEYS.split(',') : [],
    process.env.GEMINI_BACKUP_API_KEY
  ].flat().filter((k): k is string => Boolean(k && typeof k === 'string' && k.trim().length > 10)).map(k => k.trim());

  // Priority order: Admin keys first, then environment keys
  return [...new Set([...adminKeys, ...rawEnvKeys])];
}

/**
 * Client cache by API key
 */
const clientCache = new Map<string, GoogleGenAI>();

export function createGenAIClient(apiKey: string): GoogleGenAI {
  const clean = apiKey.trim();
  let client = clientCache.get(clean);
  if (!client) {
    client = new GoogleGenAI({
      apiKey: clean,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    clientCache.set(clean, client);
  }
  return client;
}

let activeKeyIndex = 0;

/**
 * Initializes GoogleGenAI client with standard user agent header
 */
export function getGenAI(overrideKey?: string): GoogleGenAI {
  if (overrideKey && overrideKey.trim()) {
    return createGenAIClient(overrideKey.trim());
  }

  const allKeys = getAllGeminiApiKeys();
  if (allKeys.length === 0) {
    if (process.env.AI_PROVIDER === 'cloudflare') {
      throw new Error('Cloudflare free mode is active. Gemini calls and paid fallback are disabled; configure an API key in Admin Settings to enable Gemini.');
    }
    throw new Error('No Google Gemini API keys configured. Please add an API key in Admin Settings or set GEMINI_API_KEY.');
  }

  const selectedKey = allKeys[activeKeyIndex % allKeys.length];
  return createGenAIClient(selectedKey);
}

/**
 * Executes an AI operation with automatic failover rotation across all available API keys.
 * If one key encounters a 429 / Quota / Rate Limit error, it rotates to the next available key.
 */
export async function executeWithGeminiFailover<T>(
  operation: (ai: GoogleGenAI, apiKey: string) => Promise<T>
): Promise<T> {
  const allKeys = getAllGeminiApiKeys();
  if (allKeys.length === 0) {
    throw new Error('No Google Gemini API keys available. Please add a key in the Admin API Keys settings.');
  }

  const totalKeys = allKeys.length;
  let lastError: any = null;

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const keyIdx = (activeKeyIndex + attempt) % totalKeys;
    const currentKey = allKeys[keyIdx];
    const client = createGenAIClient(currentKey);

    try {
      const result = await operation(client, currentKey);
      
      // Update success metrics
      activeKeyIndex = keyIdx; // Stick with working key
      const adminKeys = getAdminGeminiKeys();
      const match = adminKeys.find(k => k.key === currentKey);
      if (match) {
        match.status = 'ACTIVE';
        match.last_used_at = new Date().toISOString();
        match.success_count = (match.success_count || 0) + 1;
        saveAdminGeminiKeys(adminKeys);
      }

      return result;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err);
      const isRateLimit = errMsg.includes('429') || 
                          errMsg.includes('RESOURCE_EXHAUSTED') || 
                          errMsg.toLowerCase().includes('quota') ||
                          errMsg.includes('503') ||
                          errMsg.toLowerCase().includes('overloaded');

      console.warn(`[GeminiFailover] Key (${maskApiKey(currentKey)}) attempt failed: ${errMsg.slice(0, 120)}.`);

      const adminKeys = getAdminGeminiKeys();
      const match = adminKeys.find(k => k.key === currentKey);
      if (match) {
        if (isRateLimit) {
          match.status = 'RATE_LIMITED';
        } else if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('400')) {
          match.status = 'INVALID';
        }
        match.last_error = errMsg.slice(0, 200);
        match.failure_count = (match.failure_count || 0) + 1;
        saveAdminGeminiKeys(adminKeys);
      }

      // If more keys exist, continue to next key
      if (attempt < totalKeys - 1) {
        console.log(`[GeminiFailover] Rotating to next API key (${attempt + 2}/${totalKeys})...`);
        continue;
      }
    }
  }

  throw new Error(`All ${totalKeys} configured Gemini API keys exhausted or rate-limited. Last error: ${lastError?.message || String(lastError)}`);
}

/**
  * Executes an AI operation with automatic failover rotation across both models and API keys.
  * If a model hits a 429 quota or rate limit error, it seamlessly rotates to candidate fallback models
  * (e.g. gemini-3.1-flash-lite, gemini-2.5-flash) and available API keys.
  */
export async function executeWithModelAndKeyFailover<T>(
  candidateModels: string[],
  operation: (ai: GoogleGenAI, apiKey: string, model: string) => Promise<T>
): Promise<{ result: T; modelUsed: string; keyUsed: string }> {
  const allKeys = getAllGeminiApiKeys();
  if (allKeys.length === 0) {
    throw new Error('No Google Gemini API keys available. Please add a key in the Admin API Keys settings.');
  }

  const models = candidateModels.length > 0 ? candidateModels : getCandidateModels();
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < allKeys.length; attempt++) {
      const keyIdx = (activeKeyIndex + attempt) % allKeys.length;
      const currentKey = allKeys[keyIdx];
      const client = createGenAIClient(currentKey);

      try {
        const result = await operation(client, currentKey, model);
        activeKeyIndex = keyIdx;
        const adminKeys = getAdminGeminiKeys();
        const match = adminKeys.find(k => k.key === currentKey);
        if (match) {
          match.status = 'ACTIVE';
          match.last_used_at = new Date().toISOString();
          match.success_count = (match.success_count || 0) + 1;
          saveAdminGeminiKeys(adminKeys);
        }
        return { result, modelUsed: model, keyUsed: currentKey };
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        console.warn(`[GeminiFailover] Model ${model} on key (${maskApiKey(currentKey)}) attempt failed: ${errMsg.slice(0, 140)}`);
      }
    }
  }

  throw new Error(`All candidate Gemini models (${models.join(', ')}) and keys exhausted. Last error: ${lastError?.message || String(lastError)}`);
}

/**
 * Tests whether a Gemini API key is valid and has available quota
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string; model?: string }> {
  try {
    const client = createGenAIClient(apiKey.trim());
    const model = 'gemini-3.1-flash-lite';
    const res = await client.models.generateContent({
      model,
      contents: 'Hello, verify API connection.'
    });

    if (res.text) {
      return { valid: true, model };
    }
    return { valid: false, error: 'Empty response received from Gemini' };
  } catch (err: any) {
    const msg = err?.message || String(err);
    return { valid: false, error: msg };
  }
}
