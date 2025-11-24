export type BaseMetricRow = {
  day: string
  request_count: number
  quota: number
  prompt_tokens: number
  completion_tokens: number
}

export type ModelRow = BaseMetricRow & { model_name: string }
export type UserRow = BaseMetricRow & { username: string; user_id: number }
export type TokenRow = BaseMetricRow & { token_name: string; username: string; user_id: number }

export type DashboardData = {
  rows: ModelRow[]
  userRows: UserRow[]
  tokenRows: TokenRow[]
}

export type UserOption = {
  id: number
  username: string
  display_name: string
}

export const CHART_CONFIG = {
  colors: {
    requests: '#4318FF',
    quota: '#00B5D8',
    tokens: '#FF5E7D',
  },
  gradients: {
    requests: 'url(#requestsGradient)',
    quota: 'url(#quotaGradient)',
    tokens: 'url(#tokensGradient)',
  },
  lineChart: {
    strokeWidth: 3,
    dot: false,
    activeDot: {
      r: 6,
      strokeWidth: 2,
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
    },
    grid: {
      vertical: false,
      horizontal: true,
      opacity: 0.2,
    },
  },
  barColors: [
    '#4318FF', // Deep purple
    '#00B5D8', // Cyan
    '#6C63FF', // Purple
    '#05CD99', // Green
    '#FFB547', // Orange
    '#FF5E7D', // Pink
    '#41B883', // Emerald
    '#7983FF', // Light Purple
    '#FF8F6B', // Coral
    '#49BEFF', // Sky Blue
    '#8B5CF6', // Violet
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#10B981', // Emerald
    '#3B82F6', // Blue
  ],
}

export const getQuotaPerUnit = () => parseFloat(localStorage.getItem('quota_per_unit') || '500000')
export const getDisplayInCurrency = () => localStorage.getItem('display_in_currency') === 'true'

export const barColor = (i: number) => {
  return CHART_CONFIG.barColors[i % CHART_CONFIG.barColors.length]
}
