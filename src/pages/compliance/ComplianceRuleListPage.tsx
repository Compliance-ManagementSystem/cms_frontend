import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Plus, Search, Edit2, Trash2, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { complianceRuleService, ComplianceRuleItem } from '@/services/complianceRuleService';
import type { MasterDataItem } from '@/services/adminService';
import { lookupService } from '@/services/lookupService';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';

// Summary cards double as quick filters
type CardKey = 'active' | 'inactive' | 'archived';

const SELECT_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

const PRIORITY_VARIANT: Record<string, 'default' | 'info' | 'warning' | 'danger'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** "Units, Clinics" or the fallback when the rule applies to all */
const listNames = (items: MasterDataItem[] | undefined, all: string) =>
  items?.length ? items.map((item) => item.label || item.code).join(', ') : all;

// Rules saved by older versions may have no cycle
const cycleText = (days?: number) =>
  days === undefined || days === null ? 'Cycle not set' : days === 0 ? 'One-time' : `Every ${days} day${days === 1 ? '' : 's'}`;

export const ComplianceRuleListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can('compliance_rule', 'create');
  const canUpdate = can('compliance_rule', 'update');
  const canDelete = can('compliance_rule', 'delete');

  const [rules, setRules] = useState<ComplianceRuleItem[]>([]);
  const [categories, setCategories] = useState<MasterDataItem[]>([]);
  const [frequencies, setFrequencies] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCard, setActiveCard] = useState<CardKey | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [selectedMandatory, setSelectedMandatory] = useState('');

  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [metrics, setMetrics] = useState({ total: 0, active: 0, inactive: 0, archived: 0 });

  const [ruleToDelete, setRuleToDelete] = useState<ComplianceRuleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);

  // Filter options
  useEffect(() => {
    Promise.all([
      lookupService.getMasterData({ category: 'compliance_category' }).catch(() => ({ items: [] as MasterDataItem[] })),
      lookupService.getMasterData({ category: 'compliance_frequency' }).catch(() => ({ items: [] as MasterDataItem[] })),
    ]).then(([catRes, freqRes]) => {
      setCategories(catRes.items || []);
      setFrequencies(freqRes.items || []);
    });
  }, []);

  // Search fires once typing pauses
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((p) => (p.page === 1 ? p : { ...p, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Filters shared by the list and the export
  const buildQuery = useCallback(
    () => ({
      search: debouncedSearch || undefined,
      category: selectedCategory || undefined,
      frequency: selectedFrequency || undefined,
      mandatory: selectedMandatory || undefined,
      status: activeCard || undefined,
    }),
    [debouncedSearch, selectedCategory, selectedFrequency, selectedMandatory, activeCard]
  );

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await complianceRuleService.getRules({
        page: pagination.page,
        limit: pagination.limit,
        ...buildQuery(),
      });
      setRules(data.rules);
      setPagination((prev) => ({ ...prev, total: data.pagination.total }));

      // Status counts ignore the status filter, so the cards stay meaningful while one is selected
      const active = data.stats?.activeCount ?? 0;
      const inactive = data.stats?.inactiveCount ?? 0;
      const archived = data.stats?.archivedCount ?? 0;
      setMetrics({ total: active + inactive + archived, active, inactive, archived });
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch compliance rules');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, buildQuery, toast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const resetPage = () => setPagination((p) => ({ ...p, page: 1 }));

  const handleCardClick = (key: CardKey | 'total') => {
    setActiveCard(key === 'total' || key === activeCard ? '' : key);
    resetPage();
  };

  const handleResetFilters = () => {
    setSearch('');
    setActiveCard('');
    setSelectedCategory('');
    setSelectedFrequency('');
    setSelectedMandatory('');
    resetPage();
  };

  const hasActiveFilters = !!(search || activeCard || selectedCategory || selectedFrequency || selectedMandatory);

  const handleToggleStatus = async (rule: ComplianceRuleItem) => {
    setTogglingRuleId(rule._id);
    try {
      const res = await complianceRuleService.toggleRuleStatus(rule._id);
      toast.success(res.message || 'Rule status updated');
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change rule status');
    } finally {
      setTogglingRuleId(null);
    }
  };

  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    setIsDeleting(true);
    try {
      await complianceRuleService.deleteRule(ruleToDelete._id);
      toast.success(`Rule "${ruleToDelete.name}" deleted`);
      setRuleToDelete(null);
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete rule');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export every rule matching the current filters to CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // The API returns at most 100 rows per page, so collect every page
      const exportRows: ComplianceRuleItem[] = [];
      for (let page = 1; ; page++) {
        const batch = await complianceRuleService.getRules({ page, limit: 100, ...buildQuery() });
        exportRows.push(...batch.rules);
        if (page >= batch.pagination.totalPages || batch.rules.length === 0) break;
      }

      if (exportRows.length === 0) {
        toast.error('No compliance rules to export');
        return;
      }

      const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
      const names = (items?: MasterDataItem[]) => (items?.length ? items.map((i) => i.label || i.code).join('; ') : 'All');
      const headers = [
        'Code',
        'Name',
        'Category',
        'Frequency',
        'Renewal Cycle (Days)',
        'Mandatory',
        'Priority',
        'Status',
        'Entity Types',
        'Location Types',
        'States',
        'Required Documents',
        'Approval Required',
      ];
      const rows = exportRows.map((r) =>
        [
          r.code || '',
          r.name || '',
          r.category?.label || r.category?.code || '',
          r.frequency?.label || r.frequency?.code || '',
          r.renewalCycle === 0 ? 'One-time' : r.renewalCycle ?? '',
          r.mandatory ? 'Yes' : 'No',
          r.priority || 'medium',
          r.status || 'active',
          names(r.applicableEntityTypes),
          names(r.applicableLocationTypes),
          r.applicableStates?.length ? r.applicableStates.join('; ') : 'All',
          (r.requiredDocuments || []).map((d) => d.label).join('; '),
          r.requiresApproval ? `Yes (${r.approvalLevels || 1} level)` : 'No',
        ]
          .map(cell)
          .join(',')
      );

      // Byte-order mark so Excel reads the file as UTF-8
      const csv = '﻿' + [headers.map(cell).join(','), ...rows].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance_rules_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportRows.length} compliance ${exportRows.length === 1 ? 'rule' : 'rules'} to CSV`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to export compliance rules');
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<ComplianceRuleItem>[] = [
    {
      key: 'name',
      header: 'Rule',
      cell: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 flex-shrink-0">
            <Scale size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[260px]" title={row.name}>
              {row.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[260px]" title={row.code}>
              <span className="font-mono">{row.code}</span>
              {row.category && <span> · {row.category.label || row.category.code}</span>}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      cell: (row) => (
        <div className="text-xs whitespace-nowrap">
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {row.frequency?.label || row.frequency?.code || (
              <span className="text-rose-600 dark:text-rose-400">Frequency missing</span>
            )}
          </div>
          <div className="text-slate-500 dark:text-slate-400">{cycleText(row.renewalCycle)}</div>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Applies To',
      cell: (row) => {
        const locationTypes = listNames(row.applicableLocationTypes, 'All location types');
        const entityTypes = listNames(row.applicableEntityTypes, 'all entity types');
        const states = row.applicableStates?.length ? row.applicableStates.join(', ') : 'all states';
        return (
          <div className="text-xs max-w-[240px]">
            <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={locationTypes}>
              {locationTypes}
            </div>
            <div className="text-slate-500 dark:text-slate-400 truncate" title={`${entityTypes} · ${states}`}>
              {entityTypes} · {states}
            </div>
          </div>
        );
      },
    },
    {
      key: 'records',
      header: 'Records',
      cell: (row) =>
        (row.recordCount ?? 0) > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`${ROUTES.COMPLIANCE_RECORDS}?rule=${row._id}`);
            }}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            title="View the compliance records this rule drives"
          >
            {row.recordCount}
          </button>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">None</span>
        ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (row) => (
        <div className="whitespace-nowrap">
          <Badge variant={PRIORITY_VARIANT[row.priority] || 'default'} size="sm">
            {capitalise(row.priority || 'medium')}
          </Badge>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {row.mandatory ? 'Mandatory' : 'Recommended'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const isActive = row.status === 'active';
        const badge = (
          <Badge variant={isActive ? 'success' : row.status === 'inactive' ? 'warning' : 'default'} size="sm">
            {capitalise(row.status)}
          </Badge>
        );
        // Only roles that may change rules get the switch; archived rules are restored from the rule page
        if (!canUpdate || row.status === 'archived') return badge;
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${row.name}`}
              title={isActive ? 'Deactivate rule' : 'Activate rule'}
              disabled={togglingRuleId === row._id}
              onClick={() => handleToggleStatus(row)}
              className={`relative w-8 h-[18px] rounded-full transition-colors disabled:opacity-60 ${
                isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                  isActive ? 'translate-x-3.5' : ''
                }`}
              />
            </button>
            {badge}
          </div>
        );
      },
    },
    // Row actions only for roles that can use them
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (row: ComplianceRuleItem) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => navigate(`/compliance/rules/${row._id}/edit`)}
                    className="p-1.5 rounded text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit rule"
                    aria-label={`Edit ${row.name}`}
                  >
                    <Edit2 size={15} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setRuleToDelete(row)}
                    className="p-1.5 rounded text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete rule"
                    aria-label={`Delete ${row.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const cards: Array<{ key: CardKey | 'total'; label: string; value: number; color: string }> = [
    { key: 'total', label: 'Total Rules', value: metrics.total, color: 'text-slate-900 dark:text-white' },
    { key: 'active', label: 'Active', value: metrics.active, color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'inactive', label: 'Inactive', value: metrics.inactive, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'archived', label: 'Archived', value: metrics.archived, color: 'text-slate-600 dark:text-slate-300' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Compliance Rules</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Obligations, where they apply and how often they renew
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download size={15} />} onClick={handleExportCSV} isLoading={isExporting}>
            Export CSV
          </Button>
          <Button variant="outline" leftIcon={<RefreshCw size={15} />} onClick={fetchRules} isLoading={isLoading}>
            Refresh
          </Button>
          {canCreate && (
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => navigate(ROUTES.COMPLIANCE_RULE_CREATE)}>
              Create Rule
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards — click to filter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
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
              <div className={`text-xl font-bold mt-1 ${card.value > 0 ? card.color : 'text-slate-400 dark:text-slate-600'}`}>
                {card.value}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <Input
              placeholder="Search name, code or legal reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftAddon={<Search size={16} className="text-slate-400" />}
            />
          </div>

          <div className="w-48">
            <label className={LABEL_CLASS}>Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                resetPage();
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-44">
            <label className={LABEL_CLASS}>Frequency</label>
            <select
              value={selectedFrequency}
              onChange={(e) => {
                setSelectedFrequency(e.target.value);
                resetPage();
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Frequencies</option>
              {frequencies.map((frequency) => (
                <option key={frequency._id} value={frequency._id}>
                  {frequency.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className={LABEL_CLASS}>Type</label>
            <select
              value={selectedMandatory}
              onChange={(e) => {
                setSelectedMandatory(e.target.value);
                resetPage();
              }}
              className={SELECT_CLASS}
            >
              <option value="">All</option>
              <option value="true">Mandatory</option>
              <option value="false">Recommended</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={handleResetFilters} className="text-xs">
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Rules Table */}
      <Table<ComplianceRuleItem>
        id="compliance-rule-table"
        columns={columns}
        data={rules}
        keyExtractor={(item) => item._id}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/compliance/rules/${row._id}`)}
        emptyMessage={
          hasActiveFilters
            ? 'No rules match these filters.'
            : canCreate
            ? 'No compliance rules yet. Create the first one to start tracking obligations.'
            : 'No compliance rules yet.'
        }
        pagination={
          pagination.total > pagination.limit
            ? {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
              }
            : undefined
        }
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!ruleToDelete}
        onClose={() => !isDeleting && setRuleToDelete(null)}
        title="Delete Rule"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRuleToDelete(null)} disabled={isDeleting}>
              Keep Rule
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
              Delete Rule
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-sm text-rose-800 dark:text-rose-200">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <p>
            Delete <strong>{ruleToDelete?.name}</strong> ({ruleToDelete?.code})? This cannot be undone. A rule that
            compliance records use cannot be deleted; archive it instead.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ComplianceRuleListPage;
