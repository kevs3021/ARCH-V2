'use client';

import { useState } from 'react';
import { UserCog, ChevronUp, X } from 'lucide-react';

type SimulatedRole = 'requestor' | 'approver' | 'accounting' | null;

interface RoleSimulatorButtonProps {
  simulatedRole: SimulatedRole;
  onRoleChange: (role: SimulatedRole) => void;
}

const ROLE_OPTIONS: { value: Exclude<SimulatedRole, null>; label: string }[] = [
  { value: 'requestor', label: 'Requestor' },
  { value: 'approver', label: 'Approver' },
  { value: 'accounting', label: 'Accounting' },
];

const ROLE_COLORS: Record<Exclude<SimulatedRole, null>, string> = {
  requestor: '#3B82F6',
  approver: '#8B5CF6',
  accounting: '#10B981',
};

export default function RoleSimulatorButton({
  simulatedRole,
  onRoleChange,
}: RoleSimulatorButtonProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(role: SimulatedRole) {
    onRoleChange(role);
    setOpen(false);
  }

  return (
    <div className="fixed bottom-20 right-6 z-50 flex flex-col items-end">
      {/* Dropdown — appears above the button */}
      {open && (
        <div className="glass-card mb-2 p-2 min-w-[160px] flex flex-col gap-1">
          {ROLE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-white/10 transition-colors w-full"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: ROLE_COLORS[value] }}
              />
              {label}
              {simulatedRole === value && (
                <span className="ml-auto text-xs opacity-60">active</span>
              )}
            </button>
          ))}

          {simulatedRole && (
            <>
              <div className="border-t border-white/10 my-1" />
              <button
                onClick={() => handleSelect(null)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-white/10 transition-colors w-full text-red-400"
              >
                <X className="w-3.5 h-3.5" />
                Deactivate
              </button>
            </>
          )}
        </div>
      )}

      {/* Main trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-primary flex items-center gap-2 shadow-lg"
      >
        {simulatedRole ? (
          <>
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: ROLE_COLORS[simulatedRole] }}
            />
            <span className="capitalize">{simulatedRole}</span>
          </>
        ) : (
          <>
            <UserCog className="w-4 h-4" />
            Simulate Role
          </>
        )}
        <ChevronUp
          className={`w-3.5 h-3.5 transition-transform ${open ? '' : 'rotate-180'}`}
        />
      </button>
    </div>
  );
}
