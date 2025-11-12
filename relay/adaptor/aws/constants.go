package aws

import "github.com/songquanpeng/one-api/relay/adaptor"

// AWSToolingDefaults captures Amazon Bedrock AgentCore pricing for common server-side tools (retrieved 2025-11-12).
// Source: https://r.jina.ai/https://aws.amazon.com/bedrock/agentcore/pricing/
var AWSToolingDefaults = adaptor.ChannelToolConfig{
	Whitelist: []string{
		"agentcore_search_api",
		"agentcore_invoke_tool",
		"agentcore_identity_token",
		"agentcore_memory_short_term",
		"agentcore_memory_long_term_store",
		"agentcore_memory_long_term_retrieve",
	},
	Pricing: map[string]adaptor.ToolPricingConfig{
		"agentcore_search_api":                {UsdPerCall: 0.000025},
		"agentcore_invoke_tool":               {UsdPerCall: 0.000005},
		"agentcore_identity_token":            {UsdPerCall: 0.00001},
		"agentcore_memory_short_term":         {UsdPerCall: 0.00025},
		"agentcore_memory_long_term_store":    {UsdPerCall: 0.00075},
		"agentcore_memory_long_term_retrieve": {UsdPerCall: 0.0005},
	},
}
