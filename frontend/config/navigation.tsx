import {
  Home,
  Scale,
  FileText,
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Wrench,
  Settings,
  MessageSquare,
  BookOpen,
  Users,
} from 'lucide-react';
import { NavItem, Permission } from '@/types/navigation';

/**
 * Navigation Configuration
 *
 * Each item can carry a `permission` for RBAC-based visibility control.
 * Parent items are automatically hidden when all children are filtered out.
 */

// Main navigation tree
export const navigationItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/home',
    icon: () => <Home className="w-5 h-5" />,
    permission: 'view_home' as Permission,
  },
  {
    id: 'chat',
    label: 'Chat',
    href: '/chat',
    icon: () => <MessageSquare className="w-5 h-5" />,
    permission: 'view_chat' as Permission,
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: () => <Scale className="w-5 h-5" />,
    permission: 'view_legal' as Permission,
    children: [
      {
        id: 'legal-requests',
        label: 'Requests',
        href: '/legal/requests',
        icon: () => <FileText className="w-5 h-5" />,
        permission: 'view_legal_requests' as Permission,
      },
      {
        id: 'legal-dashboard',
        label: 'Dashboard',
        href: '/legal/dashboard',
        icon: () => <LayoutDashboard className="w-5 h-5" />,
        permission: 'view_legal_dashboard' as Permission,
      },
    ],
  },
  {
    id: 'advances',
    label: 'Advances',
    icon: () => <FolderKanban className="w-5 h-5" />,
    permission: 'view_others' as Permission,
    children: [
      {
        id: 'advances-requests',
        label: 'Advances Requests',
        href: '/others/advances-requests',
        icon: () => <FileText className="w-5 h-5" />,
        permission: 'view_advances_requests' as Permission,
      },
      {
        id: 'petty-requests',
        label: 'Petty Requests',
        href: '/others/petty-requests',
        icon: () => <Receipt className="w-5 h-5" />,
        permission: 'view_petty_requests' as Permission,
      },
      {
        id: 'others-dashboard',
        label: 'Dashboard',
        href: '/others/dashboard',
        icon: () => <LayoutDashboard className="w-5 h-5" />,
        permission: 'view_others_dashboard' as Permission,
      },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: () => <Wrench className="w-5 h-5" />,
    permission: 'view_utilities' as Permission,
    children: [
      {
        id: 'utilities-ledger',
        label: 'Ledger',
        href: '/utilities/ledger',
        icon: () => <BookOpen className="w-5 h-5" />,
      },
      {
        id: 'utilities-accounts',
        label: 'Accounts',
        href: '/utilities/accounts',
        icon: () => <Users className="w-5 h-5" />,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: () => <Settings className="w-5 h-5" />,
    permission: 'view_settings' as Permission,
  },
];

// Layout constants (pixels)
export const sidebarConfig = {
  width: 288,
  headerHeight: 64,
} as const;
