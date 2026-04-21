'use client';

import { useEffect, useState } from 'react';
import BreakdownsList from '@/components/BreakdownsList';
import DocumentsTab from '@/components/DocumentsTab';
import HistoryLog from '@/components/HistoryLog';
import LiquidationsList from '@/components/LiquidationsList';
import MessageTrail from '@/components/MessageTrail';
import Sidebar from '@/components/Sidebar';
import StatusPanel from '@/components/StatusPanel';
import { RequestStatusType } from '@/config/status';
import { EffectiveRole } from '@/lib/requestDetailUtils';

type SimulatedRole = 'requestor' | 'approver' | 'accounting' | null;

interface RequestDetailClientProps {
  userRole: string;
  requestId: string;
  requestStatus: string;
  requestData: any;
  breakdownsSummary: { hasApprovedOrRejected: boolean };
  requestedAmount: number | null;
  breakdowns: any[];
  liquidations: any[];
  currentUserId: string;
  messageTrail: any[];
  history: any[];
}

interface WindowWithSimulatedRole extends Window {
  __SIMULATED_ROLE__?: Exclude<SimulatedRole, null>;
}

export default function RequestDetailClient({
  userRole,
  requestId,
  requestStatus,
  requestData,
  breakdownsSummary,
  requestedAmount,
  breakdowns,
  liquidations,
  currentUserId,
  messageTrail,
  history,
}: RequestDetailClientProps) {
  const getSimulatedRole = (): SimulatedRole => {
    if (typeof window === 'undefined') return null;
    const windowRole = (window as WindowWithSimulatedRole).__SIMULATED_ROLE__;
    if (windowRole === 'requestor' || windowRole === 'approver' || windowRole === 'accounting') {
      return windowRole;
    }
    const storedRole = window.localStorage.getItem('__SIMULATED_ROLE__');
    if (storedRole === 'requestor' || storedRole === 'approver' || storedRole === 'accounting') {
      return storedRole;
    }
    return null;
  };

  const [simulatedRole, setSimulatedRole] = useState<SimulatedRole>(() => getSimulatedRole());

  useEffect(() => {
    const handleSimulatedRoleChange = () => {
      setSimulatedRole(getSimulatedRole());
    };

    window.addEventListener('simulatedRoleChange', handleSimulatedRoleChange);
    
    return () => {
      window.removeEventListener('simulatedRoleChange', handleSimulatedRoleChange);
    };
  }, []);

  // Also sync on mount and when navigating back to this page
  useEffect(() => {
    setSimulatedRole(getSimulatedRole());
  }, [requestId]);

  // Map userRole from database role (admin, requestor, approver, accounting) to EffectiveRole
  const dbRole = (userRole as EffectiveRole);
  
  // If user is admin and has simulated a role, use the simulated role as effectiveRole
  // Otherwise, try to use dbRole directly if it's a valid EffectiveRole, default to requestor
  const effectiveRole: EffectiveRole =
    (dbRole === 'admin' && simulatedRole) 
      ? simulatedRole 
      : (['requestor', 'approver', 'accounting', 'admin'].includes(dbRole) ? dbRole : 'requestor');

  const normalizedStatus = requestStatus.toLowerCase() as RequestStatusType;

  return (
    <>
      <Sidebar>
        <BreakdownsList
          data={breakdowns}
          requestId={requestId}
          currentUserId={currentUserId}
          requestStatus={requestStatus}
          effectiveRole={effectiveRole}
        />
        <LiquidationsList
          data={liquidations}
          requestId={requestId}
          requestStatus={requestStatus}
          effectiveRole={effectiveRole}
          requestedAmount={requestedAmount}
        />
        <MessageTrail
          trail={messageTrail}
          requestId={requestId}
          currentUserId={currentUserId}
        />
        <HistoryLog history={history} />
        <DocumentsTab requestId={requestId} />
      </Sidebar>

      <StatusPanel
        requestId={requestId}
        currentStatus={normalizedStatus}
        effectiveRole={effectiveRole}
        breakdownsSummary={breakdownsSummary}
      />
    </>
  );
}
