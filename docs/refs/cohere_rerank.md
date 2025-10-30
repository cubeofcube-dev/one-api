# Rerank API (v2) Manual

This manual provides instructions on how to use the Rerank API (v2). This endpoint takes a query and a list of texts and returns an ordered array with each text assigned a relevance score.

## Endpoint

`POST /v2/rerank`

### Example cURL Request

```bash
curl --request POST \
  --url https://api.cohere.com/v2/rerank \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header "Authorization: bearer $CO_API_KEY" \
  --data '{
    "model": "rerank-v3.5",
    "query": "What is the capital of the United States?",
    "top_n": 3,
    "documents": ["Carson City is the capital city of the American state of Nevada.",
                  "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
                  "Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district.",
                  "Capitalization or capitalisation in English grammar is the use of a capital letter at the start of a word. English usage varies from capitalization in other languages.",
                  "Capital punishment has existed in the United States since beforethe United States was a country. As of 2017, capital punishment is legal in 30 of the 50 states."]
  }'
```

### Example Successful Response (200 OK)

```json
{
  "results": [
    {
      "index": 3,
      "relevance_score": 0.999071
    },
    {
      "index": 4,
      "relevance_score": 0.7867867
    },
    {
      "index": 0,
      "relevance_score": 0.32713068
    }
  ],
  "id": "07734bd2-2473-4f07-94e1-0d9f0e6843cf",
  "meta": {
    "api_version": {
      "version": "2",
      "is_experimental": false
    },
    "billed_units": {
      "search_units": 1
    }
  }
}
```

## Authentication

Authentication is handled via a Bearer token in the `Authorization` header.

**Format**: `Bearer <token>` where `<token>` is your API key.

## Headers

| Header          | Type   | Required | Description                                 |
| --------------- | ------ | -------- | ------------------------------------------- |
| `X-Client-Name` | string | Optional | The name of the project making the request. |

## Request Body

| Parameter            | Type            | Required | Description                                                                                                                                                                                                                                                                                                                  |
| -------------------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`              | string          | Required | The identifier of the model to use (e.g., `rerank-v3.5`).                                                                                                                                                                                                                                                                    |
| `query`              | string          | Required | The search query.                                                                                                                                                                                                                                                                                                            |
| `documents`          | list of strings | Required | A list of texts to be compared against the query. For optimal performance, it is recommended to send no more than 1,000 documents in a single request. **Note:** Long documents will be automatically truncated to the `max_tokens_per_doc` value. Structured data should be formatted as YAML strings for best performance. |
| `top_n`              | integer         | Optional | Limits the number of returned reranked results to the specified value (must be `>= 1`). If not provided, all results will be returned.                                                                                                                                                                                       |
| `max_tokens_per_doc` | integer         | Optional | Defaults to `4096`. Long documents will be automatically truncated to this number of tokens.                                                                                                                                                                                                                                 |
| `priority`           | integer         | Optional | Defaults to `0`. The priority of the request, with lower numbers indicating higher priority (range `0-999`). Higher priority requests are handled first and are the last to be dropped when the system is under load.                                                                                                        |

## Response Body

### On Success (200 OK)

| Field                       | Type                    | Description                                                                                                               |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `results`                   | list of objects         | An ordered list of ranked documents. Each object contains the original `index` of the document and its `relevance_score`. |
| `id`                        | string or null          | A unique identifier for the request.                                                                                      |
| `meta`                      | object or null          | Contains metadata about the API call.                                                                                     |
| `meta.api_version`          | object or null          | Information about the API version used.                                                                                   |
| `meta.billed_units`         | object or null          | Information about the billable units for the request.                                                                     |
| `meta.tokens`               | object or null          | Information about token usage.                                                                                            |
| `meta.tokens.cached_tokens` | double or null          | The number of prompt tokens that hit the inference cache.                                                                 |
| `warnings`                  | list of strings or null | A list of any warnings generated during the request.                                                                      |

## Error Codes

| Code | Error                       | Description                                                                                                 |
| ---- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 400  | Bad Request Error           | The server could not understand the request due to invalid syntax.                                          |
| 401  | Unauthorized Error          | Authentication failed or was not provided.                                                                  |
| 403  | Forbidden Error             | The server understood the request but refuses to authorize it.                                              |
| 404  | Not Found Error             | The requested resource could not be found.                                                                  |
| 422  | Unprocessable Entity Error  | The request was well-formed but was unable to be followed due to semantic errors.                           |
| 429  | Too Many Requests Error     | The user has sent too many requests in a given amount of time.                                              |
| 498  | Invalid Token Error         | The provided token is invalid.                                                                              |
| 499  | Client Closed Request Error | The client closed the connection before the server could send a response.                                   |
| 500  | Internal Server Error       | The server encountered an unexpected condition that prevented it from fulfilling the request.               |
| 501  | Not Implemented Error       | The server does not support the functionality required to fulfill the request.                              |
| 503  | Service Unavailable Error   | The server is not ready to handle the request.                                                              |
| 504  | Gateway Timeout Error       | The server, while acting as a gateway or proxy, did not receive a timely response from the upstream server. |
