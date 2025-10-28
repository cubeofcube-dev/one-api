package conv

// AsString returns the input as a string when possible, otherwise an empty string.
func AsString(v any) string {
	if str, ok := v.(string); ok {
		return str
	}

	return ""
}
