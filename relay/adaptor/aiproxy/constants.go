package aiproxy

import "github.com/cubeofcube-dev/one-api/relay/adaptor/openai"

var ModelList = []string{""}

func init() {
	ModelList = openai.ModelList
}
