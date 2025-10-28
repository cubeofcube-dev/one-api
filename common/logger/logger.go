package logger

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	errors "github.com/Laisky/errors/v2"
	gutils "github.com/Laisky/go-utils/v5"
	glog "github.com/Laisky/go-utils/v5/log"
	"github.com/Laisky/zap"
	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/config"
)

var (
	Logger       glog.Logger
	setupLogOnce sync.Once
	initLogOnce  sync.Once
)

var (
	logRotationState = struct {
		mu          sync.Mutex
		currentDate string
		file        *os.File
		stopCh      chan struct{}
		stoppedCh   chan struct{}
	}{}
	rotationMu               sync.Mutex
	nowFunc                  = time.Now
	logRotationCheckInterval = time.Minute
)

// init initializes the logger automatically when the package is imported
func init() {
	initLogger()
}

// initLogger initializes the go-utils logger
func initLogger() {
	initLogOnce.Do(func() {
		var err error
		level := glog.LevelInfo
		if config.DebugEnabled {
			level = glog.LevelDebug
		}

		Logger, err = glog.NewConsoleWithName("one-api", level)
		if err != nil {
			panic(fmt.Sprintf("failed to create logger: %+v", err))
		}
	})
}

// SetupLogger sets up the logger to write logs to files in addition to stdout
func SetupLogger() {
	setupLogOnce.Do(func() {
		if LogDir == "" {
			Logger.Info("log directory not configured; file logging disabled")
			return
		}

		if err := os.MkdirAll(LogDir, 0o755); err != nil {
			Logger.Error("failed to ensure log directory", zap.String("log_dir", LogDir), zap.Error(err))
			return
		}

		now := nowFunc()
		logPath, logDate := determineLogFile(now)
		fd, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
		if err != nil {
			Logger.Error("failed to open log file, falling back to stdout", zap.String("log_path", logPath), zap.Error(err))
			return
		}

		prevLogger := Logger
		if confErr := configureGlobalLogger(logPath); confErr != nil {
			Logger.Error("failed to attach log file sink", zap.String("log_path", logPath), zap.Error(confErr))
			_ = fd.Close()
			return
		}

		applyGinWriters(fd)

		releaseFile := swapLogFileState(logDate, fd)
		if releaseFile != nil {
			_ = releaseFile.Close()
		}

		if prevLogger != nil {
			_ = prevLogger.Sync()
		}

		Logger.Info("log file configured", zap.String("log_path", logPath))

		if !config.OnlyOneLogFile {
			startLogRotationLoop()
		}
	})
}

// configureGlobalLogger reinitializes the shared logger with console encoding and
// attaches a file sink at logPath while retaining existing log levels.
func configureGlobalLogger(logPath string) error {
	level := Logger.Level()
	newLogger, err := glog.New(
		glog.WithName("one-api"),
		glog.WithLevel(level),
		glog.WithEncoding(glog.EncodingConsole),
		glog.WithOutputPaths([]string{"stdout", logPath}),
		glog.WithErrorOutputPaths([]string{"stderr", logPath}),
	)
	if err != nil {
		return errors.Wrap(err, "create file logger")
	}

	Logger = newLogger
	return nil
}

// determineLogFile builds the absolute log file path and corresponding date suffix using the
// provided timestamp, honoring the OnlyOneLogFile configuration switch.
func determineLogFile(ts time.Time) (string, string) {
	date := ts.Format("20060102")
	name := "oneapi.log"
	if !config.OnlyOneLogFile {
		name = fmt.Sprintf("oneapi-%s.log", date)
	}

	return filepath.Join(LogDir, name), date
}

// applyGinWriters updates gin's default writers so request logging mirrors the Zap sinks.
func applyGinWriters(fd *os.File) {
	gin.DefaultWriter = io.MultiWriter(os.Stdout, fd)
	gin.DefaultErrorWriter = io.MultiWriter(os.Stderr, fd)
}

// swapLogFileState records the active log date and file pointer, returning the previous file so callers
// may close it once the new sinks are in place.
func swapLogFileState(date string, fd *os.File) *os.File {
	logRotationState.mu.Lock()
	defer logRotationState.mu.Unlock()

	old := logRotationState.file
	logRotationState.file = fd
	logRotationState.currentDate = date

	return old
}

