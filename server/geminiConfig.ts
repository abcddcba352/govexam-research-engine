import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

import {
  ModelCapabilityTier,
  ModelTierFallbackPolicy,
  TestMode,
} from '../src/types.ts';

// Server-side configurable environment variable for Gemini model
export const GEMINI_PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.8-flash';
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite';

export const QUALITY_TIER_MODELS: readonly string[] = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
];

export const ECONOMY_TIER_MODELS: readonly string[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
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
  const candidates = process.env.GEMINI_ADDITIONAL_FALLBACKS === 'true'
    ? [primary, 'gemini-3.7-flash', 'gemini-3.6-flash', fallback, 'gemini-3.5-flash-lite']
    : [primary, fallback];
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
let cachedGenAI: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required.');
  }
  if (!cachedGenAI) {
    cachedGenAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedGenAI;
}
