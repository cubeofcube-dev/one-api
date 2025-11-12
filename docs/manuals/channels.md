# Channel Administration Guide

This guide explains how One-API channels work, how to set them up, and what every option on the Modern UI **Edit Channel** page does. It is written for administrators who manage provider connections, quotas, and built-in tools.

## 1. Channel Fundamentals

- **What is a channel?** A channel is a configured connection to an upstream AI provider (OpenAI, Azure OpenAI, Anthropic, proxy services, etc.). Channels determine where requests are sent, which models are available, pricing, credentials, rate limits, and tool policies.
- **Why multiple channels?** You can balance traffic, separate staging from production, or expose different model catalogs and pricing to user groups.
- **Lifecycle overview:**
  1. Create channel → supply credentials, base URL, and model list.
  2. Assign pricing, tooling policy, and optional overrides.
  3. Associate channel with user groups / routing logic.
  4. Monitor usage and update status or quotas as needed.

## 2. Creating or Editing a Channel

Open **Channels → Create Channel** or select an existing channel and choose **Edit**. The Modern template renders the same React form for both flows; fields marked with `*` are required.

### 2.1 Basic Information

| Field                | Description                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Channel Name\***   | Human-readable label (e.g., `Azure GPT-4 Prod`). Used throughout the dashboard.                                                                                                 |
| **Channel Type\***   | Provider preset. Determines default base URLs, adapter behavior, specialized fields, and available models. You must choose this before other provider-specific controls unlock. |
| **API Key**          | Provider credential. Leave blank while editing to keep the stored secret. Some providers (AWS, Vertex, Coze OAuth) build the key automatically from other fields.               |
| **Base URL**         | Endpoint root. Optional unless the provider demands it (Azure, OpenAI-compatible). Trailing slashes are trimmed automatically.                                                  |
| **Group Membership** | Multi-select of logical user groups (default is always included). Channels are eligible only for the groups you assign here.                                                    |
| **Models**           | Explicit allowlist of model IDs routed through this channel. Empty list means “all supported models”. The helper dialog offers search, bulk add, and clear actions.             |
| **Model Mapping**    | JSON object translating external model names to upstream model IDs (string → string). Useful when clients send `gpt-4` but upstream expects a deployment alias.                 |

### 2.2 Provider Credentials & Config (`config` block)

`config` stores provider-specific metadata as JSON. The UI renders dedicated inputs based on the channel type:

- **Azure OpenAI**: region endpoint, API version (defaults to `2024-03-01-preview` if blank).
- **AWS Bedrock**: region plus access/secret keys (channel key is derived as `AK|SK|Region`).
- **Vertex AI**: region, project ID, and service account JSON.
- **Coze**: choose between Personal Access Token (entered in API Key field) or OAuth JWT JSON blob.
- **Cloudflare**, **plugin** providers, and others expose single-purpose fields like Account ID or plugin parameters.

Any new provider that requires extra configuration will appear in this section after selecting the channel type.

### 2.3 Advanced JSON Fields

