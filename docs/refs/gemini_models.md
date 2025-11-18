# Gemini Developer API Pricing

> https://ai.google.dev/gemini-api/docs/pricing

Start building free of charge with generous limits, then scale up with pay-as-you-go pricing for your production-ready applications.

## Service Tiers

### Free

_For developers and small projects getting started with the Gemini API._

- ✅ Limited access to certain models
- ✅ Free input & output tokens
- ✅ Google AI Studio access
- ✅ Content **used** to improve our products

### Paid

_For production applications that require higher volumes and advanced features._

- ✅ Higher rate limits for production deployments
- ✅ Access to Context caching
- ✅ Batch API (50% cost reduction)
- ✅ Access to Google's most advanced models
- ✅ Content **not** used to improve our products

### Enterprise

_For large-scale deployments with custom needs for security, support, and compliance, powered by Vertex AI._

- ✅ All features in Paid, plus optional access to:
- ✅ Dedicated support channels
- ✅ Advanced security & compliance
- ✅ Provisioned throughput
- ✅ Volume-based discounts (based on usage)
- ✅ ML ops, model garden and more

## Model Pricing

### Gemini 3 Pro Preview

_The best model in the world for multimodal understanding, and our most powerful agentic and vibe-coding model yet._

| Feature                                           | Free Tier                | Paid Tier (per 1M tokens)                                                                   |
| :------------------------------------------------ | :----------------------- | :------------------------------------------------------------------------------------------ |
| **Input price**                                   | Not available            | **$2.00** (prompts ≤ 200k)<br>**$4.00** (prompts > 200k)                                    |
| **Output price**<br>_(including thinking tokens)_ | Not available            | **$12.00** (prompts ≤ 200k)<br>**$18.00** (prompts > 200k)                                  |
| **Context caching price**                         | Not available            | **$0.20** (prompts ≤ 200k)<br>**$0.40** (prompts > 200k)<br>Storage: $4.50 / 1M tokens / hr |
| **Grounding (Google Search)**                     | Not available            | 1,500 RPD (free), then **$14** / 1k queries (Coming soon)                                   |
| **Grounding (Maps)**                              | Not available            | Not available                                                                               |
| **Data Usage**                                    | Used to improve products | **No**                                                                                      |

### Gemini 2.5 Pro

_Our state-of-the-art multipurpose model, which excels at coding and complex reasoning tasks._

| Feature                                           | Free Tier                | Paid Tier (per 1M tokens)                                                                    |
| :------------------------------------------------ | :----------------------- | :------------------------------------------------------------------------------------------- |
| **Input price**                                   | Free                     | **$1.25** (prompts ≤ 200k)<br>**$2.50** (prompts > 200k)                                     |
| **Output price**<br>_(including thinking tokens)_ | Free                     | **$10.00** (prompts ≤ 200k)<br>**$15.00** (prompts > 200k)                                   |
| **Context caching price**                         | Not available            | **$0.125** (prompts ≤ 200k)<br>**$0.25** (prompts > 200k)<br>Storage: $4.50 / 1M tokens / hr |
| **Grounding (Google Search)**                     | Not available            | 1,500 RPD (free), then **$35** / 1k grounded prompts                                         |
| **Grounding (Maps)**                              | Not available            | 10,000 RPD (free), then **$25** / 1k grounded prompts                                        |
| **Data Usage**                                    | Used to improve products | **No**                                                                                       |

### Gemini 2.5 Flash

_Our first hybrid reasoning model which supports a 1M token context window and has thinking budgets._

| Feature                                           | Free Tier                | Paid Tier (per 1M tokens)                                                           |
| :------------------------------------------------ | :----------------------- | :---------------------------------------------------------------------------------- |
| **Input price**                                   | Free                     | **$0.30** (text/image/video)<br>**$1.00** (audio)                                   |
| **Output price**<br>_(including thinking tokens)_ | Free                     | **$2.50**                                                                           |
| **Context caching price**                         | Not available            | **$0.03** (text/image/video)<br>**$0.1** (audio)<br>Storage: $1.00 / 1M tokens / hr |
| **Grounding (Google Search)**                     | Free (up to 500 RPD\*)   | 1,500 RPD (free\*), then **$35** / 1k grounded prompts                              |
| **Grounding (Maps)**                              | 500 RPD                  | 1,500 RPD (free), then **$25** / 1k grounded prompts                                |
| **Data Usage**                                    | Used to improve products | **No**                                                                              |

_\*Limit shared with Flash-Lite RPD_

### Gemini 2.5 Flash Preview

_Best for large scale processing, low-latency, high volume tasks that require thinking, and agentic use cases._

