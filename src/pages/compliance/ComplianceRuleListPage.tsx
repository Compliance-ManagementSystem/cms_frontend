import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Layers,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  ToggleLeft,
  ToggleRight,
  X,
  ShieldCheck,
  Download,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { complianceRuleService, ComplianceRuleItem, RuleListStats } from '@/services/complianceRuleService';
import { adminService, MasterDataItem } from '@/services/adminService';

// ── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const ComplianceRuleListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [rules, setRules] = useState<ComplianceRuleItem[]>([]);
  const [categories, setCategories] = useState<MasterDataItem[]>([]);
  const [frequencies, setFrequencies] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real DB-level stats (not page-slice)
  const [stats, setStats] = useState<RuleListStats>({ total: 0, activeCount: 0, mandatoryCount: 0, uniqueCategoriesCount: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMandatory, setSelectedMandatory] = useState('');

  // Debounce search so API isn't called on every keystroke
  const debouncedSearch = useDebounce(search, 350);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ComplianceRuleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggling status state
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);

  // Fetch Filter Master Data — only runs once
  useEffect(() => {
    Promise.all([
      adminService.getMasterData({ category: 'compliance_category' }).catch(() => ({ items: [] })),
      adminService.getMasterData({ category: 'compliance_frequency' }).catch(() => ({ items: [] })),
    ])
      .then(([catRes, freqRes]) => {
        setCategories((catRes.items || []).filter((item: MasterDataItem) => item.status === 'active'));
        setFrequencies((freqRes.items || []).filter((item: MasterDataItem) => item.status === 'active'));
      })
      .catch((err) => console.error('Failed to load filter prerequisites', err));
  }, []);

  // Fetch Rules — toast is stable; remove it from deps to avoid infinite loop
  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await complianceRuleService.getRules({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch.trim() || undefined,
        category: selectedCategory || undefined,
        frequency: selectedFrequency || undefined,
        status: selectedStatus || undefined,
        mandatory: selectedMandatory || undefined,
      });
      setRules(data.rules);
      if (data.stats) setStats(data.stats);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (err: any) {
      toastRef.current.error(err.message || 'Failed to fetch compliance rules');
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearch,
    selectedCategory,
    selectedFrequency,
    selectedStatus,
    selectedMandatory,
  ]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Reset to page 1 when filters change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFrequency(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleMandatoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMandatory(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedFrequency('');
    setSelectedStatus('');
    setSelectedMandatory('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = !!(search || selectedCategory || selectedFrequency || selectedStatus || selectedMandatory);

  // Toggle active/inactive — optimistic update then refetch
  const handleToggleStatus = async (rule: ComplianceRuleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingRuleId(rule._id);
    // Optimistic update
    setRules((prev) =>
      prev.map((r) =>
        r._id === rule._id
          ? { ...r, status: r.status === 'active' ? 'inactive' : 'active', active: r.status !== 'active' }
          : r
      )
    );
    try {
      const res = await complianceRuleService.toggleRuleStatus(rule._id);
      toastRef.current.success(res.message || 'Rule status updated');
      // Sync with server truth
      setRules((prev) =>
        prev.map((r) => (r._id === rule._id ? { ...r, ...res.data.rule } : r))
      );
    } catch (err: any) {
      toastRef.current.error(err.message || 'Failed to toggle rule status');
      // Revert on error
      fetchRules();
    } finally {
      setTogglingRuleId(null);
    }
  };

  // Delete modal
  const openDeleteModal = (rule: ComplianceRuleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRuleToDelete(rule);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    setIsDeleting(true);
    try {
      await complianceRuleService.deleteRule(ruleToDelete._id);
      toastRef.current.success(`Rule "${ruleToDelete.name}" deleted successfully`);
      setIsDeleteModalOpen(false);
      setRuleToDelete(null);
      fetchRules();
    } catch (err: any) {
      toastRef.current.error(err.message || 'Failed to delete rule');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export (Imp-5)
  const handleExportCSV = () => {
    if (rules.length === 0) {
      toastRef.current.error('No compliance rules to export');
      return;
    }
    const headers = ['Code', 'Name', 'Category', 'Frequency', 'Renewal Cycle (Days)', 'Mandatory', 'Priority', 'Status', 'Applicable States', 'Approval Required'];
    const rows = rules.map((r) => [
      `"${(r.code || '').replace(/"/g, '""')}"`,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.category?.label || r.category?.code || '').replace(/"/g, '""')}"`,
      `"${(r.frequency?.label || r.frequency?.code || '').replace(/"/g, '""')}"`,
      r.renewalCycle ?? 0,
      r.mandatory ? 'Yes' : 'No',
      (r.priority || 'medium').toUpperCase(),
      (r.status || 'active').toUpperCase(),
      `"${(r.applicableStates?.length ? r.applicableStates.join('; ') : 'All (Pan-India)').replace(/"/g, '""')}"`,
      r.requiresApproval ? `Yes (${r.approvalLevels || 1} level)` : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `compliance_rules_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastRef.current.success(`Exported ${rules.length} compliance rules to CSV`);
  };

  // Table Columns
  const columns: Column<ComplianceRuleItem>[] = [
    {
      key: 'name',
      header: 'Rule Name & Code',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center text-indigo-400 font-semibold text-sm flex-shrink-0">
            <Scale size={16} />
          </div>
          <div>
            <div
              className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              onClick={() => navigate(`/compliance/rules/${row._id}`)}
            >
              {row.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[11px] text-slate-400">CODE:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{row.code}</span>
              {row.legalReference && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-2 truncate max-w-[160px]">
                  {row.legalReference}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => (
        <Badge variant="info" size="sm">
          {row.category?.label || row.category?.code || 'General'}
        </Badge>
      ),
    },
    {
      key: 'frequency',
      header: 'Frequency & Cycle',
      cell: (row) => (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Clock size={12} className="text-amber-500 dark:text-amber-400" />
            {row.frequency?.label || row.frequency?.code || 'Annual'}
          </div>
          <div className="text-slate-500 dark:text-slate-400 mt-0.5">
            {row.renewalCycle === 0
              ? <span className="text-sky-600 dark:text-sky-400 font-semibold">One-Time</span>
              : <>Cycle: <span className="font-semibold text-slate-700 dark:text-slate-200">{row.renewalCycle} days</span></>
            }
          </div>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Applicability Scope',
      cell: (row) => {
        const entityCount = row.applicableEntityTypes?.length || 0;
        const locationCount = row.applicableLocationTypes?.length || 0;
        const stateCount = row.applicableStates?.length || 0;

        return (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Building2 size={12} className="text-indigo-600 dark:text-indigo-400" />
              <span>{entityCount === 0 ? 'All Entity Types' : `${entityCount} Entity Type(s)`}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MapPin size={12} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                {locationCount === 0 ? 'All Locations' : `${locationCount} Loc Type(s)`}
                {' • '}
                {stateCount === 0 ? 'All States' : `${stateCount} State(s)`}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'mandatory',
      header: 'Mandatory',
      cell: (row) =>
        row.mandatory ? (
          <Badge variant="danger" size="sm">Mandatory</Badge>
        ) : (
          <Badge variant="default" size="sm">Optional</Badge>
        ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (row) => {
        const variantMap: Record<string, 'default' | 'info' | 'warning' | 'danger'> = {
          low: 'default',
          medium: 'info',
          high: 'warning',
          critical: 'danger',
        };
        return (
          <Badge variant={variantMap[row.priority] || 'default'} size="sm">
            {row.priority.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'active',
      header: 'Status',
      cell: (row) => {
        // Fix Bug 4: use status field directly instead of combined active&&status logic
        const isActive = row.status === 'active';
        const isArchived = row.status === 'archived';
        const isToggling = togglingRuleId === row._id;

        if (isArchived) {
          return <Badge variant="default" size="sm">Archived</Badge>;
        }

        return (
          <button
            type="button"
            onClick={(e) => handleToggleStatus(row, e)}
            disabled={isToggling}
            title={isActive ? 'Click to deactivate rule' : 'Click to activate rule'}
            className="flex items-center gap-1.5 group cursor-pointer focus:outline-none disabled:opacity-60"
          >
            {isActive ? (
              <>
                <ToggleRight className="text-emerald-400 w-5 h-5 group-hover:scale-110 transition-transform" />
                <Badge variant="success" size="sm">Active</Badge>
              </>
            ) : (
              <>
                <ToggleLeft className="text-slate-500 w-5 h-5 group-hover:scale-110 transition-transform" />
                <Badge variant="default" size="sm">Inactive</Badge>
              </>
            )}
          </button>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/compliance/rules/${row._id}`)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="View Details & Simulator"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => navigate(`/compliance/rules/${row._id}/edit`)}
            className="p-1.5 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="Edit Rule"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={(e) => openDeleteModal(row, e)}
            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="Delete Rule"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  // Pagination helpers
  const totalPages = pagination.totalPages;
  const currentPage = pagination.page;
  const startRecord = (currentPage - 1) * pagination.limit + 1;
  const endRecord = Math.min(currentPage * pagination.limit, pagination.total);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Scale size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Compliance Rule Engine</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Define statutory obligations, multi-tier applicability scopes, and renewal frequencies
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<Download size={15} />}
            onClick={handleExportCSV}
            disabled={rules.length === 0}
            title="Export listed compliance rules to CSV"
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={15} />}
            onClick={() => fetchRules()}
            isLoading={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => navigate('/compliance/rules/create')}
          >
            Create Rule
          </Button>
        </div>
      </div>

      {/* Metrics Row — real DB totals from stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Configured Rules</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Scale size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Rules</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.activeCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Mandatory Rules</div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{stats.mandatoryCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Categories</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.uniqueCategoriesCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Layers size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          {/* Search — debounced */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search rule by name, code or legal ref..."
              value={search}
              onChange={handleSearchChange}
              leftAddon={<Search size={16} className="text-slate-400" />}
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Frequency Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Frequency</label>
            <select
              value={selectedFrequency}
              onChange={handleFrequencyChange}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Frequencies</option>
              {frequencies.map((f) => (
                <option key={f._id} value={f._id}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={handleStatusChange}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Mandatory Filter + Reset */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mandatory</label>
              <select
                value={selectedMandatory}
                onChange={handleMandatoryChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              >
                <option value="">All</option>
                <option value="true">Mandatory</option>
                <option value="false">Optional</option>
              </select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="mt-6 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                title="Clear all filters"
              >
                <X size={15} />
              </Button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/40">
                Search: "{search}"
                <button onClick={() => setSearch('')} className="hover:text-indigo-500"><X size={11} /></button>
              </span>
            )}
            {selectedStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Status: {selectedStatus}
                <button onClick={() => setSelectedStatus('')} className="hover:text-slate-500"><X size={11} /></button>
              </span>
            )}
            {selectedMandatory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700/40">
                {selectedMandatory === 'true' ? 'Mandatory' : 'Optional'}
                <button onClick={() => setSelectedMandatory('')} className="hover:text-rose-500"><X size={11} /></button>
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Rules Table */}
      <div className="overflow-hidden">
        <Table<ComplianceRuleItem>
          columns={columns}
          data={rules}
          keyExtractor={(item) => item._id}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/compliance/rules/${row._id}`)}
          emptyMessage={
            hasActiveFilters ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Search size={22} />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No matching compliance rules</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                  No statutory rules matched your current search filters. Try adjusting search terms or clearing filters.
                </p>
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3.5 shadow-sm">
                  <Scale size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">No compliance rules configured yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                  Get started by defining statutory obligations, multi-tier applicability scopes, and renewal cadences for your organization.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={15} />}
                  onClick={() => navigate('/compliance/rules/create')}
                >
                  Create Your First Rule
                </Button>
              </div>
            )
          }
        />

        {/* Pagination — numbered pages + page size + record range */}
        {pagination.total > 0 && (
          <div className="px-6 py-4 border border-t-0 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 rounded-b-xl">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-800 dark:text-slate-200">{startRecord}–{endRecord}</strong> of{' '}
                <strong className="text-slate-800 dark:text-slate-200">{pagination.total}</strong> rules
              </span>
              <select
                value={pagination.limit}
                onChange={(e) => setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>

                {getPageNumbers().map((pg, idx) =>
                  pg === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 select-none">…</span>
                  ) : (
                    <button
                      key={pg}
                      onClick={() => setPagination((prev) => ({ ...prev, page: pg as number }))}
                      className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                        currentPage === pg
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pg}
                    </button>
                  )
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Compliance Rule"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              isLoading={isDeleting}
            >
              Delete Rule
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-sm">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-semibold text-rose-900 dark:text-rose-200">Are you sure you want to delete this rule?</p>
              <p className="mt-1 text-rose-700 dark:text-rose-300/80">
                Rule <strong>"{ruleToDelete?.name}"</strong> ({ruleToDelete?.code}) will be permanently removed.
                Any location or entity evaluation will no longer trigger this rule.
              </p>
            </div>
          </div>
          {ruleToDelete?.status === 'active' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-amber-700 dark:text-amber-300 text-xs">
              <ShieldCheck size={16} className="flex-shrink-0" />
              <span>This rule is currently <strong>active</strong>. Consider deactivating it instead of deleting.</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ComplianceRuleListPage;
