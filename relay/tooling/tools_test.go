package tooling

import (
	"io"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/model"
	"github.com/songquanpeng/one-api/relay/adaptor"
	"github.com/songquanpeng/one-api/relay/billing/ratio"
	metalib "github.com/songquanpeng/one-api/relay/meta"
	relaymodel "github.com/songquanpeng/one-api/relay/model"
)

type adaptorStub struct {
	pricing map[string]adaptor.ModelConfig
	tooling adaptor.ChannelToolConfig
}

func (s *adaptorStub) Init(*metalib.Meta)                          {}
func (s *adaptorStub) GetRequestURL(*metalib.Meta) (string, error) { return "", nil }
func (s *adaptorStub) SetupRequestHeader(*gin.Context, *http.Request, *metalib.Meta) error {
	return nil
}
func (s *adaptorStub) ConvertRequest(*gin.Context, int, *relaymodel.GeneralOpenAIRequest) (any, error) {
	return nil, nil
}
func (s *adaptorStub) ConvertImageRequest(*gin.Context, *relaymodel.ImageRequest) (any, error) {
	return nil, nil
}
func (s *adaptorStub) ConvertClaudeRequest(*gin.Context, *relaymodel.ClaudeRequest) (any, error) {
	return nil, nil
}
func (s *adaptorStub) DoRequest(*gin.Context, *metalib.Meta, io.Reader) (*http.Response, error) {
	return nil, nil
}
func (s *adaptorStub) DoResponse(*gin.Context, *http.Response, *metalib.Meta) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	return nil, nil
}
func (s *adaptorStub) GetModelList() []string                                 { return nil }
func (s *adaptorStub) GetChannelName() string                                 { return "" }
func (s *adaptorStub) GetDefaultModelPricing() map[string]adaptor.ModelConfig { return s.pricing }
func (s *adaptorStub) GetModelRatio(string) float64                           { return 0 }
func (s *adaptorStub) GetCompletionRatio(string) float64                      { return 0 }
func (s *adaptorStub) DefaultToolingConfig() adaptor.ChannelToolConfig        { return s.tooling }

func TestApplyBuiltinToolCharges_ProviderPricing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set(ctxkey.WebSearchCallCount, 3)

	meta := &metalib.Meta{ActualModelName: "gpt-4o"}
	usage := &relaymodel.Usage{PromptTokens: 120, CompletionTokens: 30}

	perCallUSD := 0.02
	provider := &adaptorStub{
		pricing: map[string]adaptor.ModelConfig{
			"gpt-4o": {},
		},
		tooling: adaptor.ChannelToolConfig{
			Pricing: map[string]adaptor.ToolPricingConfig{
				"web_search": {UsdPerCall: perCallUSD},
			},
		},
	}

	ApplyBuiltinToolCharges(c, &usage, meta, nil, provider)

	require.Equal(t, usage.PromptTokens+usage.CompletionTokens, usage.TotalTokens)
	expectedPerCall := int64(math.Ceil(perCallUSD * float64(ratio.QuotaPerUsd)))
	require.Equal(t, expectedPerCall*3, usage.ToolsCost)

	summaryAny, exists := c.Get(ctxkey.ToolInvocationSummary)
	require.True(t, exists)
	summary := summaryAny.(*model.ToolUsageSummary)
	require.Equal(t, map[string]int{"web_search": 3}, summary.Counts)
	require.Equal(t, expectedPerCall*3, summary.TotalCost)
	require.Equal(t, expectedPerCall*3, summary.CostByTool["web_search"])
}

