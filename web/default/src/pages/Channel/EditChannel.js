import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Form, Input, Message, Popup, Icon, Label, Dropdown } from 'semantic-ui-react';
import { useNavigate, useParams } from 'react-router-dom';
import { API, copy, showError, showInfo, showSuccess, verifyJSON } from '../../helpers';
import { CHANNEL_OPTIONS, COZE_AUTH_OPTIONS } from '../../constants';
import { renderChannelTip } from '../../helpers/render';
import ChannelDebugPanel from '../../components/ChannelDebugPanel';

const MODEL_MAPPING_EXAMPLE = {
  'gpt-3.5-turbo-0301': 'gpt-3.5-turbo',
  'gpt-4-0314': 'gpt-4',
  'gpt-4-32k-0314': 'gpt-4-32k',
};

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
    tool_whitelist: ['web_search'],
    tool_pricing: {
      web_search: { usd_per_call: 0.002 }
    },
  }
};

// Enhanced validation for model configs
const validateModelConfigs = (configStr) => {
  if (!configStr || configStr.trim() === '') {
    return { valid: true };
  }

  try {
    const configs = JSON.parse(configStr);

    if (typeof configs !== 'object' || configs === null || Array.isArray(configs)) {
      return { valid: false, error: 'Model configs must be a JSON object' };
    }

    for (const [modelName, config] of Object.entries(configs)) {
      if (!modelName || modelName.trim() === '') {
        return { valid: false, error: 'Model name cannot be empty' };
      }

      if (typeof config !== 'object' || config === null || Array.isArray(config)) {
        return { valid: false, error: `Configuration for model "${modelName}" must be an object` };
      }

      const configObj = config;

      // Validate ratio
      if (configObj.ratio !== undefined) {
        if (typeof configObj.ratio !== 'number' || configObj.ratio < 0) {
          return { valid: false, error: `Invalid ratio for model "${modelName}": must be a non-negative number` };
        }
      }

      // Validate completion_ratio
      if (configObj.completion_ratio !== undefined) {
        if (typeof configObj.completion_ratio !== 'number' || configObj.completion_ratio < 0) {
          return { valid: false, error: `Invalid completion_ratio for model "${modelName}": must be a non-negative number` };
        }
      }

      // Validate max_tokens
      if (configObj.max_tokens !== undefined) {
        if (!Number.isInteger(configObj.max_tokens) || configObj.max_tokens < 0) {
          return { valid: false, error: `Invalid max_tokens for model "${modelName}": must be a non-negative integer` };
        }
      }

      // Validate tool whitelist
      let hasToolWhitelist = false;
      const whitelistSet = new Set();
      if (configObj.tool_whitelist !== undefined) {
        if (!Array.isArray(configObj.tool_whitelist)) {
          return { valid: false, error: `tool_whitelist for model "${modelName}" must be an array of strings` };
        }
        for (const entry of configObj.tool_whitelist) {
          if (typeof entry !== 'string') {
            return { valid: false, error: `tool_whitelist for model "${modelName}" contains a non-string entry` };
          }
          const trimmed = entry.trim();
          if (trimmed === '') {
            return { valid: false, error: `tool_whitelist for model "${modelName}" contains an empty entry` };
          }
          hasToolWhitelist = true;
          whitelistSet.add(trimmed.toLowerCase());
        }
      }

      // Validate tool pricing
      let hasToolPricing = false;
      if (configObj.tool_pricing !== undefined) {
        if (typeof configObj.tool_pricing !== 'object' || configObj.tool_pricing === null || Array.isArray(configObj.tool_pricing)) {
          return { valid: false, error: `tool_pricing for model "${modelName}" must be an object` };
        }
        const pricingEntries = Object.entries(configObj.tool_pricing);
        if (pricingEntries.length === 0) {
          return { valid: false, error: `tool_pricing for model "${modelName}" cannot be empty` };
        }
        for (const [toolNameRaw, pricing] of pricingEntries) {
          if (typeof toolNameRaw !== 'string') {
            return { valid: false, error: `tool_pricing for model "${modelName}" has a non-string tool name` };
          }
          const toolName = toolNameRaw.trim();
          if (toolName === '') {
            return { valid: false, error: `tool_pricing for model "${modelName}" has an empty tool name` };
          }
          if (typeof pricing !== 'object' || pricing === null || Array.isArray(pricing)) {
            return { valid: false, error: `tool_pricing for tool "${toolName}" on model "${modelName}" must be an object` };
          }
          const { usd_per_call, quota_per_call } = pricing;
          if (usd_per_call !== undefined && (typeof usd_per_call !== 'number' || usd_per_call < 0)) {
            return { valid: false, error: `usd_per_call for tool "${toolName}" on model "${modelName}" must be a non-negative number` };
          }
          if (quota_per_call !== undefined && (!Number.isInteger(quota_per_call) || quota_per_call < 0)) {
            return { valid: false, error: `quota_per_call for tool "${toolName}" on model "${modelName}" must be a non-negative integer` };
          }
          if (usd_per_call === undefined && quota_per_call === undefined) {
            return { valid: false, error: `tool_pricing for tool "${toolName}" on model "${modelName}" must specify usd_per_call or quota_per_call` };
          }
          if (whitelistSet.size > 0 && !whitelistSet.has(toolName.toLowerCase())) {
            return { valid: false, error: `tool_pricing for tool "${toolName}" on model "${modelName}" is missing from tool_whitelist` };
          }
          hasToolPricing = true;
        }
      }

      // Check if at least one meaningful field is provided
      const hasPricingField = configObj.ratio !== undefined || configObj.completion_ratio !== undefined || configObj.max_tokens !== undefined;
      const hasToolField = hasToolWhitelist || hasToolPricing;
      if (!hasPricingField && !hasToolField) {
        return { valid: false, error: `Model "${modelName}" must include pricing or tool configuration` };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Invalid JSON format: ${error.message}` };
  }
};

const OAUTH_JWT_CONFIG_EXAMPLE = {
  "client_type": "jwt",
  "client_id": "123456789",
  "coze_www_base": "https://www.coze.cn",
  "coze_api_base": "https://api.coze.cn",
  "private_key": "-----BEGIN PRIVATE KEY-----\n***\n-----END PRIVATE KEY-----",
  "public_key_id": "***********************************************************"
}

function type2secretPrompt(type, t) {
  switch (type) {
    case 15:
      return t('channel.edit.key_prompts.zhipu');
    case 18:
      return t('channel.edit.key_prompts.spark');
    case 22:
      return t('channel.edit.key_prompts.fastgpt');
    case 23:
      return t('channel.edit.key_prompts.tencent');
    default:
      return t('channel.edit.key_prompts.default');
  }
}

// Helper component for labels with tooltips
const LabelWithTooltip = ({ label, helpText, children }) => (
  <label>
    {label}
    {helpText && (
      <Popup
        trigger={<Icon name="question circle outline" style={{ marginLeft: '5px', color: '#999', cursor: 'help' }} />}
        content={helpText}
        position="top left"
        size="small"
        inverted
      />
    )}
    {children}
  </label>
);

const OPENAI_COMPATIBLE_API_FORMAT_OPTIONS = [
  { key: 'chat_completion', text: 'ChatCompletion (default)', value: 'chat_completion' },
  { key: 'response', text: 'Response', value: 'response' },
];

const EditChannel = () => {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const channelId = params.id;
  const isEdit = channelId !== undefined;
  const [loading, setLoading] = useState(isEdit);
  const handleCancel = () => {
    navigate('/channel');
  };

  const originInputs = {
    name: '',
    type: 1,
    key: '',
    base_url: '',
    other: '',
    model_mapping: '',
    system_prompt: '',
    models: [],
    groups: ['default'],
    ratelimit: 0,
    model_ratio: '',
    completion_ratio: '',
    model_configs: '',
    inference_profile_arn_map: '',
  };
  const [batch, setBatch] = useState(false);
  const [inputs, setInputs] = useState(originInputs);
  const [originModelOptions, setOriginModelOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [basicModels, setBasicModels] = useState([]);
  const [fullModels, setFullModels] = useState([]);
  const [customModel, setCustomModel] = useState('');
  const [config, setConfig] = useState({
    region: '',
    sk: '',
    ak: '',
    user_id: '',
    vertex_ai_project_id: '',
    vertex_ai_adc: '',
    auth_type: 'personal_access_token',
    api_format: 'chat_completion',
  });
  const [defaultPricing, setDefaultPricing] = useState({
    model_configs: '',
  });
  const [selectedToolModel, setSelectedToolModel] = useState('');
  const [customTool, setCustomTool] = useState('');
  const [selectedDefaultTool, setSelectedDefaultTool] = useState('');

  const parsedModelConfigs = useMemo(() => {
    if (!inputs.model_configs || inputs.model_configs.trim() === '') {
      return {};
    }
    try {
      const parsed = JSON.parse(inputs.model_configs);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }, [inputs.model_configs]);

  const modelNames = useMemo(() => {
    if (!parsedModelConfigs || typeof parsedModelConfigs !== 'object') {
      return [];
    }
    return Object.keys(parsedModelConfigs);
  }, [parsedModelConfigs]);

  useEffect(() => {
    if (!parsedModelConfigs || modelNames.length === 0) {
      setSelectedToolModel('');
      return;
    }
    setSelectedToolModel((prev) => (prev && modelNames.includes(prev) ? prev : modelNames[0]));
  }, [parsedModelConfigs, modelNames]);

  const currentToolWhitelist = useMemo(() => {
    if (!parsedModelConfigs || !selectedToolModel) {
      return [];
    }
    const entry = parsedModelConfigs[selectedToolModel];
    if (!entry || typeof entry !== 'object') {
      return [];
    }
    const list = entry.tool_whitelist;
    return Array.isArray(list) ? list : [];
  }, [parsedModelConfigs, selectedToolModel]);

  const pricedToolSet = useMemo(() => {
    if (!parsedModelConfigs || !selectedToolModel) {
      return new Set();
    }
    const entry = parsedModelConfigs[selectedToolModel];
    if (!entry || typeof entry !== 'object') {
      return new Set();
    }
    const pricing = entry.tool_pricing;
    const result = new Set();
    if (pricing && typeof pricing === 'object') {
      Object.keys(pricing).forEach((name) => {
        if (typeof name === 'string') {
          result.add(name.trim().toLowerCase());
        }
      });
    }
    return result;
  }, [parsedModelConfigs, selectedToolModel]);

  const availableDefaultTools = useMemo(() => {
    if (!parsedModelConfigs || !selectedToolModel) {
      return [];
    }
    const entry = parsedModelConfigs[selectedToolModel];
    if (!entry || typeof entry !== 'object') {
      return [];
    }
    const defaults = new Set();
    const list = entry.tool_whitelist;
    if (Array.isArray(list)) {
      list.forEach((tool) => defaults.add(tool));
    }
    const pricing = entry.tool_pricing;
    if (pricing && typeof pricing === 'object') {
      Object.keys(pricing).forEach((tool) => defaults.add(tool));
    }
    return Array.from(defaults).sort((a, b) => a.localeCompare(b));
  }, [parsedModelConfigs, selectedToolModel]);

  const defaultToolOptions = useMemo(() => {
    if (!availableDefaultTools || availableDefaultTools.length === 0) {
      return [];
    }
    const existing = new Set(currentToolWhitelist.map((tool) => tool.toLowerCase()));
    return availableDefaultTools.map((tool) => {
      const disabled = existing.has(tool.toLowerCase());
      return {
        key: tool,
        text: disabled ? `${tool} (${t('channel.edit.tool_whitelist_added', 'added')})` : tool,
        value: tool,
        disabled,
      };
    });
  }, [availableDefaultTools, currentToolWhitelist, t]);

  const updateToolWhitelist = (transform) => {
    if (!selectedToolModel) {
      return;
    }
    setInputs((prev) => {
      let configs;
      try {
        configs = prev.model_configs ? JSON.parse(prev.model_configs) : {};
      } catch (e) {
        showError('Failed to parse model configurations. Please fix JSON before editing tools.');
        return prev;
      }
      if (typeof configs !== 'object' || configs === null || Array.isArray(configs)) {
        configs = {};
      } else {
        configs = { ...configs };
      }
      const rawEntry = configs[selectedToolModel];
      const entry = rawEntry && typeof rawEntry === 'object' && !Array.isArray(rawEntry) ? { ...rawEntry } : {};
      const currentList = Array.isArray(entry.tool_whitelist) ? [...entry.tool_whitelist] : [];
      const nextList = transform(currentList);
      if (!nextList) {
        return prev;
      }
      if (nextList.length > 0) {
        entry.tool_whitelist = nextList;
      } else {
        delete entry.tool_whitelist;
      }
      configs[selectedToolModel] = entry;
      return {
        ...prev,
        model_configs: JSON.stringify(configs, null, 2),
      };
    });
  };

  const addToolToWhitelist = (toolName) => {
    if (!toolName || !selectedToolModel || parsedModelConfigs === null) {
      return;
    }
    const trimmed = toolName.trim();
    if (!trimmed) {
      return;
    }
    updateToolWhitelist((list) => {
      if (list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        return null;
      }
      const next = [...list, trimmed];
      return next;
    });
    setCustomTool('');
    setSelectedDefaultTool('');
  };

  const removeToolFromWhitelist = (toolName) => {
    if (!toolName || !selectedToolModel || parsedModelConfigs === null) {
      return;
    }
    const canonical = toolName.toLowerCase();
    updateToolWhitelist((list) => {
      const filtered = list.filter((item) => item.toLowerCase() !== canonical);
      if (filtered.length === list.length) {
        return null;
      }
      return filtered;
    });
  };

  const toolEditorDisabled = parsedModelConfigs === null || !selectedToolModel;

  const loadDefaultPricing = async (channelType) => {
    try {
      const res = await API.get(`/api/channel/default-pricing?type=${channelType}`);
      if (!res.data.success) {
        return;
      }

      let defaultModelConfigs = '';
      const data = res.data.data || {};

      if (data.model_configs) {
        try {
          const parsed = JSON.parse(data.model_configs);
          defaultModelConfigs = JSON.stringify(parsed, null, 2);
        } catch (e) {
          defaultModelConfigs = data.model_configs;
        }
      } else if (data.model_ratio || data.completion_ratio) {
        const modelRatio = data.model_ratio ? JSON.parse(data.model_ratio) : {};
        const completionRatio = data.completion_ratio ? JSON.parse(data.completion_ratio) : {};

        const unifiedConfigs = {};
        const allModels = new Set([...Object.keys(modelRatio), ...Object.keys(completionRatio)]);

        for (const modelName of allModels) {
          const cfg = {};
          if (modelRatio[modelName] !== undefined) {
            cfg.ratio = modelRatio[modelName];
          }
          if (completionRatio[modelName] !== undefined) {
            cfg.completion_ratio = completionRatio[modelName];
          }
          unifiedConfigs[modelName] = cfg;
        }

        defaultModelConfigs = JSON.stringify(unifiedConfigs, null, 2);
      }

      setDefaultPricing({ model_configs: defaultModelConfigs });
    } catch (error) {
      console.error('Failed to load default pricing', error);
    }
  };

  const formatJSON = (jsonString) => {
    if (!jsonString || jsonString.trim() === '') return '';
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return jsonString; // Return original if parsing fails
    }
  };

  const isValidJSON = (jsonString) => {
    if (!jsonString || jsonString.trim() === '') return true; // Empty is valid
    try {
      JSON.parse(jsonString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const fetchChannelSpecificModels = async (channelType) => {
    try {
      const res = await API.get('/api/models');
      if (res.data.success && res.data.data) {
        // channelId2Models maps channel type to model list
        const channelModels = res.data.data[channelType] || [];
        return channelModels;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch channel-specific models:', error);
      return [];
    }
  };

  const handleInputChange = (e, { name, value }) => {
    setInputs((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'type') {
        next.base_url = '';
        next.other = '';
        next.model_mapping = '';
        next.system_prompt = '';
        next.models = [];
        next.model_configs = '';
        next.inference_profile_arn_map = '';
      }
      return next;
    });
    if (name === 'type') {
      // Fetch channel-specific models for the selected channel type
      fetchChannelSpecificModels(value).then((channelSpecificModels) => {
        setBasicModels(channelSpecificModels);
      });

      // Load default pricing for the new channel type
      loadDefaultPricing(value);
    }
  };

  const handleConfigChange = (e, { name, value }) => {
    setConfig((inputs) => ({ ...inputs, [name]: value }));
  };

  const loadChannel = async () => {
    // Add cache busting parameter to ensure fresh data
    const cacheBuster = Date.now();
    let res = await API.get(`/api/channel/${channelId}?_cb=${cacheBuster}`);
    const { success, message, data } = res.data;
    if (success) {
      if (data.models === '') {
        data.models = [];
      } else {
        data.models = data.models.split(',');
      }
      if (data.group === '') {
        data.groups = [];
      } else {
        data.groups = data.group.split(',');
      }
      if (data.model_mapping !== '') {
        data.model_mapping = JSON.stringify(
          JSON.parse(data.model_mapping),
          null,
          2
        );
      }
      if (data.model_configs && data.model_configs !== '') {
        try {
          const parsedConfigs = JSON.parse(data.model_configs);
          // Pretty format with proper indentation
          data.model_configs = JSON.stringify(parsedConfigs, null, 2);
          console.log('Loaded model_configs for channel:', data.id, 'type:', data.type, 'models:', Object.keys(parsedConfigs));
        } catch (e) {
          console.error('Failed to parse model_configs:', e);
          // If parsing fails, keep original value but log the error
        }
      }
      // Format pricing fields for display
      if (data.model_ratio && data.model_ratio !== '') {
        try {
          data.model_ratio = JSON.stringify(JSON.parse(data.model_ratio), null, 2);
        } catch (e) {
          console.error('Failed to parse model_ratio:', e);
        }
      }
      if (data.completion_ratio && data.completion_ratio !== '') {
        try {
          data.completion_ratio = JSON.stringify(JSON.parse(data.completion_ratio), null, 2);
        } catch (e) {
          console.error('Failed to parse completion_ratio:', e);
        }
      }
      if (data.inference_profile_arn_map && data.inference_profile_arn_map !== '') {
        try {
          data.inference_profile_arn_map = JSON.stringify(JSON.parse(data.inference_profile_arn_map), null, 2);
        } catch (e) {
          console.error('Failed to parse inference_profile_arn_map:', e);
        }
      }
      setInputs(data);
      if (data.config !== '') {
        try {
          const parsedConfig = JSON.parse(data.config);
          setConfig((current) => ({
            ...current,
            ...parsedConfig,
            api_format: parsedConfig.api_format || 'chat_completion',
          }));
        } catch (error) {
          console.error('Failed to parse channel config:', error);
          setConfig((current) => ({ ...current, api_format: 'chat_completion' }));
        }
      } else {
        setConfig((current) => ({ ...current, api_format: 'chat_completion' }));
      }

      // Fetch channel-specific models for this channel type
      fetchChannelSpecificModels(data.type).then((channelSpecificModels) => {
        setBasicModels(channelSpecificModels);
        console.log('setBasicModels called with channel-specific models for existing channel:', channelSpecificModels);
      });

      // Load default pricing for this channel type, but don't override existing model_configs
      loadDefaultPricing(data.type);
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const fetchModels = async () => {
    try {
      let res = await API.get(`/api/channel/models`);
      // Ensure all models are included, even those with '/' in their name
      let localModelOptions = res.data.data
        .filter((model) => typeof model.id === 'string' && model.id.length > 0)
        .map((model) => ({
          key: model.id,
          text: model.id,
          value: model.id,
        }));
      setOriginModelOptions(localModelOptions);
      setFullModels(res.data.data.map((model) => model.id));
    } catch (error) {
      showError(error.message);
    }
  };

  const fetchGroups = async () => {
    try {
      let res = await API.get(`/api/group/`);
      setGroupOptions(
        res.data.data.map((group) => ({
          key: group,
          text: group,
          value: group,
        }))
      );
    } catch (error) {
      showError(error.message);
    }
  };

  useEffect(() => {
    let localModelOptions = [...originModelOptions];
    inputs.models.forEach((model) => {
      if (!localModelOptions.find((option) => option.key === model)) {
        localModelOptions.push({
          key: model,
          text: model,
          value: model,
        });
      }
    });
    setModelOptions(localModelOptions);
  }, [originModelOptions, inputs.models]);

  useEffect(() => {
    if (isEdit) {
      loadChannel().then();
    } else {
      // For new channels, fetch channel-specific models for the default type
      fetchChannelSpecificModels(inputs.type).then((channelSpecificModels) => {
        setBasicModels(channelSpecificModels);
        console.log('setBasicModels called with channel-specific models for new channel:', channelSpecificModels);
      });
      // Load default pricing for new channels
      loadDefaultPricing(inputs.type);
      setConfig({
        region: '',
        sk: '',
        ak: '',
        user_id: '',
        vertex_ai_project_id: '',
        vertex_ai_adc: '',
        auth_type: 'personal_access_token',
        api_format: 'chat_completion',
      });
    }
    fetchModels().then();
    fetchGroups().then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (inputs.key === '') {
      if (config.ak !== '' && config.sk !== '' && config.region !== '') {
        inputs.key = `${config.ak}|${config.sk}|${config.region}`;
      } else if (
        config.region !== '' &&
        config.vertex_ai_project_id !== '' &&
        config.vertex_ai_adc !== ''
      ) {
        inputs.key = `${config.region}|${config.vertex_ai_project_id}|${config.vertex_ai_adc}`;
      }
    }
    if (!isEdit && (inputs.name === '' || inputs.key === '')) {
      showInfo(t('channel.edit.messages.name_required'));
      return;
    }
    if (inputs.type !== 43 && inputs.models.length === 0) {
      showInfo(t('channel.edit.messages.models_required'));
      return;
    }
    if (inputs.model_mapping !== '' && !verifyJSON(inputs.model_mapping)) {
      showInfo(t('channel.edit.messages.model_mapping_invalid'));
      return;
    }
    if (inputs.model_configs !== '') {
      const validation = validateModelConfigs(inputs.model_configs);
      if (!validation.valid) {
        showInfo(`${t('channel.edit.messages.model_configs_invalid')}: ${validation.error}`);
        return;
      }
    }

    // Note: model_ratio and completion_ratio are now handled through model_configs
    if (inputs.inference_profile_arn_map !== '' && !verifyJSON(inputs.inference_profile_arn_map)) {
      showInfo(t('channel.edit.messages.inference_profile_arn_map_invalid'));
      return;
    }

    if (inputs.type === 34 && config.auth_type === 'oauth_config') {
      if (!verifyJSON(inputs.key)) {
        showInfo(t('channel.edit.messages.oauth_config_invalid_format'));
        return;
      }

      try {
        const oauthConfig = JSON.parse(inputs.key);
        const requiredFields = [
          'client_type',
          'client_id',
          'coze_www_base',
          'coze_api_base',
          'private_key',
          'public_key_id'
        ];

        for (const field of requiredFields) {
          if (!oauthConfig.hasOwnProperty(field)) {
            showInfo(t('channel.edit.messages.oauth_config_missing_field', { field }));
            return;
          }
        }
      } catch (error) {
        showInfo(t('channel.edit.messages.oauth_config_parse_error', { error: error.message }));
        return;
      }
    }

    let localInputs = { ...inputs };
    if (localInputs.key === 'undefined|undefined|undefined') {
      localInputs.key = ''; // prevent potential bug
    }
    if (localInputs.base_url && localInputs.base_url.endsWith('/')) {
      localInputs.base_url = localInputs.base_url.slice(
        0,
        localInputs.base_url.length - 1
      );
    }
    if (localInputs.type === 3 && localInputs.other === '') {
      localInputs.other = '2024-03-01-preview';
    }
    let res;
    localInputs.models = localInputs.models.join(',');
    localInputs.group = localInputs.groups.join(',');
    localInputs.ratelimit = parseInt(localInputs.ratelimit);
    localInputs.config = JSON.stringify(config);

    // Handle pricing fields - convert empty strings to null for the API
    if (localInputs.model_ratio === '') {
      localInputs.model_ratio = null;
    }
    if (localInputs.completion_ratio === '') {
      localInputs.completion_ratio = null;
    }
    if (localInputs.inference_profile_arn_map === '') {
      localInputs.inference_profile_arn_map = null;
    }
    if (isEdit) {
      res = await API.put(`/api/channel/`, {
        ...localInputs,
        id: parseInt(channelId),
      });
    } else {
      res = await API.post(`/api/channel/`, localInputs);
    }
    const { success, message } = res.data;
    if (success) {
      if (isEdit) {
        showSuccess(t('channel.edit.messages.update_success'));
      } else {
        showSuccess(t('channel.edit.messages.create_success'));
        setInputs(originInputs);
      }
    } else {
      showError(message);
    }
  };

  const addCustomModel = () => {
    if (customModel.trim() === '') return;
    if (inputs.models.includes(customModel)) return;
    let localModels = [...inputs.models];
    localModels.push(customModel);
    let localModelOptions = [];
    localModelOptions.push({
      key: customModel,
      text: customModel,
      value: customModel,
    });
    setModelOptions((modelOptions) => {
      return [...modelOptions, ...localModelOptions];
    });
    setCustomModel('');
    handleInputChange(null, { name: 'models', value: localModels });
  };

  return (
    <div className='dashboard-container'>
      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header className='header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {isEdit
                ? t('channel.edit.title_edit')
                : t('channel.edit.title_create')}
            </span>
            {isEdit && (
              <ChannelDebugPanel
                channelId={channelId}
                channelType={inputs.type}
                channelName={inputs.name}
              />
            )}
          </Card.Header>
          {loading ? (
            <div style={{
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--card-bg)',
              borderRadius: '8px',
              margin: '1rem 0'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                color: 'var(--text-secondary)'
              }}>
                <div className="ui active inline loader"></div>
                <span>{t('channel.edit.loading')}</span>
              </div>
            </div>
          ) : (
            <Form autoComplete='new-password'>
              <Form.Field>
                <Form.Select
                  label={t('channel.edit.type')}
                  name='type'
                  required
                  search
                  options={CHANNEL_OPTIONS}
                  value={inputs.type}
                  onChange={handleInputChange}
                />
              </Form.Field>
              {renderChannelTip(inputs.type)}
              <Form.Field>
                <Form.Input
                  label={t('channel.edit.name')}
                  name='name'
                  placeholder={t('channel.edit.name_placeholder')}
                  onChange={handleInputChange}
                  value={inputs.name}
                  required
                />
              </Form.Field>
              <Form.Field>
                <Form.Dropdown
                  label={t('channel.edit.group')}
                  placeholder={t('channel.edit.group_placeholder')}
                  name='groups'
                  required
                  fluid
                  multiple
                  selection
                  allowAdditions
                  additionLabel={t('channel.edit.group_addition')}
                  onChange={handleInputChange}
                  value={inputs.groups}
                  autoComplete='new-password'
                  options={groupOptions}
                />
              </Form.Field>

              {/* Azure OpenAI specific fields */}
              {inputs.type === 3 && (
                <>
                  <Message>
                    Note: <strong>The model deployment name must match the model name</strong>
                    , because One API will replace the model parameter in the request body
                    with your deployment name (dots in the model name will be removed).
                    <a
                      target='_blank'
                      rel='noreferrer'
                      href='https://github.com/songquanpeng/one-api/issues/133?notification_referrer_id=NT_kwDOAmJSYrM2NjIwMzI3NDgyOjM5OTk4MDUw#issuecomment-1571602271'
                    >
                      Image Demo
                    </a>
                  </Message>
                  <Form.Field>
                    <Form.Input
                      label='AZURE_OPENAI_ENDPOINT'
                      name='base_url'
                      placeholder='Please enter AZURE_OPENAI_ENDPOINT, for example: https://docs-test-001.openai.azure.com'
                      onChange={handleInputChange}
                      value={inputs.base_url}
                      autoComplete='new-password'
                    />
                  </Form.Field>
                  <Form.Field>
                    <Form.Input
                      label='Default API Version'
                      name='other'
                      placeholder='Please enter default API version, for example: 2024-03-01-preview. This configuration can be overridden by actual request query parameters'
                      onChange={handleInputChange}
                      value={inputs.other}
                      autoComplete='new-password'
                    />
                  </Form.Field>
                </>
              )}

              {inputs.type === 50 && (
                <>
                  <Form.Field>
                    <Form.Input
                      required
                      label={t('channel.edit.base_url')}
                      name='base_url'
                      placeholder={t('channel.edit.base_url_placeholder')}
                      onChange={handleInputChange}
                      value={inputs.base_url}
                      autoComplete='new-password'
                    />
                  </Form.Field>
                  <Form.Field>
                    <LabelWithTooltip
                      label={t('channel.edit.api_format', 'Upstream API Format')}
                      helpText={t('channel.edit.api_format_help', 'Choose the upstream surface to forward requests to. ChatCompletion matches legacy OpenAI-compatible providers, while Response targets providers that expect the Response API payload.')}
                    >
                      <Form.Dropdown
                        selection
                        options={OPENAI_COMPATIBLE_API_FORMAT_OPTIONS}
                        name='api_format'
                        value={config.api_format}
                        onChange={(event, data) => handleConfigChange(event, data)}
                        autoComplete='off'
                      />
                    </LabelWithTooltip>
                  </Form.Field>
                </>
              )}

              {inputs.type === 18 && (
                <Form.Field>
                  <Form.Input
                    label={t('channel.edit.spark_version')}
                    name='other'
                    placeholder={t('channel.edit.spark_version_placeholder')}
                    onChange={handleInputChange}
                    value={inputs.other}
                    autoComplete='new-password'
                  />
                </Form.Field>
              )}
              {inputs.type === 21 && (
                <Form.Field>
                  <Form.Input
                    label={t('channel.edit.knowledge_id')}
                    name='other'
                    placeholder={t('channel.edit.knowledge_id_placeholder')}
                    onChange={handleInputChange}
                    value={inputs.other}
                    autoComplete='new-password'
                  />
                </Form.Field>
              )}
              {inputs.type === 17 && (
                <Form.Field>
                  <Form.Input
                    label={t('channel.edit.plugin_param')}
                    name='other'
                    placeholder={t('channel.edit.plugin_param_placeholder')}
                    onChange={handleInputChange}
                    value={inputs.other}
                    autoComplete='new-password'
                  />
                </Form.Field>
              )}
              {inputs.type === 34 && (
                <Message>{t('channel.edit.coze_notice')}</Message>
              )}
              {inputs.type === 40 && (
                <Message>
                  {t('channel.edit.douban_notice')}
                  <a
                    target='_blank'
                    rel='noreferrer'
                    href='https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint'
                  >
                    {t('channel.edit.douban_notice_link')}
                  </a>
                  {t('channel.edit.douban_notice_2')}
                </Message>
              )}
              {inputs.type !== 43 && (
                <Form.Field>
                  <Form.Dropdown
                    label={t('channel.edit.models')}
                    placeholder={t('channel.edit.models_placeholder')}
                    name='models'
                    required
                    fluid
                    multiple
                    search
                    onLabelClick={(e, { value }) => {
                      copy(value).then();
                    }}
                    selection
                    onChange={handleInputChange}
                    value={inputs.models}
                    autoComplete='new-password'
                    options={modelOptions}
                  />
                </Form.Field>
              )}
              {inputs.type !== 43 && (
                <div style={{ lineHeight: '40px', marginBottom: '12px' }}>
                  <Button
                    type={'button'}
                    onClick={() => {
                      // Use channel-specific models (basicModels) and deduplicate with existing models
                      const currentModels = inputs.models || [];
                      const channelModels = basicModels || [];

                      // Merge and deduplicate
                      const uniqueModels = [...new Set([...currentModels, ...channelModels])];

                      console.log('Fill Related Models clicked - using channel-specific models:', channelModels);
                      console.log('Current models:', currentModels);
                      console.log('Merged and deduplicated models:', uniqueModels);

                      handleInputChange(null, {
                        name: 'models',
                        value: uniqueModels,
                      });
                    }}
                  >
                    {t('channel.edit.buttons.fill_models')}
                  </Button>
                  <Button
                    type={'button'}
                    onClick={() => {
                      // Use all models and deduplicate with existing models
                      const currentModels = inputs.models || [];
                      const allModels = fullModels || [];

                      // Merge and deduplicate
                      const uniqueModels = [...new Set([...currentModels, ...allModels])];

                      handleInputChange(null, {
                        name: 'models',
                        value: uniqueModels,
                      });
                    }}
                  >
                    {t('channel.edit.buttons.fill_all')}
                  </Button>
                  <Button
                    type={'button'}
                    onClick={() => {
                      handleInputChange(null, { name: 'models', value: [] });
                    }}
                  >
                    {t('channel.edit.buttons.clear')}
                  </Button>
                  <Input
                    action={
                      <Button type={'button'} onClick={addCustomModel}>
                        {t('channel.edit.buttons.add_custom')}
                      </Button>
                    }
                    placeholder={t('channel.edit.buttons.custom_placeholder')}
                    value={customModel}
                    onChange={(e, { value }) => {
                      setCustomModel(value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addCustomModel();
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              )}
              {inputs.type !== 43 && (
                <>
                  <Form.Field>
                    <LabelWithTooltip
                      label={t('channel.edit.model_mapping')}
                      helpText={t('channel.edit.model_mapping_help')}
                    >
                      <Button
                        type="button"
                        size="mini"
                        onClick={() => {
                          const formatted = formatJSON(inputs.model_mapping);
                          setInputs((inputs) => ({
                            ...inputs,
                            model_mapping: formatted,
                          }));
                        }}
                        style={{ marginLeft: '10px' }}
                        disabled={!inputs.model_mapping || inputs.model_mapping.trim() === ''}
                      >
                        Format JSON
                      </Button>
                    </LabelWithTooltip>
                    <Form.TextArea
                      placeholder={`${t(
                        'channel.edit.model_mapping_placeholder'
                      )}\n${JSON.stringify(MODEL_MAPPING_EXAMPLE, null, 2)}`}
                      name='model_mapping'
                      onChange={handleInputChange}
                      value={inputs.model_mapping}
                      style={{
                        minHeight: 150,
                        fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        backgroundColor: '#f8f9fa',
                        border: `1px solid ${isValidJSON(inputs.model_mapping) ? '#e1e5e9' : '#ff6b6b'}`,
                        borderRadius: '4px',
                      }}
                      autoComplete='new-password'
                    />
                    <div style={{ fontSize: '12px', marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#666' }}>
                        {t('channel.edit.model_mapping_placeholder').split('\n')[0]}
                      </span>
                      {inputs.model_mapping && inputs.model_mapping.trim() !== '' && (
                        <span style={{
                          color: isValidJSON(inputs.model_mapping) ? '#28a745' : '#dc3545',
                          fontWeight: 'bold',
                          fontSize: '11px'
                        }}>
                          {isValidJSON(inputs.model_mapping) ? '✓ Valid JSON' : '✗ Invalid JSON'}
                        </span>
                      )}
                    </div>
                  </Form.Field>
                  <Form.Field>
                    <LabelWithTooltip
                      label={t('channel.edit.model_configs')}
                      helpText={t('channel.edit.model_configs_help')}
                    >
                      <Button
                        type="button"
                        size="mini"
                        onClick={() => {
                          const formatted = formatJSON(defaultPricing.model_configs);
                          setInputs((inputs) => ({
                            ...inputs,
                            model_configs: formatted,
                          }));
                        }}
                        style={{ marginLeft: '10px' }}
                      >
                        {t('channel.edit.buttons.load_defaults')}
                      </Button>
                      <Button
                        type="button"
                        size="mini"
                        onClick={() => {
                          const formatted = formatJSON(inputs.model_configs);
                          setInputs((inputs) => ({
                            ...inputs,
                            model_configs: formatted,
                          }));
                        }}
                        style={{ marginLeft: '5px' }}
                        disabled={!inputs.model_configs || inputs.model_configs.trim() === ''}
                      >
                        Format JSON
                      </Button>
                    </LabelWithTooltip>
                    <Form.TextArea
                      placeholder={`${t(
                        'channel.edit.model_configs_placeholder'
                      )}\n${JSON.stringify(MODEL_CONFIGS_EXAMPLE, null, 2)}`}
                      name='model_configs'
                      onChange={handleInputChange}
                      value={inputs.model_configs}
                      style={{
                        minHeight: 200,
                        fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        backgroundColor: '#f8f9fa',
                        border: `1px solid ${isValidJSON(inputs.model_configs) ? '#e1e5e9' : '#ff6b6b'}`,
                        borderRadius: '4px',
                      }}
                      autoComplete='new-password'
                    />
                    {parsedModelConfigs === null && inputs.model_configs && inputs.model_configs.trim() !== '' && (
                      <Message warning size='tiny' style={{ marginTop: '8px' }}>
                        {t('channel.edit.tool_whitelist_parse_error', 'Unable to edit the tool whitelist until model_configs contains valid JSON.')}
                      </Message>
                    )}
                    {parsedModelConfigs !== null && modelNames.length > 0 && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        border: '1px solid var(--border-color, #e1e5e9)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--card-bg, #f9fafb)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{t('channel.edit.tool_whitelist', 'Built-in Tool Whitelist')}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #666)' }}>
                            {t('channel.edit.tool_whitelist_tip', 'Click a label to remove it. Tools not listed here must define tool_pricing to remain usable.')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <Dropdown
                            selection
                            search
                            options={modelNames.map((name) => ({ key: name, text: name, value: name }))}
                            value={selectedToolModel || modelNames[0]}
                            onChange={(e, { value }) => {
                              if (typeof value === 'string') {
                                setSelectedToolModel(value);
                              }
                            }}
                            placeholder={t('channel.edit.tool_whitelist_model_placeholder', 'Select model to edit')}
                            style={{ minWidth: '220px' }}
                          />
                          {defaultToolOptions.length > 0 && (
                            <Dropdown
                              selection
                              clearable
                              options={defaultToolOptions}
                              placeholder={t('channel.edit.tool_whitelist_defaults', 'Add from known tools')}
                              value={selectedDefaultTool || null}
                              onChange={(e, { value }) => {
                                if (typeof value === 'string' && value) {
                                  addToolToWhitelist(value);
                                }
                                setSelectedDefaultTool('');
                              }}
                              disabled={toolEditorDisabled || defaultToolOptions.length === 0}
                              style={{ minWidth: '220px' }}
                            />
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '34px', marginBottom: '10px' }}>
                          {currentToolWhitelist.length === 0 ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary, #666)' }}>
                              {t('channel.edit.tool_whitelist_empty', 'No tools pinned. All tools remain permitted unless tool_pricing restricts them.')}
                            </span>
                          ) : (
                            currentToolWhitelist.map((tool) => {
                              const canonical = tool.toLowerCase();
                              const priced = pricedToolSet.has(canonical);
                              const label = (
                                <Label
                                  key={tool}
                                  as='a'
                                  color={priced ? 'blue' : 'red'}
                                  basic={priced}
                                  onClick={() => removeToolFromWhitelist(tool)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {tool}
                                  <Icon name='close' style={{ marginLeft: '6px' }} />
                                </Label>
                              );
                              if (priced) {
                                return label;
                              }
                              return (
                                <Popup
                                  key={tool}
                                  content={t('channel.edit.tool_pricing_missing', { tool, defaultValue: `Pricing not set for "${tool}". Define tool_pricing to avoid request rejection.` })}
                                  position='top center'
                                  trigger={label}
                                />
                              );
                            })
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Input
                            placeholder={t('channel.edit.tool_whitelist_add_placeholder', 'Custom tool name')}
                            value={customTool}
                            onChange={(e, { value }) => setCustomTool(value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addToolToWhitelist(customTool);
                              }
                            }}
                            disabled={toolEditorDisabled}
                            style={{ minWidth: '220px' }}
                          />
                          <Button
                            type='button'
                            onClick={() => addToolToWhitelist(customTool)}
                            disabled={toolEditorDisabled || !customTool.trim()}
                          >
                            {t('channel.edit.tool_whitelist_add', 'Add Tool')}
                          </Button>
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: '12px', marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {t('channel.edit.model_configs_help')}
                      </span>
                      {inputs.model_configs && inputs.model_configs.trim() !== '' && (
                        <span style={{
                          color: isValidJSON(inputs.model_configs) ? 'var(--success-color)' : 'var(--error-color)',
                          fontWeight: 'bold',
                          fontSize: '11px'
                        }}>
                          {isValidJSON(inputs.model_configs) ? '✓ Valid JSON' : '✗ Invalid JSON'}
                        </span>
                      )}
                    </div>
                  </Form.Field>
                  <Form.Field>
                    <LabelWithTooltip
                      label={t('channel.edit.system_prompt')}
                      helpText={t('channel.edit.system_prompt_help')}
                    />
                    <Form.TextArea
                      placeholder={t('channel.edit.system_prompt_placeholder')}
                      name='system_prompt'
                      onChange={handleInputChange}
                      value={inputs.system_prompt}
                      style={{
                        minHeight: 150,
                        fontFamily: 'JetBrains Mono, Consolas',
                      }}
                      autoComplete='new-password'
                    />
                  </Form.Field>
                </>
              )}
              {/* Move Coze authentication type selection and input fields here */}
              {inputs.type === 34 && (
                <>
                  <Form.Field>
                    <Form.Select
                      label={t('channel.edit.coze_auth_type')}
                      name="auth_type"
                      options={COZE_AUTH_OPTIONS.map(option => ({
                        ...option,
                        text: t(`channel.edit.coze_auth_options.${option.text}`)
                      }))}
                      value={config.auth_type}
                      onChange={(e, { name, value }) => handleConfigChange(e, { name, value })}
                    />
                  </Form.Field>
                  {config.auth_type === 'personal_access_token' ? (
                    <Form.Field>
                      <Form.Input
                        label={t('channel.edit.key')}
                        name='key'
                        required
                        placeholder={t('channel.edit.key_prompts.default')}
                        onChange={handleInputChange}
                        value={inputs.key}
                        autoComplete='new-password'
                      />
                    </Form.Field>
                  ) : (
                    <Form.Field>
                      <Form.TextArea
                        label={t('channel.edit.oauth_jwt_config')}
                        name="key"
                        required
                        placeholder={`${t(
                          'channel.edit.oauth_jwt_config_placeholder'
                        )}\n${JSON.stringify(OAUTH_JWT_CONFIG_EXAMPLE, null, 2)}`}
                        onChange={handleInputChange}
                        value={inputs.key}
                        style={{
                          minHeight: 150,
                          fontFamily: 'JetBrains Mono, Consolas',
                        }}
                        autoComplete='new-password'
                      />
                    </Form.Field>
                  )}
                </>
              )}

              {inputs.type === 33 && (
                <Form.Field>
                  <Form.Input
                    label='Region'
                    name='region'
                    required
                    placeholder={t('channel.edit.aws_region_placeholder')}
                    onChange={handleConfigChange}
                    value={config.region}
                    autoComplete=''
                  />
                  <Form.Input
                    label='AK'
                    name='ak'
                    required
                    placeholder={t('channel.edit.aws_ak_placeholder')}
                    onChange={handleConfigChange}
                    value={config.ak}
                    autoComplete=''
                  />
                  <Form.Input
                    label='SK'
                    name='sk'
                    required
                    placeholder={t('channel.edit.aws_sk_placeholder')}
                    onChange={handleConfigChange}
                    value={config.sk}
                    autoComplete=''
                  />
                </Form.Field>
              )}
              {inputs.type === 42 && (
                <Form.Field>
                  <Form.Input
                    label='Region'
                    name='region'
                    required
                    placeholder={t('channel.edit.vertex_region_placeholder')}
                    onChange={handleConfigChange}
                    value={config.region}
                    autoComplete=''
                  />
                  <Form.Input
                    label={t('channel.edit.vertex_project_id')}
                    name='vertex_ai_project_id'
                    required
                    placeholder={t('channel.edit.vertex_project_id_placeholder')}
                    onChange={handleConfigChange}
                    value={config.vertex_ai_project_id}
                    autoComplete=''
                  />
                  <Form.Input
                    label={t('channel.edit.vertex_credentials')}
                    name='vertex_ai_adc'
                    required
                    placeholder={t('channel.edit.vertex_credentials_placeholder')}
                    onChange={handleConfigChange}
                    value={config.vertex_ai_adc}
                    autoComplete=''
                  />
                </Form.Field>
              )}
              {inputs.type === 34 && (
                <Form.Input
                  label={t('channel.edit.user_id')}
                  name='user_id'
                  required
                  placeholder={t('channel.edit.user_id_placeholder')}
                  onChange={handleConfigChange}
                  value={config.user_id}
                  autoComplete=''
                />
              )}
              {inputs.type !== 33 &&
                inputs.type !== 42 &&
                inputs.type !== 34 &&
                (batch ? (
                  <Form.Field>
                    <Form.TextArea
                      label={t('channel.edit.key')}
                      name='key'
                      required
                      placeholder={t('channel.edit.batch_placeholder')}
                      onChange={handleInputChange}
                      value={inputs.key}
                      style={{
                        minHeight: 150,
                        fontFamily: 'JetBrains Mono, Consolas',
                      }}
                      autoComplete='new-password'
                    />
                  </Form.Field>
                ) : (
                  <Form.Field>
                    <Form.Input
                      label={t('channel.edit.key')}
                      name='key'
                      required
                      placeholder={type2secretPrompt(inputs.type, t)}
                      onChange={handleInputChange}
                      value={inputs.key}
                      autoComplete='new-password'
                    />
                  </Form.Field>
                ))}
              {inputs.type === 37 && (
                <Form.Field>
                  <Form.Input
                    label='Account ID'
                    name='user_id'
                    required
                    placeholder={
                      'Please enter Account ID, e.g.: d8d7c61dbc334c32d3ced580e4bf42b4'
                    }
                    onChange={handleConfigChange}
                    value={config.user_id}
                    autoComplete=''
                  />
                </Form.Field>
              )}
              {inputs.type !== 33 && !isEdit && (
                <Form.Checkbox
                  checked={batch}
                  label={t('channel.edit.batch')}
                  name='batch'
                  onChange={() => setBatch(!batch)}
                />
              )}
              {inputs.type !== 3 &&
                inputs.type !== 33 &&
                inputs.type !== 8 &&
                inputs.type !== 50 &&
                inputs.type !== 22 && (
                  <Form.Field>
                    <Form.Input
                      label={t('channel.edit.proxy_url')}
                      name='base_url'
                      placeholder={t('channel.edit.proxy_url_placeholder')}
                      onChange={handleInputChange}
                      value={inputs.base_url}
                      autoComplete='new-password'
                    />
                  </Form.Field>
                )}
              {inputs.type === 22 && (
                <Form.Field>
                  <Form.Input
                    label='Private Deployment URL'
                    name='base_url'
                    placeholder={
                      'Please enter the private deployment URL, format: https://fastgpt.run/api/openapi'
                    }
                    onChange={handleInputChange}
                    value={inputs.base_url}
                    autoComplete='new-password'
                  />
                </Form.Field>
              )}

              <Form.Field>
                <LabelWithTooltip
                  label={t('channel.edit.ratelimit')}
                  helpText={t('channel.edit.ratelimit_help')}
                />
                <Form.Input
                  name='ratelimit'
                  placeholder={t('channel.edit.ratelimit_placeholder')}
                  onChange={handleInputChange}
                  value={inputs.ratelimit}
                  autoComplete='new-password'
                />
              </Form.Field>

              {/* Channel-specific pricing fields - now handled through model_configs */}

              {/* AWS-specific inference profile ARN mapping */}
              {inputs.type === 33 && (
                <Form.Field>
                  <label>
                    Inference Profile ARN Map
                  </label>
                  <Form.TextArea
                    name="inference_profile_arn_map"
                    placeholder={`Optional. JSON mapping of model names to AWS Bedrock Inference Profile ARNs.\nExample:\n${JSON.stringify({
                      "claude-3-5-sonnet-20241022": "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                      "claude-3-haiku-20240307": "arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0"
                    }, null, 2)}`}
                    style={{
                      minHeight: 150,
                      fontFamily: 'JetBrains Mono, Consolas',
                    }}
                    onChange={handleInputChange}
                    value={inputs.inference_profile_arn_map}
                    autoComplete="new-password"
                  />
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                    JSON format: {`{"model_name": "arn:aws:bedrock:region:account:inference-profile/profile-id"}`}. Maps model names to AWS Bedrock Inference Profile ARNs. Leave empty to use default model IDs.
                  </div>
                </Form.Field>
              )}

              <Button onClick={handleCancel}>
                {t('channel.edit.buttons.cancel')}
              </Button>
              <Button
                type={isEdit ? 'button' : 'submit'}
                positive
                onClick={submit}
              >
                {t('channel.edit.buttons.submit')}
              </Button>
            </Form>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default EditChannel;
