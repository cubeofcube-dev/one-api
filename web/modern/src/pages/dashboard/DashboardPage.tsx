import { ResponsivePageContainer } from '@/components/ui/responsive-container'
import { useAuthStore } from '@/lib/stores/auth'
import { useTranslation } from 'react-i18next'

import { FiltersPanel } from './components/FiltersPanel'
import { OverviewSection } from './components/OverviewSection'
import { TrendSparklines } from './components/TrendSparklines'
import { EntityUsageSection, ModelUsageSection } from './components/UsageSections'
import { useDashboardData } from './hooks/useDashboardData'
import { useDashboardFilters } from './hooks/useDashboardFilters'

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const isAdmin = (user?.role ?? 0) >= 10

  const filters = useDashboardFilters({ isAdmin, t })
  const data = useDashboardData({
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    dashUser: filters.dashUser,
    isAdmin,
    validateDateRange: filters.validateDateRange,
    setDateError: filters.setDateError,
    t
  })

  if (!user) {
    return <div>{t('dashboard.login_required')}</div>
  }

  const handlePreset = (preset: 'today' | '7d' | '30d') => {
    const range = filters.applyPreset(preset)
    void data.loadStats(range)
  }

  const handleApply = () => {
    void data.loadStats()
  }

  return (
    <ResponsivePageContainer title={t('dashboard.title')} description={t('dashboard.description')}>
      {data.loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-sm text-muted-foreground">{t('dashboard.loading')}</p>
          </div>
        </div>
      )}

      <FiltersPanel
        filtersReady={filters.filtersReady}
        isAdmin={isAdmin}
        fromDate={filters.fromDate}
        toDate={filters.toDate}
        dashUser={filters.dashUser}
        userOptions={filters.userOptions}
        getMinDate={filters.getMinDate}
        getMaxDate={filters.getMaxDate}
        onFromDateChange={filters.setFromDate}
        onToDateChange={filters.setToDate}
        onUserChange={filters.setDashUser}
        onPreset={handlePreset}
        onApply={handleApply}
        loading={data.loading}
        dateError={filters.dateError}
        t={t}
      />

      {filters.dateError && (
        <div
          id="date-error"
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-950/20 dark:border-red-800"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-red-800 dark:text-red-200">{t('dashboard.errors.label')}</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{filters.dateError}</p>
        </div>
      )}

      <OverviewSection
        t={t}
        lastUpdated={data.lastUpdated}
        totals={data.rangeTotals}
        modelLeaders={data.modelLeaders}
        rangeInsights={data.rangeInsights}
      />

      <TrendSparklines t={t} timeSeries={data.timeSeries} />

      <ModelUsageSection
        title={t('dashboard.sections.model_usage')}
        keys={data.modelKeys}
        data={data.modelStackedData}
        tickFormatter={data.formatStackedTick}
        tooltipContent={data.stackedTooltip}
        statisticsMetric={data.statisticsMetric}
        onMetricChange={data.setStatisticsMetric}
        t={t}
      />

      <EntityUsageSection
        title={t('dashboard.sections.user_usage')}
        subtitle={t('dashboard.sections.metric_label', { metric: data.metricLabel })}
        keys={data.userKeys}
        data={data.userStackedData}
        tickFormatter={data.formatStackedTick}
        tooltipContent={data.stackedTooltip}
      />

      <EntityUsageSection
        title={t('dashboard.sections.token_usage')}
        subtitle={t('dashboard.sections.metric_label', { metric: data.metricLabel })}
        keys={data.tokenKeys}
        data={data.tokenStackedData}
        tickFormatter={data.formatStackedTick}
        tooltipContent={data.stackedTooltip}
      />
    </ResponsivePageContainer>
  )
}

export default DashboardPage
