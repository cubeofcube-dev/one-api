package openai

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestHandlerUpdatesContentLengthAfterRewriting verifies Handler aligns Content-Length with the rewritten payload size.
// It accepts a *testing.T to record assertions and returns no values because Go testing
// functions signal failures through t.Fatalf/t.Errorf.
func TestHandlerUpdatesContentLengthAfterRewriting(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	originalBody := []byte(`{"choices":[{"index":0,"message":{"role":"assistant","content":"hello"},"finish_reason":"stop","content_filter_results":{"hate":{"filtered":false,"severity":"safe"}}}],"usage":{"prompt_tokens":5,"completion_tokens":7,"total_tokens":12},"system_fingerprint":"fp_test"}`)
	upstream := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(originalBody)),
		Header: http.Header{
			"Content-Type":   []string{"application/json"},
			"Content-Length": []string{strconv.Itoa(len(originalBody))},
		},
	}

	if errResp, _ := Handler(c, upstream, 0, "gpt-4o"); errResp != nil {
		t.Fatalf("handler returned unexpected error: %v", errResp)
	}

	if w.Code != http.StatusOK {
		t.Fatalf("unexpected status code: %d", w.Code)
	}

	if err := json.Unmarshal(w.Body.Bytes(), &SlimTextResponse{}); err != nil {
		t.Fatalf("handler produced invalid JSON: %v", err)
	}

	bodyLen := len(w.Body.Bytes())
	if bodyLen >= len(originalBody) {
		t.Fatalf("expected rewritten body to be smaller than upstream payload")
	}

	headerLen := w.Header().Get("Content-Length")
	if headerLen != strconv.Itoa(bodyLen) {
		t.Fatalf("content-length header %q does not match body size %d", headerLen, bodyLen)
	}
}
