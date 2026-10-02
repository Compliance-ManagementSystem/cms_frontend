import type { TaskStatus, TaskPriority } from '@/services/taskService';
import { daysFromToday } from '@/utils/dates';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'pending';

export const PRIORITY_META: Record<TaskPriority, { label: string; variant: BadgeVariant }> = {
  critical: { label: 'Critical', variant: 'danger' },
  high: { label: 'High', variant: 'warning' },
  medium: { label: 'Medium', variant: 'info' },
  low: { label: 'Low', variant: 'default' },
};

export const STATUS_META: Record<TaskStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  pending_approval: { label: 'Pending Approval', variant: 'pending' },
  completed: { label: 'Completed', variant: 'success' },
  // "Overdue" is derived from the due date. Older tasks may still carry it as a
  // stored status; those are shown and handled as open tasks.
  overdue: { label: 'Open', variant: 'info' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

const ACTIVE_STATUSES: TaskStatus[] = ['open', 'in_progress', 'pending_approval', 'overdue'];

export const isTaskActive = (status: TaskStatus): boolean => ACTIVE_STATUSES.includes(status);

export const isPastDue = (task: { status: TaskStatus; dueDate?: string }): boolean =>
  !!task.dueDate && isTaskActive(task.status) && new Date(task.dueDate) < new Date();

export const formatOverdue = (dueDate: string): string => {
  const days = Math.abs(daysFromToday(dueDate));
  if (days === 0) return 'Due today';
  return days >= 60 ? `Overdue ${Math.round(days / 30)}mo` : `Overdue ${days}d`;
};

export const AUTO_SOURCE_LABELS: Record<string, string> = {
  expiry_monitor: 'Expiring compliance',
  expired_checker: 'Expired compliance',
  approval_monitor: 'Awaiting approval',
  document_check: 'Missing documents',
  overdue_check: 'Overdue submission',
  renewal_job: 'Renewal reminder',
};
