import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  User as UserIcon,
  Building2,
  MapPin,
  X,
  Zap,
} from 'lucide-react';
import {
  taskService,
  TaskItem,
  TaskStatus,
  TaskPriority,
  TaskMetrics,
} from '@/services/taskService';
import { entityService, EntityItem } from '@/services/entityService';
import { adminService, UserItem } from '@/services/adminService';
import { socketService } from '@/services/socketService';

const PRIORITY_BADGES: Record<TaskPriority, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 font-semibold',
  },
  high: {
    label: 'High',
    className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 font-medium',
  },
  medium: {
    label: 'Medium',
    className: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30 font-medium',
  },
  low: {
    label: 'Low',
    className: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/30 font-medium',
  },
};

const STATUS_BADGES: Record<TaskStatus, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 font-medium',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30 font-medium',
  },
  pending_approval: {
    label: 'Pending Approval',
    className: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30 font-medium',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 font-medium',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 font-semibold',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700/30 dark:text-slate-400 dark:border-slate-700/50 font-medium',
  },
};

export const TaskListPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Tab detection based on current path
  const isMyTasks = location.pathname.includes('/my-tasks');
  const isOverdue = location.pathname.includes('/overdue');

  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'overdue'>(
    isMyTasks ? 'my' : isOverdue ? 'overdue' : 'all'
  );

  useEffect(() => {
    if (location.pathname.includes('/my-tasks')) {
      setActiveTab('my');
    } else if (location.pathname.includes('/overdue')) {
      setActiveTab('overdue');
    } else {
      setActiveTab('all');
    }
  }, [location.pathname]);

  // State
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Entities & Users for Modal & Filter
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationNotice, setAutomationNotice] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    entity: '',
    assignedTo: '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
  });

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const data = await taskService.getMetrics(activeTab === 'my');
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  }, [activeTab]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      };

      if (activeTab === 'my') {
        res = await taskService.getMyTasks(params);
      } else if (activeTab === 'overdue') {
        res = await taskService.getOverdueTasks(params);
      } else {
        res = await taskService.getTasks(params);
      }

      setTasks(res.data);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, statusFilter, priorityFilter]);

  // Load supporting lists
  useEffect(() => {
    entityService.getEntities({ limit: 100 }).then((res) => {
      setEntities(res.entities || []);
    }).catch(() => {});

    adminService.getUsers({ limit: 100 }).then((res) => {
      setUsers(res.users || []);
    }).catch(() => {});
  }, []);

  // Listen to realtime socket events
  useEffect(() => {
    fetchTasks();
    fetchMetrics();

    const unsubTask = socketService.on('task:assigned', () => {
      fetchTasks();
      fetchMetrics();
    });

    const unsubCompliance = socketService.on('compliance:status_changed', () => {
      fetchTasks();
      fetchMetrics();
    });

    return () => {
      unsubTask();
      unsubCompliance();
    };
  }, [fetchTasks, fetchMetrics]);

  // Handle Tab Switch
  const handleTabChange = (tab: 'all' | 'my' | 'overdue') => {
    setActiveTab(tab);
    setPage(1);
    if (tab === 'my') navigate('/tasks/my-tasks');
    else if (tab === 'overdue') navigate('/tasks/overdue');
    else navigate('/tasks');
  };

  // Status Change
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      fetchTasks();
      fetchMetrics();
      if (selectedTask && selectedTask._id === taskId) {
        const updated = await taskService.getTaskById(taskId);
        setSelectedTask(updated);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Trigger Compliance Automation Scan
  const handleTriggerAutomation = async () => {
    setIsAutomating(true);
    setAutomationNotice(null);
    try {
      const res = await taskService.triggerAutomation();
      setAutomationNotice(
        `Automation Scan Complete: ${res.tasksCreated} new tasks generated, ${res.notificationsSent} notifications sent.`
      );
      fetchTasks();
      fetchMetrics();
    } catch (err) {
      console.error('Automation failed:', err);
      setAutomationNotice('Failed to execute automated compliance check.');
    } finally {
      setIsAutomating(false);
    }
  };

  // Create Task Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await taskService.createTask({
        title: formData.title,
        description: formData.description,
        entity: formData.entity || undefined,
        assignedTo: formData.assignedTo || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        status: 'open',
      });
      setCreateModalOpen(false);
      setFormData({
        title: '',
        description: '',
        entity: '',
        assignedTo: '',
        priority: 'medium',
        dueDate: '',
      });
      fetchTasks();
      fetchMetrics();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CheckSquare className="text-indigo-600 dark:text-indigo-400" size={26} />
            Compliance Tasks & Remediation
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Automated compliance reminders, document remediation, and assigned action items.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerAutomation}
            disabled={isAutomating}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-300 border border-slate-300 dark:border-indigo-500/20 shadow-sm transition-all"
            title="Scan compliance records & trigger automated tasks"
          >
            <Zap size={14} className={isAutomating ? 'animate-spin text-amber-500' : 'text-indigo-600 dark:text-indigo-400'} />
            {isAutomating ? 'Running Automation...' : 'Run Scheduled Checks'}
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus size={16} />
            Create Task
          </button>
        </div>
      </div>

      {/* ── Automation Notice Banner ─────────────────────────────────────────── */}
      {automationNotice && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 text-indigo-800 dark:text-indigo-200 text-xs">
          <div className="flex items-center gap-2.5">
            <Zap size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span>{automationNotice}</span>
          </div>
          <button
            onClick={() => setAutomationNotice(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Metrics Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Tasks</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.total}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-sky-200 dark:border-sky-500/20 shadow-sm">
          <p className="text-xs font-medium text-sky-600 dark:text-sky-400">Open</p>
          <p className="text-xl font-bold text-sky-700 dark:text-sky-300 mt-1">{metrics.open}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-indigo-200 dark:border-indigo-500/20 shadow-sm">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">In Progress</p>
          <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">{metrics.inProgress}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-purple-200 dark:border-purple-500/20 shadow-sm">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Pending Review</p>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">{metrics.pendingApproval}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-rose-200 dark:border-rose-500/20 shadow-sm">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Overdue</p>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">{metrics.overdue}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{metrics.completed}</p>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => handleTabChange('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <CheckSquare size={14} />
          All Tasks
        </button>
        <button
          onClick={() => handleTabChange('my')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'my'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <UserIcon size={14} />
          My Assigned Tasks
        </button>
        <button
          onClick={() => handleTabChange('overdue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'overdue'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle size={14} />
          Overdue Tasks
          {metrics.overdue > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {metrics.overdue}
            </span>
          )}
        </button>
      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by title, description or record..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TaskStatus | '');
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as TaskPriority | '');
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setPriorityFilter('');
              setPage(1);
              fetchTasks();
            }}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            title="Reset filters"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Task Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Priority</th>
                <th className="py-3.5 px-4 font-semibold">Task Details</th>
                <th className="py-3.5 px-4 font-semibold">Entity / Location</th>
                <th className="py-3.5 px-4 font-semibold">Assigned To</th>
                <th className="py-3.5 px-4 font-semibold">Due Date</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-indigo-500" size={18} />
                      Loading tasks...
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CheckSquare size={32} className="mx-auto mb-2 text-slate-400 opacity-50" />
                    No tasks found matching current filters.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                  const status = STATUS_BADGES[task.status] || STATUS_BADGES.open;
                  const isTaskOverdue =
                    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

                  return (
                    <tr
                      key={task._id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task);
                        setDetailModalOpen(true);
                      }}
                    >
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priority.className}`}>
                          {priority.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{task.title}</div>
                        {task.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {task.description}
                          </div>
                        )}
                        {task.isAutoGenerated && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-[9px] font-mono">
                            ⚡ Auto: {task.autoGenSource || 'scheduled'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                          <Building2 size={12} className="text-slate-400" />
                          <span className="truncate max-w-[140px]">
                            {task.entity?.name || 'General Entity'}
                          </span>
                        </div>
                        {task.location && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <MapPin size={11} className="text-slate-400" />
                            <span className="truncate max-w-[140px]">{task.location.name}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {task.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] border border-indigo-200 dark:border-indigo-500/30">
                              {task.assignedTo.firstName[0]}
                            </div>
                            <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[120px]">
                              {task.assignedTo.firstName} {task.assignedTo.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {task.dueDate ? (
                          <div
                            className={`flex items-center gap-1.5 text-xs ${
                              isTaskOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Calendar size={13} className={isTaskOverdue ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'} />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">No due date</span>
                        )}
                      </td>

                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task._id, e.target.value as TaskStatus)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border bg-white dark:bg-slate-950/80 focus:outline-none ${status.className}`}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="pending_approval">Pending Approval</option>
                          <option value="completed">Completed</option>
                          <option value="overdue">Overdue</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Showing {tasks.length} of {totalCount} tasks
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none"
            >
              Previous
            </button>
            <span className="text-slate-800 dark:text-slate-300 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Create Task Modal ─────────────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus size={18} className="text-indigo-600 dark:text-indigo-400" />
                Create New Task
              </h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upload Fire Safety NOC renewal certificate"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide context or instructions for this action item..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Entity</label>
                  <select
                    value={formData.entity}
                    onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Entity (Optional)</option>
                    {entities.map((ent) => (
                      <option key={ent._id} value={ent._id}>
                        {ent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Assign To</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Task Details Drawer / Modal ────────────────────────────────────────── */}
      {detailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    PRIORITY_BADGES[selectedTask.priority]?.className
                  }`}
                >
                  {selectedTask.priority.toUpperCase()}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    STATUS_BADGES[selectedTask.status]?.className
                  }`}
                >
                  {STATUS_BADGES[selectedTask.status]?.label}
                </span>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{selectedTask.title}</h2>
              {selectedTask.description && (
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  {selectedTask.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Assigned To</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium mt-1 block">
                  {selectedTask.assignedTo
                    ? `${selectedTask.assignedTo.firstName} ${selectedTask.assignedTo.lastName}`
                    : 'Unassigned'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Due Date</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium mt-1 block">
                  {selectedTask.dueDate
                    ? new Date(selectedTask.dueDate).toLocaleDateString()
                    : 'No due date'}
                </span>
              </div>

              {selectedTask.entity && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Entity</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium mt-1 block">
                    {selectedTask.entity.name} ({selectedTask.entity.entityCode})
                  </span>
                </div>
              )}

              {selectedTask.location && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Location</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium mt-1 block">
                    {selectedTask.location.name}
                  </span>
                </div>
              )}
            </div>

            {/* Compliance Record Link */}
            {selectedTask.complianceRecord && (
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 text-xs flex items-center justify-between">
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 block font-semibold text-[10px] uppercase">
                    Linked Statutory Record
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {selectedTask.complianceRecord.recordNumber}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigate(`/compliance/records/${selectedTask.complianceRecord?._id}`);
                  }}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shadow-sm"
                >
                  View Record
                </button>
              </div>
            )}

            {/* Completion details */}
            {selectedTask.status === 'completed' && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={16} className="inline mr-1 text-emerald-600 dark:text-emerald-400" />
                Completed by{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedTask.completedBy
                    ? `${selectedTask.completedBy.firstName} ${selectedTask.completedBy.lastName}`
                    : 'System'}
                </span>{' '}
                on{' '}
                {selectedTask.completedAt
                  ? new Date(selectedTask.completedAt).toLocaleString()
                  : 'N/A'}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Change Status:</label>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleStatusChange(selectedTask._id, e.target.value as TaskStatus)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskListPage;
