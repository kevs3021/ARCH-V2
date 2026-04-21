import NewRequestButton from '@/components/NewRequestButton';
import RequestRow from '@/components/RequestRow';
import { getRequestStatusVisual } from '@/config/requestStatusVisuals';
import { getCurrentUserFromCookie } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Layers3,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ComponentType } from 'react';

export const dynamic = 'force-dynamic';

type RequestRecord = {
  amount: number | null;
  created_at: string;
  date_needed: string | null;
  request_id: string;
  request_title: string | null;
  status: string | null;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString?: string | null) {
  if (!dateString) {
    return 'No schedule';
  }

  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isClosedStatus(status?: string | null) {
  const normalized = (status ?? '').toUpperCase();
  return ['CANCELLED', 'CLOSED', 'REJECTED'].includes(normalized);
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'primary' | 'blue';
}) {
  return (
    <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            tone === 'blue' ? 'bg-accent2/10 text-accent2' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <p className="section-label">{label}</p>
      </div>
      <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default async function AdvancesRequestsPage() {
  const supabase = await createClient();

  const user = await getCurrentUserFromCookie();
  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('other_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requests:', error);
  }

  const requests = (data ?? []) as RequestRecord[];
  const totalAmount = requests.reduce((sum, request) => sum + (request.amount ?? 0), 0);
  const activeRequests = requests.filter((request) => !isClosedStatus(request.status)).length;
  const dueSoonRequests = requests.filter((request) => {
    if (!request.date_needed || isClosedStatus(request.status)) {
      return false;
    }

    const dateNeeded = new Date(request.date_needed).getTime();
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    return dateNeeded >= now && dateNeeded <= sevenDaysFromNow;
  }).length;

  const statusBreakdown = Object.entries(
    requests.reduce<Record<string, number>>((acc, request) => {
      const label = getRequestStatusVisual(request.status ?? 'Unknown').label;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const latestRequest = requests[0] ?? null;
  const latestStatusVisual = latestRequest
    ? getRequestStatusVisual(latestRequest.status ?? 'Unknown')
    : null;

  return (
    <div className="relative z-10 min-h-screen pb-24 pt-8 pl-0 pr-44 lg:pl-4 lg:pr-48 xl:pr-52">
      <div className="mx-auto max-w-[1525px] px-10 xl:px-16">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="glass-card overflow-hidden !p-0">
            <div className="border-b border-white/40 px-6 py-6 lg:px-8 lg:py-7">
              <div className="flex flex-col gap-6">
                <div className="space-y-3">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/50 bg-white/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Advance Workflow
                  </span>
                  <div className="space-y-2">
                    <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground lg:text-[2.15rem]">
                      Advances Requests
                    </h1>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground lg:text-base">
                      Track submissions, keep an eye on upcoming due dates, and move through the
                      workflow from one place with cleaner visibility across the whole request list.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <SummaryStat
                    icon={Layers3}
                    label="Total Requests"
                    value={requests.length.toString()}
                  />
                  <SummaryStat
                    icon={CalendarClock}
                    label="Due In 7 Days"
                    value={dueSoonRequests.toString()}
                    tone="blue"
                  />
                  <SummaryStat
                    icon={CircleDollarSign}
                    label="Requested Amount"
                    value={formatCurrency(totalAmount)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-b border-white/35 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div>
                <p className="section-label mb-1">Request Registry</p>
                <p className="text-sm text-muted-foreground">
                  {activeRequests} active workflow{activeRequests === 1 ? '' : 's'} across the
                  current queue.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-white/45 bg-white/50 px-3 py-1.5">
                  Sorted by latest activity
                </span>
                <span className="rounded-full border border-white/45 bg-white/50 px-3 py-1.5">
                  Scrollable on smaller screens
                </span>
              </div>
            </div>

            {requests.length > 0 ? (
              <>
                <div className="divide-y divide-white/35 md:hidden">
                  {requests.map((request) => {
                    const statusVisual = getRequestStatusVisual(request.status ?? 'Unknown');

                    return (
                      <Link
                        key={request.request_id}
                        href={`/others/advances-requests/${request.request_id}`}
                        className="block px-6 py-4 transition-colors hover:bg-white/35"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {request.request_title || 'Untitled Request'}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              {request.request_id}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl bg-white/45 p-3">
                            <p className="section-label mb-1">Amount</p>
                            <p className="font-medium text-foreground">
                              {request.amount != null ? formatCurrency(request.amount) : 'Not set'}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white/45 p-3">
                            <p className="section-label mb-1">Date Needed</p>
                            <p className="font-medium text-foreground">
                              {formatDate(request.date_needed)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{
                              color: statusVisual.color,
                              backgroundColor: statusVisual.bgColor,
                            }}
                          >
                            {statusVisual.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Created {formatDate(request.created_at)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-sm text-muted-foreground">
                    <thead className="bg-white/35 text-[11px] uppercase tracking-[0.14em] text-foreground/65">
                      <tr>
                        <th className="px-6 py-4 font-semibold lg:px-8">Request</th>
                        <th className="px-6 py-4 text-right font-semibold">Amount</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 text-right font-semibold">Date Needed</th>
                        <th className="px-6 py-4 text-right font-semibold lg:px-8">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <RequestRow key={request.request_id} request={request} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="px-6 py-20 text-center lg:px-8">
                <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileText className="h-7 w-7" />
                  </div>
                  <p className="font-medium text-foreground">No requests found</p>
                  <p className="mt-2 text-sm leading-6">
                    Create your first advance request to start building the workflow queue.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-6 xl:sticky xl:top-8 xl:pr-10">
            <div className="card card-ambient-primary">
              <p className="section-label mb-2">Quick Action</p>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Start a new request
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use the guided form to open a fresh advance request without leaving this workspace.
              </p>
              <div className="mt-5">
                <NewRequestButton />
              </div>
            </div>

            <div className="card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="section-label mb-2">Status Overview</p>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Queue composition
                  </h2>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {requests.length}
                </span>
              </div>

              {statusBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {statusBreakdown.map(([label, count]) => {
                    const percentage =
                      requests.length > 0 ? Math.round((count / requests.length) * 100) : 0;

                    return (
                      <div key={label} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-foreground">{label}</span>
                          <span className="text-muted-foreground">{count} total, {percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/50">
                          <div
                            className="hero-gradient h-2 rounded-full"
                            style={{ width: `${Math.max(percentage, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Status insights will appear once requests exist.</p>
              )}
            </div>

            <div className="card">
              <p className="section-label mb-2">Latest Activity</p>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Most recent request
              </h2>

              {latestRequest ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {latestRequest.request_title || 'Untitled Request'}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {latestRequest.request_id}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Status</span>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{
                            color: latestStatusVisual?.color,
                            backgroundColor: latestStatusVisual?.bgColor,
                          }}
                        >
                          {latestStatusVisual?.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium text-foreground">
                          {latestRequest.amount != null
                            ? formatCurrency(latestRequest.amount)
                            : 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Date needed</span>
                        <span className="font-medium text-foreground">
                          {formatDate(latestRequest.date_needed)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">
                    Created on {formatDate(latestRequest.created_at)} and ready for follow-through
                    from the request list.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  The newest request summary will show up here once a request is created.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
