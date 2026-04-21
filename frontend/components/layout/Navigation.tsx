'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home,
  Scale,
  FileText,
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Wrench,
  Settings,
  ChevronDown,
  Menu,
  X,
  Bell,
  User,
  UserCog,
  LogOut,
  Shield,
  Crown,
  User as UserIcon,
  Moon,
  Sun,
} from 'lucide-react';
import RequestBranchRolesPanel from '@/components/utilities/RequestBranchRolesPanel';
import {
  REQUEST_BRANCHES,
  REQUEST_ROLES,
  type RequestBranch,
  type RequestRole,
} from '@/lib/utilities/assignment';
import {
  createEmptyRoleSimulationMatrix,
  deriveSimulationPermissions,
  deriveSimulatedRole,
  loadRoleSimulationMatrix,
  matrixHasSelections,
  saveRoleSimulationMatrix,
  type RoleSimulationMatrix,
} from '@/lib/roleSimulation';
import {
  NavItem,
  UserWithRBAC,
  UserRole,
  filterNavItemsByPermissions,
  getPermissionsForRole,
} from '@/types/navigation';
import { navigationItems } from '@/config/navigation';

const SIDEBAR_WIDTH = 220;
const HEADBAR_HEIGHT = 56;

const NavItemComponent: React.FC<{
  item: NavItem;
  pathname: string;
  expandedItems: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: () => void;
  level: number;
}> = ({ item, pathname, expandedItems, onToggle, onNavigate, level }) => {
  const hasChildren = Boolean(item.children?.length);
  const isExpanded = expandedItems.has(item.id);
  const Icon = item.icon;

  const isActive = item.href
    ? pathname === item.href ||
      (item.href !== '/' && pathname.startsWith(item.href))
    : item.children?.some(
        (c) =>
          c.href &&
          (pathname === c.href ||
            (c.href !== '/' && pathname.startsWith(c.href)))
      ) ?? false;

  const isChildActive = (child: NavItem) =>
    child.href
      ? pathname === child.href ||
        (child.href !== '/' && pathname.startsWith(child.href))
      : false;

  const paddingLeft = level === 0 ? 'pl-4' : 'pl-10';

  // Shared classes for interactive state
  const baseClasses = `
    group relative flex items-center gap-3 w-full pr-4 py-2.5
    text-sm font-medium transition-colors duration-150 select-none
    ${paddingLeft}
  `;

  const activeLeafClasses =
    'text-primary bg-primary/8 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-r-full before:bg-primary';
  const inactiveClasses =
    'text-muted-foreground hover:text-foreground hover:bg-muted/60';

  // Parent item (expandable)
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => onToggle(item.id)}
          className={`${baseClasses} ${isActive && !isExpanded ? activeLeafClasses : inactiveClasses}`}
          aria-expanded={isExpanded}
        >
          {Icon && (
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <Icon />
            </span>
          )}
          <span className="flex-1 text-left truncate">{item.label}</span>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4 opacity-60" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {item.children!.map((child) => (
                <NavItemComponent
                  key={child.id}
                  item={child}
                  pathname={pathname}
                  expandedItems={expandedItems}
                  onToggle={onToggle}
                  onNavigate={onNavigate}
                  level={level + 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Leaf item (link)
  return (
    <Link
      href={item.href || '#'}
      onClick={onNavigate}
      className={`${baseClasses} ${isActive || isChildActive(item) ? activeLeafClasses : inactiveClasses}`}
    >
      {Icon && (
        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          <Icon />
        </span>
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null && (
        <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-semibold leading-none">
          {item.badge}
        </span>
      )}
    </Link>
  );
};

export const Navigation: React.FC<{ user?: any }> = ({ user }) => {
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [simulationMatrix, setSimulationMatrix] = useState<RoleSimulationMatrix>(
    () => loadRoleSimulationMatrix()
  );

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!user?.role || user.role === 'admin') return;
    if (matrixHasSelections(simulationMatrix)) {
      setSimulationMatrix(createEmptyRoleSimulationMatrix());
    }
  }, [user?.role, simulationMatrix]);

  const isAdmin = user?.isAdmin === true;
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('arch-theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  const onMenuToggle = useCallback(() => setMobileMenuOpen(!mobileMenuOpen), [mobileMenuOpen]);
  const onClose = useCallback(() => setMobileMenuOpen(false), []);

  const simulatedRole = useMemo(
    () => deriveSimulatedRole(simulationMatrix),
    [simulationMatrix]
  );
  const simulationPermissions = useMemo(
    () => deriveSimulationPermissions(simulationMatrix),
    [simulationMatrix]
  );
  const simulationActive = isMounted && matrixHasSelections(simulationMatrix);
  const activeRole: UserRole = simulationActive
    ? (simulatedRole || (user?.role || 'requestor'))
    : (user?.role || 'requestor');

  const userPermissions =
    simulationActive
      ? simulationPermissions
      : (user?.permissions && user.permissions.length > 0)
        ? user.permissions
        : getPermissionsForRole(activeRole);
  const filteredItems = filterNavItemsByPermissions(
    navigationItems,
    userPermissions
  );

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // proceed with redirect even if request fails
    }
    router.push('/login');
  }, [router]);

  const handleSimulationBranchToggle = useCallback((branch: RequestBranch) => {
    setSimulationMatrix((current) => {
      const next = { ...current };
      next[branch] = current[branch].length > 0 ? [] : [...REQUEST_ROLES];
      return next;
    });
  }, []);

  const handleSimulationRoleToggle = useCallback((branch: RequestBranch, role: RequestRole) => {
    setSimulationMatrix((current) => {
      const next = { ...current };
      const branchRoles = new Set(current[branch]);
      if (branchRoles.has(role)) {
        branchRoles.delete(role);
      } else {
        branchRoles.add(role);
      }
      next[branch] = Array.from(branchRoles);
      return next;
    });
  }, []);

  const handleClearSimulation = useCallback(() => {
    setSimulationMatrix(createEmptyRoleSimulationMatrix());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const derivedRole = deriveSimulatedRole(simulationMatrix);
    const windowWithRole = window as Window & {
      __SIMULATED_ROLE__?: UserRole | null;
      __SIMULATED_ROLE_MATRIX__?: RoleSimulationMatrix;
    };

    windowWithRole.__SIMULATED_ROLE_MATRIX__ = simulationMatrix;
    windowWithRole.__SIMULATED_ROLE__ = derivedRole;

    saveRoleSimulationMatrix(matrixHasSelections(simulationMatrix) ? simulationMatrix : null);

    if (derivedRole) {
      window.localStorage.setItem('__SIMULATED_ROLE__', derivedRole);
    } else {
      window.localStorage.removeItem('__SIMULATED_ROLE__');
    }

    window.dispatchEvent(new Event('simulatedRoleChange'));
  }, [simulationMatrix]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  const onRoleSwitch = useCallback(() => {
    setRoleSwitcherOpen(true);
  }, []);

  const onCloseRoleSwitch = useCallback(() => {
    setRoleSwitcherOpen(false);
  }, []);

  return (
    <>
      <MobileHeadbar
        isMenuOpen={mobileMenuOpen}
        onMenuToggle={onMenuToggle}
        user={user}
        onRoleSwitch={onRoleSwitch}
        isDark={isDark}
        toggleTheme={toggleTheme}
        role={activeRole}
        isAdmin={isAdmin}
      />
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={onClose}
        items={filteredItems}
        pathname={pathname}
        user={user}
        onLogout={handleLogout}
        isDark={isDark}
        toggleTheme={toggleTheme}
        role={activeRole}
      />
      <DesktopSidebar
        items={filteredItems}
        pathname={pathname}
        user={user}
        onLogout={handleLogout}
        onRoleSwitch={onRoleSwitch}
        role={activeRole}
        isAdmin={isAdmin}
      />
      <RoleSwitcherModal
        isOpen={roleSwitcherOpen}
        simulatedRole={simulatedRole}
        simulationMatrix={simulationMatrix}
        onClose={onCloseRoleSwitch}
        onClear={handleClearSimulation}
        onToggleBranch={handleSimulationBranchToggle}
        onToggleRole={handleSimulationRoleToggle}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Role Badge & Switcher
// ---------------------------------------------------------------------------

const roleIcons: Record<string, React.ElementType> = {
  admin: Crown,
  accounting: Receipt,
  approver: Scale,
  requestor: FileText,
};

const roleColors: Record<string, string> = {
  admin: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  accounting: 'bg-green-500/15 text-green-600 dark:text-green-400',
  approver: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  requestor: 'bg-muted text-muted-foreground',
};

const RoleBadge: React.FC<{
  role: string;
  onClick?: () => void;
  showSwitcher?: boolean;
}> = ({ role, onClick, showSwitcher }) => {
  const Icon = roleIcons[role] || UserIcon;
  const colorClass = roleColors[role] || roleColors.requestor;

  const Component = onClick ? 'button' : 'div';
  const extraProps = onClick ? { onClick } : {};

  return (
    <Component
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
        ${colorClass} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
      {...extraProps}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="capitalize">{role}</span>
      {showSwitcher && <ChevronDown className="w-3 h-3" />}
    </Component>
  );
};

const RoleSwitcherModal: React.FC<{
  isOpen: boolean;
  simulatedRole: UserRole | null;
  simulationMatrix: RoleSimulationMatrix;
  onClose: () => void;
  onClear: () => void;
  onToggleBranch: (branch: RequestBranch) => void;
  onToggleRole: (branch: RequestBranch, role: RequestRole) => void;
}> = ({
  isOpen,
  simulatedRole,
  simulationMatrix,
  onClose,
  onClear,
  onToggleBranch,
  onToggleRole,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-[min(980px,94vw)] max-h-[90vh] overflow-hidden rounded-3xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl dark:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4 dark:border-white/10">
            <div className="space-y-1">
              <p className="section-label">Admin tools</p>
              <h3 className="font-display text-xl font-semibold text-foreground">
                Role simulation
              </h3>
              <p className="text-sm text-muted-foreground">
                Select request branches and roles to preview the simulated access state.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClear}
                className="rounded-xl border border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-white/10"
              >
                Clear
              </button>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close role simulation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(90vh-84px)] overflow-y-auto p-4">
            <RequestBranchRolesPanel
              embedded
              showHeader={false}
              className="bg-transparent p-0"
              selectedBranches={REQUEST_BRANCHES.filter((branch) => simulationMatrix[branch].length > 0)}
              selectedRolesByBranch={simulationMatrix}
              onToggleBranch={onToggleBranch}
              onToggleRole={onToggleRole}
            />

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Current simulation</p>
                <p className="text-xs text-muted-foreground">
                  {simulatedRole ? `Derived role: ${simulatedRole}` : 'No simulated roles selected'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ---------------------------------------------------------------------------
// Mobile Headbar
// ---------------------------------------------------------------------------

const MobileHeadbar: React.FC<{
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  user?: UserWithRBAC | null;
  onRoleSwitch?: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  role?: UserRole;
  isAdmin?: boolean;
}> = ({ isMenuOpen, onMenuToggle, user, onRoleSwitch, isDark, toggleTheme, role, isAdmin }) => (
  <header
    className="md:hidden fixed top-0 inset-x-0 z-50 glass-card !rounded-none !border-x-0 !border-t-0"
    style={{ height: HEADBAR_HEIGHT }}
  >
    <div className="flex items-center justify-between h-full px-4">
      {/* Left: hamburger */}
      <button
        onClick={onMenuToggle}
        className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isMenuOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Center: branding */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl hero-gradient flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm leading-none">A</span>
        </div>
        <span className="font-display font-semibold text-lg tracking-tight text-foreground">
          ARCH
        </span>
      </Link>

      {/* Right: quick actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-foreground" />
          )}
        </button>
        {isAdmin && (
          <button
            onClick={onRoleSwitch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <UserCog className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulate Role</span>
          </button>
        )}
        <button
          className="relative p-2 rounded-xl hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card" />
        </button>
        <button
          className="p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all"
          aria-label="Profile"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>
    </div>
  </header>
);

// ---------------------------------------------------------------------------
// Mobile Menu (slide-over)
// ---------------------------------------------------------------------------

const MobileMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[];
  pathname: string;
  user?: UserWithRBAC | null;
  onLogout: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  role?: UserRole;
}> = ({ isOpen, onClose, items, pathname, user, onLogout, isDark, toggleTheme, role }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Auto-expand parent containing active child
  useEffect(() => {
    const toExpand = new Set<string>();
    items.forEach((item) => {
      if (
        item.children?.some(
          (c) =>
            c.href &&
            (pathname === c.href ||
              (c.href !== '/' && pathname.startsWith(c.href)))
        )
      ) {
        toExpand.add(item.id);
      }
    });
    if (toExpand.size > 0) {
      setExpandedItems((prev) => new Set([...prev, ...toExpand]));
    }
  }, [pathname, items]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            style={{ top: HEADBAR_HEIGHT }}
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="md:hidden fixed left-0 bottom-0 z-50 w-[min(320px,85vw)] glass-card !rounded-none !border-l-0 !border-t-0 !border-b-0 flex flex-col"
            style={{ top: HEADBAR_HEIGHT }}
          >
            {/* Items */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-3 sidebar-scrollbar">
              {items.map((item) => (
                <NavItemComponent
                  key={item.id}
                  item={item}
                  pathname={pathname}
                  expandedItems={expandedItems}
                  onToggle={toggleExpand}
                  onNavigate={onClose}
                  level={0}
                />
              ))}
            </div>

            {/* User footer */}
            <div className="flex-shrink-0 p-4 border-t border-border/30">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full mb-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-foreground" />
                ) : (
                  <Moon className="w-5 h-5 text-foreground" />
                )}
                <span className="text-sm text-foreground">
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>
              <div className="flex items-center gap-3">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || ''}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.name || 'User'}
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
};

