package groq

import (
	"github.com/songquanpeng/one-api/relay/adaptor"
	"github.com/songquanpeng/one-api/relay/billing/ratio"
)

// ModelRatios contains all supported models and their pricing ratios
// Model list is derived from the keys of this map, eliminating redundancy
// Based on Groq pricing: https://groq.com/pricing/
var ModelRatios = map[string]adaptor.ModelConfig{
	// Regular Models
	"llama-3.3-70b-versatile":      {Ratio: 0.59 * ratio.MilliTokensUsd, CompletionRatio: 0.79 / 0.59},
	"llama-3.1-8b-instant":         {Ratio: 0.05 * ratio.MilliTokensUsd, CompletionRatio: 0.08 / 0.05},
	"meta-llama/llama-guard-4-12b": {Ratio: 0.2 * ratio.MilliTokensUsd, CompletionRatio: 1},
	"whisper-large-v3":             {Ratio: 0.111 * ratio.MilliTokensUsd, CompletionRatio: 1},
	"whisper-large-v3-turbo":       {Ratio: 0.04 * ratio.MilliTokensUsd, CompletionRatio: 1},
	"openai/gpt-oss-120b":          {Ratio: 0.15 * ratio.MilliTokensUsd, CachedInputRatio: 0.075 * ratio.MilliTokensUsd, CompletionRatio: 0.75 / 0.15},
	"openai/gpt-oss-20b":           {Ratio: 0.1 * ratio.MilliTokensUsd, CachedInputRatio: 0.0375 * ratio.MilliTokensUsd, CompletionRatio: 0.5 / 0.1},

	// Preview Models
	"qwen/qwen3-32b":                                {Ratio: 0.29 * ratio.MilliTokensUsd, CompletionRatio: 0.59 / 0.29},
	"moonshotai/kimi-k2-instruct-0905":              {Ratio: 1 * ratio.MilliTokensUsd, CachedInputRatio: 0.5 * ratio.MilliTokensUsd, CompletionRatio: 3},
	"meta-llama/llama-4-maverick-17b-128e-instruct": {Ratio: 0.2 * ratio.MilliTokensUsd, CompletionRatio: 3},
	"meta-llama/llama-4-scout-17b-16e-instruct":     {Ratio: 0.11 * ratio.MilliTokensUsd, CompletionRatio: 0.34 / 0.11},
}

// ModelList derived from ModelRatios for backward compatibility
var ModelList = adaptor.GetModelListFromPricing(ModelRatios)
