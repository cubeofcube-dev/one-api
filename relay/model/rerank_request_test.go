package model

import "testing"

func TestRerankRequestNormalizeFromInput(t *testing.T) {
	req := &RerankRequest{
		Model:     "rerank-test",
		Input:     "  example query  ",
		Documents: []string{"doc1", "doc2"},
	}

	if err := req.Normalize(); err != nil {
		t.Fatalf("expected normalize to succeed, got %v", err)
	}
	if req.Query != "example query" {
		t.Fatalf("expected trimmed query, got %q", req.Query)
	}
}

func TestRerankRequestNormalizeRequiredFields(t *testing.T) {
	req := &RerankRequest{Model: "rerank-test"}
	if err := req.Normalize(); err == nil {
		t.Fatalf("expected error when query missing")
	}
}

func TestRerankRequestClone(t *testing.T) {
	docs := []string{"a", "b"}
	req := &RerankRequest{
		Model:     "rerank-test",
		Query:     "foo",
		Documents: docs,
	}

	clone := req.Clone()
	if clone == req {
		t.Fatalf("expected clone to create new instance")
	}
	clone.Documents[0] = "mutated"
	if req.Documents[0] == "mutated" {
		t.Fatalf("expected clone to deep copy documents slice")
	}
}
