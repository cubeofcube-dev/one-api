package common

import "github.com/go-playground/validator/v10"

// Validate exposes the shared instance of the request payload validator.
var Validate *validator.Validate

func init() {
	Validate = validator.New()
}
