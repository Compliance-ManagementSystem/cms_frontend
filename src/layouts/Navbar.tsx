import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  Shield,
  Building,
  Menu,
} from 'lucide-react';
import { SIDEBAR_GROUPS } from '@/constants/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { ROUTES } from '@/constants/routes';
import { notificationService } from '@/services/notificationService';
import { socketService } from '@/services/socketService';

interface NavbarProps {
  sidebarCollapsed: boolean;
  onOpenMobileSidebar?: () => void;
}

const ROLE_BADGE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  super_admin: {
    label: 'Super Admin',
    className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  admin: {
    label: 'Admin',
    className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  },
  entity_admin: {
    label: 'Entity Admin',
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  location_manager: {
    label: 'Location Manager',
    className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  },
  compliance_officer: {
    label: 'Compliance Officer',
    className: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  },
  viewer: {
    label: 'Viewer',
    className: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  },
};

const Navbar: React.FC<NavbarProps> = ({ sidebarCollapsed, onOpenMobileSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch initial notifications & unread count
  useEffect(() => {
    if (user) {
      notificationService.getUnreadCount().then((count) => setUnreadCount(count)).catch(() => {});
      notificationService.getNotifications(1, 5).then((res) => setRecentNotifs(res.data)).catch(() => {});
      socketService.connect();
    }
  }, [user]);

  // Listen to realtime notifications
  useEffect(() => {
    const unsub = socketService.on('notification:new', (notif: any) => {
      setRecentNotifs((prev) => [notif, ...prev.slice(0, 4)]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      unsub();
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setRecentNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClickNotif = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif._id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setRecentNotifs((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error(err);
      }
    }
    setNotifOpen(false);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    } else {
      navigate(ROUTES.NOTIFICATIONS);
    }
  };

  // Resolve page title from current path
  const currentItem = SIDEBAR_GROUPS.flatMap((g) => g.items).find(
    (item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(item.path + '/')
  );

  const pageTitle = currentItem?.label ?? 'Compliance Management System';
  const roleCode = user?.role?.code || 'viewer';
  const roleBadge = ROLE_BADGE_CONFIG[roleCode] || {
    label: user?.role?.name || roleCode,
    className: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  };

  const userInitials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}`.toUpperCase()
    : 'U';

  return (
    <header
      id="top-navbar"
      className={[
        'fixed top-0 right-0 z-20 h-16',
        'flex items-center justify-between px-3 sm:px-6',
        'bg-slate-950',
        'border-b border-slate-800/60',
        'transition-all duration-250 ease-in-out',
        'left-0',
        sidebarCollapsed ? 'lg:left-[4.5rem]' : 'lg:left-64',
      ].join(' ')}
    >
      {/* ── Left: Mobile Hamburger & Page title ───────────────────────────── */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onOpenMobileSidebar && (
          <button
            id="navbar-mobile-toggle"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all flex items-center justify-center flex-shrink-0"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-slate-100 leading-tight truncate">
            {pageTitle}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* ── Right: Actions ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          id="navbar-search"
          aria-label="Search"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all duration-150"
        >
          <Search size={18} />
        </button>

        {/* Theme toggle */}
        <button
          id="navbar-theme-toggle"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all duration-150 cursor-pointer"
        >
          {theme === 'dark' ? (
            <Moon size={18} className="text-slate-400 hover:text-slate-200 transition-colors" />
          ) : (
            <Sun size={18} className="text-amber-400 hover:text-amber-300 transition-colors" />
          )}
        </button>

        {/* Notifications Popover Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            id="navbar-notifications"
            aria-label="Notifications"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all duration-150"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-100">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {recentNotifs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No new notifications.
                  </div>
                ) : (
                  recentNotifs.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => handleClickNotif(notif)}
                      className={`p-3.5 hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        !notif.isRead ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-medium truncate ${!notif.isRead ? 'text-slate-100 font-semibold' : 'text-slate-300'}`}>
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {notif.body}
                      </p>
                      <span className="text-[9px] text-slate-500 mt-1 block">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-800 bg-slate-950/60 text-center">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    navigate(ROUTES.NOTIFICATIONS);
                  }}
                  className="w-full py-1.5 text-xs text-center text-indigo-400 hover:text-indigo-300 font-medium rounded-lg hover:bg-slate-800 transition-colors"
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-800 mx-1" aria-hidden="true" />

        {/* User profile menu dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="navbar-user-menu"
            aria-label="User menu"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all duration-150 group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-md shadow-indigo-900/30">
              {userInitials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-200 leading-tight">
                {user?.fullName || 'User'}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {roleBadge.label}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 group-hover:text-slate-300 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 border border-slate-800 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* Header profile info */}
              <div className="px-3 py-2.5 border-b border-slate-800 mb-1">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.fullName}
                </p>
                <p className="text-[11px] text-slate-400 truncate mb-2">
                  {user?.email}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadge.className}`}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {roleBadge.label}
                  </span>
                  {user?.entity && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
                      <Building className="w-3 h-3 mr-1" />
                      {user.entity.code}
                    </span>
                  )}
                </div>
              </div>

              {/* Sign out button */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
