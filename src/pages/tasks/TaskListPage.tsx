import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  Building2,
  MapPin,
  X,
  Zap,
  Play,
  Check,
  RotateCcw,
  Link2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table, { Column } from '@/components/ui/Table';
import {
  taskService,
  TaskItem,
  TaskStatus,
  TaskPriority,
  TaskMetrics,
  TaskAssigneeOption,
} from '@/services/taskService';
import { entityService, EntityItem } from '@/services/entityService';
import { socketService } from '@/services/socketService';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import TaskDetailModal from './TaskDetailModal';
import { PRIORITY_META, STATUS_META, AUTO_SOURCE_LABELS, isPastDue, formatOverdue } from './taskDisplay';

const PAGE_SIZE = 15;

// Summary cards double as quick filters
type CardKey = 'open' | 'in_progress' | 'pending_approval' | 'overdue' | 'completed';

const METRIC_CARDS: Array<{
  key: CardKey | 'total';
  label: string;
  color: string;
  value: (m: TaskMetrics) => number;
}> = [
  { key: 'total', label: 'Total Tasks', color: 'text-slate-900 dark:text-white', value: (m) => m.total },
  { key: 'open', label: 'Open', color: 'text-sky-600 dark:text-sky-400', value: (m) => m.open },
  { key: 'in_progress', label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', value: (m) => m.inProgress },
  {
    key: 'pending_approval',
    label: 'Pending Approval',
    color: 'text-orange-600 dark:text-orange-400',
    value: (m) => m.pendingApproval,
  },
  { key: 'overdue', label: 'Overdue', color: 'text-rose-600 dark:text-rose-400', value: (m) => m.overdue },
  { key: 'completed', label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', value: (m) => m.completed },
];

const SORT_OPTIONS = [
  { value: 'dueDate:asc', label: 'Due soonest' },
  { value: 'dueDate:desc', label: 'Due latest' },
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
];

const SELECT_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

const EMPTY_FORM = {
  title: '',
  description: '',
  entity: '',
  assignedTo: '',
  priority: 'medium' as TaskPriority,
  dueDate: '',
};

export const TaskListPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { can, hasRole } = useAuth();
  const canCreate = can('task', 'create');
  const canUpdate = can('task', 'update');
  const canDelete = can('task', 'delete');
  const canRunAutomation = hasRole(['super_admin', 'admin']);

  // The open task lives in the URL (?task=<id>) so notifications can link straight to it
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTaskId = searchParams.get('task');
  const openTask = (id: string) => setSearchParams({ task: id });
  const closeTask = useCallback(() => setSearchParams({}), [setSearchParams]);

  // /tasks/my-tasks limits the page to the signed-in user; /tasks/overdue preselects the Overdue card
  const mineOnly = location.pathname.includes('/my-tasks');
  const onOverduePath = location.pathname.includes('/overdue');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<TaskMetrics>({
    total: 0,
    open: 0,
    inProgress: 0,
    pendingApproval: 0,
    completed: 0,
    overdue: 0,
    cancelled: 0,
  });

  // Filters
  const [activeCard, setActiveCard] = useState<CardKey | ''>(onOverduePath ? 'overdue' : '');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create form
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [users, setUsers] = useState<TaskAssigneeOption[]>([]);

  // Automation
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationNotice, setAutomationNotice] = useState<string | null>(null);

  useEffect(() => {
    if (onOverduePath) setActiveCard('overdue');
  }, [onOverduePath]);

  // Search fires once typing pauses
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchMetrics = useCallback(async () => {
    try {
      setMetrics(await taskService.getMetrics(mineOnly));
    } catch {
      // Counters are secondary; the task list reports load failures
    }
  }, [mineOnly]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [sortBy, sortOrder] = sort.split(':') as [string, 'asc' | 'desc'];
      const cardStatus = activeCard && activeCard !== 'overdue' ? activeCard : '';
      const params = {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: cardStatus || statusFilter || undefined,
        priority: priorityFilter || undefined,
        overdueOnly: activeCard === 'overdue' ? true : undefined,
        sortBy,
        sortOrder,
      };

      const res = mineOnly ? await taskService.getMyTasks(params) : await taskService.getTasks(params);
      setTasks(res.data);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [mineOnly, activeCard, page, debouncedSearch, statusFilter, priorityFilter, sort, toast]);

  const refreshAll = useCallback(() => {
    fetchTasks();
    fetchMetrics();
  }, [fetchTasks, fetchMetrics]);

  // Initial load, filter changes and realtime updates
  useEffect(() => {
    refreshAll();
    const unsubTask = socketService.on('task:assigned', refreshAll);
    const unsubCompliance = socketService.on('compliance:status_changed', refreshAll);
    return () => {
      unsubTask();
      unsubCompliance();
    };
  }, [refreshAll]);

  // Supporting lists for the create form
  useEffect(() => {
    if (!canCreate) return;
    entityService
      .getEntities({ limit: 100 })
      .then((res) => setEntities(res.entities || []))
      .catch(() => {});
  }, [canCreate]);

  // Assignee options follow the selected entity
  useEffect(() => {
    if (!canCreate) return;
    taskService
      .getAssignees(formData.entity || undefined)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [canCreate, formData.entity]);

  const handleCardClick = (key: CardKey | 'total') => {
    const next = key === 'total' || key === activeCard ? '' : key;
    setActiveCard(next);
    setStatusFilter('');
    setPage(1);
    // Leave the /tasks/overdue path once a different view is chosen
    if (onOverduePath && next !== 'overdue') navigate('/tasks');
  };

  const handleScopeChange = (mine: boolean) => {
    setPage(1);
    navigate(mine ? '/tasks/my-tasks' : '/tasks');
  };

  const handleResetFilters = () => {
    setSearch('');
    setActiveCard('');
    setStatusFilter('');
    setPriorityFilter('');
    setPage(1);
    if (onOverduePath) navigate('/tasks');
  };

  const hasActiveFilters = !!(search || activeCard || statusFilter || priorityFilter);

  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    try {
      await taskService.updateTaskStatus(task._id, newStatus);
      toast.success(`"${task.title}" marked ${STATUS_META[newStatus].label.toLowerCase()}`);
      refreshAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task status');
    }
  };

  const handleTriggerAutomation = async () => {
    setIsAutomating(true);
    setAutomationNotice(null);
    try {
      const res = await taskService.triggerAutomation();
      setAutomationNotice(
        `Scan complete: ${res.recordsScanned} records checked, ${res.tasksCreated} tasks created, ` +
          `${res.tasksClosed} resolved tasks closed, ${res.notificationsSent} notifications sent` +
          (res.recordsFailed ? `, ${res.recordsFailed} records failed.` : '.')
      );
      refreshAll();
    } catch (err: any) {
      setAutomationNotice(err.message || 'Failed to execute automated compliance check.');
    } finally {
      setIsAutomating(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.entity || !formData.assignedTo || !formData.dueDate) {
      toast.error('Title, entity, assignee and due date are required');
      return;
    }

    setIsCreating(true);
    try {
      await taskService.createTask({
        title: formData.title.trim(),
        description: formData.description || undefined,
        entity: formData.entity,
        assignedTo: formData.assignedTo,
        priority: formData.priority,
        dueDate: formData.dueDate,
      });
      toast.success('Task created and assigned');
      setCreateModalOpen(false);
      setFormData(EMPTY_FORM);
      refreshAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  // The one next step for a task; anything else is done from the detail view
  const nextAction = (task: TaskItem): { label: string; status: TaskStatus; icon: React.ReactNode } => {
    if (task.status === 'completed' || task.status === 'cancelled') {
      return { label: 'Reopen', status: 'open', icon: <RotateCcw size={13} /> };
    }
    if (task.status === 'open' || task.status === 'overdue') {
      return { label: 'Start', status: 'in_progress', icon: <Play size={13} /> };
    }
    return { label: 'Complete', status: 'completed', icon: <Check size={13} /> };
  };

  const columns: Column<TaskItem>[] = [
    {
      key: 'task',
      header: 'Task',
      cell: (task) => (
        <div className="min-w-0 max-w-[270px]">
          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate" title={task.title}>
            {task.title}
          </div>
          {task.description && (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{task.description}</div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px]">
            {task.isAutoGenerated && (
              <span className="text-indigo-600 dark:text-indigo-400">
                Auto · {AUTO_SOURCE_LABELS[task.autoGenSource || ''] || 'Scheduled check'}
              </span>
            )}
            {task.complianceRecord && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/compliance/records/${task.complianceRecord?._id}`);
                }}
                className="inline-flex items-center gap-1 max-w-full font-mono text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:underline"
                title="Open linked compliance record"
              >
                <Link2 size={11} className="shrink-0" />
                <span className="truncate">{task.complianceRecord.recordNumber}</span>
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (task) => (
        <Badge variant={PRIORITY_META[task.priority]?.variant || 'default'} size="sm">
          {PRIORITY_META[task.priority]?.label || task.priority}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Entity & Location',
      cell: (task) => (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
            <Building2 size={12} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{task.entity?.name || '—'}</span>
          </div>
          {task.location && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MapPin size={12} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{task.location.name}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assignee',
      cell: (task) =>
        task.assignedTo ? (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] border border-indigo-200 dark:border-indigo-500/30">
              {task.assignedTo.firstName?.[0] || '?'}
            </div>
            <span className="text-xs text-slate-800 dark:text-slate-200">
              {task.assignedTo.firstName} {task.assignedTo.lastName}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Unassigned</span>
        ),
    },
    {
      key: 'dueDate',
      header: 'Due',
      cell: (task) =>
        task.dueDate ? (
          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Calendar size={12} className="text-slate-500 dark:text-slate-400" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
            {isPastDue(task) && (
              <Badge variant="danger" size="sm">{formatOverdue(task.dueDate)}</Badge>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (task) => (
        <span className="whitespace-nowrap">
          <Badge variant={STATUS_META[task.status]?.variant || 'default'} size="sm">
            {STATUS_META[task.status]?.label || task.status}
          </Badge>
        </span>
      ),
    },
    ...(canUpdate
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (task: TaskItem) => {
              const action = nextAction(task);
              return (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={action.icon}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(task, action.status);
                  }}
                >
                  {action.label}
                </Button>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <CheckSquare size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Tasks</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Compliance reminders, remediation work and assigned action items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canRunAutomation && (
            <Button
              variant="outline"
              leftIcon={<Zap size={15} className="text-amber-500 dark:text-amber-400" />}
              onClick={handleTriggerAutomation}
              isLoading={isAutomating}
              title="Scan compliance records and open or close automated tasks"
            >
              Run Scheduled Checks
            </Button>
          )}
          {canCreate && (
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setCreateModalOpen(true)}>
              Create Task
            </Button>
          )}
        </div>
      </div>

      {/* Automation Notice */}
      {automationNotice && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 text-indigo-800 dark:text-indigo-200 text-xs">
          <div className="flex items-center gap-2.5">
            <Zap size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span>{automationNotice}</span>
          </div>
          <button
            onClick={() => setAutomationNotice(null)}
            aria-label="Dismiss"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Summary cards — click to filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRIC_CARDS.map((card) => {
          const isActive = card.key === activeCard;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => handleCardClick(card.key)}
              aria-pressed={isActive}
              className={`text-left p-3 rounded-xl border bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none transition-colors ${
                isActive
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{card.label}</div>
              <div className={`text-xl font-bold mt-1 ${card.color}`}>{card.value(metrics)}</div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="flex flex-wrap items-end gap-3">
          {/* Whose tasks */}
          <div
            role="group"
            aria-label="Task scope"
            className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-sm"
          >
            {[
              { mine: false, label: 'All tasks' },
              { mine: true, label: 'Assigned to me' },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={mineOnly === option.mine}
                onClick={() => handleScopeChange(option.mine)}
                className={`px-3 py-2 transition-colors ${
                  mineOnly === option.mine
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search title, description or record number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftAddon={<Search size={16} className="text-slate-400" />}
            />
          </div>

          <div className="w-40">
            <label className={LABEL_CLASS}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TaskStatus | '');
                setActiveCard('');
                setPage(1);
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="w-36">
            <label className={LABEL_CLASS}>Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as TaskPriority | '');
                setPage(1);
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="w-40">
            <label className={LABEL_CLASS}>Sort by</label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className={SELECT_CLASS}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={handleResetFilters} className="text-xs">
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Task Table */}
      <Table<TaskItem>
        columns={columns}
        data={tasks}
        keyExtractor={(task) => task._id}
        isLoading={loading}
        onRowClick={(task) => openTask(task._id)}
        emptyMessage={
          hasActiveFilters
            ? 'No tasks match these filters.'
            : mineOnly
            ? 'Nothing is assigned to you right now.'
            : 'No tasks yet. Tasks appear here when created or raised by scheduled compliance checks.'
        }
        pagination={
          totalCount > PAGE_SIZE
            ? { page, limit: PAGE_SIZE, total: totalCount, onPageChange: setPage }
            : undefined
        }
      />

      {/* Create Task Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Task"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} isLoading={isCreating}>
              Create Task
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Title"
            required
            placeholder="e.g. Upload Fire Safety NOC renewal certificate"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div>
            <label className={LABEL_CLASS}>Description</label>
            <textarea
              rows={3}
              placeholder="Context or instructions for this action item"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`${SELECT_CLASS} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className={SELECT_CLASS}
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
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className={SELECT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Entity *</label>
              <select
                required
                value={formData.entity}
                onChange={(e) => setFormData({ ...formData, entity: e.target.value, assignedTo: '' })}
                className={SELECT_CLASS}
              >
                <option value="">Select entity</option>
                {entities.map((entity) => (
                  <option key={entity._id} value={entity._id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Assign To *</label>
              <select
                required
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className={SELECT_CLASS}
              >
                <option value="">Select assignee</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                    {user.role?.name ? ` (${user.role.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Task Details */}
      <TaskDetailModal
        taskId={selectedTaskId}
        onClose={closeTask}
        onChanged={refreshAll}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
};

export default TaskListPage;
