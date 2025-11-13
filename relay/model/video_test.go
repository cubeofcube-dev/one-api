package model

import "testing"

func TestVideoRequestRequestedDurationSeconds(t *testing.T) {
	seconds := 8.5
	duration := 6.0
	req := &VideoRequest{
		Seconds:         &seconds,
		Duration:        &duration,
		DurationSeconds: nil,
	}
	if got := req.RequestedDurationSeconds(); got != seconds {
		t.Fatalf("expected seconds %.1f, got %.1f", seconds, got)
	}

	req.DurationSeconds = &duration
	if got := req.RequestedDurationSeconds(); got != duration {
		t.Fatalf("expected duration_seconds %.1f, got %.1f", duration, got)
	}

	req.DurationSeconds = nil
	req.Seconds = nil
	if got := req.RequestedDurationSeconds(); got != duration {
		t.Fatalf("expected duration %.1f fallback, got %.1f", duration, got)
	}
}

func TestVideoRequestRequestedResolution(t *testing.T) {
	req := &VideoRequest{Size: "1280x720"}
	if got := req.RequestedResolution(); got != "1280x720" {
		t.Fatalf("expected size resolution, got %s", got)
	}

	req.Size = ""
	req.Resolution = "720x1280"
	if got := req.RequestedResolution(); got != "720x1280" {
		t.Fatalf("expected fallback resolution, got %s", got)
	}

	req.Resolution = ""
	if got := req.RequestedResolution(); got != "" {
		t.Fatalf("expected empty resolution, got %s", got)
	}
}
