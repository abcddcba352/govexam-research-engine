import {
  ModelCapabilityTier,
  ModelPricingConfig,
  ModelCostTelemetry
} from '../src/types.ts';

export const PRICING_VERSION = '2026-03-v1';
export const PRICING_RETRIEVED_AT = '2026-09-08T00:00:00Z';

/**
 * Official Gemini Model Pricing Registry
 * Versioned: 2026-03-v1 (Retrieved 2026-09-08)
 * Costs expressed in USD per 1M tokens (or per 1k search queries)
 */
export const MODEL_PRICING_REGISTRY: Record<string, ModelPricingConfig> = {
  'gemini-3.8-flash': {
    model_id: 'gemini-3.8-flash',
    tier: 'QUALITY_TIER',
    cost_per_million_input_tokens: 0.15,
    cost_per_million_output_tokens: 0.60,
    cost_per_million_thinking_tokens: 0.60,
    cost_per_thousand_search_queries: 35.0,
    free_tier_daily_request_limit: 20,
  },
  'gemini-3.7-flash': {
    model_id: 'gemini-3.7-flash',
    tier: 'QUALITY_TIER',
    cost_per_million_input_tokens: 0.15,
    cost_per_million_output_tokens: 0.60,
    cost_per_million_thinking_tokens: 0.60,
    cost_per_thousand_search_queries: 35.0,
    free_tier_daily_request_limit: 20,
  },
  'gemini-3.6-flash': {
    model_id: 'gemini-3.6-flash',
    tier: 'QUALITY_TIER',
    cost_per_million_input_tokens: 0.15,
    cost_per_million_output_tokens: 0.60,
    cost_per_million_thinking_tokens: 0.60,
    cost_per_thousand_search_queries: 35.0,
    free_tier_daily_request_limit: 20,
  },
  'gemini-3.5-flash-lite': {
    model_id: 'gemini-3.5-flash-lite',
    tier: 'ECONOMY_TIER',
    cost_per_million_input_tokens: 0.075,
    cost_per_million_output_tokens: 0.30,
    cost_per_million_thinking_tokens: 0.30,
    cost_per_thousand_search_queries: 35.0,
    free_tier_daily_request_limit: 1500,
  },
  'gemini-3.1-flash-lite': {
    model_id: 'gemini-3.1-flash-lite',
    tier: 'ECONOMY_TIER',
    cost_per_million_input_tokens: 0.075,
    cost_per_million_output_tokens: 0.30,
    cost_per_million_thinking_tokens: 0.30,
    cost_per_thousand_search_queries: 35.0,
    free_tier_daily_request_limit: 1500,
  },
};

export interface CalculateCostInput {
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens?: number;
  search_queries?: number;
  is_free_tier?: boolean;
}

/**
 * Calculates both actual billed cost and estimated paid-tier equivalent cost.
 * For free-tier calls:
 *   actual_billed_cost = 0.00
 *   estimated_paid_tier_equivalent_cost = what it would cost on paid tier
 */
export function calculateModelCost(input: CalculateCostInput): ModelCostTelemetry {
  const modelId = input.model_id;
  const pricing = MODEL_PRICING_REGISTRY[modelId] || {
    model_id: modelId,
    tier: (modelId.includes('lite') ? 'ECONOMY_TIER' : 'QUALITY_TIER') as ModelCapabilityTier,
    cost_per_million_input_tokens: 0.15,
    cost_per_million_output_tokens: 0.60,
    cost_per_million_thinking_tokens: 0.60,
    cost_per_thousand_search_queries: 35.0,
  };

  const isFreeTier = input.is_free_tier !== undefined ? input.is_free_tier : true;
  const inputTokens = Math.max(0, input.input_tokens || 0);
  const outputTokens = Math.max(0, input.output_tokens || 0);
  const thinkingTokens = Math.max(0, input.thinking_tokens || 0);
  const searchQueries = Math.max(0, input.search_queries || 0);

  const inputCost = (inputTokens / 1_000_000) * pricing.cost_per_million_input_tokens;
  const outputCost = (outputTokens / 1_000_000) * pricing.cost_per_million_output_tokens;
  const thinkingCost = (thinkingTokens / 1_000_000) * (pricing.cost_per_million_thinking_tokens || pricing.cost_per_million_output_tokens);
  const searchCost = (searchQueries / 1_000) * (pricing.cost_per_thousand_search_queries || 0);

  const paidEquivalentCost = inputCost + outputCost + thinkingCost + searchCost;
  const billedCost = isFreeTier ? 0.0 : paidEquivalentCost;

  return {
    model_id: modelId,
    tier: pricing.tier,
    is_free_tier: isFreeTier,
    actual_billed_cost: Number(billedCost.toFixed(6)),
    estimated_paid_tier_equivalent_cost: Number(paidEquivalentCost.toFixed(6)),
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    thinking_tokens: thinkingTokens,
    search_queries: searchQueries,
    pricing_version: PRICING_VERSION,
    retrieved_at: PRICING_RETRIEVED_AT,
  };
}

export function formatCostTelemetry(cost: ModelCostTelemetry): string {
  return [
    `Model: ${cost.model_id} (${cost.tier})`,
    `Tier Mode: ${cost.is_free_tier ? 'FREE_TIER (No API invoice incurred)' : 'PAID_TIER'}`,
    `Actual Billed Cost: $${cost.actual_billed_cost.toFixed(5)} USD`,
    `Paid Tier Equivalent: $${cost.estimated_paid_tier_equivalent_cost.toFixed(5)} USD`,
    `Tokens: ${cost.input_tokens.toLocaleString()} prompt / ${cost.output_tokens.toLocaleString()} candidate (${(cost.input_tokens + cost.output_tokens).toLocaleString()} total)`,
    cost.thinking_tokens > 0 ? `Thinking Tokens: ${cost.thinking_tokens.toLocaleString()}` : null,
    cost.search_queries > 0 ? `Search Queries: ${cost.search_queries}` : null,
    `Pricing Version: ${cost.pricing_version} (retrieved ${cost.retrieved_at})`,
  ].filter(Boolean).join(' | ');
}
