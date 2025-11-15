package openai

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDallE3HasPerImagePricing(t *testing.T) {
	cfg, ok := ModelRatios["dall-e-3"]
	require.True(t, ok, "dall-e-3 not found in ModelRatios")
	require.Equal(t, 0.0, cfg.Ratio, "expected Ratio=0 for per-image model")
	require.NotNil(t, cfg.Image, "expected image config for dall-e-3")
	require.Greater(t, cfg.Image.PricePerImageUsd, 0.0, "expected price_per_image_usd > 0 for dall-e-3")
}

func TestOpenAIToolingDefaultsWebSearchPricing(t *testing.T) {
	defaults := OpenAIToolingDefaults
	pricing, ok := defaults.Pricing["web_search"]
	require.True(t, ok, "web search pricing missing for OpenAI defaults")
	require.InDelta(t, 0.01, pricing.UsdPerCall, 1e-9, "expected base web search pricing")
	require.Empty(t, defaults.Whitelist, "expected built-in allowlist to be inferred from pricing")

	keys := make([]string, 0, len(defaults.Pricing))
	for name := range defaults.Pricing {
		keys = append(keys, name)
	}
	require.ElementsMatch(t, []string{
		"code_interpreter",
		"file_search",
		"web_search",
		"web_search_preview_reasoning",
		"web_search_preview_non_reasoning",
	}, keys, "expected pricing map to enumerate all OpenAI built-in tools")
}
