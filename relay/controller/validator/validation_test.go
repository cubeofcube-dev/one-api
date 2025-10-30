package validator

import (
	"testing"

	"github.com/songquanpeng/one-api/relay/model"
)

func TestValidateRerankRequest(t *testing.T) {
	req := &model.RerankRequest{
		Model:     "cohere-rerank",
		Query:     "hello",
		Documents: []string{"doc"},
	}
	if err := ValidateRerankRequest(req); err != nil {
		t.Fatalf("expected valid request, got %v", err)
	}

	bad := &model.RerankRequest{Model: "cohere"}
	if err := ValidateRerankRequest(bad); err == nil {
		t.Fatalf("expected error for missing query")
	}

	bad = &model.RerankRequest{Model: "cohere", Query: "hello"}
	if err := ValidateRerankRequest(bad); err == nil {
		t.Fatalf("expected error for missing documents")
	}

	topN := 0
	bad = &model.RerankRequest{
		Model:     "cohere",
		Query:     "hello",
		Documents: []string{"doc"},
		TopN:      &topN,
	}
	if err := ValidateRerankRequest(bad); err == nil {
		t.Fatalf("expected error for invalid top_n")
	}
}
