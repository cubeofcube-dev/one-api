import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotifications } from '@/components/ui/notifications'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { logEditPageLayout } from '@/dev/layout-debug'
import { api } from '@/lib/api'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Info } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import * as z from 'zod'

// Enhanced channel schema with comprehensive validation
const channelSchema = z.object({
  name: z.string().min(1, 'Channel name is required'),
  // Coerce because Select returns string
  type: z.coerce.number().int().min(1, 'Channel type is required'),
  // key optional on edit; we enforce presence only on create in submit handler
  key: z.string().optional(),
  base_url: z.string().optional(),
  other: z.string().optional(),
  models: z.array(z.string()).default([]),
  model_mapping: z.string().optional(),
  model_configs: z.string().optional(),
  tooling: z.string().optional(),
  system_prompt: z.string().optional(),
  groups: z.array(z.string()).default(['default']),
  // Coerce because inputs emit strings; enforce integers for these numeric fields
  priority: z.coerce.number().int().default(0),
  weight: z.coerce.number().int().default(0),
  ratelimit: z.coerce.number().int().min(0).default(0),
  // AWS and Vertex AI specific config
  config: z.object({
    region: z.string().optional(),
    ak: z.string().optional(),
    sk: z.string().optional(),
    user_id: z.string().optional(),
    vertex_ai_project_id: z.string().optional(),
    vertex_ai_adc: z.string().optional(),
    auth_type: z.string().default('personal_access_token'),
    api_format: z.enum(['chat_completion', 'response']).default('chat_completion'),
  }).default({}),
  inference_profile_arn_map: z.string().optional(),
})

type ChannelForm = z.infer<typeof channelSchema>
type ChannelConfigForm = NonNullable<ChannelForm['config']>

interface ChannelType {
  key: number
  text: string
  value: number
  color?: string
  tip?: string
  description?: string
}

interface Model {
  id: string
  name: string
}

export const normalizeChannelType = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string' && value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// Coercion helpers to ensure numbers are numbers (avoid Zod "expected number, received string")
const toInt = (v: unknown, def = 0): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  const n = Number(v as any)
  return Number.isFinite(n) ? Math.trunc(n) : def
}

// Comprehensive channel types with colors and descriptions
const CHANNEL_TYPES: ChannelType[] = [
  { key: 1, text: 'OpenAI', value: 1, color: 'green' },
  { key: 50, text: 'OpenAI Compatible', value: 50, color: 'olive', description: 'OpenAI compatible channel, supports custom Base URL' },
  { key: 14, text: 'Anthropic', value: 14, color: 'black' },
  { key: 33, text: 'AWS', value: 33, color: 'black' },
  { key: 3, text: 'Azure', value: 3, color: 'olive' },
  { key: 11, text: 'PaLM2', value: 11, color: 'orange' },
  { key: 24, text: 'Gemini', value: 24, color: 'orange' },
  { key: 51, text: 'Gemini (OpenAI)', value: 51, color: 'orange', description: 'Gemini OpenAI compatible format' },
  { key: 28, text: 'Mistral AI', value: 28, color: 'orange' },
  { key: 41, text: 'Novita', value: 41, color: 'purple' },
  { key: 40, text: 'ByteDance Volcano Engine', value: 40, color: 'blue', description: 'Formerly ByteDance Doubao' },
  { key: 15, text: 'Baidu Wenxin Qianfan', value: 15, color: 'blue', tip: 'Get AK (API Key) and SK (Secret Key) from Baidu console' },
  { key: 47, text: 'Baidu Wenxin Qianfan V2', value: 47, color: 'blue', tip: 'For V2 inference service, get API Key from Baidu IAM' },
  { key: 17, text: 'Alibaba Tongyi Qianwen', value: 17, color: 'orange' },
  { key: 49, text: 'Alibaba Cloud Bailian', value: 49, color: 'orange' },
  { key: 18, text: 'iFlytek Spark Cognition', value: 18, color: 'blue', tip: 'WebSocket version API' },
  { key: 48, text: 'iFlytek Spark Cognition V2', value: 48, color: 'blue', tip: 'HTTP version API' },
  { key: 16, text: 'Zhipu ChatGLM', value: 16, color: 'violet' },
  { key: 19, text: '360 ZhiNao', value: 19, color: 'blue' },
  { key: 25, text: 'Moonshot AI', value: 25, color: 'black' },
  { key: 23, text: 'Tencent Hunyuan', value: 23, color: 'teal' },
  { key: 26, text: 'Baichuan Model', value: 26, color: 'orange' },
  { key: 27, text: 'MiniMax', value: 27, color: 'red' },
  { key: 29, text: 'Groq', value: 29, color: 'orange' },
  { key: 30, text: 'Ollama', value: 30, color: 'black' },
  { key: 31, text: '01.AI', value: 31, color: 'green' },
  { key: 32, text: 'StepFun', value: 32, color: 'blue' },
  { key: 34, text: 'Coze', value: 34, color: 'blue' },
  { key: 35, text: 'Cohere', value: 35, color: 'blue' },
  { key: 36, text: 'DeepSeek', value: 36, color: 'black' },
  { key: 37, text: 'Cloudflare', value: 37, color: 'orange' },
  { key: 38, text: 'DeepL', value: 38, color: 'black' },
  { key: 39, text: 'together.ai', value: 39, color: 'blue' },
  { key: 42, text: 'VertexAI', value: 42, color: 'blue' },
  { key: 43, text: 'Proxy', value: 43, color: 'blue' },
  { key: 44, text: 'SiliconFlow', value: 44, color: 'blue' },
  { key: 45, text: 'xAI', value: 45, color: 'blue' },
  { key: 46, text: 'Replicate', value: 46, color: 'blue' },
  { key: 22, text: 'Knowledge Base: FastGPT', value: 22, color: 'blue' },
  { key: 21, text: 'Knowledge Base: AI Proxy', value: 21, color: 'purple' },
  { key: 20, text: 'OpenRouter', value: 20, color: 'black' },
  { key: 2, text: 'Proxy: API2D', value: 2, color: 'blue' },
  { key: 5, text: 'Proxy: OpenAI-SB', value: 5, color: 'brown' },
  { key: 7, text: 'Proxy: OhMyGPT', value: 7, color: 'purple' },
  { key: 10, text: 'Proxy: AI Proxy', value: 10, color: 'purple' },
  { key: 4, text: 'Proxy: CloseAI', value: 4, color: 'teal' },
  { key: 6, text: 'Proxy: OpenAI Max', value: 6, color: 'violet' },
  { key: 9, text: 'Proxy: AI.LS', value: 9, color: 'yellow' },
  { key: 12, text: 'Proxy: API2GPT', value: 12, color: 'blue' },
  { key: 13, text: 'Proxy: AIGC2D', value: 13, color: 'purple' },
]

const CHANNEL_TYPES_WITH_DEDICATED_BASE_URL = new Set<number>([3, 50])
const CHANNEL_TYPES_WITH_CUSTOM_KEY_FIELD = new Set<number>([34])

const OPENAI_COMPATIBLE_API_FORMAT_OPTIONS = [
  { value: 'chat_completion', label: 'ChatCompletion (default)' },
  { value: 'response', label: 'Response' },
]

const COZE_AUTH_OPTIONS = [
  { key: 'personal_access_token', text: 'Personal Access Token', value: 'personal_access_token' },
  { key: 'oauth_jwt', text: 'OAuth JWT', value: 'oauth_jwt' },
]

const MODEL_MAPPING_EXAMPLE = {
  'gpt-3.5-turbo-0301': 'gpt-3.5-turbo',
  'gpt-4-0314': 'gpt-4',
  'gpt-4-32k-0314': 'gpt-4-32k',
}

const MODEL_CONFIGS_EXAMPLE = {
  'gpt-3.5-turbo-0301': {
    ratio: 0.0015,
    completion_ratio: 2.0,
    max_tokens: 65536,
  },
  'gpt-4': {
    ratio: 0.03,
    completion_ratio: 2.0,
    max_tokens: 128000,
  },
} satisfies Record<string, Record<string, unknown>>

const TOOLING_CONFIG_EXAMPLE = {
  whitelist: ['web_search'],
  pricing: {
    web_search: {
      usd_per_call: 0.025,
    },
  },
} satisfies Record<string, unknown>

type ToolPricingEntry = {
  usd_per_call?: number
  quota_per_call?: number
}

type ParsedToolingConfig = {
  whitelist?: string[]
  pricing?: Record<string, ToolPricingEntry>
}

type NormalizedToolingConfig = ParsedToolingConfig & { whitelist: string[] }

const normalizeToolingConfigShape = (value: unknown): NormalizedToolingConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { whitelist: [] }
  }

  const record = value as Record<string, unknown>
  const normalized: Record<string, unknown> = { ...record }
  const whitelistValue = (record as any).whitelist

  normalized.whitelist = Array.isArray(whitelistValue) ? whitelistValue : []

  return normalized as NormalizedToolingConfig
}

const stringifyToolingConfig = (value: unknown): string => JSON.stringify(normalizeToolingConfigShape(value), null, 2)

const clonePricingMap = (pricing?: Record<string, ToolPricingEntry>): Record<string, ToolPricingEntry> => {
  if (!pricing) {
    return {}
  }
  const entries = Object.entries(pricing).map(([key, entry]) => [key, { ...(entry ?? {}) } as ToolPricingEntry])
  return Object.fromEntries(entries)
}

const cloneNormalizedToolingConfig = (config: NormalizedToolingConfig): NormalizedToolingConfig => {
  const cloned: NormalizedToolingConfig = {
    ...config,
    whitelist: [...config.whitelist],
  }
  if (config.pricing) {
    cloned.pricing = clonePricingMap(config.pricing)
  }
  return cloned
}

const prepareToolingConfigForSet = (config: NormalizedToolingConfig): NormalizedToolingConfig => {
  const cloned = cloneNormalizedToolingConfig(config)
  if (cloned.pricing) {
    const cleanedPricing = Object.fromEntries(
      Object.entries(cloned.pricing).map(([key, entry]) => [key, { ...(entry ?? {}) } as ToolPricingEntry])
    )
    if (Object.keys(cleanedPricing).length > 0) {
      cloned.pricing = cleanedPricing
    } else {
      delete (cloned as any).pricing
    }
  }
  delete (cloned as any).model_overrides
  return cloned
}

