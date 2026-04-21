import RequestDetailClient from '@/components/RequestDetailClient';
import AdditionalDetailsCard from '@/components/AdditionalDetailsCard';
import { getRequestStatusVisual } from '@/config/requestStatusVisuals';
import { getCurrentUserFromCookie } from '@/lib/auth';
import { getRequestDataBundle } from '@/lib/data/requests';
import { createClient } from '@/lib/supabase/server';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CircleDollarSign,
  FileText,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type EffectiveRole = 'requestor' | 'approver' | 'accounting' | 'admin';

const REQUEST_BRANCH = 'advances';

async function getEffectiveRole(userId: string, isAdmin: boolean, supabase: Awaited<ReturnType<typeof createClient>>): Promise<EffectiveRole> {
  if (isAdmin) return 'admin';
  
  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('request_role, request_branch')
    .eq('user_id', userId);
  
  const roleSet = new Set(
    permissions?.filter(p => p.request_branch?.toLowerCase() === REQUEST_BRANCH).map(p => p.request_role) || []
  );
  
  if (roleSet.has('accounting')) return 'accounting';
  if (roleSet.has('approver')) return 'approver';
  if (roleSet.has('requestor')) return 'requestor';
  
  return 'requestor';
}

function formatCurrency(amount?: number | null, currency = 'PHP') {
  if (amount == null) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
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

export default async function RequestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUserFromCookie();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();
  
  const [requestData, effectiveRole] = await Promise.all([
    getRequestDataBundle(id, user.userId, user.isAdmin, supabase),
    getEffectiveRole(user.userId, user.isAdmin, supabase),
  ]);

  if (!requestData.requestData) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-card relative z-10 max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
            Request not found
          </h2>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">
            The request you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/others/advances-requests" className="btn-primary text-sm">
            Back to Requests
          </Link>
        </div>
      </div>
    );
  }

  const statusVisual = getRequestStatusVisual(requestData.requestData.status || '');
  const requestorName = requestData.requestData.requestor
    ? `${requestData.requestData.requestor.first_name} ${requestData.requestData.requestor.last_name}`
    : null;
  const subtitleParts = [
    requestData.requestData.request_id,
    requestorName ? `| ${requestorName}` : null,
  ].filter(Boolean);

  const breakdownsSummary = {
    hasApprovedOrRejected: requestData.breakdowns.some(
      (b: any) => b.status === 'Approved' || b.status === 'Rejected'
    ),
  };

  const totalBreakdownAmount = requestData.breakdowns.reduce(
    (sum: number, b: any) => sum + (b.amount ?? 0),
    0
  );

  const displayAmount = totalBreakdownAmount > 0 ? totalBreakdownAmount : requestData.requestData.amount;

  return (
    <div className="relative z-10 min-h-screen pb-27 pt-8 pl-0 lg:pl-4 -mr-4 lg:-mr-8">
      <div className="mx-auto max-w-[1525px] px-6">
        <div className="space-y-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <section className="glass-card overflow-hidden !p-0 flex-1">
              <div className="border-b border-white/40 px-6 py-5 lg:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <Link
                      href="/others/advances-requests"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/55 text-muted-foreground transition-colors hover:bg-white/75 hover:text-foreground"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Link>

                    <div className="min-w-0 space-y-3">
                      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/50 bg-white/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <FileText className="h-3.5 w-3.5" />
                        Request Detail
                      </span>

                      <div className="space-y-2">
                        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground lg:text-[2rem]">
                          {requestData.requestData.request_title || 'Untitled Request'}
                        </h1>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {subtitleParts.join(' / ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                      style={{ color: statusVisual.color, backgroundColor: statusVisual.bgColor }}
                    >
                      {statusVisual.label}
                    </span>
                    <span className="rounded-full border border-white/45 bg-white/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      Created {formatDate(requestData.requestData.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 lg:px-8">
                <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CircleDollarSign className="h-5 w-5" />
                    </div>
                    <p className="section-label">Requested Amount</p>
                  </div>
                  <p className="font-display text-2xl font-semibold text-foreground">
                    {formatCurrency(displayAmount, requestData.requestData.currency)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent2/10 text-accent2">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <p className="section-label">Date Needed</p>
                  </div>
                  <p className="font-display text-xl font-semibold text-foreground">
                    {formatDate(requestData.requestData.date_needed)}
                  </p>
                </div>
              </div>
            </section>

            <aside className="w-full lg:w-64 flex-shrink-0">
              <AdditionalDetailsCard request={requestData.requestData} />
            </aside>
          </div>

          <main className="flex gap-6">
            <div className="w-full">
              <RequestDetailClient
                userRole={effectiveRole}
                requestId={id}
                requestStatus={requestData.requestData.status || 'open'}
                requestData={requestData.requestData}
                breakdownsSummary={breakdownsSummary}
                requestedAmount={requestData.requestData.amount ?? null}
                breakdowns={requestData.breakdowns}
                liquidations={requestData.liquidations}
                currentUserId={user.userId}
                messageTrail={requestData.requestData.message_trail || []}
                history={requestData.requestData.history || []}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
