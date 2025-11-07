package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	glog "github.com/Laisky/go-utils/v6/log"
	"github.com/Laisky/zap"
	_ "github.com/joho/godotenv/autoload"
)

// main configures logging, listens for termination signals, and runs the regression harness.
func main() {
	logger, err := glog.NewConsoleWithName("oneapi-test", glog.LevelInfo)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create logger: %+v\n", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	command := "run"
	if len(os.Args) > 1 {
		command = strings.ToLower(strings.TrimSpace(os.Args[1]))
	}

	var execErr error
	switch command {
	case "", "run":
		execErr = run(ctx, logger)
	case "generate":
		execErr = generate(ctx, logger)
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n", command)
		os.Exit(1)
	}

	if execErr != nil {
		logger.Error("command failed", zap.String("command", command), zap.Error(execErr))
		os.Exit(1)
	}

	logger.Info("command completed", zap.String("command", command))
}