const findPricingEntryCaseInsensitive = (
  pricing: Record<string, ToolPricingEntry> | undefined,
  toolName: string,
): { key: string | null; entry?: ToolPricingEntry } => {
  if (!pricing) {
    return { key: null, entry: undefined }
  }
  if (Object.prototype.hasOwnProperty.call(pricing, toolName)) {
    return { key: toolName, entry: pricing[toolName] }
  }
  const canonical = toolName.toLowerCase()
  const matchedKey = Object.keys(pricing).find((key) => key.toLowerCase() === canonical)
  if (!matchedKey) {
    return { key: null, entry: undefined }
  }
  return { key: matchedKey, entry: pricing[matchedKey] }
}

const OAUTH_JWT_CONFIG_EXAMPLE = {
  "client_type": "jwt",
  "client_id": "123456789",
  "coze_www_base": "https://www.coze.cn",
  "coze_api_base": "https://api.coze.cn",
  "private_key": "-----BEGIN PRIVATE KEY-----\n***\n-----END PRIVATE KEY-----",
  "public_key_id": "***********************************************************"
}

// JSON validation functions
const isValidJSON = (jsonString: string) => {
  if (!jsonString || jsonString.trim() === '') return true
  try {
    JSON.parse(jsonString)
    return true
  } catch (e) {
    return false
  }
}

const formatJSON = (jsonString: string) => {
  if (!jsonString || jsonString.trim() === '') return ''
  try {
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    return jsonString
  }
}

// Enhanced model configs validation
const validateModelConfigs = (configStr: string) => {
  if (!configStr || configStr.trim() === '') {
    return { valid: true }
  }

  try {
    const configs = JSON.parse(configStr)

    if (typeof configs !== 'object' || configs === null || Array.isArray(configs)) {
      return { valid: false, error: 'Model configs must be a JSON object' }
    }

    for (const [modelName, config] of Object.entries(configs)) {
      if (!modelName || modelName.trim() === '') {
        return { valid: false, error: 'Model name cannot be empty' }
      }

      if (typeof config !== 'object' || config === null || Array.isArray(config)) {
        return { valid: false, error: `Configuration for model "${modelName}" must be an object` }
      }

      const configObj = config as any
      // Validate ratio
      if (configObj.ratio !== undefined) {
        if (typeof configObj.ratio !== 'number' || configObj.ratio < 0) {
          return { valid: false, error: `Invalid ratio for model "${modelName}": must be a non-negative number` }
        }
      }

      // Validate completion_ratio
      if (configObj.completion_ratio !== undefined) {
        if (typeof configObj.completion_ratio !== 'number' || configObj.completion_ratio < 0) {
          return { valid: false, error: `Invalid completion_ratio for model "${modelName}": must be a non-negative number` }
        }
      }

      // Validate max_tokens
      if (configObj.max_tokens !== undefined) {
        if (!Number.isInteger(configObj.max_tokens) || configObj.max_tokens < 0) {
          return { valid: false, error: `Invalid max_tokens for model "${modelName}": must be a non-negative integer` }
        }
      }

      const hasPricingField = configObj.ratio !== undefined || configObj.completion_ratio !== undefined || configObj.max_tokens !== undefined
      if (!hasPricingField) {
        return { valid: false, error: `Model "${modelName}" must include pricing configuration` }
      }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: `Invalid JSON format: ${(error as Error).message}` }
  }
}

const validateToolingConfig = (configStr: string) => {
  if (!configStr || configStr.trim() === '') {
    return { valid: true }
  }

  try {
    const config = JSON.parse(configStr)
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      return { valid: false, error: 'Tooling config must be a JSON object' }
    }

    const validateWhitelist = (value: any, scope: string) => {
      if (value === undefined) {
        return { valid: true }
      }
      if (!Array.isArray(value)) {
        return { valid: false, error: `${scope} whitelist must be an array of strings` }
      }
      for (const entry of value) {
        if (typeof entry !== 'string' || entry.trim() === '') {
          return { valid: false, error: `${scope} whitelist contains an invalid entry` }
        }
      }
      return { valid: true }
    }

    const validatePricing = (value: any, scope: string) => {
      if (value === undefined) {
        return { valid: true }
      }
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { valid: false, error: `${scope} pricing must be an object` }
      }
      for (const [toolName, entry] of Object.entries(value as Record<string, any>)) {
        if (!toolName || toolName.trim() === '') {
          return { valid: false, error: `${scope} pricing has an empty tool name` }
        }
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
          return { valid: false, error: `${scope} pricing for tool "${toolName}" must be an object` }
        }
        const { usd_per_call, quota_per_call } = entry as Record<string, any>
        if (usd_per_call !== undefined && (typeof usd_per_call !== 'number' || usd_per_call < 0)) {
          return { valid: false, error: `${scope} pricing usd_per_call for "${toolName}" must be a non-negative number` }
        }
        if (quota_per_call !== undefined && (typeof quota_per_call !== 'number' || quota_per_call < 0)) {
          return { valid: false, error: `${scope} pricing quota_per_call for "${toolName}" must be a non-negative number` }
        }
        if (usd_per_call === undefined && quota_per_call === undefined) {
          return { valid: false, error: `${scope} pricing for "${toolName}" must include usd_per_call or quota_per_call` }
        }
      }
      return { valid: true }
    }

    const whitelistResult = validateWhitelist((config as any).whitelist, 'Default')
    if (!whitelistResult.valid) {
      return whitelistResult
    }

    const pricingResult = validatePricing((config as any).pricing, 'Default')
    if (!pricingResult.valid) {
      return pricingResult
    }

    if ((config as any).model_overrides !== undefined) {
      return { valid: false, error: 'model_overrides is no longer supported. Configure tooling at the channel level.' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: `Invalid JSON format: ${(error as Error).message}` }
  }
}

// Helper function to get key prompt based on channel type
const getKeyPrompt = (type: number) => {
  switch (type) {
    case 15:
      return 'Please enter Baidu API Key and Secret Key in format: API_KEY|SECRET_KEY'
    case 18:
      return 'Please enter iFlytek App ID, API Secret, and API Key in format: APPID|API_SECRET|API_KEY'
    case 22:
      return 'Please enter FastGPT API Key'
    case 23:
      return 'Please enter Tencent SecretId and SecretKey in format: SECRET_ID|SECRET_KEY'
    default:
      return 'Please enter your API key'
  }
}

