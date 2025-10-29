package logger

import (
	"sync"
	"time"
)

// ResetSetupLogOnceForTests resets the setupLogOnce guard so tests can re-run SetupLogger without touching
// unexported state in production code. It must only be used from test files.
func ResetSetupLogOnceForTests() {
	setupLogOnce = sync.Once{}
}

// WaitForLogRetentionCleanerForTests blocks until all retention cleaner goroutines finish.
func WaitForLogRetentionCleanerForTests() {
	retentionWorkerGroup.Wait()
}

// SetRotationNowFuncForTests overrides the rotation clock to make time deterministic in tests.
func SetRotationNowFuncForTests(f func() time.Time) {
	rotationNow = f
}

// ResetRotationNowFuncForTests restores the default wall clock used by rotation writers.
func ResetRotationNowFuncForTests() {
	rotationNow = defaultRotationNow
}
