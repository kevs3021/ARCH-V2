'use client';

import { memo } from 'react';
import { getRequestStatusVisual } from '@/config/requestStatusVisuals';
import { useRouter } from 'next/navigation';

type RequestRowProps = {
  request: {
    amount?: number | null;
    created_at: string;
    date_needed?: string | null;
    request_id: string;
    request_title?: string | null;
    status?: string | null;
  };
};

function formatAmount(amount?: number | null) {
  if (amount == null) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString?: string | null) {
  if (!dateString) {
    return 'N/A';
  }

  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const RequestRowComponent = ({ request }: RequestRowProps) => {
  const router = useRouter();
  const statusVisual = getRequestStatusVisual(request.status ?? 'Unknown');

  return (
    <tr
      className="group cursor-pointer border-t border-white/35 transition-colors hover:bg-white/35"
      onClick={() => router.push(`/others/advances-requests/${request.request_id}`)}
    >
      <td className="px-6 py-4 lg:px-8">
        <div className="min-w-[220px]">
          <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {request.request_title || 'Untitled Request'}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {request.request_id}
          </p>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="whitespace-nowrap text-sm font-semibold text-foreground">
          {formatAmount(request.amount)}
        </span>
      </td>
      <td className="px-6 py-4">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
          style={{ color: statusVisual.color, backgroundColor: statusVisual.bgColor }}
        >
          {statusVisual.label}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="whitespace-nowrap text-sm text-foreground/80">
          {formatDate(request.date_needed)}
        </span>
      </td>
      <td className="px-6 py-4 text-right lg:px-8">
        <span className="whitespace-nowrap text-sm text-foreground/80">
          {formatDate(request.created_at)}
        </span>
      </td>
    </tr>
  );
};

export default memo(RequestRowComponent);