export function EditChannelPage() {
  const params = useParams()
  const channelId = params.id
  const isEdit = channelId !== undefined
  const navigate = useNavigate()
  const { notify } = useNotifications()
  const { t } = useTranslation()
  const tr = useCallback(
      (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      t(`channels.edit.${key}`, { defaultValue, ...options }),
    [t]
  )
  const showToolingJSONError = useCallback(() => {
    notify({
      type: 'error',
      title: tr('tooling.errors.invalid_json_title', 'Invalid JSON'),
      message: tr('tooling.errors.invalid_json_message', 'Fix tooling JSON before editing the whitelist.'),
    })
  }, [notify, tr])

  const [loading, setLoading] = useState(isEdit)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modelsCatalog, setModelsCatalog] = useState<Record<number, string[]>>({})
  const [modelSearchTerm, setModelSearchTerm] = useState('')
  const [groups, setGroups] = useState<string[]>([])
  const [defaultPricing, setDefaultPricing] = useState<string>('')
  const [defaultTooling, setDefaultTooling] = useState<string>('')
  const [defaultBaseURL, setDefaultBaseURL] = useState<string>('')
  const [batchMode, setBatchMode] = useState(false)
  const [customModel, setCustomModel] = useState('')
  const [formInitialized, setFormInitialized] = useState(!isEdit) // Track if form has been properly initialized
  const [loadedChannelType, setLoadedChannelType] = useState<number | null>(null) // Track the loaded channel type
  const [customTool, setCustomTool] = useState('')

  const form = useForm<ChannelForm>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: '',
      // For create, do not preselect a type so dependent fields stay locked until user chooses
      // Keep a sane default for edit; values will be reset after loading
      type: isEdit ? 1 : (undefined as unknown as number),
      key: '',
      base_url: '',
      other: '',
      models: [],
      model_mapping: '',
      model_configs: '',
      tooling: '',
      system_prompt: '',
      groups: ['default'],
      priority: 0,
      weight: 0,
      ratelimit: 0,
      config: {
        region: '',
        ak: '',
        sk: '',
        user_id: '',
        vertex_ai_project_id: '',
        vertex_ai_adc: '',
        auth_type: 'personal_access_token',
        api_format: 'chat_completion',
      },
      inference_profile_arn_map: '',
    },
  })

  const watchType = form.watch('type')
  const watchConfig = form.watch('config')
  const watchModelConfigs = form.watch('model_configs') ?? ''
  const watchTooling = form.watch('tooling') ?? ''

  const normalizedChannelType = useMemo(() => normalizeChannelType(watchType), [watchType])

  const currentCatalogModels = useMemo(() => {
    if (normalizedChannelType === null) {
      return [] as string[]
    }
    return modelsCatalog[normalizedChannelType] ?? []
  }, [modelsCatalog, normalizedChannelType])

  const availableModels = useMemo<Model[]>(() => {
    return currentCatalogModels
      .map((model) => ({ id: model, name: model }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [currentCatalogModels])

  const parsedToolingConfig = useMemo<NormalizedToolingConfig | null>(() => {
    const raw = (watchTooling ?? '').trim()
    if (raw === '') {
      return normalizeToolingConfigShape({})
    }
    try {
      const parsed = JSON.parse(raw)
      return normalizeToolingConfigShape(parsed)
    } catch (error) {
      return null
    }
  }, [watchTooling])

  const parsedDefaultTooling = useMemo<NormalizedToolingConfig | null>(() => {
    if (!defaultTooling || defaultTooling.trim() === '') {
      return null
    }
    try {
      const parsed = JSON.parse(defaultTooling)
      return normalizeToolingConfigShape(parsed)
    } catch (error) {
      return null
    }
  }, [defaultTooling])

  const currentToolWhitelist = useMemo(() => {
    return parsedToolingConfig?.whitelist ?? []
  }, [parsedToolingConfig])

  const pricedToolSet = useMemo(() => {
    const result = new Set<string>()
    const collectPricing = (pricing?: Record<string, ToolPricingEntry>) => {
      if (!pricing || typeof pricing !== 'object') {
        return
      }
      Object.keys(pricing).forEach((tool) => {
        const canonical = tool.trim().toLowerCase()
        if (canonical) {
          result.add(canonical)
        }
      })
    }

    if (parsedToolingConfig) {
      collectPricing(parsedToolingConfig.pricing)
    }
    if (parsedDefaultTooling) {
      collectPricing(parsedDefaultTooling.pricing)
    }

    return result
  }, [parsedDefaultTooling, parsedToolingConfig])

  const availableDefaultTools = useMemo(() => {
    const defaults = new Set<string>()
    const collectWhitelist = (list?: string[]) => {
      if (!Array.isArray(list)) {
        return
      }
      list.forEach((tool) => {
        const trimmed = tool.trim()
        if (trimmed) {
          defaults.add(trimmed)
        }
      })
    }
    const collectPricingKeys = (pricing?: Record<string, ToolPricingEntry>) => {
      if (!pricing || typeof pricing !== 'object') {
        return
      }
      Object.keys(pricing).forEach((tool) => {
        const trimmed = tool.trim()
        if (trimmed) {
          defaults.add(trimmed)
        }
      })
    }

    if (parsedDefaultTooling) {
      collectWhitelist(parsedDefaultTooling.whitelist)
      collectPricingKeys(parsedDefaultTooling.pricing)
    }
    if (parsedToolingConfig && parsedToolingConfig !== null) {
      collectWhitelist(parsedToolingConfig.whitelist)
      collectPricingKeys(parsedToolingConfig.pricing)
    }

    return Array.from(defaults).sort((a, b) => a.localeCompare(b))
  }, [parsedDefaultTooling, parsedToolingConfig])

  const toolEditorDisabled = parsedToolingConfig === null

  const mutateToolWhitelist = useCallback((transform: (config: NormalizedToolingConfig) => NormalizedToolingConfig | null) => {
    if (parsedToolingConfig === null) {
      showToolingJSONError()
      return
    }
    const raw = watchTooling ?? ''
    let configs: NormalizedToolingConfig
    try {
      if (!raw || raw.trim() === '') {
        configs = normalizeToolingConfigShape({})
      } else {
        const parsed = JSON.parse(raw)
        configs = normalizeToolingConfigShape(parsed)
      }
    } catch (error) {
      showToolingJSONError()
      return
    }

    const workingConfig = cloneNormalizedToolingConfig(configs)
    const updatedConfig = transform(workingConfig)
    if (!updatedConfig) {
      return
    }

    const normalizedResult = normalizeToolingConfigShape(updatedConfig)
    const prepared = prepareToolingConfigForSet(normalizedResult)

    form.setValue('tooling', stringifyToolingConfig(prepared), { shouldDirty: true, shouldValidate: true })
  }, [form, notify, parsedToolingConfig, showToolingJSONError, watchTooling])

  const addToolToWhitelist = useCallback((toolName: string, options?: { isCustom?: boolean }) => {
    if (!toolName || parsedToolingConfig === null) {
      return
    }
    const trimmed = toolName.trim()
    if (!trimmed) {
      return
    }
    const canonical = trimmed.toLowerCase()
    const isCustomTool = options?.isCustom ?? false

    mutateToolWhitelist((config) => {
      if (config.whitelist.some((item) => item.toLowerCase() === canonical)) {
        return null
      }

      const updatedWhitelist = [...config.whitelist, trimmed]
      const nextPricing = clonePricingMap(config.pricing)

      // Remove any entries using a different casing for the same tool
      Object.keys(nextPricing).forEach((key) => {
        if (key.toLowerCase() === canonical && key !== trimmed) {
          nextPricing[trimmed] = { ...nextPricing[key] }
          delete nextPricing[key]
        }
      })

      if (!Object.prototype.hasOwnProperty.call(nextPricing, trimmed)) {
        const { entry: existingEntry } = findPricingEntryCaseInsensitive(config.pricing, trimmed)
        const { entry: defaultEntry } = findPricingEntryCaseInsensitive(parsedDefaultTooling?.pricing, trimmed)
        const pricingEntry = existingEntry
          ? { ...existingEntry }
          : defaultEntry
            ? { ...defaultEntry }
            : { usd_per_call: 0.1 }

        // Ensure custom tools always have a sensible default even without prior pricing
        nextPricing[trimmed] = isCustomTool && !existingEntry && !defaultEntry
          ? { usd_per_call: 0.1 }
          : pricingEntry
      }

      const hasPricingEntries = Object.keys(nextPricing).length > 0

      return {
        ...config,
        whitelist: updatedWhitelist,
        ...(hasPricingEntries ? { pricing: nextPricing } : {}),
      }
    })
    setCustomTool('')
  }, [mutateToolWhitelist, parsedDefaultTooling, parsedToolingConfig])

  const removeToolFromWhitelist = useCallback((toolName: string) => {
    if (!toolName || parsedToolingConfig === null) {
      return
    }
    const canonical = toolName.toLowerCase()
    mutateToolWhitelist((config) => {
      const filtered = config.whitelist.filter((item) => item.toLowerCase() !== canonical)
      if (filtered.length === config.whitelist.length) {
        return null
      }

      const nextPricing = clonePricingMap(config.pricing)
      Object.keys(nextPricing).forEach((key) => {
        if (key.toLowerCase() === canonical) {
          delete nextPricing[key]
        }
      })

      const hasPricingEntries = Object.keys(nextPricing).length > 0

      return {
        ...config,
        whitelist: filtered,
        ...(hasPricingEntries ? { pricing: nextPricing } : {}),
      }
    })
  }, [mutateToolWhitelist, parsedToolingConfig])

  const selectedChannelType = CHANNEL_TYPES.find(t => t.value === normalizedChannelType)
  const hasSelectedType = normalizedChannelType !== null && !!selectedChannelType
  const channelTypeRequiresDedicatedBaseURL = normalizedChannelType !== null && CHANNEL_TYPES_WITH_DEDICATED_BASE_URL.has(normalizedChannelType)
  const channelTypeOverridesKeyField = normalizedChannelType !== null && CHANNEL_TYPES_WITH_CUSTOM_KEY_FIELD.has(normalizedChannelType)

  // Debug logging for watchType changes
  useEffect(() => {
    console.log(`[CHANNEL_TYPE_DEBUG] watchType changed value=${String(watchType)} typeof=${typeof watchType}`)
    console.log(`[CHANNEL_TYPE_DEBUG] selectedChannelType value=${String(selectedChannelType?.value ?? '')} text=${String(selectedChannelType?.text ?? '')}`)
  }, [watchType, selectedChannelType])

  // Fetch server-side channel metadata (default base URL) when type changes
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setDefaultBaseURL('')
        if (normalizedChannelType === null) return
        const res = await api.get(`/api/channel/metadata?type=${normalizedChannelType}`)
        const base = (res.data?.data?.default_base_url as string) || ''
        if (!cancelled) {
          setDefaultBaseURL(base)
        }
      } catch (_) {
        // ignore
      }
    }
    run()
    return () => { cancelled = true }
  }, [normalizedChannelType])

  // Additional effect to ensure type field is properly set after form initialization
  useEffect(() => {
    if (isEdit && formInitialized && loadedChannelType) {
      const currentType = form.getValues('type')
      const numericCurrentType = typeof currentType === 'number' ? currentType : Number(currentType)
      console.log(`[CHANNEL_TYPE_DEBUG] form init currentType=${String(currentType)} numeric=${String(numericCurrentType)} loadedType=${String(loadedChannelType)}`)

      if (!Number.isFinite(numericCurrentType) || numericCurrentType !== loadedChannelType) {
        console.log(`[CHANNEL_TYPE_DEBUG] type mismatch in effect expected=${String(loadedChannelType)} actual=${String(currentType)}`)
        form.setValue('type', loadedChannelType, { shouldValidate: true, shouldDirty: false })
      }
    }
  }, [isEdit, formInitialized, loadedChannelType, form])

  // Effect to sync watchType with loadedChannelType
  useEffect(() => {
    if (isEdit && loadedChannelType && normalizedChannelType !== loadedChannelType) {
      console.log(`[CHANNEL_TYPE_DEBUG] watchType sync watchType=${String(watchType)} normalized=${String(normalizedChannelType)} loadedType=${String(loadedChannelType)}`)
      form.setValue('type', loadedChannelType, { shouldValidate: true, shouldDirty: false })
    }
  }, [isEdit, loadedChannelType, normalizedChannelType, watchType, form])

  const loadChannel = async () => {
    if (!channelId) {
      console.log('[CHANNEL_TYPE_DEBUG] no channelId skip load')
      return
    }

    console.log(`[CHANNEL_TYPE_DEBUG] start load channel id=${String(channelId)}`)
    console.log(`[CHANNEL_TYPE_DEBUG] before load type=${String(form.getValues('type') as any)}`)

    try {
      // Unified API call - complete URL with /api prefix
      const response = await api.get(`/api/channel/${channelId}`)
      const { success, message, data } = response.data

      console.log(`[CHANNEL_TYPE_DEBUG] api response success=${String(success)} message=${String(message ?? '')}`)

      if (success && data) {
        console.log(`[CHANNEL_TYPE_DEBUG] raw data.type typeof=${typeof data.type} value=${String(data.type)}`)

        // Parse models field - convert string to array
        let models: string[] = []
        if (data.models && typeof data.models === 'string' && data.models.trim() !== '') {
          models = data.models.split(',').map((model: string) => model.trim()).filter((model: string) => model !== '')
        }

        // Parse groups field - convert string to array
        let groups: string[] = ['default']
        if (data.group && typeof data.group === 'string' && data.group.trim() !== '') {
          groups = data.group.split(',').map((group: string) => group.trim()).filter((group: string) => group !== '')
        }

        // Parse JSON configuration
        let config: ChannelConfigForm = {
          region: '',
          ak: '',
          sk: '',
          user_id: '',
          vertex_ai_project_id: '',
          vertex_ai_adc: '',
          auth_type: 'personal_access_token',
          api_format: 'chat_completion',
        }
        if (data.config && typeof data.config === 'string' && data.config.trim() !== '') {
          try {
            const parsed = JSON.parse(data.config) as Partial<ChannelConfigForm>
            config = {
              ...config,
              ...parsed,
              api_format: parsed.api_format === 'response' ? 'response' : 'chat_completion',
            }
          } catch (e) {
            console.error('Failed to parse config JSON:', e)
          }
        }

        // Format JSON fields for display
        const formatJsonField = (field: string) => {
          if (field && typeof field === 'string' && field.trim() !== '') {
            try {
              return JSON.stringify(JSON.parse(field), null, 2)
            } catch (e) {
              return field
            }
          }
          return ''
        }

        // Ensure type is a number and handle edge cases
        let channelType = toInt(data.type, 1)

        console.log(`[CHANNEL_TYPE_DEBUG] processed channelType=${String(channelType)}`)

        let toolingField = ''
        if (data.tooling && typeof data.tooling === 'string' && data.tooling.trim() !== '') {
          try {
            const parsedTooling = JSON.parse(data.tooling)
            toolingField = stringifyToolingConfig(parsedTooling)
          } catch (e) {
            toolingField = data.tooling
          }
        }

        const formData: ChannelForm = {
          name: data.name || '',
          type: channelType,
          key: data.key || '',
          base_url: data.base_url || '',
          other: data.other || '',
          models,
          model_mapping: formatJsonField(data.model_mapping),
          model_configs: formatJsonField(data.model_configs),
          tooling: toolingField,
          system_prompt: data.system_prompt || '',
          groups,
          priority: toInt(data.priority, 0),
          weight: toInt(data.weight, 0),
          ratelimit: toInt(data.ratelimit, 0),
          config,
          inference_profile_arn_map: formatJsonField(data.inference_profile_arn_map),
        }

        console.log(`[CHANNEL_TYPE_DEBUG] prepared form data type=${String(formData.type)} priority=${String(formData.priority)} weight=${String(formData.weight)} ratelimit=${String(formData.ratelimit)}`)

        // Load channel-specific default pricing
        if (channelType) {
          console.log(`[CHANNEL_TYPE_DEBUG] load pricing for type=${String(channelType)}`)
          await loadDefaultPricing(channelType)
        }

        console.log('[CHANNEL_TYPE_DEBUG] about to reset form with data')

        // Store the loaded channel type
        setLoadedChannelType(channelType)

        form.reset(formData)

        // Wait a tick to ensure form is updated
        await new Promise(resolve => setTimeout(resolve, 0))

        console.log(`[CHANNEL_TYPE_DEBUG] after reset type=${String(form.getValues('type') as any)} watchType=${String(watchType)}`)

        // Force update the type field if it's not set correctly
        const currentTypeValue = form.getValues('type')
        if (currentTypeValue !== channelType) {
          console.log(`[CHANNEL_TYPE_DEBUG] mismatch after reset expected=${String(channelType)} actual=${String(currentTypeValue)} force setValue`)
          form.setValue('type', channelType, { shouldValidate: true, shouldDirty: false })

          // Wait another tick and check again
          await new Promise(resolve => setTimeout(resolve, 0))
          console.log(`[CHANNEL_TYPE_DEBUG] type after setValue=${String(form.getValues('type') as any)}`)
        }

        // Mark form as initialized
        console.log('[CHANNEL_TYPE_DEBUG] set formInitialized true')
        setFormInitialized(true)
      } else {
        throw new Error(message || 'Failed to load channel')
      }
    } catch (error) {
      console.error('[CHANNEL_TYPE_DEBUG] Error loading channel:', error)
    } finally {
      console.log('[CHANNEL_TYPE_DEBUG] Setting loading to false')
      setLoading(false)
    }
  }

  const loadModelsCatalog = useCallback(async () => {
    try {
      // Unified API call - complete URL with /api prefix
      const response = await api.get('/api/models')
      const { success, data } = response.data

      if (success && data) {
        const catalog: Record<number, string[]> = {}
        Object.entries(data).forEach(([typeKey, models]) => {
          if (!Array.isArray(models)) return
          const typeId = Number(typeKey)
          if (!Number.isFinite(typeId)) return
          catalog[typeId] = (models as string[])
            .filter((model) => typeof model === 'string' && model.trim() !== '')
        })
        setModelsCatalog(catalog)
      }
    } catch (error) {
      console.error('Error loading models catalog:', error)
    }
  }, [])

  const loadDefaultPricing = async (channelType: number) => {
    try {
      setDefaultPricing('')
      setDefaultTooling('')
      // Unified API call - complete URL with /api prefix
      const response = await api.get(`/api/channel/default-pricing?type=${channelType}`)
      const { success, data } = response.data
      if (success) {
        if (data?.model_configs) {
          try {
            const parsed = JSON.parse(data.model_configs)
            const formatted = JSON.stringify(parsed, null, 2)
            setDefaultPricing(formatted)
          } catch (e) {
            setDefaultPricing(data.model_configs)
          }
        } else {
          setDefaultPricing('')
        }

        if (typeof data?.tooling === 'string' && data.tooling.trim() !== '') {
          try {
            const parsedTooling = JSON.parse(data.tooling)
            setDefaultTooling(stringifyToolingConfig(parsedTooling))
          } catch (e) {
            setDefaultTooling(data.tooling)
          }
        } else {
          setDefaultTooling(stringifyToolingConfig({ whitelist: [], pricing: {} }))
        }
      }
    } catch (error) {
      console.error('Error loading default pricing:', error)
    }
  }

  // formatJSON helper defined above at module scope is reused here

  const loadGroups = async () => {
    try {
      // Unified API call - complete URL with /api prefix
      const response = await api.get('/api/option/')
      const { success, data } = response.data

      if (success && data) {
        // Extract available groups from system options
        const groupsOption = data.find((option: any) => option.key === 'AvailableGroups')
        if (groupsOption && groupsOption.value) {
          const availableGroups = groupsOption.value.split(',').map((g: string) => g.trim()).filter((g: string) => g !== '')
          setGroups(['default', ...availableGroups])
        } else {
          setGroups(['default'])
        }
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      setGroups(['default'])
    }
  }

  useEffect(() => {
    console.log('[CHANNEL_TYPE_DEBUG] Main useEffect triggered:', { isEdit, channelId })
    if (isEdit) {
      loadChannel()
    } else {
      console.log('[CHANNEL_TYPE_DEBUG] Not in edit mode, setting loading to false')
      setLoading(false)
    }
    loadModelsCatalog()
    loadGroups()
  }, [isEdit, channelId])

  useEffect(() => {
    console.log('[CHANNEL_TYPE_DEBUG] watchType useEffect triggered:', watchType)
    if (normalizedChannelType !== null) {
      loadDefaultPricing(normalizedChannelType)
    }
  }, [watchType, normalizedChannelType])

  const filteredModels = availableModels.filter(model =>
    model.name.toLowerCase().includes(modelSearchTerm.toLowerCase())
  )

  const selectedModels = form.watch('models')
  const selectedGroups = form.watch('groups')

  const toggleModel = (modelValue: string) => {
    const currentModels = form.getValues('models')
    if (currentModels.includes(modelValue)) {
      form.setValue('models', currentModels.filter(m => m !== modelValue))
    } else {
      form.setValue('models', [...currentModels, modelValue])
    }
  }

  const toggleGroup = (groupValue: string) => {
    const currentGroups = form.getValues('groups')
    if (currentGroups.includes(groupValue)) {
      form.setValue('groups', currentGroups.filter(g => g !== groupValue))
    } else {
      form.setValue('groups', [...currentGroups, groupValue])
    }
  }

  const onSubmit = async (data: ChannelForm) => {
    setIsSubmitting(true)
    try {
      // Prepare payload first so provider-specific key construction happens before key validation
      let payload: any = { ...data }
      console.log(`[EDIT_CHANNEL_SUBMIT] start isEdit=${String(isEdit)} type=${String(payload.type)} priority=${String(payload.priority)} weight=${String(payload.weight)} ratelimit=${String(payload.ratelimit)}`)

      // Handle special key construction for AWS and Vertex AI
      if (watchType === 33 && watchConfig.ak && watchConfig.sk && watchConfig.region) {
        payload.key = `${watchConfig.ak}|${watchConfig.sk}|${watchConfig.region}`
      } else if (watchType === 42 && watchConfig.region && watchConfig.vertex_ai_project_id && watchConfig.vertex_ai_adc) {
        payload.key = `${watchConfig.region}|${watchConfig.vertex_ai_project_id}|${watchConfig.vertex_ai_adc}`
      }

      // Require key only on create (after provider-specific construction)
      if (!isEdit && (!payload.key || payload.key.trim() === '')) {
        form.setError('key', { message: 'API key is required' })
        notify({
          type: 'error',
          title: tr('validation.error_title', 'Validation error'),
          message: tr('validation.api_key_required', 'API key is required.'),
        })
        return
      }

      // Validate JSON fields
      if (data.model_mapping && !isValidJSON(data.model_mapping)) {
        form.setError('model_mapping', { message: 'Invalid JSON format in model mapping' })
        notify({
          type: 'error',
          title: tr('validation.invalid_json_title', 'Invalid JSON'),
          message: tr('validation.model_mapping_invalid', 'Model Mapping has invalid JSON.'),
        })
        return
      }

      if (data.model_configs) {
        const validation = validateModelConfigs(data.model_configs)
        if (!validation.valid) {
          form.setError('model_configs', { message: validation.error || 'Invalid model configs format' })
          notify({
            type: 'error',
            title: tr('validation.model_configs_title', 'Invalid configs'),
            message: validation.error || tr('validation.model_configs_message', 'Model Configs are invalid.'),
          })
          return
        }
      }

      // Note: 'other' is a plain string for many providers (e.g., Azure API version,
      // iFlytek Spark version, plugin params, knowledge ID). Do not validate as JSON.
      // If a future provider requires JSON in `other`, add a conditional check by type here.

      if (data.inference_profile_arn_map && !isValidJSON(data.inference_profile_arn_map)) {
        form.setError('inference_profile_arn_map', { message: 'Invalid JSON format in inference profile ARN map' })
        notify({
          type: 'error',
          title: tr('validation.invalid_json_title', 'Invalid JSON'),
          message: tr('validation.inference_profile_invalid', 'Inference Profile ARN Map has invalid JSON.'),
        })
        return
      }

      // Validate Coze OAuth JWT config if needed
      if (watchType === 34 && watchConfig.auth_type === 'oauth_jwt') {
        if (!isValidJSON(data.key)) {
          form.setError('key', { message: 'Invalid JSON format for OAuth JWT configuration' })
          notify({
            type: 'error',
            title: tr('validation.invalid_json_title', 'Invalid JSON'),
            message: tr('validation.oauth_invalid_json', 'OAuth JWT configuration JSON is invalid.'),
          })
          return
        }

        try {
          const oauthConfig = JSON.parse(data.key)
          const requiredFields = ['client_type', 'client_id', 'coze_www_base', 'coze_api_base', 'private_key', 'public_key_id']

          for (const field of requiredFields) {
            if (!oauthConfig.hasOwnProperty(field)) {
              form.setError('key', { message: `Missing required field: ${field}` })
              notify({
                type: 'error',
                title: tr('validation.oauth_missing_field_title', 'Missing field'),
                message: tr('validation.oauth_missing_field_message', 'OAuth JWT configuration missing: {{field}}', { field }),
              })
              return
            }
          }
        } catch (error) {
          form.setError('key', { message: `OAuth config parse error: ${(error as Error).message}` })
          notify({
            type: 'error',
            title: tr('validation.oauth_parse_title', 'Parse error'),
            message: tr('validation.oauth_parse_message', 'OAuth JWT parse error: {{error}}', { error: (error as Error).message }),
          })
          return
        }
      }

      // Coerce numeric fields to numbers
      payload.priority = toInt(payload.priority, 0)
      payload.weight = toInt(payload.weight, 0)
      payload.ratelimit = toInt(payload.ratelimit, 0)
      console.log(`[EDIT_CHANNEL_SUBMIT] coerced numbers priority=${String(payload.priority)} weight=${String(payload.weight)} ratelimit=${String(payload.ratelimit)}`)

      // Convert arrays to comma-separated strings for backend
      payload.models = payload.models.join(',')
      payload.group = payload.groups.join(',')
      delete payload.groups

      // Convert config object to JSON string
      payload.config = JSON.stringify(data.config)

      // Handle empty key for edit operations (don't update if empty)
      if (isEdit && (!payload.key || payload.key.trim() === '')) {
        delete payload.key
      }

      const normalizedSubmitType = normalizeChannelType(payload.type)
      const baseURLRawValue = typeof payload.base_url === 'string' ? payload.base_url : ''
      const trimmedBaseURL = baseURLRawValue.trim()
      const baseURLRequired = normalizedSubmitType !== null && CHANNEL_TYPES_WITH_DEDICATED_BASE_URL.has(normalizedSubmitType)

      if (baseURLRequired && !trimmedBaseURL) {
        form.setError('base_url', { message: 'Base URL is required for this channel type' })
        notify({
          type: 'error',
          title: tr('validation.error_title', 'Validation error'),
          message: tr('validation.base_url_required', 'Base URL is required for this channel type.'),
        })
        return
      }

      payload.base_url = trimmedBaseURL
      form.clearErrors('base_url')

      // Handle base_url - remove trailing slash
      if (payload.base_url && payload.base_url.endsWith('/')) {
        payload.base_url = payload.base_url.slice(0, -1)
      }

      // Handle Azure default API version (plain string)
      if (watchType === 3 && (!payload.other || payload.other.trim() === '')) {
        payload.other = '2024-03-01-preview'
      }

      // Convert empty/whitespace-only strings to null for optional JSON fields (exclude `other`, it's plain text)
      const jsonFields = ['model_mapping', 'model_configs', 'inference_profile_arn_map', 'system_prompt']
      jsonFields.forEach((field) => {
        const v = payload[field]
        if (typeof v === 'string' && v.trim() === '') {
          payload[field] = null
        }
      })

      console.log('[EDIT_CHANNEL_SUBMIT] before request')
      console.log(`[EDIT_CHANNEL_SUBMIT] payload summary before request type=${String(payload.type)} priority=${String(payload.priority)} weight=${String(payload.weight)} ratelimit=${String(payload.ratelimit)}`)
      let response
      if (isEdit && channelId) {
        // Unified API call - complete URL with /api prefix
        response = await api.put('/api/channel/', { ...payload, id: parseInt(channelId) })
      } else {
        response = await api.post('/api/channel/', payload)
      }
      console.log('[EDIT_CHANNEL_SUBMIT] after request')

      const { success, message } = response.data
      if (success) {
        navigate('/channels', {
          state: {
            message: isEdit ? 'Channel updated successfully' : 'Channel created successfully'
          }
        })
      } else {
        form.setError('root', { message: message || 'Operation failed' })
        notify({
          type: 'error',
          title: tr('errors.request_failed_title', 'Request failed'),
          message: message || tr('errors.operation_failed', 'Operation failed'),
        })
      }
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Operation failed'
      })
      notify({
        type: 'error',
        title: tr('errors.unexpected_title', 'Unexpected error'),
        message: error instanceof Error ? error.message : tr('errors.operation_failed', 'Operation failed'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // RHF invalid handler: toast and focus first invalid field
  const onInvalid = (errors: any) => {
    // Compact debug: log key and a brief snapshot of numeric field types (string-only output)
    try {
      const t = form.getValues('type') as unknown
      const p = form.getValues('priority') as unknown
      const w = form.getValues('weight') as unknown
      const r = form.getValues('ratelimit') as unknown
      console.log(
        `[EDIT_CHANNEL_INVALID] key=${String(Object.keys(errors)[0] || '')} type=${String(t)}(${typeof t}) priority=${String(p)}(${typeof p}) weight=${String(w)}(${typeof w}) ratelimit=${String(r)}(${typeof r})`
      )
    } catch (_) {
      // swallow
    }
    const firstKey = Object.keys(errors)[0]
    const firstMsg = errors[firstKey]?.message || 'Please correct the highlighted fields.'
    notify({
      type: 'error',
      title: tr('validation.error_title', 'Validation error'),
      message: String(firstMsg),
    })
    const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ; (el as any).focus?.()
    }
  }

  const testChannel = async () => {
    if (!channelId) return

    try {
      setIsSubmitting(true)
      // Unified API call - complete URL with /api prefix
      const response = await api.get(`/api/channel/test/${channelId}`)
      const { success, message } = response.data

      if (success) {
        // Show success message
        alert('Channel test successful!')
      } else {
        // Show error message
        alert(`Channel test failed: ${message || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`Channel test failed: ${error instanceof Error ? error.message : 'Network error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper functions for model management
  const addCustomModel = () => {
    if (!customModel.trim()) return
    const currentModels = form.getValues('models')
    if (currentModels.includes(customModel)) return

    form.setValue('models', [...currentModels, customModel])
    setCustomModel('')
  }
  const removeModel = (modelToRemove: string) => {
    const currentModels = form.getValues('models')
    form.setValue('models', currentModels.filter(m => m !== modelToRemove))
  }

  const fillRelatedModels = () => {
    if (currentCatalogModels.length === 0) {
      return
    }
    const currentModels = form.getValues('models')
    const uniqueModels = [...new Set([...currentModels, ...currentCatalogModels])]
    form.setValue('models', uniqueModels)
  }

  const fillAllModels = () => {
    const currentModels = form.getValues('models')
    const allModelIds = availableModels.map(m => m.id)
    const uniqueModels = [...new Set([...currentModels, ...allModelIds])]
    form.setValue('models', uniqueModels)
  }

  const clearModels = () => {
    form.setValue('models', [])
  }

  // Helper functions for group management
  const addGroup = (groupName: string) => {
    const currentGroups = form.getValues('groups')
    if (!currentGroups.includes(groupName)) {
      form.setValue('groups', [...currentGroups, groupName])
    }
  }

  const removeGroup = (groupToRemove: string) => {
    const currentGroups = form.getValues('groups')
    const newGroups = currentGroups.filter(g => g !== groupToRemove)
    // Ensure at least 'default' group remains
    if (newGroups.length === 0) {
      newGroups.push('default')
    }
    form.setValue('groups', newGroups)
  }

  // JSON formatting helpers
  const formatModelMapping = () => {
    const current = form.getValues('model_mapping')
    const formatted = formatJSON(current)
    form.setValue('model_mapping', formatted)
  }

  const formatOtherConfig = () => {
    const current = form.getValues('other')
    const formatted = formatJSON(current)
    form.setValue('other', formatted)
  }

  const formatInferenceProfileArnMap = () => {
    const current = form.getValues('inference_profile_arn_map')
    const formatted = formatJSON(current)
    form.setValue('inference_profile_arn_map', formatted)
  }

  const loadDefaultModelConfigs = () => {
    if (defaultPricing) {
      form.setValue('model_configs', defaultPricing)
    }
  }

  const formatModelConfigs = () => {
    const value = form.getValues('model_configs')
    if (!value) {
      form.setValue('model_configs', JSON.stringify(MODEL_CONFIGS_EXAMPLE, null, 2), {
        shouldDirty: true,
        shouldValidate: true,
      })
      return
    }
    try {
      const parsed = JSON.parse(value)
      form.setValue('model_configs', JSON.stringify(parsed, null, 2), {
        shouldDirty: true,
        shouldValidate: true,
      })
    } catch (error) {
      notify({
        type: 'error',
        title: tr('validation.invalid_json_title', 'Invalid JSON'),
        message: tr('model_configs.format_error', 'Unable to format model_configs: {{error}}', { error: (error as Error).message }),
      })
    }
  }

  const formatToolingConfig = () => {
    const value = form.getValues('tooling')
    if (!value || value.trim() === '') {
      form.setValue('tooling', stringifyToolingConfig({ whitelist: [], pricing: {} }), {
        shouldDirty: true,
        shouldValidate: true,
      })
      return
    }
    try {
      const parsed = JSON.parse(value)
      form.setValue('tooling', stringifyToolingConfig(parsed), {
        shouldDirty: true,
        shouldValidate: true,
      })
    } catch (error) {
      notify({
        type: 'error',
        title: tr('validation.invalid_json_title', 'Invalid JSON'),
        message: tr('tooling.format_error', 'Unable to format tooling config: {{error}}', { error: (error as Error).message }),
      })
    }
  }

  // Helpers for error highlighting
  const fieldHasError = (name: string) => !!(form.formState.errors as any)?.[name]
  const errorClass = (name: string) => (fieldHasError(name) ? 'border-destructive focus-visible:ring-destructive' : '')

  const LabelWithHelp = ({ label, help }: { label: string; help: string }) => (
    <div className="flex items-center gap-1">
      <FormLabel>{label}</FormLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-muted-foreground cursor-help" aria-label={`Help: ${label}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-pre-line">{help}</TooltipContent>
      </Tooltip>
    </div>
  )

  // Render channel-specific configuration fields
  const renderChannelSpecificFields = () => {
    const channelType = normalizedChannelType

    switch (channelType) {
      case 3: // Azure OpenAI
        return (
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
            <h4 className="font-medium text-blue-900">{tr('azure.heading', 'Azure OpenAI Configuration')}</h4>
            <FormField
              control={form.control}
              name="base_url"
              render={({ field }) => (
                <FormItem>
                  <LabelWithHelp
                    label={tr('azure.endpoint.label', 'Azure OpenAI Endpoint *')}
                    help={tr('azure.endpoint.help', 'Your resource endpoint, e.g., https://your-resource.openai.azure.com')}
                  />
                  <FormControl>
                    <Input
                      placeholder={
                        defaultBaseURL || tr('azure.endpoint.placeholder', 'https://your-resource.openai.azure.com')
                      }
                      className={errorClass('base_url')}
                      required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="other"
              render={({ field }) => (
                <FormItem>
                  <LabelWithHelp
                    label={tr('azure.version.label', 'API Version')}
                    help={tr(
                      'azure.version.help',
                      'Default API version used when the request does not specify one (e.g., 2024-03-01-preview).'
                    )}
                  />
                  <FormControl>
                    <Input
                      placeholder={tr('azure.version.placeholder', '2024-03-01-preview')}
                      className={errorClass('other')}
                      {...field}
                    />
                  </FormControl>
                  <span className="text-xs text-muted-foreground">
                    {tr(
                      'azure.version.note',
                      'Default: 2024-03-01-preview. This can be overridden by request query parameters.'
                    )}
                  </span>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  <strong>{tr('azure.version.warning_label', 'Important:')}</strong>{' '}
                  {tr(
                    'azure.version.warning_text',
                    'The model name should be your deployment name, not the original model name.'
                  )}
                </span>
              </div>
            </div>
          </div>
        )

      case 33: // AWS Bedrock
        return (
          <div className="space-y-4 p-4 border rounded-lg bg-orange-50/50">
            <h4 className="font-medium text-orange-900">{tr('aws.heading', 'AWS Bedrock Configuration')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="config.region"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithHelp
                      label={tr('aws.region.label', 'Region *')}
                      help={tr('aws.region.help', 'AWS region for Bedrock (e.g., us-east-1). Must match where your models/profiles reside.')}
                    />
                    <FormControl>
                      <Input placeholder={tr('aws.region.placeholder', 'us-east-1')} className={errorClass('config.region')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.ak"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithHelp
                      label={tr('aws.ak.label', 'Access Key *')}
                      help={tr('aws.ak.help', 'AWS Access Key ID with permissions to call Bedrock.')}
                    />
                    <FormControl>
                      <Input placeholder={tr('aws.ak.placeholder', 'AKIA...')} className={errorClass('config.ak')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.sk"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithHelp
                      label={tr('aws.sk.label', 'Secret Key *')}
                      help={tr('aws.sk.help', 'AWS Secret Access Key for the above Access Key ID.')}
                    />
                    <FormControl>
                      <Input type="password" placeholder={tr('aws.sk.placeholder', 'Secret Key')} className={errorClass('config.sk')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {tr('aws.note', 'The final API key will be constructed as: AK|SK|Region')}
            </div>
          </div>
        )

      case 34: // Coze
        return (
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
            <h4 className="font-medium text-blue-900">{tr('coze.heading', 'Coze Configuration')}</h4>
            <Controller
              name="config.auth_type"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <LabelWithHelp
                    label={tr('coze.auth_type.label', 'Authentication Type')}
                    help={tr('coze.auth_type.help', 'Choose how to authenticate to Coze: Personal Access Token or OAuth JWT.')}
                  />
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={tr('coze.auth_type.placeholder', 'Select authentication type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COZE_AUTH_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchConfig.auth_type === 'personal_access_token' ? (
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithHelp
                      label={tr('coze.pat.label', 'Personal Access Token *')}
                      help={tr('coze.pat.help', 'Your Coze Personal Access Token (pat_...).')}
                    />
                    <FormControl>
                      <Input type="password" placeholder={tr('coze.pat.placeholder', 'pat_...')} className={errorClass('key')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithHelp
                      label={tr('coze.jwt.label', 'OAuth JWT Configuration *')}
                      help={tr(
                        'coze.jwt.help',
                        'JSON configuration for Coze OAuth JWT: client_type, client_id, coze_www_base, coze_api_base, private_key, public_key_id.'
                      )}
                    />
                    <FormControl>
                      <Textarea
                        placeholder={tr(
                          'coze.jwt.placeholder',
                          `OAuth JWT configuration in JSON format:\n${JSON.stringify(OAUTH_JWT_CONFIG_EXAMPLE, null, 2)}`
                        )}
                        className={`font-mono text-sm min-h-[120px] ${errorClass('key')}`}
                        {...field}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      {tr(
                        'coze.jwt.required',
                        'Required fields: client_type, client_id, coze_www_base, coze_api_base, private_key, public_key_id'
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="config.user_id"
              render={({ field }) => (
                <FormItem>
                  <LabelWithHelp
                    label={tr('coze.user.label', 'User ID')}
                    help={tr('coze.user.help', 'Optional Coze user ID used for bot operations (if required by your setup).')}
                  />
                  <FormControl>
                    <Input placeholder={tr('coze.user.placeholder', 'User ID for bot operations')} className={errorClass('config.user_id')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 42: // Vertex AI
        return (
          <div className="space-y-4 p-4 border rounded-lg bg-green-50/50">
            <h4 className="font-medium text-green-900">{tr('vertex.heading', 'Vertex AI Configuration')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="config.region"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithHelp
                      label={tr('vertex.region.label', 'Region *')}
                      help={tr('vertex.region.help', 'Google Cloud region for Vertex AI (e.g., us-central1).')}
                    />
                    <FormControl>
                      <Input placeholder={tr('vertex.region.placeholder', 'us-central1')} className={errorClass('config.region')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.vertex_ai_project_id"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithHelp
                      label={tr('vertex.project.label', 'Project ID *')}
                      help={tr('vertex.project.help', 'Your GCP Project ID hosting Vertex AI resources.')}
                    />
                    <FormControl>
                      <Input
                        placeholder={tr('vertex.project.placeholder', 'my-project-id')}
                        className={errorClass('config.vertex_ai_project_id')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.vertex_ai_adc"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithHelp
                      label={tr('vertex.credentials.label', 'Service Account Credentials *')}
                      help={tr('vertex.credentials.help', 'Paste the JSON of a service account with Vertex AI permissions.')}
                    />
                    <FormControl>
                      <Textarea
                        placeholder={tr('vertex.credentials.placeholder', 'Google service account JSON credentials')}
                        className={`font-mono text-xs ${errorClass('config.vertex_ai_adc')}`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )

      case 18: // iFlytek Spark
        return (
          <Controller
            name="other"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <LabelWithHelp
                  label={tr('spark.version.label', 'Spark Version')}
                  help={tr('spark.version.help', 'Select the API version for iFlytek Spark (e.g., v3.5).')}
                />
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={tr('spark.version.placeholder', 'Select Spark version')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="v1.1">v1.1</SelectItem>
                    <SelectItem value="v2.1">v2.1</SelectItem>
                    <SelectItem value="v3.1">v3.1</SelectItem>
                    <SelectItem value="v3.5">v3.5</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 21: // Knowledge Base: AI Proxy
        return (
          <FormField
            control={form.control}
            name="other"
            render={({ field }) => (
              <FormItem>
                <LabelWithHelp
                  label={tr('ai_proxy.knowledge.label', 'Knowledge ID')}
                  help={tr('ai_proxy.knowledge.help', 'Knowledge base identifier for AI Proxy knowledge retrieval.')}
                />
                <FormControl>
                  <Input placeholder={tr('ai_proxy.knowledge.placeholder', 'Knowledge base ID')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 17: // Plugin
        return (
          <FormField
            control={form.control}
            name="other"
            render={({ field }) => (
              <FormItem>
                <LabelWithHelp
                  label={tr('plugin.params.label', 'Plugin Parameters')}
                  help={tr('plugin.params.help', 'Provider/plugin-specific parameters if required.')}
                />
                <FormControl>
                  <Input placeholder={tr('plugin.params.placeholder', 'Plugin-specific parameters')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 37: // Cloudflare
        return (
          <FormField
            control={form.control}
            name="config.user_id"
            render={({ field }) => (
              <FormItem>
                <LabelWithHelp
                  label={tr('cloudflare.account.label', 'Account ID')}
                  help={tr('cloudflare.account.help', 'Your Cloudflare account ID for the AI gateway.')}
                />
                <FormControl>
                  <Input placeholder={tr('cloudflare.account.placeholder', 'd8d7c61dbc334c32d3ced580e4bf42b4')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 50: // OpenAI Compatible
        return (
          <div className="space-y-4 p-4 border rounded-lg bg-purple-50/50">
            <h4 className="font-medium text-purple-900">{tr('openai_compatible.heading', 'OpenAI Compatible Configuration')}</h4>
            <FormField
              control={form.control}
              name="base_url"
              render={({ field }) => (
                <FormItem>
                  <LabelWithHelp
                    label={tr('openai_compatible.base_url.label', 'Base URL *')}
                    help={tr(
                      'openai_compatible.base_url.help',
                      'Base URL of the OpenAI-compatible endpoint, e.g., https://api.your-provider.com. /v1 is appended automatically when required.'
                    )}
                  />
                  <FormControl>
                    <Input
                      placeholder={
                        defaultBaseURL || tr('openai_compatible.base_url.placeholder', 'https://api.your-provider.com')
                      }
                      className={errorClass('base_url')}
                      required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.api_format"
              render={({ field }) => (
                <FormItem>
                  <LabelWithHelp
                    label={tr('openai_compatible.api_format.label', 'Upstream API Format *')}
                    help={tr(
                      'openai_compatible.api_format.help',
                      'Select which upstream API surface should handle requests. ChatCompletion is the historical default; choose Response when the upstream expects OpenAI Response API payloads.'
                    )}
                  />
                  <FormControl>
                    <Select value={field.value ?? 'chat_completion'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={tr('openai_compatible.api_format.placeholder', 'Select upstream API format')} />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENAI_COMPATIBLE_API_FORMAT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {tr(`openai_compatible.api_format.option.${option.value}`, option.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      default:
        return null
    }
  }

  const currentFormType = form.getValues().type
  const shouldShowLoading = loading || (isEdit && !formInitialized)

  console.log('[CHANNEL_TYPE_DEBUG] Render check:', {
    loading,
    isEdit,
    currentFormType,
    formInitialized,
    loadedChannelType,
    shouldShowLoading,
    watchType,
    formValues: form.getValues()
  })

  // Layout diagnostics: when the form is actually rendered (no loading), log layout info
  useEffect(() => {
    if (!shouldShowLoading) {
      logEditPageLayout('EditChannelPage')
    }
    // Re-run when channel type changes as sections expand/collapse
  }, [shouldShowLoading, watchType])

  if (shouldShowLoading) {
    console.log('[CHANNEL_TYPE_DEBUG] Showing loading screen')
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">{tr('loading', 'Loading channel...')}</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log('[CHANNEL_TYPE_DEBUG] Rendering main form')

  return (
    <div className="container mx-auto px-4 py-6">
      <TooltipProvider>
        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit
                ? tr('title.edit', 'Edit Channel')
                : tr('title.create', 'Create Channel')}
            </CardTitle>
            <CardDescription>
              {isEdit
                ? tr('description.edit', 'Update channel configuration')
                : tr('description.create', 'Create a new API channel')}
            </CardDescription>
            {selectedChannelType?.description && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  {tr(
                    `channel_type.${selectedChannelType.value}.description`,
                    selectedChannelType.description
                  )}
                </span>
              </div>
            )}
            {selectedChannelType?.tip && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span
                  className="text-sm text-yellow-800"
                  dangerouslySetInnerHTML={{
                    __html: tr(
                      `channel_type.${selectedChannelType.value}.tip`,
                      selectedChannelType.tip
                    )
                  }}
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                {/* Basic Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithHelp
                          label={tr('fields.name.label', 'Channel Name *')}
                          help={tr(
                            'fields.name.help',
                            'Human-readable identifier. Use provider/environment in the name, for example "OpenAI GPT-4 Production".'
                          )}
                        />
                        <FormControl>
                          <Input
                            placeholder={tr('fields.name.placeholder', 'Enter channel name')}
                            className={errorClass('name')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Controller
                    name="type"
                    control={form.control}
                    render={({ field }) => {
                      const stringValue = field.value ? String(field.value) : ''
                      console.log('[CHANNEL_TYPE_DEBUG] Select render (Controller) - value:', field.value, 'string:', stringValue, 'isEdit:', isEdit)
                      return (
                        <FormItem>
                          <LabelWithHelp
                            label={tr('fields.type.label', 'Channel Type *')}
                            help={tr(
                              'fields.type.help',
                              'Select the upstream provider. This determines models, auth method, and default Base URL.'
                            )}
                          />
                          <Select
                            value={stringValue}
                            onValueChange={(v) => {
                              console.log(`[CHANNEL_TYPE_DEBUG] select onChange raw=${String(v)} typeof=${typeof v}`)
                              const numValue = parseInt(v)
                              field.onChange(numValue)
                              if (isEdit) {
                                setLoadedChannelType(numValue)
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className={errorClass('type')}>
                                <SelectValue placeholder={tr('fields.type.placeholder', 'Select channel type')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-96 overflow-y-auto">
                              {CHANNEL_TYPES.map((t) => (
                                <SelectItem key={t.value} value={String(t.value)}>
                                  {t.text}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                </div>

                {!channelTypeOverridesKeyField && (
                  <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithHelp
                          label={tr('fields.api_key.label', 'API Key')}
                          help={tr(
                            'fields.api_key.help',
                            'Credentials for the selected provider. Stored encrypted. Leave empty on edit to keep existing.'
                          )}
                        />
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={
                              isEdit
                                ? tr('fields.api_key.placeholder_edit', 'Leave empty to keep existing key')
                                : tr('fields.api_key.placeholder_create', 'Enter API key')
                            }
                            className={errorClass('key')}
                            {...field}
                          />
                        </FormControl>
                        {isEdit && (
                          <div className="text-xs text-muted-foreground">
                            {tr(
                              'fields.api_key.note',
                              'Current API key is hidden for security. Enter a new key only if you want to update it.'
                            )}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!channelTypeRequiresDedicatedBaseURL && (
                  <FormField
                    control={form.control}
                    name="base_url"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithHelp
                          label={tr('fields.base_url.label', 'Base URL (Optional)')}
                          help={tr(
                            'fields.base_url.help',
                            'Provider API endpoint (e.g., https://api.openai.com). Leave empty to use the default for the chosen provider.'
                          )}
                        />
                        <FormControl>
                          <Input
                            placeholder={
                              defaultBaseURL || tr('fields.base_url.placeholder', 'e.g., https://api.openai.com')
                            }
                            className={errorClass('base_url')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {renderChannelSpecificFields()}

                {(!isEdit && !hasSelectedType) ? (
                  <div className="p-4 border rounded-lg bg-muted/30 text-muted-foreground">
                    {tr('models.select_type_notice', 'Select a channel type to configure Supported Models.')}
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="models"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithHelp
                          label={tr('models.label', 'Supported Models *')}
                          help={tr(
                            'models.help',
                            'Models available through this channel. Leave empty to allow all provider models. Use the buttons to fill related/all models; duplicates are removed.'
                          )}
                        />
                        <div className="flex gap-2 mb-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={fillRelatedModels}
                            disabled={currentCatalogModels.length === 0}
                            size="sm"
                          >
                            {tr('models.fill_related', 'Fill Related Models ({{count}})', { count: currentCatalogModels.length })}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={fillAllModels}
                            size="sm"
                            disabled={availableModels.length === 0}
                          >
                            {tr('models.fill_all', 'Fill All Supported Models ({{count}})', { count: availableModels.length })}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={clearModels}
                            size="sm"
                          >
                            {tr('models.clear_all', 'Clear All')}
                          </Button>
                        </div>
                        <div className="mb-2">
                          <Input
                            placeholder={tr('models.search_placeholder', 'Search models...')}
                            value={modelSearchTerm}
                            onChange={(e) => setModelSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="relative isolate max-h-48 overflow-y-auto border rounded-md p-4 space-y-2">
                          {filteredModels.map((model) => (
                            <div key={model.id} className="relative flex items-center space-x-2">
                              <Checkbox
                                id={model.id}
                                checked={selectedModels.includes(model.id)}
                                onCheckedChange={() => toggleModel(model.id)}
                              />
                              <Label
                                htmlFor={model.id}
                                className="flex-1 cursor-pointer text-sm"
                                onClick={() => navigator.clipboard.writeText(model.id)}
                                title={tr('models.copy_title', 'Click to copy model name')}
                              >
                                {model.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2">
                          <div className="flex gap-2 mb-2">
                            <Input
                              placeholder={tr('models.custom_placeholder', 'Add custom model...')}
                              value={customModel}
                              onChange={(e) => setCustomModel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addCustomModel()
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={addCustomModel}
                              disabled={!customModel.trim()}
                              size="sm"
                            >
                              {tr('models.add_custom', 'Add')}
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedModels.slice().sort().map((model) => (
                            <Badge
                              key={model}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => removeModel(model)}
                            >
                              {model} ×
                            </Badge>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="groups"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithHelp
                        label={tr('groups.label', 'Groups *')}
                        help={tr(
                          'groups.help',
                          'Restrict access to specific user groups. Empty means all users can access. The default group is always kept.'
                        )}
                      />
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {groups.map((group) => (
                            <div key={group} className="flex items-center space-x-2">
                              <Checkbox
                                id={`group-${group}`}
                                checked={form.watch('groups').includes(group)}
                                onCheckedChange={(checked) => {
                                  const currentGroups = form.getValues('groups')
                                  if (checked) {
                                    if (!currentGroups.includes(group)) {
                                      form.setValue('groups', [...currentGroups, group])
                                    }
                                  } else {
                                    const newGroups = currentGroups.filter(g => g !== group)
                                    if (newGroups.length === 0) {
                                      newGroups.push('default')
                                    }
                                    form.setValue('groups', newGroups)
                                  }
                                }}
                              />
                              <Label htmlFor={`group-${group}`} className="cursor-pointer text-sm">
                                {group}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {form.watch('groups').map((group) => (
                            <Badge
                              key={group}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => removeGroup(group)}
                            >
                              {group} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithHelp
                          label={tr('fields.priority.label', 'Priority')}
                          help={tr('fields.priority.help', 'Lower numbers are tried first when multiple channels support a model.')}
                        />
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => { console.log(`[EDIT_CHANNEL_INPUT] priority change value=${String(e.target.value)}`); field.onChange(e.target.value) }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithHelp
                          label={tr('fields.weight.label', 'Weight')}
                          help={tr('fields.weight.help', 'Load balancing weight among channels with the same priority. Higher weight receives more requests.')}
                        />
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => { console.log(`[EDIT_CHANNEL_INPUT] weight change value=${String(e.target.value)}`); field.onChange(e.target.value) }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="model_mapping"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <LabelWithHelp
                          label={tr('model_mapping.label', 'Model Mapping (JSON)')}
                          help={tr(
                            'model_mapping.help',
                            'Map external/legacy model names to this provider\'s actual model names. JSON object: { "from": "to" }.'
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={formatModelMapping}
                        >
                          {tr('buttons.format_json', 'Format JSON')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const example = JSON.stringify(MODEL_MAPPING_EXAMPLE, null, 2)
                            form.setValue('model_mapping', example)
                          }}
                        >
                          {tr('buttons.fill_template', 'Fill Template')}
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder={tr(
                            'model_mapping.placeholder',
                            `Model name mapping in JSON format:\n${JSON.stringify(MODEL_MAPPING_EXAMPLE, null, 2)}`
                          )}
                          className={`font-mono text-sm min-h-[100px] ${errorClass('model_mapping')}`}
                          {...field}
                          onBlur={() => {
                            // Avoid reading from the blur event; rely on current field value only
                            try {
                              field.onBlur()
                              const val = String(field.value ?? '')
                              if (!val || val.trim() === '') {
                                form.clearErrors('model_mapping')
                                return
                              }
                              if (!isValidJSON(val)) {
                                form.setError('model_mapping', { message: tr('validation.invalid_json', 'Invalid JSON format') })
                              } else {
                                form.clearErrors('model_mapping')
                              }
                            } catch {
                              // no-op
                            }
                          }}
                        />
                      </FormControl>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {tr('model_mapping.note', 'Map model names for this channel (optional)')}
                        </span>
                        {field.value && field.value.trim() !== '' && (
                          <span className={`font-bold text-xs ${isValidJSON(field.value) ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {isValidJSON(field.value)
                              ? tr('validation.valid_json', '✓ Valid JSON')
                              : tr('validation.invalid_json_short', '✗ Invalid JSON')}
                          </span>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(!isEdit && !hasSelectedType) ? (
                  <div className="p-4 border rounded-lg bg-muted/30 text-muted-foreground">
                    {tr('model_configs.select_type_notice', 'Select a channel type to configure Model Configs.')}
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="model_configs"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <LabelWithHelp
                            label={tr('model_configs.label', 'Model Configs (JSON)')}
                            help={tr(
                              'model_configs.help',
                              'Unified per-model settings. Fields: ratio (input pricing multiplier), completion_ratio (output multiplier), max_tokens (limit).'
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={formatModelConfigs}
                          >
                            {tr('buttons.format_json', 'Format JSON')}
                          </Button>
                          {watchType !== 3 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={loadDefaultModelConfigs}
                              disabled={!defaultPricing}
                            >
                              {tr('buttons.load_defaults', 'Load Defaults')}
                            </Button>
                          )}
                        </div>
                        {/* Default pricing preview removed to reduce distraction; defaults are auto-filled when empty */}
                        <FormControl>
                          <Textarea
                            placeholder={tr(
                              'model_configs.placeholder',
                              `Model configurations in JSON format:\n${JSON.stringify(MODEL_CONFIGS_EXAMPLE, null, 2)}`
                            )}
                            className={`font-mono text-sm min-h-[120px] ${errorClass('model_configs')}`}
                            {...field}
                            onBlur={() => {
                              // Avoid reading from the blur event; rely on current field value only
                              try {
                                field.onBlur()
                                const val = String(field.value ?? '')
                                if (!val || val.trim() === '') {
                                  form.clearErrors('model_configs')
                                  return
                                }
                                if (!isValidJSON(val)) {
                                  form.setError('model_configs', { message: tr('validation.invalid_json', 'Invalid JSON format') })
                                  return
                                }
                                const validation = validateModelConfigs(val)
                                if (!validation.valid) {
                                  form.setError('model_configs', { message: validation.error || tr('model_configs.invalid', 'Invalid model configs format') })
                                } else {
                                  form.clearErrors('model_configs')
                                }
                              } catch {
                                // no-op
                              }
                            }}
                          />
                        </FormControl>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {tr('model_configs.note', 'Configure pricing and limits per model (optional)')}
                          </span>
                          {field.value && field.value.trim() !== '' && (
                            <span className={`font-bold text-xs ${isValidJSON(field.value) && validateModelConfigs(field.value).valid
                              ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {isValidJSON(field.value) && validateModelConfigs(field.value).valid
                                ? tr('model_configs.valid', '✓ Valid Config')
                                : tr('model_configs.invalid_short', '✗ Invalid Config')}
                            </span>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="tooling"
                  render={({ field }) => {
                    const rawValue = typeof field.value === 'string' ? field.value : ''
                    const trimmed = rawValue.trim()
                    const jsonValid = trimmed === '' ? true : isValidJSON(rawValue)
                    const toolingValidation = trimmed === '' ? { valid: true } : validateToolingConfig(rawValue)
                    const toolingValid = jsonValid && toolingValidation.valid
                    const toolingErrorMessage = (!toolingValid && 'error' in toolingValidation)
                      ? (toolingValidation as { valid: boolean; error?: string }).error
                      : undefined

                    return (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <LabelWithHelp
                            label={tr('tooling.label', 'Tooling Config (JSON)')}
                            help={tr(
                              'tooling.help',
                              'Define channel-wide built-in tool policy. Configure the whitelist and per-call pricing for provider built-in tools.'
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={formatToolingConfig}
                          >
                            {tr('buttons.format_json', 'Format JSON')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!defaultTooling) {
                                form.setValue('tooling', stringifyToolingConfig({ whitelist: [], pricing: {} }), {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                                return
                              }
                              try {
                                const parsed = JSON.parse(defaultTooling)
                                form.setValue('tooling', stringifyToolingConfig(parsed), {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                              } catch (error) {
                                form.setValue('tooling', defaultTooling, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                              }
                            }}
                            disabled={!defaultTooling}
                          >
                            {tr('buttons.load_defaults', 'Load Defaults')}
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder={tr(
                              'tooling.placeholder',
                              `Tooling configuration in JSON format:\n${JSON.stringify(TOOLING_CONFIG_EXAMPLE, null, 2)}`
                            )}
                            className={`font-mono text-sm min-h-[120px] ${errorClass('tooling')}`}
                            {...field}
                            onBlur={() => {
                              try {
                                field.onBlur()
                                if (!trimmed) {
                                  form.clearErrors('tooling')
                                  return
                                }
                                if (!isValidJSON(field.value ?? '')) {
                                  form.setError('tooling', { message: tr('validation.invalid_json', 'Invalid JSON format') })
                                  return
                                }
                                const validation = validateToolingConfig(String(field.value ?? ''))
                                if (!validation.valid) {
                                  form.setError('tooling', { message: validation.error || tr('tooling.invalid', 'Invalid tooling config format') })
                                } else {
                                  form.clearErrors('tooling')
                                }
                              } catch {
                                // no-op
                              }
                            }}
                          />
                        </FormControl>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {tr('tooling.note', 'Configure built-in tool allowlists and per-call pricing (optional)')}
                          </span>
                          {trimmed !== '' && (
                            <span className={`font-bold text-xs ${toolingValid ? 'text-green-600' : 'text-red-600'}`}>
                              {toolingValid ? '✓ Valid Config' : '✗ Invalid Config'}
                            </span>
                          )}
                        </div>
                        {toolingErrorMessage && (
                          <div className="mt-2 text-xs text-destructive">
                            {toolingErrorMessage}
                          </div>
                        )}
                        {parsedToolingConfig === null && trimmed !== '' ? (
                          <div className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
                            {tr('tooling.fix_json_notice', 'Fix the tooling JSON above to manage the built-in tool whitelist.')}
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-medium">{tr('tooling.whitelist.title', 'Built-in Tool Whitelist')}</span>
                              <span className="text-xs text-muted-foreground">
                                {tr('tooling.whitelist.subtitle', 'Empty whitelist keeps all provider tools available.')}
                              </span>
                            </div>
                            {availableDefaultTools.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {tr('tooling.whitelist.known', 'Known tools:')}
                                </span>
                                {availableDefaultTools.map((tool) => {
                                  const exists = currentToolWhitelist.some((item) => item.toLowerCase() === tool.toLowerCase())
                                  return (
                                    <button
                                      type="button"
                                      key={`${tool}-suggest`}
                                      onClick={() => addToolToWhitelist(tool)}
                                      disabled={exists || toolEditorDisabled}
                                      className={`rounded-md border border-dashed border-border/60 px-2 py-1 text-xs transition ${exists ? 'cursor-not-allowed text-muted-foreground/60' : 'text-muted-foreground hover:bg-muted'}`}
                                    >
                                      {tool}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                            <div className="flex min-h-[2.5rem] flex-wrap gap-2">
                              {currentToolWhitelist.length === 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  {tr('tooling.whitelist.empty', 'No tools pinned. All built-in tools remain available.')}
                                </span>
                              ) : (
                                currentToolWhitelist.map((tool) => {
                                  const canonical = tool.toLowerCase()
                                  const priced = pricedToolSet.has(canonical)
                                  if (priced) {
                                    return (
                                      <Badge
                                        key={tool}
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-secondary/80"
                                        onClick={() => removeToolFromWhitelist(tool)}
                                      >
                                        {tool} ×
                                      </Badge>
                                    )
                                  }
                                  return (
                                    <Tooltip key={tool}>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="outline"
                                          className="cursor-pointer border-destructive bg-transparent text-destructive hover:bg-transparent hover:text-destructive"
                                          onClick={() => removeToolFromWhitelist(tool)}
                                        >
                                          {tool} ×
                                        </Badge>
                                      </TooltipTrigger>
                                        <TooltipContent>
                                          {tr('tooling.whitelist.pricing_required', 'Set pricing to unblock "{{tool}}". Requests remain blocked until pricing is configured.', { tool })}
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                value={customTool}
                                onChange={(event) => setCustomTool(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    addToolToWhitelist(customTool, { isCustom: true })
                                  }
                                }}
                                placeholder={tr('tooling.whitelist.custom_placeholder', 'Custom tool name')}
                                disabled={toolEditorDisabled}
                                className="w-56"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => addToolToWhitelist(customTool, { isCustom: true })}
                                disabled={toolEditorDisabled || customTool.trim() === ''}
                              >
                                {tr('tooling.whitelist.add_tool', 'Add tool')}
                              </Button>
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
                <FormField
                  control={form.control}
                  name="system_prompt"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithHelp
                        label={tr('system_prompt.label', 'System Prompt')}
                        help={tr(
                          'system_prompt.help',
                          'Optional text prepended as a system message to every request sent through this channel. Use for guardrails or style. Clients can still override with their own system messages.'
                        )}
                      />
                      <FormControl>
                        <Textarea
                          placeholder={tr('system_prompt.placeholder', 'Optional system prompt to prepend to all requests')}
                          className={`min-h-[100px] ${errorClass('system_prompt')}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* AWS Bedrock specific field */}
                {watchType === 33 && (
                  <FormField
                    control={form.control}
                    name="inference_profile_arn_map"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <LabelWithHelp
                            label={tr('inference_profile.label', 'Inference Profile ARN Map (AWS Bedrock)')}
                            help={tr(
                              'inference_profile.help',
                              'JSON map of model name to AWS Bedrock Inference Profile ARN. Use to route certain models via specific Bedrock inference profiles.'
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={formatInferenceProfileArnMap}
                          >
                            {tr('buttons.format_json', 'Format JSON')}
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder={tr(
                              'inference_profile.placeholder',
                              `AWS Bedrock inference profile ARN mapping:\n${JSON.stringify({
                              "claude-3-5-sonnet-20241022": "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                              "claude-3-haiku-20240307": "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0"
                            }, null, 2)}`
                            )}
                            className={`font-mono text-sm min-h-[100px] ${errorClass('inference_profile_arn_map')}`}
                            {...field}
                            onBlur={() => {
                              // Avoid reading from the blur event; rely on current field value only
                              try {
                                field.onBlur()
                                const val = String(field.value ?? '')
                                if (!val || val.trim() === '') {
                                  form.clearErrors('inference_profile_arn_map')
                                  return
                                }
                                if (!isValidJSON(val)) {
                                  form.setError('inference_profile_arn_map', { message: tr('validation.invalid_json', 'Invalid JSON format') })
                                } else {
                                  form.clearErrors('inference_profile_arn_map')
                                }
                              } catch {
                                // no-op
                              }
                            }}
                          />
                        </FormControl>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {tr('inference_profile.note', 'Map model names to AWS Bedrock inference profile ARNs (optional)')}
                          </span>
                          {field.value && field.value.trim() !== '' && (
                            <span className={`font-bold text-xs ${isValidJSON(field.value) ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {isValidJSON(field.value)
                                ? tr('validation.valid_json', '✓ Valid JSON')
                                : tr('validation.invalid_json_short', '✗ Invalid JSON')}
                            </span>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.formState.errors.root && (
                  <div className="text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? (isEdit
                        ? tr('actions.updating', 'Updating...')
                        : tr('actions.creating', 'Creating...'))
                      : (isEdit
                        ? tr('actions.update', 'Update Channel')
                        : tr('actions.create', 'Create Channel'))
                    }
                  </Button>
                  {isEdit && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={testChannel}
                      disabled={isSubmitting}
                    >
                      {tr('actions.test_channel', 'Test Channel')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/channels')}
                  >
                    {tr('actions.cancel', 'Cancel')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  )
}

export default EditChannelPage
