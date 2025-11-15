package controller

import (
	"bytes"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/relay/adaptor/openai"
	"github.com/songquanpeng/one-api/relay/pricing"
)

// Test that DALL·E 3 defaults quality to "standard" (not "auto").
func TestGetImageRequest_DefaultQuality_DALLE3(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	body := []byte(`{
        "model": "dall-e-3",
        "prompt": "test prompt",
        "size": "1024x1024"
    }`)
	req := httptest.NewRequest("POST", "/v1/images/generations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	ir, err := getImageRequest(c, 0)
	if err != nil {
		t.Fatalf("getImageRequest error: %v", err)
	}
	cfg, ok := pricing.ResolveModelConfig("dall-e-3", nil, &openai.Adaptor{})
	if !ok || cfg.Image == nil {
		t.Fatalf("expected pricing config for dall-e-3")
	}
	applyImageDefaults(ir, cfg.Image)
	if ir.Quality != "standard" {
		t.Fatalf("expected default quality 'standard' for dall-e-3, got %q", ir.Quality)
	}
}

func TestGetImageRequest_DefaultQuality_GPTImage1(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	body := []byte(`{
        "model": "gpt-image-1",
        "prompt": "test prompt",
        "size": "1024x1024"
    }`)
	req := httptest.NewRequest("POST", "/v1/images/generations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	ir, err := getImageRequest(c, 0)
	if err != nil {
		t.Fatalf("getImageRequest error: %v", err)
	}
	cfg, ok := pricing.ResolveModelConfig("gpt-image-1", nil, &openai.Adaptor{})
	if !ok || cfg.Image == nil {
		t.Fatalf("expected pricing config for gpt-image-1")
	}
	applyImageDefaults(ir, cfg.Image)
	if ir.Quality != "high" {
		t.Fatalf("expected default quality 'high' for gpt-image-1, got %q", ir.Quality)
	}
}

func TestGetImageRequest_DefaultQuality_GPTImage1Mini(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	body := []byte(`{
        "model": "gpt-image-1-mini",
        "prompt": "test prompt",
        "size": "1024x1024"
    }`)
	req := httptest.NewRequest("POST", "/v1/images/generations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	ir, err := getImageRequest(c, 0)
	if err != nil {
		t.Fatalf("getImageRequest error: %v", err)
	}
	cfg, ok := pricing.ResolveModelConfig("gpt-image-1-mini", nil, &openai.Adaptor{})
	if !ok || cfg.Image == nil {
		t.Fatalf("expected pricing config for gpt-image-1-mini")
	}
	applyImageDefaults(ir, cfg.Image)
	if ir.Quality != "high" {
		t.Fatalf("expected default quality 'high' for gpt-image-1-mini, got %q", ir.Quality)
	}
}

func TestGetImageRequest_DefaultQuality_DALLE2(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	body := []byte(`{
        "model": "dall-e-2",
        "prompt": "test prompt",
        "size": "1024x1024"
    }`)
	req := httptest.NewRequest("POST", "/v1/images/generations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	ir, err := getImageRequest(c, 0)
	if err != nil {
		t.Fatalf("getImageRequest error: %v", err)
	}
	cfg, ok := pricing.ResolveModelConfig("dall-e-2", nil, &openai.Adaptor{})
	if !ok || cfg.Image == nil {
		t.Fatalf("expected pricing config for dall-e-2")
	}
	applyImageDefaults(ir, cfg.Image)
	if ir.Quality != "standard" {
		t.Fatalf("expected default quality 'standard' for dall-e-2, got %q", ir.Quality)
	}
}