// startLogRotationLoop kicks off a background ticker that checks once per interval whether a fresh
// daily log file should be created. It is a no-op when rotation is already running.
func startLogRotationLoop() {
	logRotationState.mu.Lock()
	if logRotationState.stopCh != nil {
		logRotationState.mu.Unlock()
		return
	}

	stopCh := make(chan struct{})
	stoppedCh := make(chan struct{})
	logRotationState.stopCh = stopCh
	logRotationState.stoppedCh = stoppedCh
	logRotationState.mu.Unlock()

	go func() {
		ticker := time.NewTicker(logRotationCheckInterval)
		defer func() {
			ticker.Stop()
			close(stoppedCh)
		}()

		for {
			select {
			case <-stopCh:
				return
			case tickTime := <-ticker.C:
				if err := rotateLogFileIfNeeded(tickTime); err != nil {
					Logger.Warn("log rotation failed", zap.Error(err))
				}
			}
		}
	}()
}

// stopLogRotationLoop halts the rotation ticker, waiting until the goroutine exits before returning.
func stopLogRotationLoop() {
	logRotationState.mu.Lock()
	stopCh := logRotationState.stopCh
	stoppedCh := logRotationState.stoppedCh
	logRotationState.stopCh = nil
	logRotationState.stoppedCh = nil
	logRotationState.mu.Unlock()

	if stopCh == nil {
		return
	}

	close(stopCh)
	if stoppedCh != nil {
		<-stoppedCh
	}
}

// rotateLogFileIfNeeded ensures a new log file is opened when the day changes. The supplied timestamp
// determines which date suffix to use for the next log file.
func rotateLogFileIfNeeded(ts time.Time) error {
	if config.OnlyOneLogFile {
		return nil
	}

	if strings.TrimSpace(LogDir) == "" {
		return nil
	}

	rotationMu.Lock()
	defer rotationMu.Unlock()

	logRotationState.mu.Lock()
	currentDate := logRotationState.currentDate
	logRotationState.mu.Unlock()

	logPath, newDate := determineLogFile(ts)
	if newDate == currentDate {
		return nil
	}

	if err := os.MkdirAll(LogDir, 0o755); err != nil {
		return errors.Wrap(err, "ensure log directory")
	}

	fd, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return errors.Wrap(err, "open log file")
	}

	prevLogger := Logger
	if confErr := configureGlobalLogger(logPath); confErr != nil {
		_ = fd.Close()
		return errors.Wrap(confErr, "attach log file sink")
	}

	applyGinWriters(fd)
	old := swapLogFileState(newDate, fd)
	if prevLogger != nil {
		_ = prevLogger.Sync()
	}

	if old != nil && old != fd {
		_ = old.Close()
	}

	Logger.Info("rotated log file", zap.String("log_path", logPath), zap.String("log_date", newDate))

	return nil
}

// SetupEnhancedLogger sets up the logger with alertPusher integration
func SetupEnhancedLogger(ctx context.Context) {
	opts := []zap.Option{}

	// Setup alert pusher if configured
	if config.LogPushAPI != "" {
		ratelimiter, err := gutils.NewRateLimiter(ctx, gutils.RateLimiterArgs{
			Max:     1,
			NPerSec: 1,
		})
		if err != nil {
			Logger.Panic("create ratelimiter", zap.Error(err))
		}

		alertPusher, err := glog.NewAlert(
			ctx,
			config.LogPushAPI,
			glog.WithAlertType(config.LogPushType),
			glog.WithAlertToken(config.LogPushToken),
			glog.WithAlertHookLevel(zap.ErrorLevel),
			glog.WithRateLimiter(ratelimiter),
		)
		if err != nil {
			Logger.Panic("create AlertPusher", zap.Error(err))
		}

		opts = append(opts, zap.HooksWithFields(alertPusher.GetZapHook()))
		Logger.Info("alert pusher configured",
			zap.String("alert_api", config.LogPushAPI),
			zap.String("alert_type", config.LogPushType),
		)
	}

	// Get hostname for logger context
	hostname, err := os.Hostname()
	if err != nil {
		Logger.Panic("get hostname", zap.Error(err))
	}

	// Apply options and add hostname context
	logger := Logger.WithOptions(opts...).With(
		zap.String("host", hostname),
	)
	Logger = logger

	// Set log level based on debug mode
	if config.DebugEnabled {
		_ = Logger.ChangeLevel("debug")
		Logger.Info("running in debug mode with enhanced logging")
	} else {
		_ = Logger.ChangeLevel("info")
		Logger.Info("running in production mode with enhanced logging")
	}
}
