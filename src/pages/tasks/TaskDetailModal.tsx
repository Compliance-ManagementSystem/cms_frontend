import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Pencil, Trash2, Send, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { daysFromToday } from '@/utils/dates';
import {
  taskService,
  TaskItem,
  TaskStatus,
  TaskPriority,
  TaskAssigneeOption,
} from '@/services/taskService';

interface TaskDetailModalProps {
  taskId: string | null;
  onClose: () => void;
  /** Called after any change so the list and counters can refresh */
  onChanged: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}

const PRIORITY_VARIANT: Record<TaskPriority, 'danger' | 'warning' | 'info' | 'default'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const STATUS_META: Record<TaskStatus, { label: string; variant: 'info' | 'pending' | 'success' | 'default' }> = {
  open: { label: 'Open', variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'info' },
  pending_approval: { label: 'Pending Approval', variant: 'pending' },
  completed: { label: 'Completed', variant: 'success' },
  // Stored "overdue" only exists on older tasks; it is an open task
  overdue: { label: 'Open', variant: 'info' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

const FIELD_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

const fullName = (user?: { firstName: string; lastName: string }) =>
  user ? `${user.firstName} ${user.lastName}`.trim() : '';

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, onClose, onChanged, canUpdate, canDelete }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [task, setTask] = useState<TaskItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [assignees, setAssignees] = useState<TaskAssigneeOption[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
    assignedTo: '',
  });

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      setTask(await taskService.getTaskById(taskId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load task');
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [taskId, toast, onClose]);

  useEffect(() => {
    setTask(null);
    setIsEditing(false);
    setConfirmingDelete(false);
    setCommentText('');
    loadTask();
  }, [loadTask]);

  const startEditing = () => {
    if (!task) return;
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      assignedTo: task.assignedTo?._id || '',
    });
    setIsEditing(true);
    taskService
      .getAssignees(task.entity?._id)
      .then(setAssignees)
      .catch(() => setAssignees([]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    if (!form.title.trim() || !form.dueDate || !form.assignedTo) {
      toast.error('Title, assignee and due date are required');
      return;
    }

    setIsSaving(true);
    try {
      const reassigned = form.assignedTo !== task.assignedTo?._id;
      const updated = await taskService.updateTask(task._id, {
        title: form.title.trim(),
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate,
        assignedTo: form.assignedTo,
      });
      setTask(updated);
      setIsEditing(false);
      toast.success(reassigned ? 'Task updated and reassigned' : 'Task updated');
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    if (!task) return;
    try {
      setTask(await taskService.updateTaskStatus(task._id, status));
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task status');
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsSaving(true);
    try {
      await taskService.deleteTask(task._id);
      toast.success('Task deleted');
      onChanged();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !commentText.trim()) return;
    setIsCommenting(true);
    try {
      setTask(await taskService.addComment(task._id, commentText.trim()));
      setCommentText('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const isActive = !!task && ['open', 'in_progress', 'pending_approval', 'overdue'].includes(task.status);
  const overdueDays =
    task?.dueDate && isActive && new Date(task.dueDate) < new Date() ? Math.abs(daysFromToday(task.dueDate)) : null;
  const comments = task?.comments || [];

  const footer = !task ? undefined : isEditing ? (
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
        Save Changes
      </Button>
    </div>
  ) : confirmingDelete ? (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
        <AlertTriangle size={14} />
        Delete this task permanently?
      </span>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setConfirmingDelete(false)} disabled={isSaving}>
          Keep Task
        </Button>
        <Button variant="danger" onClick={handleDelete} isLoading={isSaving}>
          Delete Task
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-3">
      <div>
        {canDelete && (
          <Button variant="ghost" leftIcon={<Trash2 size={14} />} onClick={() => setConfirmingDelete(true)}>
            Delete
          </Button>
        )}
      </div>
      <div className="flex gap-3">
        {canUpdate && (
          <Button variant="outline" leftIcon={<Pencil size={14} />} onClick={startEditing}>
            Edit
          </Button>
        )}
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={!!taskId}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : 'Task Details'}
      size="lg"
      closeOnOverlay={!isEditing}
      footer={footer}
    >
      {isLoading || !task ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading task...</div>
      ) : isEditing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div>
            <label className={LABEL_CLASS}>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${FIELD_CLASS} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={LABEL_CLASS}>Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className={FIELD_CLASS}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>Due Date *</label>
              <input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Assigned To *</label>
              <select
                required
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                className={FIELD_CLASS}
              >
                {/* Keep the current assignee selectable even if outside the loaded list */}
                {task.assignedTo && !assignees.some((u) => u._id === task.assignedTo?._id) && (
                  <option value={task.assignedTo._id}>{fullName(task.assignedTo)}</option>
                )}
                {assignees.map((u) => (
                  <option key={u._id} value={u._id}>
                    {fullName(u)}
                    {u.role?.name ? ` (${u.role.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.assignedTo !== task.assignedTo?._id && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The new assignee will be notified when you save.
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant={PRIORITY_VARIANT[task.priority]} size="sm">
                {task.priority.toUpperCase()}
              </Badge>
              <Badge variant={STATUS_META[task.status].variant} size="sm">
                {STATUS_META[task.status].label}
              </Badge>
              {overdueDays !== null && (
                <Badge variant="danger" size="sm">
                  {overdueDays === 0 ? 'Due today' : `Overdue ${overdueDays}d`}
                </Badge>
              )}
              {task.isAutoGenerated && (
                <Badge variant="default" size="sm">Auto-generated</Badge>
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line">{task.description}</p>
            )}
          </div>

          {/* Facts */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Assigned to</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">
                {fullName(task.assignedTo) || 'Unassigned'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Due date</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Entity</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">
                {task.entity ? `${task.entity.name}${task.entity.entityCode ? ` (${task.entity.entityCode})` : ''}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Location</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">{task.location?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Created</dt>
              <dd className="text-slate-700 dark:text-slate-300">
                {new Date(task.createdAt).toLocaleDateString()}
                {task.createdBy ? ` by ${fullName(task.createdBy)}` : task.isAutoGenerated ? ' by automation' : ''}
              </dd>
            </div>
            {canUpdate && (
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</dt>
                <dd>
                  <select
                    value={task.status === 'overdue' ? 'open' : task.status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className={`${FIELD_CLASS} !py-1.5 !text-xs`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </dd>
              </div>
            )}
          </dl>

          {/* Linked compliance record */}
          {task.complianceRecord && (
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 text-sm flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400">Linked compliance record</div>
                <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {task.complianceRecord.recordNumber}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/compliance/records/${task.complianceRecord?._id}`)}
              >
                Open Record
              </Button>
            </div>
          )}

          {/* Completion */}
          {task.status === 'completed' && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>
                {task.completedBy ? `Completed by ${fullName(task.completedBy)}` : 'Closed automatically'}
                {task.completedAt ? ` on ${new Date(task.completedAt).toLocaleString()}` : ''}
              </span>
            </div>
          )}

          {/* Comments */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Comments{comments.length > 0 ? ` (${comments.length})` : ''}
            </h4>

            {comments.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No comments yet.</p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {comments.map((comment) => (
                  <li
                    key={comment._id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {fullName(comment.author) || 'User'}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-line">{comment.text}</p>
                  </li>
                ))}
              </ul>
            )}

            {canUpdate && (
              <form onSubmit={handleAddComment} className="flex items-start gap-2">
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment or progress note"
                  aria-label="Add a comment"
                  className={`${FIELD_CLASS} resize-none`}
                />
                <Button
                  type="submit"
                  variant="outline"
                  leftIcon={<Send size={14} />}
                  isLoading={isCommenting}
                  disabled={!commentText.trim()}
                >
                  Post
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TaskDetailModal;
