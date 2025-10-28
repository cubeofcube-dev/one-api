package env

import (
	"os"
	"strconv"
	"strings"
)

// Bool reads a boolean environment variable, returning defaultValue when unset or invalid.
func Bool(env string, defaultValue bool) bool {
	if env == "" || os.Getenv(env) == "" {
		return defaultValue
	}
	return strings.ToLower(os.Getenv(env)) == "true"
}

// Int reads an integer environment variable, falling back to defaultValue when parsing fails.
func Int(env string, defaultValue int) int {
	if env == "" || os.Getenv(env) == "" {
		return defaultValue
	}
	num, err := strconv.Atoi(os.Getenv(env))
	if err != nil {
		return defaultValue
	}
	return num
}

// Float64 reads a float64 environment variable, returning defaultValue on error or absence.
func Float64(env string, defaultValue float64) float64 {
	if env == "" || os.Getenv(env) == "" {
		return defaultValue
	}
	num, err := strconv.ParseFloat(os.Getenv(env), 64)
	if err != nil {
		return defaultValue
	}
	return num
}

// String reads a string environment variable, returning defaultValue when the key is unset or empty.
func String(env string, defaultValue string) string {
	if env == "" || os.Getenv(env) == "" {
		return defaultValue
	}
	return os.Getenv(env)
}
