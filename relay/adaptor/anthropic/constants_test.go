package anthropic

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestClaudeWebSearchPricingApplied(t *testing.T) {
	pricing, ok := AnthropicToolingDefaults.Pricing["web_search"]
	require.True(t, ok, "web search pricing missing for anthropic defaults")
	require.InDelta(t, 0.01, pricing.UsdPerCall, 1e-9, "expected $0.01 per call for web search")
	require.Empty(t, AnthropicToolingDefaults.Whitelist, "expected anthropic default allowlist to be inferred from pricing")

	keys := make([]string, 0, len(AnthropicToolingDefaults.Pricing))
	for name := range AnthropicToolingDefaults.Pricing {
		keys = append(keys, name)
	}
	require.ElementsMatch(t, []string{"web_search"}, keys, "expected pricing map to enumerate anthropic built-in tools")
}