// ---------------------------------------------------------------------------
// Desktop Sidebar
// ---------------------------------------------------------------------------

const DesktopSidebar: React.FC<{
  items: NavItem[];
  pathname: string;
  user?: UserWithRBAC | null;
  onLogout: () => void;
  onRoleSwitch?: () => void;
  role?: UserRole;
  isAdmin?: boolean;
}> = ({ items, pathname, user, onLogout, onRoleSwitch, role, isAdmin }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Auto-expand parent containing active child on mount / route change
  useEffect(() => {
    const toExpand = new Set<string>();
    items.forEach((item) => {
      if (
        item.children?.some(
          (c) =>
            c.href &&
            (pathname === c.href ||
              (c.href !== '/' && pathname.startsWith(c.href)))
        )
      ) {
        toExpand.add(item.id);
      }
    });
    if (toExpand.size > 0) {
      setExpandedItems((prev) => new Set([...prev, ...toExpand]));
    }
  }, [pathname, items]);

  return (
    <>
    <aside
      className="hidden md:flex fixed inset-y-0 left-0 z-50 flex-col glass-card !rounded-none !border-l-0 !border-t-0 !border-b-0"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* Header / branding */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0 border-b border-border/30"
        style={{ height: HEADBAR_HEIGHT }}
      >
        <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-white font-bold text-lg leading-none">A</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-xl tracking-tight leading-tight text-foreground">
            ARCH
          </h1>
          <p className="text-[11px] text-muted-foreground leading-none truncate">
            Luminous Ledger
          </p>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto overscroll-contain py-3 sidebar-scrollbar">
        {items.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            pathname={pathname}
            expandedItems={expandedItems}
            onToggle={toggleExpand}
            onNavigate={() => {}}
            level={0}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 p-4 border-t border-border/30">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || ''}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
          )}
<div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.name || 'User'}
                  </p>
                </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={onRoleSwitch}
                className="p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Simulate Role"
                title="Simulate Role"
              >
                <UserCog className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};

export interface NavigationProps {
  user?: UserWithRBAC | null;
}

export default Navigation;
