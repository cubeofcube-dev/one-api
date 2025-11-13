package openai

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	gmw "github.com/Laisky/gin-middlewares/v7"
	"github.com/Laisky/zap"
	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/relay/model"
)

const maxLoggedVideoBytes = 64 * 1024

// VideoHandler forwards OpenAI video responses (JSON job metadata or binary content) unchanged to the caller.
// It logs the upstream payload for diagnostics and surfaces provider errors without altering the body.
func VideoHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	logger := gmw.GetLogger(c)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError), nil
	}
	if err = resp.Body.Close(); err != nil {
		return ErrorWrapper(err, "close_response_body_failed", http.StatusInternalServerError), nil
	}

	logFields := []zap.Field{zap.Int("body_bytes", len(body))}
	if len(body) == 0 {
		logger.Debug("video handler upstream response empty", logFields...)
	} else if len(body) <= maxLoggedVideoBytes {
		logFields = append(logFields, zap.ByteString("body", body))
		logger.Debug("video handler upstream response", logFields...)
	} else {
		logFields = append(logFields, zap.ByteString("body_preview", body[:maxLoggedVideoBytes]))
		logger.Debug("video handler upstream response truncated", logFields...)
	}

	var maybeError struct {
		Error *model.Error `json:"error,omitempty"`
	}
	if len(body) > 0 {
		if unmarshalErr := json.Unmarshal(body, &maybeError); unmarshalErr == nil {
			if maybeError.Error != nil && maybeError.Error.Type != "" {
				maybeError.Error.RawError = nil
				return &model.ErrorWithStatusCode{
					Error:      *maybeError.Error,
					StatusCode: resp.StatusCode,
				}, nil
			}
		}
	}

	resp.Body = io.NopCloser(bytes.NewReader(body))

	for k, values := range resp.Header {
		for _, v := range values {
			c.Writer.Header().Add(k, v)
		}
	}

	c.Writer.WriteHeader(resp.StatusCode)
	if _, err = io.Copy(c.Writer, resp.Body); err != nil {
		return ErrorWrapper(err, "copy_response_body_failed", http.StatusInternalServerError), nil
	}
	if err = resp.Body.Close(); err != nil {
		return ErrorWrapper(err, "close_response_body_failed", http.StatusInternalServerError), nil
	}

	return nil, nil
}
