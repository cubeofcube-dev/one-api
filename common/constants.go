package common

import (
	"fmt"
	"runtime/debug"
	"time"
)

// StartTime records the Unix timestamp when the application process started.
var StartTime = time.Now().Unix() // unit: second

// Version stores the semantic version assigned during build time.
var Version = "0.0.0"

func init() {
	info, ok := debug.ReadBuildInfo()
	if ok {
		version := info.Main.Version
		if version == "" {
			version = "dev"
		}

		if info.Main.Sum != "" {
			version = fmt.Sprintf("%s(%s)", version, info.Main.Sum)
		}

		Version = version
	}
}
