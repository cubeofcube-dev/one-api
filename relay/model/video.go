package model

import "strings"

// VideoRequest captures the minimal fields required from a /v1/videos request
// so the relay can perform billing and model mapping while forwarding the raw
// body to the upstream provider.
type VideoRequest struct {
	Model           string   `json:"model,omitempty" form:"model"`
	Prompt          string   `json:"prompt,omitempty" form:"prompt"`
	Seconds         *float64 `json:"seconds,omitempty" form:"seconds"`
	Duration        *float64 `json:"duration,omitempty" form:"duration"`
	DurationSeconds *float64 `json:"duration_seconds,omitempty" form:"duration_seconds"`
	Size            string   `json:"size,omitempty" form:"size"`
	Resolution      string   `json:"resolution,omitempty" form:"resolution"`
	AspectRatio     string   `json:"aspect_ratio,omitempty" form:"aspect_ratio"`
	RemixID         string   `json:"remix_id,omitempty" form:"remix_id"`
	ReferenceID     string   `json:"reference_id,omitempty" form:"reference_id"`
}

// RequestedDurationSeconds resolves the requested render length in seconds, if provided.
func (r *VideoRequest) RequestedDurationSeconds() float64 {
	if r == nil {
		return 0
	}
	if r.DurationSeconds != nil && *r.DurationSeconds > 0 {
		return *r.DurationSeconds
	}
	if r.Seconds != nil && *r.Seconds > 0 {
		return *r.Seconds
	}
	if r.Duration != nil && *r.Duration > 0 {
		return *r.Duration
	}
	return 0
}

// RequestedResolution returns the most specific resolution hint supplied in the request.
func (r *VideoRequest) RequestedResolution() string {
	if r == nil {
		return ""
	}
	if trimmed := strings.TrimSpace(r.Size); trimmed != "" {
		return trimmed
	}
	if trimmed := strings.TrimSpace(r.Resolution); trimmed != "" {
		return trimmed
	}
	return ""
}
