// components/requests/HistoryLog.tsx
import { History, ArrowRight } from 'lucide-react';
import { REQUEST_STATUSES, RequestStatusType } from '@/config/status';
import { HistoryEntry } from '@/types/index';

function formatDate(dateString?: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const config = REQUEST_STATUSES[status as RequestStatusType];
  const color = config?.color ?? '#95A5A6';
  const bgColor = config?.bgColor ?? '#F2F3F4';
  const label = config?.label ?? status;

  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ color, backgroundColor: bgColor }}
    >
      {label}
    </span>
  );
}

export default function HistoryLog({ history }: { history?: HistoryEntry[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
          <History className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No history yet</p>
      </div>
    );
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      {sorted.map((entry, index) => (
        <div key={index} className="relative pl-6">
          {/* Timeline dot */}
          <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-muted border-2 border-primary/40" />
          {/* Timeline line */}
          {index < sorted.length - 1 && (
            <div className="absolute left-[4px] top-4 w-0.5 h-full bg-border/50" />
          )}
          <div className="pb-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-medium text-foreground">{entry.action}</span>
              {entry.from_status && entry.to_status && (
                <span className="inline-flex items-center gap-1">
                  <StatusBadge status={entry.from_status} />
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <StatusBadge status={entry.to_status} />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{entry.user || 'System'}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
