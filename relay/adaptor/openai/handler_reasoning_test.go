package openai

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/relay/model"
)

// TestHandlerRemapsReasoningFormatThinking verifies reasoning_content converts to thinking when requested.
func TestHandlerRemapsReasoningFormatThinking(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions?thinking=true&reasoning_format=thinking", nil)
	c.Request = req

	reasoning := "deep dive"
	respStruct := SlimTextResponse{
		Choices: []TextResponseChoice{
			{
				Index: 0,
				Message: model.Message{
					Role:             "assistant",
					Content:          "2",
					ReasoningContent: &reasoning,
				},
				FinishReason: "stop",
			},
		},
		Usage: model.Usage{PromptTokens: 3, CompletionTokens: 5, TotalTokens: 8},
	}

	body, err := json.Marshal(respStruct)
	if err != nil {
		t.Fatalf("failed to marshal upstream response: %v", err)
	}

	upstream := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
	}

	if errResp, _ := Handler(c, upstream, 0, "gpt-4o"); errResp != nil {
		t.Fatalf("handler returned unexpected error: %v", errResp)
	}

	if w.Code != http.StatusOK {
		t.Fatalf("unexpected status code: %d", w.Code)
	}

	var out SlimTextResponse
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("failed to unmarshal handler output: %v", err)
	}
	if len(out.Choices) != 1 {
		t.Fatalf("expected one choice, got %d", len(out.Choices))
	}

	msg := out.Choices[0].Message
	if msg.Thinking == nil || *msg.Thinking != "deep dive" {
		t.Fatalf("expected thinking to contain reasoning text, got %#v", msg.Thinking)
	}
	if msg.ReasoningContent != nil {
		t.Fatalf("expected reasoning_content cleared, got %#v", msg.ReasoningContent)
	}
}
