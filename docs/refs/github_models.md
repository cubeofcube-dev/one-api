# REST API Endpoints for Models Inference

https://docs.github.com/en/rest/models/inference

**Note:** The REST API is now versioned. For more information, see "About API versioning."

This document provides instructions on how to use the REST API to submit a chat completion request to a specified model, with or without organizational attribution.

## About GitHub Models Inference

You can use the REST API to run inference requests using the GitHub Models platform. The API requires the `models:read` scope when using a fine-grained personal access token or when authenticating using a GitHub App.

The API supports:

- Accessing top models from OpenAI, DeepSeek, Microsoft, Llama, and more.
- Running chat-based inference requests with full control over sampling and response parameters.
- Streaming or non-streaming completions.
- Organizational attribution and usage tracking.

## Run an inference request attributed to an organization

This endpoint allows you to run an inference request attributed to a specific organization. You must be a member of the organization and have enabled models to use this endpoint. The token used to authenticate must have the `models:read` permission if using a fine-grained PAT or GitHub App minted token.

### Parameters

#### Headers

| Name           | Type   | Description                                              |
| -------------- | ------ | -------------------------------------------------------- |
| `content-type` | string | **Required**. Setting to `application/json` is required. |
| `accept`       | string | Setting to `application/vnd.github+json` is recommended. |

#### Path Parameters

| Name  | Type   | Description                                                                                                     |
| ----- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `org` | string | **Required**. The organization login associated with the organization to which the request is to be attributed. |

#### Query Parameters

| Name          | Type   | Description                                                       |
| ------------- | ------ | ----------------------------------------------------------------- |
| `api-version` | string | The API version to use. Optional, but required for some features. |

#### Body Parameters

| Name                | Type             | Description                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`             | string           | **Required**. ID of the specific model to use for the request. The model ID should be in the format of `{publisher}/{model_name}` where `"openai/gpt-4.1"` is an example. You can find supported models in the `catalog/models` endpoint.                                                                                               |
| `messages`          | array of objects | **Required**. The collection of context messages associated with this chat completion request. Typical usage begins with a chat message for the `System` role that provides instructions for the behavior of the assistant, followed by alternating messages between the `User` and `Assistant` roles.                                  |
| `frequency_penalty` | number           | A value that influences the probability of generated tokens appearing based on their cumulative frequency in generated text. Positive values will make tokens less likely to appear as their frequency increases and decrease the likelihood of the model repeating the same statements verbatim. Supported range is `[-2, 2]`.         |
| `max_tokens`        | integer          | The maximum number of tokens to generate in the completion. The token count of your prompt plus `max_tokens` cannot exceed the model's context length.                                                                                                                                                                                  |
| `modalities`        | array of strings | The modalities that the model is allowed to use for the chat completions response. The default modality is `text`. Indicating an unsupported modality combination results in a 422 error. Supported values are: `text`, `audio`.                                                                                                        |
| `presence_penalty`  | number           | A value that influences the probability of generated tokens appearing based on their existing presence in generated text. Positive values will make tokens less likely to appear when they already exist and increase the model's likelihood to output new tokens. Supported range is `[-2, 2]`.                                        |
| `response_format`   | object           | The desired format for the response. Can be one of these objects.                                                                                                                                                                                                                                                                       |
| `seed`              | integer          | If specified, the system will make a best effort to sample deterministically such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed.                                                                                                                                |
| `stream`            | boolean          | A value indicating whether chat completions should be streamed for this request. Default: `false`.                                                                                                                                                                                                                                      |
| `stream_options`    | object           | Whether to include usage information in the response. Requires `stream` to be set to `true`.                                                                                                                                                                                                                                            |
| `stop`              | array of strings | A collection of textual sequences that will end completion generation.                                                                                                                                                                                                                                                                  |
| `temperature`       | number           | The sampling temperature to use that controls the apparent creativity of generated completions. Higher values will make output more random while lower values will make results more focused and deterministic. It is not recommended to modify `temperature` and `top_p` for the same completion request. Supported range is `[0, 1]`. |
| `tool_choice`       | string           | If specified, the model will configure which of the provided tools it can use for the chat completions response. Can be one of: `auto`, `required`, `none`.                                                                                                                                                                             |
| `tools`             | array of objects | A list of tools the model may request to call. Currently, only functions are supported as a tool.                                                                                                                                                                                                                                       |
| `top_p`             | number           | An alternative to sampling with temperature called nucleus sampling. This value causes the model to consider the results of tokens with the provided probability mass. It is not recommended to modify `temperature` and `top_p` for the same request. Supported range is `[0, 1]`.                                                     |

### HTTP Response Status Codes

| Status code | Description |
| ----------- | ----------- |
| 200         | OK          |

### Code Samples

#### Request Example

`POST /orgs/{org}/inference/chat/completions`

```curl
curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  https://models.github.ai/orgs/ORG/inference/chat/completions \
  -d '{"model":"openai/gpt-4.1","messages":[{"role":"user","content":"What is the capital of France?"}]}'
