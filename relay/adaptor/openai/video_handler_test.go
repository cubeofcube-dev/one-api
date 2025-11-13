package openai

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestVideoHandlerPassThroughJSON ensures JSON metadata is forwarded unchanged.
func TestVideoHandlerPassThroughJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/v1/videos", nil)
	c.Request = req

	original := map[string]any{
		"id":      "video_123",
		"object":  "video",
		"model":   "sora-2",
		"status":  "queued",
		"seconds": "4",
	}

	body, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal upstream response: %v", err)
	}

	upstream := &http.Response{
		StatusCode: http.StatusAccepted,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header: http.Header{
			"Content-Type": []string{"application/json"},
			"X-Video":      []string{"pass-through"},
		},
	}

	if errResp, usage := VideoHandler(c, upstream); errResp != nil {
		t.Fatalf("video handler returned unexpected error: %v", errResp)
	} else if usage != nil {
		t.Fatalf("expected nil usage, got %#v", usage)
	}

	if w.Code != http.StatusAccepted {
		t.Fatalf("unexpected status code: %d", w.Code)
	}

	if headerVal := w.Header().Get("X-Video"); headerVal != "pass-through" {
		t.Fatalf("header not forwarded: got %q", headerVal)
	}

	if !bytes.Equal(w.Body.Bytes(), body) {
		t.Fatalf("response body mutated: got %s", w.Body.Bytes())
	}
}

// TestVideoHandlerSurfaceError ensures upstream error payloads surface appropriately.
func TestVideoHandlerSurfaceError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/v1/videos", nil)
	c.Request = req

	errorBody := map[string]any{
		"error": map[string]any{
			"type":    "invalid_request_error",
			"message": "missing prompt",
		},
	}

	body, err := json.Marshal(errorBody)
	if err != nil {
		t.Fatalf("failed to marshal error response: %v", err)
	}

	upstream := &http.Response{
		StatusCode: http.StatusBadRequest,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
	}

	errResp, usage := VideoHandler(c, upstream)
	if errResp == nil {
		t.Fatalf("expected error from video handler")
	}
	if errResp.StatusCode != http.StatusBadRequest {
		t.Fatalf("unexpected status: %d", errResp.StatusCode)
	}
	if usage != nil {
		t.Fatalf("expected nil usage on error, got %#v", usage)
	}
}

// TestVideoHandlerBinary ensures binary payloads stream without JSON parsing requirements.
func TestVideoHandlerBinary(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/v1/videos/video_123/content", nil)
	c.Request = req

	binaryBody := []byte{0x01, 0x02, 0x03, 0x04}

	upstream := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(binaryBody)),
		Header: http.Header{
			"Content-Type":   []string{"application/octet-stream"},
			"Content-Length": []string{"4"},
		},
	}

	if errResp, usage := VideoHandler(c, upstream); errResp != nil {
		t.Fatalf("video handler returned unexpected error: %v", errResp)
	} else if usage != nil {
		t.Fatalf("expected nil usage, got %#v", usage)
	}

	if w.Code != http.StatusOK {
		t.Fatalf("unexpected status code: %d", w.Code)
	}

	if !bytes.Equal(w.Body.Bytes(), binaryBody) {
		t.Fatalf("binary body mutated: %#v", w.Body.Bytes())
	}
}
