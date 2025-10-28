package common

import "time"

// StartTime records the Unix timestamp when the application process started.
var StartTime = time.Now().Unix() // unit: second

// Version stores the semantic version assigned during build time.
var Version = "v0.0.0" // this hard coding will be replaced automatically when building, no need to manually change