func TestApplyBuiltinToolCharges_ChannelOverrides(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set(ctxkey.WebSearchCallCount, 2)

	meta := &metalib.Meta{ActualModelName: "gpt-4o"}
	usage := &relaymodel.Usage{PromptTokens: 50, CompletionTokens: 10}

	provider := &adaptorStub{
		pricing: map[string]adaptor.ModelConfig{
			"gpt-4o": {},
		},
		tooling: adaptor.ChannelToolConfig{
			Pricing: map[string]adaptor.ToolPricingConfig{
				"web_search": {QuotaPerCall: 10},
			},
		},
	}

	channel := &model.Channel{}
	require.NoError(t, channel.SetToolingConfig(&model.ChannelToolingConfig{
		Whitelist: []string{"web_search"},
		Pricing: map[string]model.ToolPricingLocal{
			"web_search": {QuotaPerCall: 42},
		},
	}))

	ApplyBuiltinToolCharges(c, &usage, meta, channel, provider)

	require.Equal(t, int64(84), usage.ToolsCost)
	summaryAny, exists := c.Get(ctxkey.ToolInvocationSummary)
	require.True(t, exists)
	summary := summaryAny.(*model.ToolUsageSummary)
	require.Equal(t, int64(84), summary.TotalCost)
	require.Equal(t, 2, summary.Counts["web_search"])
	require.Equal(t, int64(84), summary.CostByTool["web_search"])
}

func TestValidateChatBuiltinTools_Disallowed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	request := &relaymodel.GeneralOpenAIRequest{
		Model: "gpt-4o",
		Tools: []relaymodel.Tool{{Type: "web_search"}},
	}
	meta := &metalib.Meta{ActualModelName: "gpt-4o"}

	channel := &model.Channel{}
	require.NoError(t, channel.SetModelPriceConfigs(map[string]model.ModelConfigLocal{
		"gpt-4o": {Ratio: 1},
	}))
	require.NoError(t, channel.SetToolingConfig(&model.ChannelToolingConfig{
		Whitelist: []string{"code_interpreter"},
	}))

	err := ValidateChatBuiltinTools(c, request, meta, channel, nil)
	require.Error(t, err)
	require.Contains(t, err.Error(), "web_search")
}

func TestValidateChatBuiltinTools_AllowsPricedToolWithoutWhitelist(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	request := &relaymodel.GeneralOpenAIRequest{
		Model: "gpt-4o",
		Tools: []relaymodel.Tool{{Type: "web_search"}},
	}
	meta := &metalib.Meta{ActualModelName: "gpt-4o"}

	channel := &model.Channel{}
	require.NoError(t, channel.SetModelPriceConfigs(map[string]model.ModelConfigLocal{
		"gpt-4o": {Ratio: 1},
	}))
	require.NoError(t, channel.SetToolingConfig(&model.ChannelToolingConfig{
		Pricing: map[string]model.ToolPricingLocal{
			"web_search": {UsdPerCall: 0.01},
		},
	}))

	require.NoError(t, ValidateChatBuiltinTools(c, request, meta, channel, nil))
}

func TestValidateChatBuiltinTools_PricingFallback(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	request := &relaymodel.GeneralOpenAIRequest{
		Model: "gpt-4o",
		Tools: []relaymodel.Tool{{Type: "web_search"}},
	}
	meta := &metalib.Meta{ActualModelName: "gpt-4o"}

	provider := &adaptorStub{
		pricing: map[string]adaptor.ModelConfig{
			"gpt-4o": {},
		},
		tooling: adaptor.ChannelToolConfig{
			Pricing: map[string]adaptor.ToolPricingConfig{
				"web_search": {UsdPerCall: 0.02},
			},
		},
	}

	require.NoError(t, ValidateChatBuiltinTools(c, request, meta, nil, provider))
}

func TestValidateChatBuiltinTools_RejectsWhenNeitherWhitelistedNorPriced(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	request := &relaymodel.GeneralOpenAIRequest{
		Model: "gpt-4o",
		Tools: []relaymodel.Tool{{Type: "web_search"}},
	}
	meta := &metalib.Meta{ActualModelName: "gpt-4o"}

	channel := &model.Channel{}
	require.NoError(t, channel.SetModelPriceConfigs(map[string]model.ModelConfigLocal{
		"gpt-4o": {Ratio: 1},
	}))
	require.NoError(t, channel.SetToolingConfig(&model.ChannelToolingConfig{
		Whitelist: []string{"code_interpreter"},
	}))

	err := ValidateChatBuiltinTools(c, request, meta, channel, nil)
	require.Error(t, err)
	require.Contains(t, err.Error(), "tool web_search is not allowed")
}
