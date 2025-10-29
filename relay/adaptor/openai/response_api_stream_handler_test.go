package openai

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/relay/relaymode"
)

// TestResponseAPIStreamHandler_NoDuplicate ensures delta events + done events do not create duplicate final chunks.
func TestResponseAPIStreamHandler_NoDuplicate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	sse := `event: response.created
data: {"type":"response.created","response":{"id":"resp_test_dup","object":"response","created_at":1741290958,"status":"in_progress"}}

event: response.output_item.added
data: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_test_dup","type":"message","status":"in_progress","role":"assistant","content":[]}}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_test_dup","output_index":0,"content_index":0,"delta":"Hello"}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_test_dup","output_index":0,"content_index":0,"delta":" world"}

event: response.output_text.done
data: {"type":"response.output_text.done","item_id":"msg_test_dup","output_index":0,"content_index":0,"text":"Hello world"}

event: response.output_item.done
data: {"type":"response.output_item.done","output_index":0,"item":{"id":"msg_test_dup","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"Hello world","annotations":[]}]}}

event: response.completed
data: {"type":"response.completed","response":{"id":"resp_test_dup","object":"response","created_at":1741290958,"status":"completed","output":[{"id":"msg_test_dup","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"Hello world","annotations":[]}]}],"usage":{"input_tokens":1,"output_tokens":2,"total_tokens":3}}}

data: [DONE]`

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(sse)),
		Header:     make(http.Header),
	}
	resp.Header.Set("Content-Type", "text/event-stream")

	err, aggregatedText, usage := ResponseAPIStreamHandler(c, resp, relaymode.ChatCompletions)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if aggregatedText != "Hello world" {
		t.Fatalf("unexpected aggregated text: %q", aggregatedText)
	}
	if usage == nil || usage.TotalTokens != 3 {
		t.Fatalf("unexpected usage: %v", usage)
	}

	// Inspect emitted stream and ensure only one full-text chunk and one usage chunk
	body := w.Body.String()
	if !strings.Contains(body, "data: [DONE]") {
		t.Fatalf("missing DONE in stream output; body=%q", body)
	}

	t.Logf("stream body:\n%s", body)

	usageChunks := 0
	finishCount := 0
	var combined strings.Builder
	fullTextChunks := 0

	for _, part := range strings.Split(body, "\n\n") {
		part = strings.TrimSpace(part)
		if !strings.HasPrefix(part, "data: ") {
			continue
		}
		payload := strings.TrimPrefix(part, "data: ")
		if payload == "" || payload == "[DONE]" {
			continue
		}
		var chunk ChatCompletionsStreamResponse
		if err := json.Unmarshal([]byte(payload), &chunk); err != nil {
			// ignore non-json payloads
			continue
		}
		if chunk.Usage != nil {
			usageChunks++
		}
		if len(chunk.Choices) > 0 {
			ch := chunk.Choices[0]
			if ch.FinishReason != nil && *ch.FinishReason != "" {
				finishCount++
			}
			if content, ok := ch.Delta.Content.(string); ok && strings.TrimSpace(content) != "" {
				if strings.TrimSpace(content) == "Hello world" {
					fullTextChunks++
				}
				combined.WriteString(content)
			}
		}
	}

	// No duplicate full-text chunks; zero or one is acceptable. Deltas should
	// reconstruct the expected final text.
	if fullTextChunks > 1 {
		t.Fatalf("expected at most 1 full-text chunk, got %d", fullTextChunks)
	}
	if strings.TrimSpace(combined.String()) != "Hello world" {
		t.Fatalf("combined delta content mismatch: expected %q, got %q", "Hello world", strings.TrimSpace(combined.String()))
	}
	if usageChunks != 1 {
		t.Fatalf("expected exactly 1 usage chunk, got %d", usageChunks)
	}
	if finishCount != 1 {
		t.Fatalf("expected exactly 1 finish_reason present, got %d", finishCount)
	}
}
