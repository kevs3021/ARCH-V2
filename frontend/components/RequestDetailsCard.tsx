// components/requests/RequestDetailsCard.tsx
'use client';

import { useState, useEffect, type ComponentType, type ReactNode } from 'react';
import { Calendar, Building2, Globe, Megaphone, Wallet, StickyNote, User, ChevronDown, ChevronUp } from 'lucide-react';

function formatDate(dateString?: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatAmount(amount?: number, currency?: string) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function DetailItem({ icon: Icon, label, children }: { icon: ComponentType<{ className?: string }>; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="section-label mb-0.5">{label}</p>
        <div className="text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function RequestDetailsCard({ request }: { request: any }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setExpanded(true);
    }
  }, []);

  return (
    <div className="card card-ambient-primary">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">Additional Details</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Always visible */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <DetailItem icon={Building2} label="Company">
          {request.company || '—'}
        </DetailItem>

        <DetailItem icon={Globe} label="Branch">
          {request.branch || '—'}
        </DetailItem>

        <DetailItem icon={Megaphone} label="Campaign">
          {request.campaign || '—'}
        </DetailItem>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="mt-6 pt-6 space-y-6 border-t border-border/30">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DetailItem icon={Calendar} label="Created">
              {formatDate(request.created_at)}
            </DetailItem>
          </div>

          {request.remarks && (
            <DetailItem icon={StickyNote} label="Remarks">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{request.remarks}</p>
            </DetailItem>
          )}
        </div>
      )}
    </div>
  );
}
