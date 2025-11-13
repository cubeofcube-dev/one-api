import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatTimestamp, renderQuota } from '@/lib/utils'
import { LOG_TYPES, getLogTypeLabel } from '@/lib/constants/logs'
import type { LogEntry, LogMetadata } from '@/types/log'
import { useAuthStore } from '@/lib/stores/auth'
import { api } from '@/lib/api'
import {
  Activity,
  ArrowRight,
  CheckCircle,
  Clock,
  Copy,
  FileText,
  Flag,
  Globe,
  Hash,
  Play,
  Reply,
  Send,
  User,
  Zap
} from 'lucide-react'

interface LogDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: LogEntry | null
}

const getCacheWriteSummaries = (metadata?: LogMetadata) => {
  const details = metadata?.cache_write_tokens
  if (!details) {
    return { fiveMinute: 0, oneHour: 0 }
  }

  const safeNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0)

  return {
    fiveMinute: safeNumber(details.ephemeral_5m),
    oneHour: safeNumber(details.ephemeral_1h)
  }
}

const formatLatency = (ms?: number) => {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const getLatencyColor = (ms?: number) => {
  if (!ms) return ''
  if (ms < 1000) return 'text-green-600'
  if (ms < 3000) return 'text-yellow-600'
  return 'text-red-600'
}

const DetailItem = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="space-y-1">
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
    <div className="text-sm break-words leading-relaxed">{value}</div>
  </div>
)

interface TraceTimestamps {
  request_received?: number
  request_forwarded?: number
  first_upstream_response?: number
  first_client_response?: number
  upstream_completed?: number
  request_completed?: number
}

interface TraceDurations {
  processing_time?: number
  upstream_response_time?: number
  response_processing_time?: number
  streaming_time?: number
  total_time?: number
}

interface TraceData {
  id: number
  trace_id: string
  url: string
  method: string
  body_size: number
  status: number
  created_at: number
  updated_at: number
  timestamps: TraceTimestamps
  durations?: TraceDurations
  log?: {
    id: number
    user_id: number
    username: string
    content: string
    type: number
  }
}

const formatDuration = (milliseconds?: number): string => {
  if (!milliseconds) return 'N/A'
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  }
  return `${(milliseconds / 1000).toFixed(2)}s`
}

const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'bg-green-500 text-white'
  if (status >= 300 && status < 400) return 'bg-yellow-500 text-white'
  if (status >= 400 && status < 500) return 'bg-orange-500 text-white'
  if (status >= 500) return 'bg-red-500 text-white'
  return 'bg-gray-500 text-white'
}

const getMethodColor = (method: string): string => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-blue-500 text-white'
    case 'POST':
      return 'bg-green-500 text-white'
    case 'PUT':
      return 'bg-yellow-500 text-white'
    case 'DELETE':
      return 'bg-red-500 text-white'
    case 'PATCH':
      return 'bg-purple-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

const timelineEvents = [
  {
    key: 'request_received' as keyof TraceTimestamps,
    title: 'Request Received',
    icon: Play,
    color: 'text-blue-500',
    description: 'Initial request received by the gateway'
  },
  {
    key: 'request_forwarded' as keyof TraceTimestamps,
    title: 'Forwarded to Upstream',
    icon: ArrowRight,
    color: 'text-teal-500',
    description: 'Request forwarded to upstream service'
  },
  {
    key: 'first_upstream_response' as keyof TraceTimestamps,
    title: 'First Upstream Response',
    icon: Reply,
    color: 'text-purple-500',
    description: 'First response received from upstream'
  },
  {
    key: 'first_client_response' as keyof TraceTimestamps,
    title: 'First Client Response',
    icon: Send,
    color: 'text-orange-500',
    description: 'First response sent to client'
  },
  {
    key: 'upstream_completed' as keyof TraceTimestamps,
    title: 'Upstream Completed',
    icon: CheckCircle,
    color: 'text-green-500',
    description: 'Upstream response completed (streaming)'
  },
  {
    key: 'request_completed' as keyof TraceTimestamps,
    title: 'Request Completed',
    icon: Flag,
    color: 'text-green-600',
    description: 'Request fully completed'
  }
]

