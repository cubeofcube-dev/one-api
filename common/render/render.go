package render

import (
	"encoding/json"
	"strings"

	"github.com/Laisky/errors/v2"
	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common"
)

// StringData streams an SSE data chunk to the client using the provided string payload.
func StringData(c *gin.Context, str string) {
	str = strings.TrimPrefix(str, "data: ")
	str = strings.TrimSuffix(str, "\r")
	c.Render(-1, common.CustomEvent{Data: "data: " + str})
	c.Writer.Flush()
}

// ObjectData serializes the object to JSON and streams it as an SSE chunk.
func ObjectData(c *gin.Context, object any) error {
	jsonData, err := json.Marshal(object)
	if err != nil {
		return errors.Wrapf(err, "error marshalling object")
	}
	StringData(c, string(jsonData))
	return nil
}

// Done signals the completion of an SSE stream to the client.
func Done(c *gin.Context) {
	StringData(c, "[DONE]")
}
