package geminiOpenaiCompatible

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/songquanpeng/one-api/relay/billing/ratio"
)

func TestGeminiWebSearchPricingApplied(t *testing.T) {
	pricing, ok := geminiToolingDefaults.Pricing["web_search"]
	require.True(t, ok, "web search pricing missing for gemini defaults")
	require.InDelta(t, 0.035, pricing.UsdPerCall, 1e-9, "expected $0.035 per grounded search call")
	require.Empty(t, geminiToolingDefaults.Whitelist, "gemini defaults should not restrict whitelist")
}

func TestGeminiTieredPricingConfigured(t *testing.T) {
	cfg, ok := ModelRatios["gemini-3-pro-preview"]
	require.True(t, ok, "gemini-3-pro-preview missing from pricing map")
	require.InDelta(t, 2.0*ratio.MilliTokensUsd, cfg.Ratio, 1e-12)
	require.Len(t, cfg.Tiers, 1, "expected a single tier for gemini-3-pro-preview")
	tier := cfg.Tiers[0]
	require.Equal(t, 200001, tier.InputTokenThreshold)
	require.InDelta(t, 4.0*ratio.MilliTokensUsd, tier.Ratio, 1e-12)
	require.InDelta(t, 18.0/4.0, tier.CompletionRatio, 1e-9)
}

func TestGeminiFlashAudioPricing(t *testing.T) {
	cfg, ok := ModelRatios["gemini-2.5-flash"]
	require.True(t, ok, "gemini-2.5-flash missing from pricing map")
	require.NotNil(t, cfg.Audio, "gemini-2.5-flash audio pricing missing")
	require.InDelta(t, 1.0/0.30, cfg.Audio.PromptRatio, 1e-9)
	require.InDelta(t, 0.30, cfg.Audio.CompletionRatio, 1e-9)
}

func TestGeminiEmbeddingConfig(t *testing.T) {
	cfg, ok := ModelRatios["gemini-embedding-001"]
	require.True(t, ok, "gemini-embedding-001 missing from pricing map")
	require.InDelta(t, 0.15*ratio.MilliTokensUsd, cfg.Ratio, 1e-12)
}

func TestGemini3ProImagePreviewPricing(t *testing.T) {
	cfg, ok := ModelRatios["gemini-3-pro-image-preview"]
	require.True(t, ok, "gemini-3-pro-image-preview missing from pricing map")
	require.InDelta(t, 2.0*ratio.MilliTokensUsd, cfg.Ratio, 1e-12)
	require.NotNil(t, cfg.Image, "expected image pricing metadata for gemini-3-pro-image-preview")
	require.InDelta(t, gemini3ProImageBasePrice, cfg.Image.PricePerImageUsd, 1e-12)
	require.Len(t, cfg.Tiers, 1, "expected large-context tier to be defined")
	require.Contains(t, cfg.Image.SizeMultipliers, "1024x1024")
	require.Contains(t, cfg.Image.SizeMultipliers, "2048x2048")
	require.Contains(t, cfg.Image.SizeMultipliers, "4096x4096")
	require.InDelta(t, gemini3ProImage4KPrice/gemini3ProImageBasePrice, cfg.Image.SizeMultipliers["4096x4096"], 1e-12)
}
