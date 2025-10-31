# Rerank API User Manual

The Rerank API allows you to send a query and a list of documents, and receive a ranked list of the most relevant documents according to your query. This is useful for search, recommendation, and information retrieval scenarios.

## Endpoint

```
POST /v1/rerank
POST /v2/rerank
```

## Request Format

Send a JSON payload with the following fields:

| Field                | Type             | Required | Description                                               |
| -------------------- | ---------------- | -------- | --------------------------------------------------------- |
| `model`              | string           | Yes      | The rerank model to use (e.g., `rerank-v3.5`).            |
| `query`              | string           | Yes      | The search query.                                         |
| `documents`          | array of strings | Yes      | List of documents to rank.                                |
| `top_n`              | integer          | No       | Number of top results to return. If omitted, returns all. |
| `max_tokens_per_doc` | integer          | No       | Max tokens per document (default: 4096).                  |
| `priority`           | integer          | No       | Request priority (0-999, default: 0).                     |

### Example Request

```bash
curl -X POST \
  https://your-one-api-server/v1/rerank \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "rerank-v3.5",
    "query": "What is the capital of the United States?",
    "top_n": 3,
    "documents": [
      "Carson City is the capital city of the American state of Nevada.",
      "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
      "Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district.",
      "Capitalization or capitalisation in English grammar is the use of a capital letter at the start of a word. English usage varies from capitalization in other languages.",
      "Capital punishment has existed in the United States since before the United States was a country. As of 2017, capital punishment is legal in 30 of the 50 states."
    ]
  }'
```

## Example Response

```json
{
  "results": [
    { "index": 2, "relevance_score": 0.999 },
    { "index": 4, "relevance_score": 0.78 },
    { "index": 0, "relevance_score": 0.32 }
  ],
  "id": "some-unique-id",
  "meta": {
    "api_version": { "version": "2", "is_experimental": false },
    "billed_units": { "search_units": 1 }
  }
}
```

- `results` is an array of objects, each with the original `index` of the document and its `relevance_score`.
- The highest scoring documents are most relevant to your query.

## Authentication

Include your API key in the `Authorization` header:

```
Authorization: Bearer <YOUR_API_KEY>
```

## Error Handling

If your request is invalid or there is a problem, you will receive an error response with a message and error code.

## Tips

- For best results, keep your documents concise and relevant.
- You can send up to 1,000 documents in a single request.
- Use `top_n` to limit the number of results if you only need the most relevant ones.

## Further Reading

See the [Cohere Rerank API Reference](../refs/cohere_rerank.md) for more details on advanced options and error codes.
