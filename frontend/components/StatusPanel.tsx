'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronUp } from 'lucide-react';
import { REQUEST_STATUSES, RequestStatusType } from '@/config/status';
import { getPermittedTransitions, EffectiveRole, BreakdownsSummary } from '@/lib/requestDetailUtils';
import type { AuthNotification } from '@/lib/authNotifications';
import NotificationStack from '@/components/NotificationStack';

interface StatusPanelProps {
  requestId: string;
  currentStatus: RequestStatusType;
  effectiveRole: EffectiveRole;
  breakdownsSummary: BreakdownsSummary;
}

const TERMINAL_STATUSES: RequestStatusType[] = ['cancelled', 'closed'];

function normalizeStatus(status: string): RequestStatusType {
  return status.toLowerCase() as RequestStatusType;
}

export default function StatusPanel({
  requestId,
  currentStatus: rawStatus,
  effectiveRole,
  breakdownsSummary,
}: StatusPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<AuthNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const pushToast = useCallback((notification: Omit<AuthNotification, 'id'>) => {
    const id = crypto.randomUUID();
    const next: AuthNotification = { ...notification, id };
    setNotifications((current) => [...current, next]);
    const timer = setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
      toastTimersRef.current.delete(id);
    }, 5000);
    toastTimersRef.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

  const currentStatus = normalizeStatus(rawStatus as string);
  const statusConfig = REQUEST_STATUSES[currentStatus] ?? {
    label: (rawStatus as string) ?? 'Unknown',
    color: '#95A5A6',
    bgColor: '#F2F3F4',
  };
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus);
  const transitions = isTerminal
    ? []
    : getPermittedTransitions(effectiveRole, currentStatus, breakdownsSummary);

  console.log('[StatusPanel] effectiveRole:', effectiveRole, 'currentStatus:', currentStatus, 'transitions:', transitions);

  const [primaryTransition, ...alternateTransitions] = transitions;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTransition = useCallback(async (toStatus: RequestStatusType) => {
    setDropdownOpen(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        pushToast({
          tone: 'error',
          title: 'Action Failed',
          message: data.error ?? `Request failed (${res.status})`,
        });
        return;
      }

      window.dispatchEvent(new CustomEvent('requestStatusChanged', { detail: { requestId, toStatus } }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      router.refresh();
    } catch {
      pushToast({
        tone: 'error',
        title: 'Network Error',
        message: 'Unable to connect. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [requestId, router, pushToast]);

  const primaryConfig = primaryTransition ? REQUEST_STATUSES[primaryTransition as RequestStatusType] : null;

  return (
    <div className="relative">
      <NotificationStack notifications={notifications} onDismiss={dismissToast} />
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 bg-background/80 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <div ref={dropdownRef} className="relative">
              {primaryTransition ? (
                <div
                  role="button"
                  onClick={() => handleTransition(primaryTransition as RequestStatusType)}
                  className="btn-primary h-10 px-4 flex items-center gap-3 text-sm font-medium disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span className="truncate">Submit as {primaryConfig?.label ?? primaryTransition}</span>
                  
                  {alternateTransitions.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen((v) => !v);
                      }}
                      disabled={loading}
                      className="p-1 hover:bg-white/20 rounded"
                      aria-label="More options"
                    >
                      <ChevronUp
                        className={`w-4 h-4 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>
              ) : (
                <div className="btn-primary h-10 px-4 flex items-center gap-3 text-sm font-medium opacity-60 cursor-not-allowed">
                  <span className="truncate">No actions available</span>
                </div>
              )}

              {dropdownOpen && alternateTransitions.length > 0 && primaryTransition && (
                <div className="absolute bottom-full right-0 mb-2 glass-card !p-1 min-w-[180px] flex flex-col gap-0.5">
                  {alternateTransitions.map((toStatus) => {
                    const cfg = REQUEST_STATUSES[toStatus as RequestStatusType];
                    return (
                      <button
                        key={toStatus}
                        onClick={() => handleTransition(toStatus as RequestStatusType)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-white/10 transition-colors w-full"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg?.color ?? '#95A5A6' }}
                        />
                        {cfg?.label ?? toStatus}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}