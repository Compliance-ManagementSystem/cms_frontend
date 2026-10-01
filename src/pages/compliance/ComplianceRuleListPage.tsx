import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { complianceRuleService, ComplianceRuleItem } from '@/services/complianceRuleService';
import { adminService, MasterDataItem } from '@/services/adminService';

export const ComplianceRuleListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [rules, setRules] = useState<ComplianceRuleItem[]>([]);
  const [categories, setCategories] = useState<MasterDataItem[]>([]);
  const [frequencies, setFrequencies] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMandatory, setSelectedMandatory] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ComplianceRuleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggling status state
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);

  // Fetch Filter Master Data
  useEffect(() => {
    Promise.all([
      adminService.getMasterData({ category: 'compliance_category' }).catch(() => ({ items: [] })),
      adminService.getMasterData({ category: 'compliance_frequency' }).catch(() => ({ items: [] })),
    ])
      .then(([catRes, freqRes]) => {
        setCategories((catRes.items || []).filter((item: MasterDataItem) => item.status === 'active'));
        setFrequencies((freqRes.items || []).filter((item: MasterDataItem) => item.status === 'active'));
      })
      .catch((err) => {
        console.error('Failed to load compliance rule filter prerequisites', err);
      });
  }, []);

  // Fetch Rules
  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await complianceRuleService.getRules({
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        category: selectedCategory || undefined,
        frequency: selectedFrequency || undefined,
        status: selectedStatus || undefined,
        mandatory: selectedMandatory || undefined,
      });
      setRules(data.rules);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
      }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch compliance rules');
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    search,
    selectedCategory,
    selectedFrequency,
    selectedStatus,
    selectedMandatory,
    toast,
  ]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Handlers
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

  // Toggle active/inactive
  const handleToggleStatus = async (rule: ComplianceRuleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingRuleId(rule._id);
    try {
      const res = await complianceRuleService.toggleRuleStatus(rule._id);
      toast.success(res.message || 'Rule status updated');
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle rule status');
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
      toast.success(`Rule "${ruleToDelete.name}" deleted successfully`);
      setIsDeleteModalOpen(false);
      setRuleToDelete(null);
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete rule');
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics
  const totalCount = pagination.total;
  const activeCount = rules.filter((r) => r.active || r.status === 'active').length;
  const mandatoryCount = rules.filter((r) => r.mandatory).length;
  const uniqueCategoriesCount = new Set(rules.map((r) => r.category?.label || r.category?.code)).size;

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
            Cycle: <span className="font-semibold text-slate-700 dark:text-slate-200">{row.renewalCycle || 365} days</span>
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
              <span>
                {entityCount === 0 ? 'All Entity Types' : `${entityCount} Entity Type(s)`}
              </span>
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
          <Badge variant="danger" size="sm">
            Mandatory
          </Badge>
        ) : (
          <Badge variant="default" size="sm">
            Optional
          </Badge>
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
        const isActive = row.active && row.status !== 'inactive';
        const isToggling = togglingRuleId === row._id;

        return (
          <button
            type="button"
            onClick={(e) => handleToggleStatus(row, e)}
            disabled={isToggling}
            title={isActive ? 'Click to deactivate rule' : 'Click to activate rule'}
            className="flex items-center gap-1.5 group cursor-pointer focus:outline-none"
          >
            {isActive ? (
              <>
                <ToggleRight className="text-emerald-400 w-5 h-5 group-hover:scale-110 transition-transform" />
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </>
            ) : (
              <>
                <ToggleLeft className="text-slate-500 w-5 h-5 group-hover:scale-110 transition-transform" />
                <Badge variant="default" size="sm">
                  Inactive
                </Badge>
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Configured Rules</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</div>
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
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
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
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{mandatoryCount}</div>
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
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{uniqueCategoriesCount}</div>
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
          {/* Search */}
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
                <option key={c._id} value={c._id}>
                  {c.label}
                </option>
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
                <option key={f._id} value={f._id}>
                  {f.label}
                </option>
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
            </select>
          </div>

          {/* Mandatory Filter */}
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

            {(search || selectedCategory || selectedFrequency || selectedStatus || selectedMandatory) && (
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="mt-6 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Rules Table */}
      <div className="overflow-hidden">
        <Table<ComplianceRuleItem>
          columns={columns}
          data={rules}
          keyExtractor={(item) => item._id}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/compliance/rules/${row._id}`)}
          emptyMessage="No compliance rules found. Create your first rule to configure statutory obligations."
        />

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 rounded-b-xl border border-slate-200 dark:border-slate-800 mt-2">
            <div>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} rules
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <span className="px-2 text-slate-800 dark:text-slate-300 font-medium">Page {pagination.page}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page * pagination.limit >= pagination.total}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
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
                Rule <strong>"{ruleToDelete?.name}"</strong> ({ruleToDelete?.code}) will be removed.
                Any location or entity evaluation will no longer trigger this rule.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ComplianceRuleListPage;