| Feature                                           | Free Tier                | Paid Tier (per 1M tokens)                                                           |
| :------------------------------------------------ | :----------------------- | :---------------------------------------------------------------------------------- |
| **Input price**                                   | Free                     | **$0.30** (text/image/video)<br>**$1.00** (audio)                                   |
| **Output price**<br>_(including thinking tokens)_ | Free                     | **$2.50**                                                                           |
| **Context caching price**                         | Not available            | **$0.03** (text/image/video)<br>**$0.1** (audio)<br>Storage: $1.00 / 1M tokens / hr |
| **Grounding (Google Search)**                     | Free (up to 500 RPD)     | 1,500 RPD (free), then **$35** / 1k grounded prompts                                |
| **Data Usage**                                    | Used to improve products | **No**                                                                              |

### Gemini 2.5 Flash-Lite

_Our smallest and most cost effective model, built for at scale usage._

| Feature                                           | Free Tier                | Paid Tier (per 1M tokens)                                                            |
| :------------------------------------------------ | :----------------------- | :----------------------------------------------------------------------------------- |
| **Input price**                                   | Free                     | **$0.10** (text/image/video)<br>**$0.30** (audio)                                    |
| **Output price**<br>_(including thinking tokens)_ | Free                     | **$0.40**                                                                            |
| **Context caching price**                         | Not available            | **$0.01** (text/image/video)<br>**$0.03** (audio)<br>Storage: $1.00 / 1M tokens / hr |
| **Grounding (Google Search)**                     | Free (up to 500 RPD\*)   | 1,500 RPD (free\*), then **$35** / 1k grounded prompts                               |
| **Grounding (Maps)**                              | 500 RPD                  | 1,500 RPD (free), then **$25** / 1k grounded prompts                                 |
| **Data Usage**                                    | Used to improve products | **No**                                                                               |

_\*Limit shared with Flash RPD_

### Gemini 2.5 Flash-Lite Preview

| Feature                       | Free Tier                | Paid Tier (per 1M tokens)                                                            |
| :---------------------------- | :----------------------- | :----------------------------------------------------------------------------------- |
| **Input price**               | Free                     | **$0.10** (text/image/video)<br>**$0.30** (audio)                                    |
| **Output price**              | Free                     | **$0.40**                                                                            |
| **Context caching price**     | Not available            | **$0.01** (text/image/video)<br>**$0.03** (audio)<br>Storage: $1.00 / 1M tokens / hr |
| **Grounding (Google Search)** | Free (up to 500 RPD)     | 1,500 RPD (free), then **$35** / 1k grounded prompts                                 |
| **Data Usage**                | Used to improve products | **No**                                                                               |

### Gemini 2.5 Flash Native Audio (Live API)

_Optimized for higher quality audio outputs with better pacing, voice naturalness, verbosity, and mood._

| Feature          | Free Tier                | Paid Tier (per 1M tokens)                   |
| :--------------- | :----------------------- | :------------------------------------------ |
| **Input price**  | Free                     | **$0.50** (text)<br>**$3.00** (audio/video) |
| **Output price** | Free                     | **$2.00** (text)<br>**$12.00** (audio)      |
| **Data Usage**   | Used to improve products | **No**                                      |

> **Note:** The Live API also includes half-cascade audio generation models (`gemini-live-2.5-flash-preview`, `gemini-2.0-flash-live-001`) which will be deprecated soon.

### Gemini 2.5 Flash Image

_Native image generation model._

| Feature          | Free Tier                | Paid Tier                          |
| :--------------- | :----------------------- | :--------------------------------- |
| **Input price**  | Not available            | **$0.30** / 1M tokens (text/image) |
| **Output price** | Not available            | **$0.039** per image\*             |
| **Data Usage**   | Used to improve products | **No**                             |

_\*Output images up to 1024x1024px consume 1290 tokens and are equivalent to $0.039 per image ($30 per 1M tokens)._

### Gemini 2.5 Flash Preview TTS

_Text-to-speech audio model optimized for price-performance._

| Feature          | Free Tier                | Paid Tier (per 1M tokens) |
| :--------------- | :----------------------- | :------------------------ |
| **Input price**  | Free                     | **$0.50** (text)          |
| **Output price** | Free                     | **$10.00** (audio)        |
| **Data Usage**   | Used to improve products | **No**                    |

### Gemini 2.5 Pro Preview TTS

_Text-to-speech audio model optimized for powerful, low-latency speech generation._

| Feature          | Free Tier                | Paid Tier (per 1M tokens) |
| :--------------- | :----------------------- | :------------------------ |
| **Input price**  | Not available            | **$1.00** (text)          |
| **Output price** | Not available            | **$20.00** (audio)        |
| **Data Usage**   | Used to improve products | **No**                    |

### Gemini 2.0 Flash

_Balanced multimodal model with 1 million token context window._

