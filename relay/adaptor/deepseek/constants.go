package deepseek

import (
	"github.com/songquanpeng/one-api/relay/adaptor"
	"github.com/songquanpeng/one-api/relay/billing/ratio"
)

// ModelRatios contains all supported models and their pricing ratios
// Model list is derived from the keys of this map, eliminating redundancy
// Based on official DeepSeek pricing: https://api-docs.deepseek.com/quick_start/pricing
var ModelRatios = map[string]adaptor.ModelConfig{
	"deepseek-chat": {
		Ratio:            0.28 * ratio.MilliTokensUsd,
		CachedInputRatio: 0.028 * ratio.MilliTokensUsd,
		CompletionRatio:  0.42 / 0.28,
	},
	"deepseek-reasoner": {
		Ratio:            0.28 * ratio.MilliTokensUsd,
		CachedInputRatio: 0.028 * ratio.MilliTokensUsd,
		CompletionRatio:  0.42 / 0.28,
	},
}

// DeepseekToolingDefaults documents that DeepSeek does not publish built-in tool pricing (retrieved 2025-11-12).
// Source: https://r.jina.ai/https://api-docs.deepseek.com/quick_start/pricing
var DeepseekToolingDefaults = adaptor.ChannelToolConfig{}
