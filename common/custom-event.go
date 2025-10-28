// Copyright 2014 Manu Martinez-Almeida.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

package common

import (
	"fmt"
	"io"
	"net/http"
	"strings"
)

type stringWriter interface {
	io.Writer
	writeString(string) (int, error)
}

type stringWrapper struct {
	io.Writer
}

func (w stringWrapper) writeString(str string) (int, error) {
	return w.Writer.Write([]byte(str))
}

func checkWriter(writer io.Writer) stringWriter {
	if w, ok := writer.(stringWriter); ok {
		return w
	} else {
		return stringWrapper{writer}
	}
}

// Server-Sent Events
// W3C Working Draft 29 October 2009
// http://www.w3.org/TR/2009/WD-eventsource-20091029/

var contentType = []string{"text/event-stream"}
var noCache = []string{"no-cache"}

// var fieldReplacer = strings.NewReplacer(
// 	"\n", "\\n",
// 	"\r", "\\r")

var dataReplacer = strings.NewReplacer(
	"\n", "\ndata:",
	"\r", "\\r")

// CustomEvent represents a server-sent event that can be streamed to clients.
// The fields map directly to the SSE specification, with Data carrying the message body.
type CustomEvent struct {
	Event string
	Id    string
	Retry uint
	Data  any
}

func encode(writer io.Writer, event CustomEvent) error {
	w := checkWriter(writer)
	return writeData(w, event.Data)
}

func writeData(w stringWriter, data any) error {
	dataReplacer.WriteString(w, fmt.Sprint(data))
	if strings.HasPrefix(data.(string), "data") {
		w.writeString("\n\n")
	}
	// No error to wrap here, but if error handling is added, wrap with errors.Wrap/Wrapf
	return nil
}

// Render applies the SSE headers and writes the event payload to the provided ResponseWriter.
// It returns any error produced while encoding the event data.
func (r CustomEvent) Render(w http.ResponseWriter) error {
	r.WriteContentType(w)
	return encode(w, r)
}

// WriteContentType sets the Content-Type and Cache-Control headers expected for SSE responses.
func (r CustomEvent) WriteContentType(w http.ResponseWriter) {
	header := w.Header()
	header["Content-Type"] = contentType

	if _, exist := header["Cache-Control"]; !exist {
		header["Cache-Control"] = noCache
	}
}