// LogDetailsModal renders a scrollable dialog containing the full details of a log entry, including metadata and content.
export function LogDetailsModal({ open, onOpenChange, log }: LogDetailsModalProps) {
  const { user } = useAuthStore()
  const metadataJSON = useMemo(() => (log?.metadata ? JSON.stringify(log.metadata, null, 2) : null), [log])
  const cacheWriteSummary = useMemo(() => getCacheWriteSummaries(log?.metadata), [log])
  const [traceData, setTraceData] = useState<TraceData | null>(null)
  const [traceLoading, setTraceLoading] = useState(false)
  const [traceError, setTraceError] = useState<string | null>(null)
  const [traceCopied, setTraceCopied] = useState(false)
  const hasTrace = Boolean(
    log &&
    log.trace_id &&
    log.trace_id.trim() !== '' &&
    typeof log.id === 'number' &&
    log.type === LOG_TYPES.CONSUME
  )

  useEffect(() => {
    let active = true
    const loadTrace = async () => {
      if (!open || !hasTrace || !log) {
        if (active) {
          setTraceData(null)
          setTraceError(null)
          setTraceLoading(false)
        }
        return
      }

      setTraceLoading(true)
      setTraceError(null)
      try {
        const response = await api.get(`/api/trace/log/${log.id}`)
        if (!active) {
          return
        }
        if (response.data?.success) {
          setTraceData(response.data.data as TraceData)
        } else {
          setTraceData(null)
          setTraceError(response.data?.message || 'Failed to load trace information.')
        }
      } catch (error: any) {
        if (!active) {
          return
        }
        setTraceData(null)
        setTraceError(error?.response?.data?.message || 'Failed to load trace information.')
      } finally {
        if (active) {
          setTraceLoading(false)
        }
      }
    }

    loadTrace()

    return () => {
      active = false
    }
  }, [open, hasTrace, log])

  const handleCopy = async (value?: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch (error) {
      console.error('Failed to copy value to clipboard:', error)
    }
  }

  const handleTraceCopy = async (value?: string) => {
    if (!value) {
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      setTraceCopied(true)
      setTimeout(() => setTraceCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy trace ID:', error)
    }
  }

  useEffect(() => {
    if (!open) {
      setTraceCopied(false)
    }
  }, [open])

  const renderTraceSummary = (trace: TraceData) => (
    <div className="rounded border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        <Globe className="h-4 w-4" />
        Request Information
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            URL
          </div>
          <div className="font-mono text-sm bg-background p-2 rounded border break-all">
            {trace.url || 'N/A'}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Method & Status
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getMethodColor(trace.method)}>{trace.method || 'N/A'}</Badge>
            <Badge className={getStatusColor(trace.status)}>{trace.status || 'N/A'}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Request Size
          </div>
          <div className="text-sm">{trace.body_size ? `${trace.body_size} bytes` : 'N/A'}</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            User
          </div>
          <div className="text-sm">{trace.log?.username || log?.username || user?.username || 'N/A'}</div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="h-4 w-4" />
            Trace ID
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  className="font-mono text-xs bg-background border rounded px-2 py-2 break-all cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleTraceCopy(trace.trace_id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleTraceCopy(trace.trace_id)
                    }
                  }}
                >
                  {trace.trace_id || 'N/A'}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>{traceCopied ? 'Copied!' : 'Click to copy trace ID'}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )

  const renderTimeline = (trace: TraceData) => {
    if (!trace.timestamps) {
      return <p className="text-sm text-muted-foreground">Timeline data is not available for this trace.</p>
    }

    const { timestamps, durations } = trace
    const activeEvents = timelineEvents.filter(event => timestamps[event.key])

    if (activeEvents.length === 0) {
      return <p className="text-sm text-muted-foreground">Timeline data is not available for this trace.</p>
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Clock className="h-4 w-4" />
          Request Timeline
        </div>
        <div className="space-y-4">
          {activeEvents.map((event, index) => {
            const timestamp = timestamps[event.key]
            const Icon = event.icon
            const isLast = index === activeEvents.length - 1

            let duration: number | undefined
            if (event.key === 'request_forwarded') duration = durations?.processing_time
            else if (event.key === 'first_upstream_response') duration = durations?.upstream_response_time
            else if (event.key === 'first_client_response') duration = durations?.response_processing_time
            else if (event.key === 'upstream_completed') duration = durations?.streaming_time

            return (
              <div key={event.key} className="relative pl-10">
                <div className="absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-border bg-background">
                  <Icon className={cn('h-4 w-4', event.color)} />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium">{event.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {timestamp ? formatTimestamp(Math.floor(timestamp / 1000)) : 'N/A'}
                    </span>
                    {duration && (
                      <Badge variant="outline" className="text-xs">
                        +{formatDuration(duration)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
                {!isLast && <div className="absolute left-3.5 top-8 h-6 w-px bg-border" />}
              </div>
            )
          })}
        </div>

        {durations?.total_time && (
          <div className="flex items-center gap-2 border rounded-lg bg-primary/5 border-primary/20 px-4 py-3">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Total Request Time:</span>
            <Badge variant="default">{formatDuration(durations.total_time)}</Badge>
          </div>
        )}
      </div>
    )
  }

  const renderIdentifier = (value?: string) => (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs bg-muted rounded px-2 py-1 break-all flex-1">
        {value || '—'}
      </span>
      {value && (
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(value)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )

  const renderSummary = () => {
    if (!log) return null

    const username = log.username || user?.username || '—'
    const channelDisplay = log.channel ?? '—'
    const promptTokens = log.prompt_tokens ?? 0
    const cachedPromptTokens = log.cached_prompt_tokens ?? 0
    const completionTokens = log.completion_tokens ?? 0
    const cachedCompletionTokens = log.cached_completion_tokens ?? 0
    const totalTokens = promptTokens + completionTokens
    const totalCachedTokens = cachedPromptTokens + cachedCompletionTokens
    const quotaDisplay = renderQuota(log.quota ?? 0)
    const rawQuota = Number.isFinite(log.quota) ? log.quota : 0
    const latencyValue = formatLatency(log.elapsed_time)
    const latencyColor = getLatencyColor(log.elapsed_time)
    const logTypeLabel = getLogTypeLabel(log.type)
    const createdAtDisplay = formatTimestamp(log.created_at)

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem label="Log ID" value={<span className="font-mono text-sm">{log.id}</span>} />
          <DetailItem label="Type" value={<Badge variant="outline">{logTypeLabel}</Badge>} />
          <DetailItem label="Recorded At" value={<span className="font-mono text-sm">{createdAtDisplay}</span>} />
          <DetailItem label="Model" value={log.model_name || '—'} />
          <DetailItem label="User" value={username} />
          <DetailItem label="Token" value={log.token_name || '—'} />
          <DetailItem label="Channel" value={<span className="font-mono text-sm">{channelDisplay}</span>} />
          <DetailItem label="Quota" value={<span className="font-mono text-sm">{quotaDisplay}</span>} />
          <DetailItem label="Quota (raw units)" value={<span className="font-mono text-sm">{rawQuota}</span>} />
          <DetailItem
            label="Latency"
            value={<span className={cn('font-mono text-sm', latencyColor)}>{latencyValue}</span>}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem
            label="Prompt Tokens (input)"
            value={<span className="font-mono text-sm">{promptTokens}</span>}
          />
          <DetailItem
            label="Prompt Tokens (cached)"
            value={<span className="font-mono text-sm">{cachedPromptTokens}</span>}
          />
          <DetailItem
            label="Completion Tokens (output)"
            value={<span className="font-mono text-sm">{completionTokens}</span>}
          />
          <DetailItem
            label="Completion Tokens (cached)"
            value={<span className="font-mono text-sm">{cachedCompletionTokens}</span>}
          />
          <DetailItem
            label="Cache Write 5m Tokens"
            value={<span className="font-mono text-sm">{cacheWriteSummary.fiveMinute}</span>}
          />
          <DetailItem
            label="Cache Write 1h Tokens"
            value={<span className="font-mono text-sm">{cacheWriteSummary.oneHour}</span>}
          />
          <DetailItem
            label="Total Tokens"
            value={<span className="font-mono text-sm">{totalTokens}</span>}
          />
          <DetailItem
            label="Total Cached Tokens"
            value={<span className="font-mono text-sm">{totalCachedTokens}</span>}
          />
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log Entry Details
            {log && (
              <Badge variant="secondary" className="ml-2">
                {getLogTypeLabel(log.type)}
              </Badge>
            )}
          </DialogTitle>
          {log && (
            <DialogDescription className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4" />
              Recorded at {formatTimestamp(log.created_at)}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-2">
          <div className="space-y-6">
            {!log && <p className="text-sm text-muted-foreground">Select a log entry to view full details.</p>}

            {log && (
              <>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Summary</h3>
                  {renderSummary()}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identifiers</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request ID</span>
                      {renderIdentifier(log.request_id)}
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trace ID</span>
                      {renderIdentifier(log.trace_id)}
                    </div>
                  </div>
                </section>

                {(log.is_stream || log.system_prompt_reset) && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Flags</h3>
                    <div className="flex gap-2 flex-wrap">
                      {log.is_stream && <Badge variant="secondary">Stream</Badge>}
                      {log.system_prompt_reset && <Badge variant="destructive">System Reset</Badge>}
                    </div>
                  </section>
                )}

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Content</h3>
                  <div className="rounded border bg-muted/40 p-3">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                      {log.content || 'No content recorded.'}
                    </pre>
                  </div>
                </section>

                {metadataJSON && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Metadata</h3>
                    <div className="rounded border bg-muted/40 p-3">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed">{metadataJSON}</pre>
                    </div>
                  </section>
                )}

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tracing</h3>
                  {!hasTrace && (
                    <p className="text-sm text-muted-foreground">Tracing data is not available for this log entry.</p>
                  )}

                  {hasTrace && traceLoading && (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  )}

                  {hasTrace && !traceLoading && traceError && (
                    <Alert variant="destructive">
                      <AlertDescription>{traceError}</AlertDescription>
                    </Alert>
                  )}

                  {hasTrace && !traceLoading && traceData && (
                    <div className="space-y-6">
                      {renderTraceSummary(traceData)}
                      <Separator />
                      {renderTimeline(traceData)}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
