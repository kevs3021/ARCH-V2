'use client';

import { useState, useEffect } from 'react';
import { Building2, Globe, Megaphone, Calendar, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';

function formatDate(dateString?: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdditionalDetailsCard({ request }: { request: any }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setExpanded(true);
    }
  }, []);

  return (
    <aside className="glass-card overflow-hidden !p-0 w-full lg:w-64 flex-shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border-b border-white/40 px-4 py-3"
      >
        <p className="section-label">Additional Details</p>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Company</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{request.company || '—'}</p>

          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Branch</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{request.branch || '—'}</p>

          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Campaign</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{request.campaign || '—'}</p>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Created</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{formatDate(request.created_at)}</p>

          {request.remarks && (
            <>
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Remarks</span>
              </div>
              <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{request.remarks}</p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}