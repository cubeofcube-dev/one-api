package openai

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/songquanpeng/one-api/common/ctxkey"
)

func TestEmbeddingHandlerUsageFromResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
	c.Set(ctxkey.SkipAdaptorResponseBodyLog, true)

	body := `{"object":"list","data":[{"object":"embedding","index":0,"embedding":[0.1,0.2]}],"model":"text-embedding-3-small","usage":{"prompt_tokens":10,"total_tokens":10}}`
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       io.NopCloser(bytes.NewBufferString(body)),
	}
	resp.Header.Set("Content-Type", "application/json")

	errResp, usage := EmbeddingHandler(c, resp, 4, "text-embedding-3-small")
	require.Nil(t, errResp)
	require.NotNil(t, usage)
	require.Equal(t, 10, usage.PromptTokens)
	require.Equal(t, 10, usage.TotalTokens)
	require.Equal(t, http.StatusOK, w.Code)
	require.JSONEq(t, body, w.Body.String())
}

func TestEmbeddingHandlerUsageFallback(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)

	body := `{"object":"list","data":[{"object":"embedding","index":0,"embedding":[0.1]}],"model":"text-embedding-3-small"}`
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       io.NopCloser(bytes.NewBufferString(body)),
	}

	errResp, usage := EmbeddingHandler(c, resp, 7, "text-embedding-3-small")
	require.Nil(t, errResp)
	require.NotNil(t, usage)
	require.Equal(t, 7, usage.PromptTokens)
	require.Equal(t, 7, usage.TotalTokens)
	require.Zero(t, usage.CompletionTokens)
	require.Equal(t, http.StatusOK, w.Code)
	require.JSONEq(t, body, w.Body.String())
}
