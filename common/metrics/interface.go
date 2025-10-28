package metrics

import (
	"time"
)

// MetricsRecorder defines the interface for recording metrics
type MetricsRecorder interface {
	// HTTP metrics
	RecordHTTPRequest(startTime time.Time, path, method, statusCode string)
	RecordHTTPActiveRequest(path, method string, delta float64)

	// Relay metrics
	RecordRelayRequest(startTime time.Time, channelId int, channelType, model, userId string, success bool, promptTokens, completionTokens int, quotaUsed float64)

	// Channel metrics
	UpdateChannelMetrics(channelId int, channelName, channelType string, status int, balance float64, responseTimeMs int, successRate float64)
	UpdateChannelRequestsInFlight(channelId int, channelName, channelType string, delta float64)

	// User metrics
	RecordUserMetrics(userId, username, group string, quotaUsed float64, promptTokens, completionTokens int, balance float64)

	// Database metrics
	RecordDBQuery(startTime time.Time, operation, table string, success bool)
	UpdateDBConnectionMetrics(inUse, idle int)

	// Redis metrics
	RecordRedisCommand(startTime time.Time, command string, success bool)
	UpdateRedisConnectionMetrics(active int)

	// Rate limit metrics
	RecordRateLimitHit(limitType, identifier string)
	UpdateRateLimitRemaining(limitType, identifier string, remaining int)

	// Authentication metrics
	RecordTokenAuth(success bool)
	UpdateActiveTokens(userId, tokenName string, count int)

	// Error metrics
	RecordError(errorType, component string)

	// Model metrics
	RecordModelUsage(modelName, channelType string, latency time.Duration)

	// Billing metrics
	RecordBillingOperation(startTime time.Time, operation string, success bool, userId int, channelId int, modelName string, quotaAmount float64)
	RecordBillingTimeout(userId int, channelId int, modelName string, estimatedQuota float64, elapsedTime time.Duration)
	RecordBillingError(errorType, operation string, userId int, channelId int, modelName string)
	UpdateBillingStats(totalBillingOperations, successfulBillingOperations, failedBillingOperations int64)

	// System metrics
	InitSystemMetrics(version, buildTime, goVersion string, startTime time.Time)
}

// GlobalRecorder holds the active metrics recorder implementation.
var GlobalRecorder MetricsRecorder

// NoOpRecorder is a no-operation implementation for when metrics are disabled
type NoOpRecorder struct{}

// RecordHTTPRequest implements MetricsRecorder.RecordHTTPRequest without collecting any data.
func (n *NoOpRecorder) RecordHTTPRequest(startTime time.Time, path, method, statusCode string) {}

// RecordHTTPActiveRequest implements MetricsRecorder.RecordHTTPActiveRequest without collecting any data.
func (n *NoOpRecorder) RecordHTTPActiveRequest(path, method string, delta float64) {}

// RecordRelayRequest implements MetricsRecorder.RecordRelayRequest without collecting any data.
func (n *NoOpRecorder) RecordRelayRequest(startTime time.Time, channelId int, channelType, model, userId string, success bool, promptTokens, completionTokens int, quotaUsed float64) {
}

// UpdateChannelMetrics implements MetricsRecorder.UpdateChannelMetrics without collecting any data.
func (n *NoOpRecorder) UpdateChannelMetrics(channelId int, channelName, channelType string, status int, balance float64, responseTimeMs int, successRate float64) {
}

// UpdateChannelRequestsInFlight implements MetricsRecorder.UpdateChannelRequestsInFlight without collecting any data.
func (n *NoOpRecorder) UpdateChannelRequestsInFlight(channelId int, channelName, channelType string, delta float64) {
}

// RecordUserMetrics implements MetricsRecorder.RecordUserMetrics without collecting any data.
func (n *NoOpRecorder) RecordUserMetrics(userId, username, group string, quotaUsed float64, promptTokens, completionTokens int, balance float64) {
}

// RecordDBQuery implements MetricsRecorder.RecordDBQuery without collecting any data.
func (n *NoOpRecorder) RecordDBQuery(startTime time.Time, operation, table string, success bool) {}

// UpdateDBConnectionMetrics implements MetricsRecorder.UpdateDBConnectionMetrics without collecting any data.
func (n *NoOpRecorder) UpdateDBConnectionMetrics(inUse, idle int) {}

// RecordRedisCommand implements MetricsRecorder.RecordRedisCommand without collecting any data.
func (n *NoOpRecorder) RecordRedisCommand(startTime time.Time, command string, success bool) {}

// UpdateRedisConnectionMetrics implements MetricsRecorder.UpdateRedisConnectionMetrics without collecting any data.
func (n *NoOpRecorder) UpdateRedisConnectionMetrics(active int) {}

// RecordRateLimitHit implements MetricsRecorder.RecordRateLimitHit without collecting any data.
func (n *NoOpRecorder) RecordRateLimitHit(limitType, identifier string) {}

// UpdateRateLimitRemaining implements MetricsRecorder.UpdateRateLimitRemaining without collecting any data.
func (n *NoOpRecorder) UpdateRateLimitRemaining(limitType, identifier string, remaining int) {}

// RecordTokenAuth implements MetricsRecorder.RecordTokenAuth without collecting any data.
func (n *NoOpRecorder) RecordTokenAuth(success bool) {}

// UpdateActiveTokens implements MetricsRecorder.UpdateActiveTokens without collecting any data.
func (n *NoOpRecorder) UpdateActiveTokens(userId, tokenName string, count int) {}

// RecordError implements MetricsRecorder.RecordError without collecting any data.
func (n *NoOpRecorder) RecordError(errorType, component string) {}

// RecordModelUsage implements MetricsRecorder.RecordModelUsage without collecting any data.
func (n *NoOpRecorder) RecordModelUsage(modelName, channelType string, latency time.Duration) {}

// RecordBillingOperation implements MetricsRecorder.RecordBillingOperation without collecting any data.
func (n *NoOpRecorder) RecordBillingOperation(startTime time.Time, operation string, success bool, userId int, channelId int, modelName string, quotaAmount float64) {
}

// RecordBillingTimeout implements MetricsRecorder.RecordBillingTimeout without collecting any data.
func (n *NoOpRecorder) RecordBillingTimeout(userId int, channelId int, modelName string, estimatedQuota float64, elapsedTime time.Duration) {
}

// RecordBillingError implements MetricsRecorder.RecordBillingError without collecting any data.
func (n *NoOpRecorder) RecordBillingError(errorType, operation string, userId int, channelId int, modelName string) {
}

// UpdateBillingStats implements MetricsRecorder.UpdateBillingStats without collecting any data.
func (n *NoOpRecorder) UpdateBillingStats(totalBillingOperations, successfulBillingOperations, failedBillingOperations int64) {
}

// InitSystemMetrics implements MetricsRecorder.InitSystemMetrics without collecting any data.
func (n *NoOpRecorder) InitSystemMetrics(version, buildTime, goVersion string, startTime time.Time) {}

// Initialize with no-op recorder by default
func init() {
	GlobalRecorder = &NoOpRecorder{}
}
