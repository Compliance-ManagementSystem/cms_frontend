import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Menu,
  Lock,
  LogOut,
  X,
} from 'lucide-react';
import { SIDEBAR_GROUPS, SidebarItem } from '@/constants/sidebar';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { hasRole, hasPermission, logout } = useAuth();

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen) {
      onCloseMobile?.();
    }
  }, [location.pathname]);

  // Filter items based on role and permission
  const isItemVisible = (item: SidebarItem): boolean => {
    if (item.roles && item.roles.length > 0) {
      if (!hasRole(item.roles)) return false;
    }
    if (item.permission) {
      if (!hasPermission(item.permission)) return false;
    }
    return true;
  };

  return (
    <aside
      id="main-sidebar"
      aria-label="Main navigation"
      className={[
        'fixed top-0 bottom-0 left-0 h-full',
        'flex flex-col',
        'bg-slate-950 border-r border-slate-800/60',
        'transition-all duration-250 ease-in-out',
        // Mobile styles: offcanvas drawer with z-50
        'z-50 w-72 max-w-[85vw]',
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        // Desktop styles: static positioning with lg:
        'lg:translate-x-0 lg:z-30',
        collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
      ].join(' ')}
    >
      {/* ── Top Header with Logo & Controls ─────────────────────────────────── */}
      <div
        className={[
          'h-16 flex items-center px-4 border-b border-slate-800/60 flex-shrink-0',
          collapsed ? 'lg:justify-center justify-between' : 'justify-between',
        ].join(' ')}
      >
        {/* Brand / Logo (Always visible on mobile drawer, or on desktop when expanded) */}
        <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'lg:hidden flex' : 'flex'}`}>
          <div className="flex-shrink-0 p-2 rounded-xl gradient-brand shadow-lg shadow-blue-900/30">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100 leading-tight truncate">
              Compliance
            </p>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase truncate">
              Management System
            </p>
          </div>
        </div>

        {/* Desktop Hamburger Toggle (When collapsed on desktop) */}
        {collapsed && (
          <button
            id="sidebar-toggle-desktop-collapsed"
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="hidden lg:flex p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors items-center justify-center mx-auto focus:outline-none"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Desktop Hamburger Toggle (When expanded on desktop) */}
        {!collapsed && (
          <button
            id="sidebar-toggle-desktop-expanded"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="hidden lg:flex p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors flex-shrink-0 focus:outline-none"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Mobile Close Button (X icon on mobile drawer) */}
        {onCloseMobile && (
          <button
            id="sidebar-close-mobile"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors flex items-center justify-center focus:outline-none"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {SIDEBAR_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              {/* Group title */}
              {!collapsed && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  {group.title}
                </p>
              )}

              <ul className="space-y-0.5" role="list">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                  if (item.disabled) {
                    return (
                      <li key={item.path}>
                        <div
                          className={[
                            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent',
                            'opacity-40 cursor-not-allowed select-none',
                            collapsed ? 'justify-center' : '',
                          ].join(' ')}
                          title={collapsed ? item.label : undefined}
                          aria-disabled="true"
                        >
                          <Icon size={18} className="text-slate-500 flex-shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="text-sm font-medium text-slate-500 truncate flex-1">
                                {item.label}
                              </span>
                              <Lock size={12} className="text-slate-600 flex-shrink-0" />
                            </>
                          )}
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        id={`nav-${item.path.replace('/', '')}`}
                        onClick={(e) => {
                          if (isActive) {
                            e.preventDefault();
                            return;
                          }
                          if (mobileOpen) {
                            onCloseMobile?.();
                          }
                        }}
                        className={[
                          'relative flex items-center gap-3 px-3 py-2.5 rounded-lg border',
                          'transition-colors duration-150 group select-none',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                          collapsed ? 'justify-center' : '',
                          isActive
                            ? 'bg-blue-900/30 text-blue-400 border-blue-800/40 shadow-sm shadow-blue-950/40'
                            : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/70',
                        ].join(' ')}
                        title={collapsed ? item.label : undefined}
                      >
                        {/* Active indicator bar - smoothly transitions opacity */}
                        <span
                          className={`nav-active-indicator transition-opacity duration-150 pointer-events-none ${
                            isActive ? 'opacity-100' : 'opacity-0'
                          }`}
                          aria-hidden="true"
                        />

                        <Icon
                          size={18}
                          className={[
                            'flex-shrink-0 transition-colors duration-150',
                            isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300',
                          ].join(' ')}
                        />

                        {!collapsed && (
                          <span className="text-sm font-medium truncate flex-1">
                            {item.label}
                          </span>
                        )}

                        {!collapsed && item.badge && item.badge > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}

                        {/* CSS Tooltip for collapsed state - no state triggers */}
                        {collapsed && (
                          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden lg:block">
                            {item.label}
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-slate-700 rotate-45" />
                          </div>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── Bottom Section: Sign Out ────────────────────────────────────────── */}
      <div className="flex-shrink-0 p-3 border-t border-slate-800/60">
        <div className="relative group">
          <button
            id="sidebar-signout"
            onClick={() => {
              logout();
              if (mobileOpen) onCloseMobile?.();
            }}
            aria-label="Sign out"
            className={[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent',
              'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/20',
              'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50',
              collapsed ? 'justify-center' : '',
            ].join(' ')}
          >
            <LogOut size={18} className="flex-shrink-0 text-rose-400 group-hover:text-rose-300 transition-colors" />
            {!collapsed && (
              <span className="text-sm font-medium">Sign Out</span>
            )}
          </button>
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-rose-300 text-xs font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden lg:block">
              Sign Out
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-slate-700 rotate-45" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
