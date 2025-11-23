import { formatNumber } from '@/lib/utils'

export const getQuotaPerUnit = () => parseFloat(localStorage.getItem('quota_per_unit') || '500000')
export const getDisplayInCurrency = () => localStorage.getItem('display_in_currency') === 'true'

export const renderQuota = (quota: number, precision: number = 2): string => {
  const displayInCurrency = getDisplayInCurrency()
  const quotaPerUnit = getQuotaPerUnit()

  if (displayInCurrency) {
    const amount = (quota / quotaPerUnit).toFixed(precision)
    return `$${amount}`
  }

  return formatNumber(quota)
}

export const chartConfig = {
  colors: {
    requests: '#4318FF',
    quota: '#00B5D8',
    tokens: '#FF5E7D',
  },
  barColors: [
    '#4318FF',
    '#00B5D8',
    '#6C63FF',
    '#05CD99',
    '#FFB547',
    '#FF5E7D',
    '#41B883',
    '#7983FF',
    '#FF8F6B',
    '#49BEFF',
    '#8B5CF6',
    '#F59E0B',
    '#EF4444',
    '#10B981',
    '#3B82F6',
  ],
}

export const barColor = (index: number) => chartConfig.barColors[index % chartConfig.barColors.length]

export const GradientDefs = () => (
  <defs>
    <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#4318FF" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#4318FF" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="quotaGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#00B5D8" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#00B5D8" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="tokensGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FF5E7D" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#FF5E7D" stopOpacity={0.1} />
    </linearGradient>
  </defs>
)
