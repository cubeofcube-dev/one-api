package openai

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDallE3HasPerImagePricing(t *testing.T) {
	cfg, ok := ModelRatios["dall-e-3"]
	require.True(t, ok, "dall-e-3 not found in ModelRatios")
	require.Equal(t, 0.0, cfg.Ratio, "expected Ratio=0 for per-image model")
	require.Greater(t, cfg.ImagePriceUsd, 0.0, "expected ImagePriceUsd > 0 for dall-e-3")
}

func TestOpenAIToolingDefaultsWebSearchPricing(t *testing.T) {
	pricing, ok := openAIToolingDefaults.Pricing["web_search"]
	require.True(t, ok, "web search pricing missing for OpenAI defaults")
	require.InDelta(t, 0.025, pricing.UsdPerCall, 1e-9, "expected highest published price for web search")
	require.Empty(t, openAIToolingDefaults.Whitelist, "OpenAI defaults should not restrict tool whitelist")
}

func TestOpenAIWebSearchPerCallUSDVariants(t *testing.T) {
	require.InDelta(t, 0.01, openAIWebSearchPerCallUSD("gpt-4o"), 1e-9)
	require.InDelta(t, 0.025, openAIWebSearchPerCallUSD("gpt-4o-mini-search-preview"), 1e-9)
	require.InDelta(t, 0.01, openAIWebSearchPerCallUSD("o3-deep-research"), 1e-9)
}
