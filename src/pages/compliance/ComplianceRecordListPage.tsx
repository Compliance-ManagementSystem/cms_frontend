import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Building2,
  MapPin,
  FileText,
  User,
  Zap,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { daysFromToday } from '@/utils/dates';
import {
  complianceRecordService,
  ComplianceRecordItem,
  ComplianceRecordStatus,
} from '@/services/complianceRecordService';
import { complianceRuleService, ComplianceRuleItem } from '@/services/complianceRuleService';
import { entityService, EntityItem } from '@/services/entityService';
import { locationService, LocationItem, operatesAt } from '@/services/locationService';
import { adminService, UserItem } from '@/services/adminService';
import { FEATURES } from '@/constants/features';

// Summary cards double as quick filters over one or more statuses
interface MetricCard {
  key: string;
  label: string;
  color: string;
  statuses?: ComplianceRecordStatus[];
  overdue?: boolean;
}

// The five statuses of the Location Master sheet
const SHEET_METRIC_CARDS: MetricCard[] = [
  { key: 'total', label: 'Total Records', color: 'text-slate-900 dark:text-white' },
  { key: 'pending', label: 'To Be Applied', color: 'text-amber-600 dark:text-amber-400', statuses: ['pending'] },
  { key: 'applied', label: 'Applied', color: 'text-indigo-600 dark:text-indigo-400', statuses: ['in_progress'] },
  {
    key: 'approved',
    label: 'Approved',
    color: 'text-emerald-600 dark:text-emerald-400',
    statuses: ['approved', 'expiring_soon'],
  },
  { key: 'expired', label: 'Expired', color: 'text-rose-600 dark:text-rose-400', statuses: ['expired'] },
  {
    key: 'not_applicable',
    label: 'Not Applicable',
    color: 'text-slate-500 dark:text-slate-400',
    statuses: ['not_applicable'],
  },
];

const WORKFLOW_METRIC_CARDS: MetricCard[] = [
  { key: 'total', label: 'Total Records', color: 'text-slate-900 dark:text-white' },
  { key: 'pending', label: 'Pending Action', color: 'text-amber-600 dark:text-amber-400', statuses: ['pending'] },
  {
    key: 'correction',
    label: 'Needs Correction',
    color: 'text-orange-600 dark:text-orange-400',
    statuses: ['correction', 'rejected'],
  },
  {
    key: 'review',
    label: 'In Review',
    color: 'text-indigo-600 dark:text-indigo-400',
    statuses: ['submitted', 'resubmitted', 'under_review'],
  },
  {
    key: 'approved',
    label: 'Approved',
    color: 'text-emerald-600 dark:text-emerald-400',
    statuses: ['approved', 'expiring_soon'],
  },
  { key: 'expired', label: 'Expired', color: 'text-rose-600 dark:text-rose-400', statuses: ['expired'] },
  { key: 'overdue', label: 'Overdue', color: 'text-rose-600 dark:text-rose-400', overdue: true },
];

const METRIC_CARDS = FEATURES.recordApprovalWorkflow ? WORKFLOW_METRIC_CARDS : SHEET_METRIC_CARDS;

const SHEET_STATUS_OPTIONS = [
  { value: 'pending', label: 'To Be Applied' },
  { value: 'in_progress', label: 'Applied' },
  { value: 'approved,expiring_soon', label: 'Approved' },
  { value: 'expired', label: 'Expired' },
  { value: 'not_applicable', label: 'Not Applicable' },
];