| Feature                       | Free Tier                | Paid Tier (per 1M tokens)                                                              |
| :---------------------------- | :----------------------- | :------------------------------------------------------------------------------------- |
| **Input price**               | Free                     | **$0.10** (text/image/video)<br>**$0.70** (audio)                                      |
| **Output price**              | Free                     | **$0.40**                                                                              |
| **Context caching price**     | Free                     | **$0.025** (text/image/video)<br>**$0.175** (audio)<br>Storage: $1.00 / 1M tokens / hr |
| **Image generation**          | Free                     | **$0.039** per image                                                                   |
| **Grounding (Google Search)** | Free (up to 500 RPD)     | 1,500 RPD (free), then **$35** / 1k grounded prompts                                   |
| **Grounding (Maps)**          | 500 RPD                  | 1,500 RPD (free), then **$25** / 1k grounded prompts                                   |
| **Data Usage**                | Used to improve products | **No**                                                                                 |

### Gemini 2.0 Flash-Lite

| Feature          | Free Tier                | Paid Tier (per 1M tokens) |
| :--------------- | :----------------------- | :------------------------ |
| **Input price**  | Free                     | **$0.075**                |
| **Output price** | Free                     | **$0.30**                 |
| **Data Usage**   | Used to improve products | **No**                    |

## Specialized Models

### Imagen 4

_Latest image generation model._

| Feature        | Free Tier                | Paid Tier (per Image) |
| :------------- | :----------------------- | :-------------------- |
| **Fast**       | Not available            | **$0.02**             |
| **Standard**   | Not available            | **$0.04**             |
| **Ultra**      | Not available            | **$0.06**             |
| **Data Usage** | Used to improve products | **No**                |

### Imagen 3

| Feature         | Free Tier     | Paid Tier (per Image) |
| :-------------- | :------------ | :-------------------- |
| **Image price** | Not available | **$0.03**             |

### Veo 3.1 & Veo 3

_Video generation models._

| Feature      | Free Tier     | Paid Tier (per second) |
| :----------- | :------------ | :--------------------- |
| **Standard** | Not available | **$0.40**              |
| **Fast**     | Not available | **$0.15**              |

### Veo 2

| Feature         | Free Tier     | Paid Tier (per second) |
| :-------------- | :------------ | :--------------------- |
| **Video price** | Not available | **$0.35**              |

### Gemini Embedding (gemini-embedding-001)

| Feature         | Free Tier | Paid Tier (per 1M tokens) |
| :-------------- | :-------- | :------------------------ |
| **Input price** | Free      | **$0.15**                 |

### Gemini Robotics-ER 1.5 Preview

| Feature                       | Free Tier            | Paid Tier (per 1M tokens)                            |
| :---------------------------- | :------------------- | :--------------------------------------------------- |
| **Input price**               | Free                 | **$0.30** (text/image/video)<br>**$1.00** (audio)    |
| **Output price**              | Free                 | **$2.50**                                            |
| **Grounding (Google Search)** | Free (up to 500 RPD) | 1,500 RPD (free), then **$35** / 1k grounded prompts |

### Gemini 2.5 Computer Use Preview

_Optimized for building browser control agents._

| Feature          | Free Tier     | Paid Tier (per 1M tokens)                  |
| :--------------- | :------------ | :----------------------------------------- |
| **Input price**  | Not available | **$1.25** (≤ 200k)<br>**$2.50** (> 200k)   |
| **Output price** | Not available | **$10.00** (≤ 200k)<br>**$15.00** (> 200k) |

### Gemma 3 & Gemma 3n

_Open models built from Gemini technology._

| Feature                | Free Tier | Paid Tier     |
| :--------------------- | :-------- | :------------ |
| **Input/Output price** | **Free**  | Not available |

## Pricing for Tools

_Tools are priced at their own rates, applied to the model using them._

| Tool               | Free Tier                   | Paid Tier                                                                                      |
| :----------------- | :-------------------------- | :--------------------------------------------------------------------------------------------- |
| **Google Search**  | 500 RPD free (shared limit) | 1,500 RPD free (shared limit). Then **$35** / 1,000 grounded prompts.                          |
| **Google Maps**    | 500 RPD                     | 1,500 RPD free (shared limit). 10,000 RPD free for Pro. Then **$25** / 1,000 grounded prompts. |
| **Code execution** | Free                        | Free                                                                                           |
| **URL context**    | Free                        | Charged as input tokens.                                                                       |
| **Computer use**   | Not available               | See Gemini 2.5 Computer Use pricing.                                                           |
| **File search**    | Free                        | Embeddings: **$0.15** / 1M tokens. Retrieved document tokens charged as regular tokens.        |

### Notes

- **[ * ]** Google AI Studio usage is free of charge in all available regions.
- **[ ** ]\*\* Prices may differ from the prices listed here and the prices offered on Vertex AI.
- **[ \*** ]\*\* If you are using dynamic retrieval to optimize costs, only requests that contain at least one grounding support URL from the web in their response are charged for Grounding with Google Search. Costs for Gemini always apply.

_Last updated 2025-11-18 UTC._
