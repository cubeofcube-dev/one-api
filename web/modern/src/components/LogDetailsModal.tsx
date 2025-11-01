import { useMemo, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { formatTimestamp, renderQuota } from '@/lib/utils'
import { getLogTypeLabel } from '@/lib/constants/logs'
import type { LogEntry, LogMetadata } from '@/types/log'
import { Copy, FileText, Hash } from 'lucide-react'

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

const DetailItem = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="space-y-1">
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
    <div className="text-sm break-words leading-relaxed">{value}</div>
  </div>
)

// LogDetailsModal renders a scrollable dialog containing the full details of a log entry, including metadata and content.
export function LogDetailsModal({ open, onOpenChange, log }: LogDetailsModalProps) {
  const metadataJSON = useMemo(() => (log?.metadata ? JSON.stringify(log.metadata, null, 2) : null), [log])
  const cacheWriteSummary = useMemo(() => getCacheWriteSummaries(log?.metadata), [log])

  const handleCopy = async (value?: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch (error) {
      console.error('Failed to copy value to clipboard:', error)
    }
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

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailItem label="Model" value={log.model_name || '—'} />
        <DetailItem label="User" value={log.username || '—'} />
        <DetailItem label="Token" value={log.token_name || '—'} />
        <DetailItem label="Channel" value={typeof log.channel === 'number' ? log.channel : '—'} />
        <DetailItem label="Quota" value={renderQuota(log.quota)} />
        <DetailItem label="Prompt Tokens" value={log.prompt_tokens ?? 0} />
        <DetailItem label="Completion Tokens" value={log.completion_tokens ?? 0} />
        <DetailItem label="Cached Prompt Tokens" value={log.cached_prompt_tokens ?? 0} />
        <DetailItem label="Cached Completion Tokens" value={log.cached_completion_tokens ?? 0} />
        <DetailItem label="Cache Write 5m Tokens" value={cacheWriteSummary.fiveMinute} />
        <DetailItem label="Cache Write 1h Tokens" value={cacheWriteSummary.oneHour} />
        <DetailItem label="Latency" value={log.elapsed_time ? `${log.elapsed_time}ms` : '—'} />
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
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
