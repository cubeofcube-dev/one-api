package geminiOpenaiCompatible

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGeminiWebSearchPricingApplied(t *testing.T) {
	pricing, ok := geminiToolingDefaults.Pricing["web_search"]
	require.True(t, ok, "web search pricing missing for gemini defaults")
	require.InDelta(t, 0.035, pricing.UsdPerCall, 1e-9, "expected $0.035 per grounded search call")
	require.Empty(t, geminiToolingDefaults.Whitelist, "gemini defaults should not restrict whitelist")
}
