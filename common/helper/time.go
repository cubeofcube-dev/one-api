package helper

import (
	"fmt"
	"time"
)

// GetTimestamp returns the current Unix timestamp measured in seconds.
func GetTimestamp() int64 {
	return time.Now().Unix()
}

// GetTimeString returns a sortable timestamp string combining wall-clock time and nanoseconds.
func GetTimeString() string {
	now := time.Now()
	return fmt.Sprintf("%s%d", now.Format("20060102150405"), now.UnixNano()%1e9)
}

// CalcElapsedTime returns the elapsed time since start in milliseconds, rounding sub-millisecond durations up to 1.
func CalcElapsedTime(start time.Time) int64 {
	elapsed := time.Since(start)
	ms := elapsed.Milliseconds()
	if ms == 0 && elapsed > 0 {
		// Ensure non-zero latency for sub-millisecond operations so UI does not show 0
		return 1
	}
	return ms
}
