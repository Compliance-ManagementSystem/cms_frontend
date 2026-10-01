import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Hourglass,
  CheckSquare,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  notificationService,
  NotificationItem,
  NotificationType,
} from '@/services/notificationService';
import { socketService } from '@/services/socketService';

const NOTIFICATION_ICONS: Record<
  NotificationType,
  { icon: React.ReactNode; bg: string; text: string }
> = {
  task_assigned: {
    icon: <CheckSquare size={16} />,
    bg: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/15 dark:border-indigo-500/30',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  compliance_expiring: {
    icon: <Clock size={16} />,
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
  },
  compliance_expired: {
    icon: <AlertOctagon size={16} />,
    bg: 'bg-rose-50 border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400',
  },
  task_overdue: {
    icon: <AlertTriangle size={16} />,
    bg: 'bg-rose-50 border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400',
  },
  approval_pending: {
    icon: <Hourglass size={16} />,
    bg: 'bg-purple-50 border-purple-200 dark:bg-purple-500/15 dark:border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
  compliance_approved: {
    icon: <CheckCircle2 size={16} />,
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  compliance_rejected: {
    icon: <XCircle size={16} />,
    bg: 'bg-rose-50 border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400',
  },
  system: {
    icon: <ShieldAlert size={16} />,
    bg: 'bg-slate-100 border-slate-200 dark:bg-slate-500/15 dark:border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
  },
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(page, 20, unreadOnly);
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    fetchNotifications();

    const unsubscribe = socketService.on('notification:new', (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClickItem = (notif: NotificationItem) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Bell className="text-indigo-600 dark:text-indigo-400" size={24} />
            Notifications Center
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time updates, compliance milestone reminders, and workflow assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700/80 shadow-sm dark:shadow-none"
            >
              <CheckCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              Mark all as read
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                !unreadOnly
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                unreadOnly
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Notification List ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-150 dark:divide-slate-800/40">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <Clock size={16} className="animate-spin text-indigo-500" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Bell size={32} className="mx-auto mb-2 text-slate-400 opacity-40" />
            <p className="text-xs">No notifications to display.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const config =
              NOTIFICATION_ICONS[notif.type] || NOTIFICATION_ICONS.system;

            return (
              <div
                key={notif._id}
                onClick={() => handleClickItem(notif)}
                className={`p-4 flex items-start gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group ${
                  !notif.isRead ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.bg} ${config.text}`}
                >
                  {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-xs font-semibold truncate ${
                        !notif.isRead ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {notif.title}
                    </h3>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {notif.body}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                    <span>
                      {new Date(notif.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {notif.actionUrl && (
                      <span className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                        View details <ArrowRight size={10} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notif.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif._id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(notif._id, e)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
