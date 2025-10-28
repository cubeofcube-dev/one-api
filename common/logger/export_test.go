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

// ResetLogRotationForTests stops the rotation loop and clears cached file handles so subsequent tests can
// configure logging without inheriting prior state.
func ResetLogRotationForTests() {
	stopLogRotationLoop()
	logRotationState.mu.Lock()
	if logRotationState.file != nil {
		_ = logRotationState.file.Close()
		logRotationState.file = nil
	}
	logRotationState.currentDate = ""
	logRotationState.mu.Unlock()

	logRotationCheckInterval = time.Minute
	nowFunc = time.Now
}

// ForceLogRotationForTests triggers the rotation logic using the supplied timestamp, allowing tests to
// simulate date changes deterministically.
func ForceLogRotationForTests(ts time.Time) error {
	return rotateLogFileIfNeeded(ts)
}

// StopLogRotationLoopForTests halts the rotation ticker without resetting other state.
func StopLogRotationLoopForTests() {
	stopLogRotationLoop()
}

// SetNowFuncForTests overrides the time source used by SetupLogger and the rotation loop.
func SetNowFuncForTests(f func() time.Time) {
	nowFunc = f
}

// SetLogRotationCheckIntervalForTests adjusts how frequently the rotation loop checks for date changes.
func SetLogRotationCheckIntervalForTests(d time.Duration) {
	logRotationCheckInterval = d
}