```

#### Example Response

**Status: 200**

```json
{
  "choices": [
    {
      "message": {
        "content": "The capital of France is Paris.",
        "role": "assistant"
      }
    }
  ]
}
```

## Run an inference request

This endpoint allows you to run an inference request. The token used to authenticate must have the `models:read` permission if using a fine-grained PAT or GitHub App minted token.

### Parameters

#### Headers

| Name           | Type   | Description                                              |
| -------------- | ------ | -------------------------------------------------------- |
| `content-type` | string | **Required**. Setting to `application/json` is required. |
| `accept`       | string | Setting to `application/vnd.github+json` is recommended. |

#### Query Parameters

| Name          | Type   | Description                                                       |
| ------------- | ------ | ----------------------------------------------------------------- |
| `api-version` | string | The API version to use. Optional, but required for some features. |

#### Body Parameters

| Name                | Type             | Description                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`             | string           | **Required**. ID of the specific model to use for the request. The model ID should be in the format of `{publisher}/{model_name}` where `"openai/gpt-4.1"` is an example. You can find supported models in the `catalog/models` endpoint.                                                                                               |
| `messages`          | array of objects | **Required**. The collection of context messages associated with this chat completion request. Typical usage begins with a chat message for the `System` role that provides instructions for the behavior of the assistant, followed by alternating messages between the `User` and `Assistant` roles.                                  |
| `frequency_penalty` | number           | A value that influences the probability of generated tokens appearing based on their cumulative frequency in generated text. Positive values will make tokens less likely to appear as their frequency increases and decrease the likelihood of the model repeating the same statements verbatim. Supported range is `[-2, 2]`.         |
| `max_tokens`        | integer          | The maximum number of tokens to generate in the completion. The token count of your prompt plus `max_tokens` cannot exceed the model's context length.                                                                                                                                                                                  |
| `modalities`        | array of strings | The modalities that the model is allowed to use for the chat completions response. The default modality is `text`. Indicating an unsupported modality combination results in a 422 error. Supported values are: `text`, `audio`.                                                                                                        |
| `presence_penalty`  | number           | A value that influences the probability of generated tokens appearing based on their existing presence in generated text. Positive values will make tokens less likely to appear when they already exist and increase the model's likelihood to output new tokens. Supported range is `[-2, 2]`.                                        |
| `response_format`   | object           | The desired format for the response. Can be one of these objects.                                                                                                                                                                                                                                                                       |
| `seed`              | integer          | If specified, the system will make a best effort to sample deterministically such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed.                                                                                                                                |
| `stream`            | boolean          | A value indicating whether chat completions should be streamed for this request. Default: `false`.                                                                                                                                                                                                                                      |
| `stream_options`    | object           | Whether to include usage information in the response. Requires `stream` to be set to `true`.                                                                                                                                                                                                                                            |
| `stop`              | array of strings | A collection of textual sequences that will end completion generation.                                                                                                                                                                                                                                                                  |
| `temperature`       | number           | The sampling temperature to use that controls the apparent creativity of generated completions. Higher values will make output more random while lower values will make results more focused and deterministic. It is not recommended to modify `temperature` and `top_p` for the same completion request. Supported range is `[0, 1]`. |
| `tool_choice`       | string           | If specified, the model will configure which of the provided tools it can use for the chat completions response. Can be one of: `auto`, `required`, `none`.                                                                                                                                                                             |
| `tools`             | array of objects | A list of tools the model may request to call. Currently, only functions are supported as a tool.                                                                                                                                                                                                                                       |
| `top_p`             | number           | An alternative to sampling with temperature called nucleus sampling. This value causes the model to consider the results of tokens with the provided probability mass. It is not recommended to modify `temperature` and `top_p` for the same request. Supported range is `[0, 1]`.                                                     |

### HTTP response status codes

| Status code | Description |
| ----------- | ----------- |
| 200         | OK          |

### Code samples

#### Request example

`POST /inference/chat/completions`

```curl
curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  https://models.github.ai/inference/chat/completions \
  -d '{"model":"openai/gpt-4.1","messages":[{"role":"user","content":"What is the capital of France?"}]}'
```

#### Example Response

**Status: 200**

```json
{
  "choices": [
    {
      "message": {
        "content": "The capital of France is Paris.",
        "role": "assistant"
      }
    }
  ]
}
```

## Help and Support

- Ask the GitHub community
- Contact support
