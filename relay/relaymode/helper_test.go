package relaymode

import "testing"

func TestGetByPathRealtime(t *testing.T) {
	if got := GetByPath("/v1/realtime"); got != Realtime {
		t.Fatalf("expected Realtime, got %d", got)
	}
	if got := GetByPath("/v1/realtime?model=gpt-4o-realtime-preview"); got != Realtime {
		t.Fatalf("expected Realtime with query, got %d", got)
	}
}

func TestGetByPathVideos(t *testing.T) {
	if got := GetByPath("/v1/videos"); got != Videos {
		t.Fatalf("expected Videos, got %d", got)
	}
	if got := GetByPath("/v1/videos/video_123"); got != Videos {
		t.Fatalf("expected Videos with path segment, got %d", got)
	}
}
