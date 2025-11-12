package anthropic

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestClaudeWebSearchPricingApplied(t *testing.T) {
	pricing, ok := AnthropicToolingDefaults.Pricing["web_search"]
	require.True(t, ok, "web search pricing missing for anthropic defaults")
	require.InDelta(t, 0.01, pricing.UsdPerCall, 1e-9, "expected $0.01 per call for web search")
	require.ElementsMatch(t, []string{"web_search"}, AnthropicToolingDefaults.Whitelist, "anthropic defaults whitelist should include web_search")
}
