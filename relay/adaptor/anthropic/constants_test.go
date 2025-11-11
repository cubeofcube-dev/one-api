package anthropic

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestClaudeWebSearchPricingApplied(t *testing.T) {
	pricing, ok := anthropicToolingDefaults.Pricing["web_search"]
	require.True(t, ok, "web search pricing missing for anthropic defaults")
	require.InDelta(t, 0.01, pricing.UsdPerCall, 1e-9, "expected $0.01 per call for web search")
	require.Empty(t, anthropicToolingDefaults.Whitelist, "anthropic defaults should not restrict tool whitelist")
}