| Field                         | Purpose                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Model Configs**             | JSON describing per-model pricing ratios and max tokens. Example structure: `{"gpt-4o": {"ratio": 0.03, "completion_ratio": 2.0, "max_tokens": 128000}}`. Empty → pricing inferred from global defaults. |
| **Tooling Config (JSON)**     | Defines built-in tool policy and pricing. See [Section 4](#4-tooling-policy).                                                                                                                            |
| **System Prompt**             | Optional default system message injected into every request when the upstream supports it.                                                                                                               |
| **Inference Profile ARN Map** | AWS Bedrock only. JSON map of model → Inference Profile ARN.                                                                                                                                             |

All JSON fields accept formatted input; the **Format** buttons auto-indent valid JSON, and empty strings are saved as `null`.

### 2.4 Operational Settings

| Field                                  | Description                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Priority**                           | Higher values are preferred when multiple channels serve the same model and group.                                     |
| **Weight**                             | Legacy load-balancing hint. Unless you rely on historical behavior, set `0`.                                           |
| **Rate Limit**                         | Requests per minute allowed for this channel. `0` means unlimited (subject to upstream throttling).                    |
| **Testing Model** (optional API field) | Preferred model for health checks. When blank, One-API chooses the cheapest configured model.                          |
| **Status**                             | Edited via the channel list (Enable / Disable). Disabled channels stay in the database but are skipped during routing. |

## 3. Model Pricing & Quotas

One-API meters usage in unified quota units. Channel-level pricing can override global defaults:

1. **Model Configs JSON** (recommended): Set `ratio`, `completion_ratio`, and optional `max_tokens` per model. Ratios are expressed as USD per 1M tokens; they are converted automatically to quota units.
2. **Legacy fields** (`model_ratio`, `completion_ratio`): still respected during migration but replaced by `model_configs` in the UI.

When pricing data is missing, One-API falls back to adapter defaults (see `relay/adaptor/*/constants.go`). For accurate billing, provide explicit values that match your provider contract.

**Balance & Usage:** Additional readonly fields (visible in the table, not the form) track balance, last update time, and consumed quota.

## 4. Tooling Policy

Built-in tools (e.g., `web_search`, `code_interpreter`, `file_search`) funnel through a consistent policy engine:

1. **Effective allowlist** is computed from provider defaults + channel overrides.
2. **Pricing** must exist for any allowed tool. If no pricing entry exists, requests are rejected.
3. **Whitelist behavior:**
   - No whitelist → any tool with pricing is allowed.
   - Empty whitelist → identical to “no whitelist”; pricing still controls access.
   - Administrator-specified whitelist → only those tools are allowed, even if provider defaults include others.

### Tooling Config JSON Schema

```json
{
  "whitelist": ["web_search", "code_interpreter"],
  "pricing": {
    "web_search": { "usd_per_call": 0.01 },
    "code_interpreter": { "usd_per_call": 0.03 }
  }
}
```

- `whitelist` entries are case-insensitive and trimmed.
- Pricing can use either `usd_per_call` or `quota_per_call`. When both are absent or zero, the tool is considered unpriced and therefore blocked.
- Clear the field (submit an empty string) to revert to provider defaults.

The UI offers helper buttons:

- **Format**: Reformat JSON using canonical order and indentation.
- **Load Defaults**: Pull adapter defaults (when available) for the selected channel type.
- **Add Tool**: Quick-add a whitelist entry; the UI will prefill pricing from defaults or prompt for manual input.

## 5. Groups and Routing

- **Groups** map to user segments. Each channel must include `default`; you can add more (e.g., `enterprise`, `beta`, `internal`).
- Routing logic selects channels based on user group, model requested, channel priority, and health status.
- For deterministic routing, restrict a channel to a single group and model combination.

## 6. Testing & Monitoring

- **Test Channel** button (on edit page) issues a diagnostic request using the configured testing model. Successful tests confirm credentials and base URL.
- **Status column** in the channel list shows response time, last test timestamp, balance, and auto-disable reasons. Channels auto-disable after repeated errors or quota exhaustion.
- Traces are recorded in `logs/` and the database for auditing.

## 7. Editing Tips & Validation Rules

- Every JSON field is validated client-side with human-readable error messages. Invalid JSON blocks submission.
- Numeric fields (priority, weight, rate limit) accept integers only; blank values become `0`.
- Coze OAuth JWT requires a full JSON object with `client_type`, `client_id`, `coze_www_base`, `coze_api_base`, `private_key`, and `public_key_id`.
- Azure `other` field defaults to the latest supported API version if left blank.
- Clearing sensitive fields: leaving the API key empty when editing keeps the stored value. To remove credentials entirely, disable or delete the channel.

## 8. Troubleshooting Checklist

| Symptom                                                            | Possible Cause                                          | Remedy                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Requests still reach `web_search` after removing it from whitelist | Pricing entry left intact while whitelist omitted       | Ensure whitelist contains only approved tools or clear pricing entries as well |
| Channel edit form loads with empty tooling JSON                    | Stored config is `null` or invalid JSON                 | Re-enter JSON, use **Format** to validate                                      |
| 401/403 from provider                                              | API key malformed, missing base URL, or wrong auth type | Re-enter credentials; verify channel type matches provider                     |
| Users hit “no enabled channel” errors                              | Channel disabled, group mismatch, or model not in list  | Re-enable channel, adjust groups/models                                        |

## 9. Glossary of Data Fields

- **Balance / Balance Updated Time**: Optional manual tracking for providers without APIs. Populated by scheduled jobs or manual refresh.
- **Used Quota**: Accumulated quota units consumed by the channel; resets via maintenance or database operations.
- **Model Mapping**: Facilitates backwards compatibility when client model names differ from provider deployments.
- **Config JSON**: Structured storage for adapter-specific metadata (region, auth type, plugin parameters, etc.).

## 10. Best Practices

- Keep at least one fallback channel per critical model with a distinct provider to improve resiliency.
- Match channel names to deployment environments (`Prod`, `Staging`, `EU`, `US`) for easy identification.
- Review tooling policies quarterly. Providers may introduce new built-in tools requiring explicit pricing.
- Before editing a production channel, duplicate it, apply changes to the copy, test thoroughly, then swap traffic.

For additional technical reference, inspect the React implementation (`web/modern/src/pages/channels/EditChannelPage.tsx`) and backend controller (`controller/channel.go`). They align exactly with the options described above.