const WORKFLOW_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'Applied' },
  { value: 'not_applicable', label: 'Not Applicable' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'correction', label: 'Needs Correction' },
  { value: 'resubmitted', label: 'Resubmitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_OPTIONS = FEATURES.recordApprovalWorkflow ? WORKFLOW_STATUS_OPTIONS : SHEET_STATUS_OPTIONS;

const SELECT_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none';

const refId = (ref?: string | { _id: string }) => (typeof ref === 'string' ? ref : ref?._id);

export const ComplianceRecordListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can('compliance_record', 'create');
  const canDelete = can('compliance_record', 'delete');

  const [records, setRecords] = useState<ComplianceRecordItem[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filter prerequisites
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [rules, setRules] = useState<ComplianceRuleItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Initial filters can come from the URL, so dashboard drill-downs open a filtered list:
  // ?status=a,b  ?card=<key>  ?overdue=true  ?entity=<id>  ?location=<id>  ?expiringWithin=<days>
  const [searchParams] = useSearchParams();
  const [activeCard, setActiveCard] = useState(
    searchParams.get('overdue') === 'true' ? 'overdue' : searchParams.get('card') || ''
  );
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [selectedEntity, setSelectedEntity] = useState(searchParams.get('entity') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || '');
  const [expiringWithinDays, setExpiringWithinDays] = useState(
    Number(searchParams.get('expiringWithin')) || 0
  );
  const [selectedRule, setSelectedRule] = useState(searchParams.get('rule') || '');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    entity: '',
    location: '',
    rule: '',
    assignedUser: '',
    dueDate: '',
    expiryDate: '',
    comments: '',
  });

  // Generate for Location Modal state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateLocationId, setGenerateLocationId] = useState('');

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ComplianceRecordItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load filter options
  useEffect(() => {
    Promise.all([
      entityService.getEntities({ limit: 100 }).catch(() => ({ entities: [] })),
      locationService.getAllLocations({ sortBy: 'name', sortOrder: 'asc' }).catch(() => ({ locations: [] })),
      complianceRuleService.getRules({ limit: 100, status: 'active' }).catch(() => ({ rules: [] })),
      adminService.getUsers({ limit: 100 }).catch(() => ({ users: [] })),
    ])
      .then(([entRes, locRes, rulesRes, usersRes]) => {
        setEntities(entRes.entities || []);
        setLocations(locRes.locations || []);
        setRules(rulesRes.rules || []);
        setUsers(usersRes.users || []);

        if (entRes.entities?.length > 0 && !createForm.entity) {
          const firstEnt = entRes.entities[0]._id;
          const locsForFirst = (locRes.locations || []).filter((l) => operatesAt(l, firstEnt));
          setCreateForm((prev) => ({
            ...prev,
            entity: firstEnt,
            location: locsForFirst[0]?._id || '',
            rule: rulesRes.rules?.[0]?._id || '',
          }));
        }
      })
      .catch((err) => {
        console.error('Failed to load compliance filter options', err);
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

  // Fetch Compliance Records
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const card = METRIC_CARDS.find((c) => c.key === activeCard);
      const data = await complianceRecordService.getRecords({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
        status:
          card?.statuses?.join(',') ||
          selectedStatus ||
          (expiringWithinDays ? 'approved,expiring_soon' : undefined),
        expiryDateFrom: expiringWithinDays
          ? new Date().toISOString()
          : (!FEATURES.recordAssignment && dueDateFrom) || undefined,
        expiryDateTo: expiringWithinDays
          ? new Date(Date.now() + expiringWithinDays * 24 * 60 * 60 * 1000).toISOString()
          : (!FEATURES.recordAssignment && dueDateTo) || undefined,
        overdue: card?.overdue ? 'true' : undefined,
        entity: selectedEntity || undefined,
        location: selectedLocation || undefined,
        rule: selectedRule || undefined,
        // Without due dates the date range filters on expiry instead (above)
        dueDateFrom: (FEATURES.recordAssignment && dueDateFrom) || undefined,
        dueDateTo: (FEATURES.recordAssignment && dueDateTo) || undefined,
      });

      setRecords(data.records);
      setMetrics(data.metrics || {});
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
      }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch compliance records');
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearch,
    activeCard,
    selectedStatus,
    selectedEntity,
    selectedLocation,
    selectedRule,
    dueDateFrom,
    dueDateTo,
    expiringWithinDays,
    toast,
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handlers
  const handleResetFilters = () => {
    setSearch('');
    setActiveCard('');
    setSelectedStatus('');
    setSelectedEntity('');
    setSelectedLocation('');
    setSelectedRule('');
    setDueDateFrom('');
    setDueDateTo('');
    setExpiringWithinDays(0);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleCardClick = (key: string) => {
    setActiveCard(key === 'total' || key === activeCard ? '' : key);
    setSelectedStatus('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const metricValue = (card: MetricCard) =>
    card.overdue
      ? metrics.overdue || 0
      : card.statuses
      ? card.statuses.reduce((sum, st) => sum + (metrics[st] || 0), 0)
      : metrics.total || 0;

  // Location options follow the selected entity
  const filterLocations = selectedEntity
    ? locations.filter((l) => operatesAt(l, selectedEntity))
    : locations;

  const hasActiveFilters = !!(
    search ||
    activeCard ||
    selectedStatus ||
    selectedEntity ||
    selectedLocation ||
    selectedRule ||
    dueDateFrom ||
    dueDateTo ||
    expiringWithinDays
  );

  // Create record submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.entity || !createForm.location || !createForm.rule) {
      toast.error('Entity, Location, and Compliance Rule are required');
      return;
    }

    setIsCreating(true);
    try {
      await complianceRecordService.createRecord({
        entity: createForm.entity,
        location: createForm.location,
        rule: createForm.rule,
        assignedUser: createForm.assignedUser || undefined,
        dueDate: createForm.dueDate || undefined,
        expiryDate: createForm.expiryDate || undefined,
        comments: createForm.comments || undefined,
      });
      toast.success('Compliance tracking record created successfully');
      setIsCreateModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create compliance record');
    } finally {
      setIsCreating(false);
    }
  };

  // Generate applicable records for a location
  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateLocationId) {
      toast.error('Please select a target operational location');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await complianceRecordService.generateRecordsForLocation(generateLocationId);
      toast.success(res.message || 'Generated compliance obligations for location');
      setIsGenerateModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate location compliance obligations');
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete
  const confirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await complianceRecordService.deleteRecord(recordToDelete._id);
      toast.success(`Record ${recordToDelete.recordNumber} deleted`);
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  // Status Badge Mapper
  const renderStatusBadge = (status: ComplianceRecordStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" size="sm">APPROVED</Badge>;
      case 'submitted':
        return <Badge variant="info" size="sm">SUBMITTED</Badge>;
      case 'under_review':
        return <Badge variant="info" size="sm">UNDER REVIEW</Badge>;
      case 'correction':
        return <Badge variant="warning" size="sm">NEEDS CORRECTION</Badge>;
      case 'resubmitted':
        return <Badge variant="info" size="sm">RESUBMITTED</Badge>;
      case 'expiring_soon':
        return <Badge variant="warning" size="sm">EXPIRING SOON</Badge>;
      case 'expired':
        return <Badge variant="danger" size="sm">EXPIRED</Badge>;
      case 'rejected':
        return <Badge variant="danger" size="sm">REJECTED</Badge>;
      case 'in_progress':
        return <Badge variant="info" size="sm">APPLIED</Badge>;
      case 'not_applicable':
        return <Badge variant="default" size="sm">NOT APPLICABLE</Badge>;
      case 'pending':
      default:
        return (
          <Badge variant="warning" size="sm">
            {FEATURES.recordApprovalWorkflow ? 'PENDING' : 'TO BE APPLIED'}
          </Badge>
        );
    }
  };

  // Table Columns
  const allColumns: Column<ComplianceRecordItem>[] = [
    {
      key: 'recordNumber',
      header: 'Record',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm flex-shrink-0">
            <ClipboardCheck size={16} />
          </div>
          <div className="min-w-0">
            <div
              className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[280px]"
              title={row.rule?.name}
            >
              {row.rule?.name || 'Compliance Obligation'}
            </div>
            <div className="text-xs mt-0.5 whitespace-nowrap font-mono text-indigo-600 dark:text-indigo-300 font-semibold">
              {row.recordNumber}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Entity & Location',
      cell: (row) => (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
            <Building2 size={12} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="truncate max-w-[150px]">{row.entity?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <MapPin size={12} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="truncate max-w-[150px]">{row.location?.name || '—'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <span className="whitespace-nowrap">{renderStatusBadge(row.status)}</span>,
    },
    {
      key: 'expiry',
      header: 'Expiry',
      cell: (row) => {
        const days = row.expiryDate ? daysFromToday(row.expiryDate) : null;
        const tracked = ['approved', 'expiring_soon', 'expired'].includes(row.status);
        return (
          <div className="text-xs flex items-center gap-2 whitespace-nowrap">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Clock size={12} className="text-slate-500 dark:text-slate-400" />
              {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '—'}
            </span>
            {tracked && days !== null && days < 0 && (
              <Badge variant="danger" size="sm">Expired {Math.abs(days)}d ago</Badge>
            )}
            {tracked && days !== null && days >= 0 && days <= 30 && (
              <Badge variant="warning" size="sm">{days === 0 ? 'Expires today' : `Expires in ${days}d`}</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'dates',
      header: 'Due / Expiry',
      cell: (row) => {
        const awaitingUnit = ['pending', 'correction', 'rejected'].includes(row.status);
        const days = row.dueDate ? daysFromToday(row.dueDate) : null;
        const isOverdue = awaitingUnit && days !== null && days < 0;
        const isDueSoon = awaitingUnit && days !== null && days >= 0 && days <= 14;

        return (
          <div className="text-xs space-y-1 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Clock size={12} className="text-slate-500 dark:text-slate-400" />
                {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}
              </span>
              {isOverdue && (
                <Badge variant="danger" size="sm">Overdue {Math.abs(days!)}d</Badge>
              )}
              {isDueSoon && (
                <Badge variant="warning" size="sm">{days === 0 ? 'Due today' : `Due in ${days}d`}</Badge>
              )}
            </div>
            {row.expiryDate && (
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                Expires {new Date(row.expiryDate).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'assignedUser',
      header: 'Assignee',
      cell: (row) => (
        <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <User size={13} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span>{row.assignedUser?.fullName || row.assignedUser?.email || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      key: 'documents',
      header: 'Documents',
      cell: (row) => {
        const required = row.rule?.requiredDocuments || [];
        const attached = row.documents || [];

        if (required.length === 0) {
          return (
            <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
              <FileText size={13} className="text-sky-600 dark:text-sky-400" />
              <span>{attached.length} attached</span>
            </div>
          );
        }

        const attachedTypes = new Set(attached.map((d) => refId(d.documentType)));
        const provided = required.filter((r) => attachedTypes.has(refId(r.documentType))).length;
        const complete = provided === required.length;

        return (
          <div
            className={`text-xs flex items-center gap-1.5 whitespace-nowrap font-medium ${
              complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            <FileText size={13} />
            <span>
              {provided} / {required.length} required
            </span>
          </div>
        );
      },
    },
    // The row itself opens the record, so the only row action is delete
    ...(canDelete
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (row: ComplianceRecordItem) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRecordToDelete(row);
                  setIsDeleteModalOpen(true);
                }}
                className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Delete Record"
              >
                <Trash2 size={15} />
              </button>
            ),
          },
        ]
      : []),
  ];

  // Due dates and assignees are switched off: show expiry on its own instead
  const hiddenColumns = FEATURES.recordAssignment ? ['expiry'] : ['dates', 'assignedUser'];
  const columns = allColumns.filter((column) => !hiddenColumns.includes(column.key));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Compliance Records</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Track entity and facility statutory obligations, manage documents, and process approvals
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={15} />}
            onClick={() => fetchRecords()}
            isLoading={isLoading}
          >
            Refresh
          </Button>
          {canCreate && (
            <>
              {FEATURES.recordAutoGenerate && (
                <Button
                  variant="outline"
                  leftIcon={<Zap size={15} className="text-amber-500 dark:text-amber-400" />}
                  onClick={() => setIsGenerateModalOpen(true)}
                >
                  Auto-Generate for Unit
                </Button>
              )}
              {FEATURES.recordManualCreate && (
                <Button
                  variant="primary"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  New Record
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary cards — click to filter */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${METRIC_CARDS.length > 6 ? 'xl:grid-cols-7' : 'xl:grid-cols-6'} gap-3`}>
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
              <div className={`text-xl font-bold mt-1 ${card.color}`}>{metricValue(card)}</div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <Input
              placeholder="Search record # or notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftAddon={<Search size={16} className="text-slate-400" />}
            />
          </div>

          <div className="w-32">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setActiveCard('');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Statuses</option>
              {/* A status set from a dashboard link that is not one of the options */}
              {selectedStatus && !STATUS_OPTIONS.some((option) => option.value === selectedStatus) && (
                <option value={selectedStatus}>
                  {selectedStatus.includes(',') ? 'Multiple statuses' : selectedStatus.replace(/_/g, ' ')}
                </option>
              )}
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Entity</label>
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value);
                setSelectedLocation('');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Entities</option>
              {entities.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Locations</option>
              {filterLocations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Compliance Rule</label>
            <select
              value={selectedRule}
              onChange={(e) => {
                setSelectedRule(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Rules</option>
              {rules.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {FEATURES.recordAssignment ? 'Due between' : 'Expires between'}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label={FEATURES.recordAssignment ? 'Due date from' : 'Expiry date from'}
                value={dueDateFrom}
                max={dueDateTo || undefined}
                onChange={(e) => {
                  setDueDateFrom(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`${SELECT_CLASS} !w-[124px] !px-2 !text-xs h-[38px]`}
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                aria-label={FEATURES.recordAssignment ? 'Due date to' : 'Expiry date to'}
                value={dueDateTo}
                min={dueDateFrom || undefined}
                onChange={(e) => {
                  setDueDateTo(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`${SELECT_CLASS} !w-[124px] !px-2 !text-xs h-[38px]`}
              />
            </div>
          </div>

          {expiringWithinDays > 0 && (
            <button
              type="button"
              onClick={() => {
                setExpiringWithinDays(0);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 text-amber-800 dark:text-amber-200"
              title="Remove this filter"
            >
              Expiring within {expiringWithinDays} days ✕
            </button>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" onClick={handleResetFilters} className="text-xs">
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Records Table */}
      <Table<ComplianceRecordItem>
        columns={columns}
        data={records}
        keyExtractor={(item) => item._id}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/compliance/records/${row._id}`)}
        emptyMessage={
          hasActiveFilters
            ? 'No compliance records match these filters.'
            : 'No compliance tracking records found. Initialize compliance for an operating facility.'
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

      {/* Create Compliance Record Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Initialize Compliance Record"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateSubmit}
              isLoading={isCreating}
            >
              Create Record
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Corporate Entity *
            </label>
            <select
              value={createForm.entity}
              onChange={(e) => {
                const ent = e.target.value;
                const locs = locations.filter((l) => operatesAt(l, ent));
                setCreateForm({
                  ...createForm,
                  entity: ent,
                  location: locs[0]?._id || '',
                });
              }}
              required
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">-- Choose Entity --</option>
              {entities.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} ({e.entityCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Operational Location *
            </label>
            <select
              value={createForm.location}
              onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
              required
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">-- Choose Location --</option>
              {locations
                .filter((l) => !createForm.entity || operatesAt(l, createForm.entity))
                .map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name} ({l.locationCode})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Compliance Rule *
            </label>
            <select
              value={createForm.rule}
              onChange={(e) => setCreateForm({ ...createForm, rule: e.target.value })}
              required
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">-- Choose Rule --</option>
              {rules.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          <div className={FEATURES.recordAssignment ? 'grid grid-cols-2 gap-3' : ''}>
            {FEATURES.recordAssignment && (
              <div>
                <Input
                  label="Due Date"
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                />
              </div>
            )}
            <div>
              <Input
                label="Expiry Date"
                type="date"
                value={createForm.expiryDate}
                onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
              />
            </div>
          </div>

{FEATURES.recordAssignment && (
                    <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Assigned Stakeholder
            </label>
            <select
              value={createForm.assignedUser}
              onChange={(e) => setCreateForm({ ...createForm, assignedUser: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">-- Unassigned --</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName || `${u.firstName} ${u.lastName}`} ({u.role?.name || u.email})
                </option>
              ))}
            </select>
          </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Initial Notes / Comments
            </label>
            <textarea
              rows={2}
              value={createForm.comments}
              onChange={(e) => setCreateForm({ ...createForm, comments: e.target.value })}
              placeholder="Initial statutory tracking instructions..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* Auto-Generate Obligations Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Auto-Generate Compliance Obligations"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsGenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateSubmit}
              isLoading={isGenerating}
              leftIcon={<Zap size={15} />}
            >
              Generate Obligations
            </Button>
          </div>
        }
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Select an operational location. The <strong>Rule Evaluation Engine</strong> will analyze the facility's
            state, location type, and parent entity structure to initialize all statutory compliance tracking records.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Target Operational Unit *
            </label>
            <select
              value={generateLocationId}
              onChange={(e) => setGenerateLocationId(e.target.value)}
              required
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">-- Choose Facility / Location --</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name} ({l.locationCode}) - {l.address?.city || ''} {l.address?.state || ''}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Compliance Record"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
              Delete Record
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-sm">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div>
            <p className="font-semibold text-rose-900 dark:text-rose-200">Confirm Record Removal</p>
            <p className="mt-1 text-xs text-rose-700 dark:text-rose-300/80">
              Are you sure you want to delete compliance record <strong>{recordToDelete?.recordNumber}</strong>?
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ComplianceRecordListPage;
