'use client';

import { FileText, History, Layers, MessageSquare, Wallet } from 'lucide-react';
import { useState, type ReactNode } from 'react';

const tabs = [
  {
    id: 'breakdowns',
    label: 'Breakdowns',
    icon: Layers,
    description: 'Review line items, approvals, and recording status for this request.',
  },
  {
    id: 'liquidations',
    label: 'Liquidations',
    icon: Wallet,
    description: 'Track submitted liquidation entries and compare them with the requested amount.',
  },
  {
    id: 'trail',
    label: 'Messages',
    icon: MessageSquare,
    description: 'Keep the conversation visible so updates and clarifications stay in context.',
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    description: 'See the request timeline and the important status transitions at a glance.',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    description: 'Open supporting files and upload additional records when needed.',
  },
];

interface SidebarProps {
  children: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const [activeTab, setActiveTab] = useState('trail');
  const childArray = Array.isArray(children) ? children : [children];

  const tabIndex: Record<string, number> = {
    breakdowns: 0,
    liquidations: 1,
    trail: 2,
    history: 3,
    documents: 4,
  };

  const activeContent = childArray[tabIndex[activeTab]];

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex gap-2 overflow-x-auto border-b border-border/30 p-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex min-w-[120px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-center transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(73,111,210,0.14)]'
                  : 'bg-white/35 text-muted-foreground hover:bg-white/55 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-5 sm:p-6">
        {activeContent || (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
