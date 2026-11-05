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
  CheckCircle2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import RecordStatus from '@/components/ui/RecordStatus';
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
import { FEATURES } from '@/constants/features';
import { adminService } from '@/services/adminService';
import { UPLOAD_ACCEPT, pickUploadFile } from '@/utils/validation';
import { getErrorMessage } from '@/utils/errors';

// Summary cards double as quick filters over one or more statuses
interface MetricCard {
  key: string;
  label: string;
  color: string;
  statuses?: ComplianceRecordStatus[];
  overdue?: boolean;
}

// The five statuses of the Location Master sheet
const METRIC_CARDS: MetricCard[] = [
  { key: 'total', label: 'Total Records', color: 'text-slate-900 dark:text-white' },
  { key: 'pending', label: 'To Be Applied', color: 'text-amber-600 dark:text-amber-400', statuses: ['pending'] },
  {
    key: 'ready_to_apply',
    label: 'Ready to Apply',
    color: 'text-cyan-600 dark:text-cyan-400',
    statuses: ['ready_to_apply'],
  },
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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'To Be Applied' },
  { value: 'ready_to_apply', label: 'Ready to Apply' },
  { value: 'in_progress', label: 'Applied' },
  { value: 'approved,expiring_soon', label: 'Approved' },
  { value: 'expired', label: 'Expired' },
  { value: 'not_applicable', label: 'Not Applicable' },
];

const SELECT_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none';

export const ComplianceRecordListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can('compliance_record', 'create');
  const canDelete = can('compliance_record', 'delete');
  const canUpdateStatus = can('compliance_record', 'update');

  const [records, setRecords] = useState<ComplianceRecordItem[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filter prerequisites
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [rules, setRules] = useState<ComplianceRuleItem[]>([]);

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
  const [selectedState, setSelectedState] = useState(searchParams.get('state') || '');
  const [selectedCom, setSelectedCom] = useState(searchParams.get('com') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || '');
  const [expiringWithinDays, setExpiringWithinDays] = useState(Number(searchParams.get('expiringWithin')) || 0);
  const [selectedRule, setSelectedRule] = useState(searchParams.get('rule') || '');
  // Arriving from a dashboard figure: closed units are left out, so the list matches the figure
  const [liveUnitsOnly, setLiveUnitsOnly] = useState(searchParams.get('units') === 'live');
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
    comments: '',
  });

  // Mark as Applied: a ready record's next step, straight from the list
  const [recordToApply, setRecordToApply] = useState<ComplianceRecordItem | null>(null);
  const [applyForm, setApplyForm] = useState({ acknowledgementNumber: '', comments: '' });
  const [applyFile, setApplyFile] = useState<File | null>(null);
  const [isApplying, setIsApplying] = useState(false);

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
    ])
      .then(([entRes, locRes, rulesRes]) => {
        setEntities(entRes.entities || []);
        setLocations(locRes.locations || []);
        setRules(rulesRes.rules || []);

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
          card?.statuses?.join(',') || selectedStatus || (expiringWithinDays ? 'approved,expiring_soon' : undefined),
        expiryDateFrom: expiringWithinDays ? new Date().toISOString() : dueDateFrom || undefined,
        expiryDateTo: expiringWithinDays
          ? new Date(Date.now() + expiringWithinDays * 24 * 60 * 60 * 1000).toISOString()
          : dueDateTo || undefined,
        overdue: card?.overdue ? 'true' : undefined,
        entity: selectedEntity || undefined,
        location: selectedLocation || undefined,
        state: selectedState || undefined,
        com: selectedCom || undefined,
        rule: selectedRule || undefined,
        units: liveUnitsOnly ? 'live' : undefined,
      });

      setRecords(data.records);
      setMetrics(data.metrics || {});
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
      }));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch compliance records'));
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
    selectedState,
    selectedCom,
    selectedLocation,
    selectedRule,
    dueDateFrom,
    dueDateTo,
    expiringWithinDays,
    liveUnitsOnly,
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
    setSelectedState('');
    setSelectedCom('');
    setSelectedLocation('');
    setSelectedRule('');
    setDueDateFrom('');
    setDueDateTo('');
    setExpiringWithinDays(0);
    setLiveUnitsOnly(false);
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
  // States come from the units on file; the unit list follows the chosen entity and state
  const stateOptions = [...new Set(locations.map((l) => l.address?.state?.trim()).filter(Boolean) as string[])].sort();
  const sameState = (l: LocationItem) =>
    !selectedState || l.address?.state?.trim().toLowerCase() === selectedState.toLowerCase();
  // COMs come from the units too, each listed once
  const comOptions = [...new Set(locations.map((l) => l.com?.trim()).filter(Boolean) as string[])].sort();
  const filterLocations = locations.filter(
    (l) =>
      (!selectedEntity || operatesAt(l, selectedEntity)) &&
      sameState(l) &&
      (!selectedCom || l.com?.trim() === selectedCom)
  );

  const hasActiveFilters = !!(
    search ||
    activeCard ||
    selectedStatus ||
    selectedEntity ||
    selectedState ||
    selectedCom ||
    selectedLocation ||
    selectedRule ||
    dueDateFrom ||
    dueDateTo ||
    expiringWithinDays ||
    liveUnitsOnly
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
        comments: createForm.comments || undefined,
      });
      toast.success('Compliance tracking record created successfully');
      setIsCreateModalOpen(false);
      fetchRecords();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create compliance record'));
    } finally {
      setIsCreating(false);
    }
  };

  const openMarkApplied = (row: ComplianceRecordItem) => {
    setRecordToApply(row);
    setApplyForm({ acknowledgementNumber: '', comments: '' });
    setApplyFile(null);
  };

  // Same as Applied on the record page: the acknowledgement number and its copy are both required
  const confirmMarkApplied = async () => {
    if (!recordToApply) return;
    const acknowledgementNumber = applyForm.acknowledgementNumber.trim();
    if (!acknowledgementNumber) {
      toast.error('Enter the acknowledgement number');
      return;
    }
    if (!applyFile) {
      toast.error('Upload the acknowledgement');
      return;
    }

    setIsApplying(true);
    try {
      const res = await complianceRecordService.updateRecordStatus(recordToApply._id, {
        status: 'in_progress',
        acknowledgementNumber,
        comments: applyForm.comments.trim() || undefined,
      });

      try {
        const formData = new FormData();
        formData.append('file', applyFile);
        formData.append('name', `Acknowledgement - ${acknowledgementNumber}`);
        formData.append('entity', recordToApply.entity._id);
        formData.append('location', recordToApply.location._id);
        formData.append('complianceRecord', recordToApply._id);
        formData.append('type', 'ACKNOWLEDGEMENT');
        const types = await adminService.getMasterData({ category: 'document_type' }).catch(() => ({ items: [] }));
        const documentTypeId = (types.items || []).find(
          (type: { code: string }) => type.code === 'ACKNOWLEDGEMENT'
        )?._id;
        if (documentTypeId) formData.append('documentType', documentTypeId);
        await complianceRecordService.uploadDocument(formData);
        toast.success(res.message || 'Marked as Applied');
      } catch (err) {
        toast.error(
          `Marked as Applied, but the acknowledgement could not be uploaded: ${getErrorMessage(err, 'unknown error')}`
        );
      }

      setRecordToApply(null);
      fetchRecords();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not mark the record as Applied'));
    } finally {
      setIsApplying(false);
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
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete record'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Status Badge Mapper
  const renderStatusBadge = (status: ComplianceRecordStatus) => <RecordStatus status={status} />;

  // Table Columns
  const columns: Column<ComplianceRecordItem>[] = [
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
      cell: (row) => renderStatusBadge(row.status),
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
              <Badge variant="danger" size="sm">
                Expired {Math.abs(days)}d ago
              </Badge>
            )}
            {tracked && days !== null && days >= 0 && days <= 30 && (
              <Badge variant="warning" size="sm">
                {days === 0 ? 'Expires today' : `Expires in ${days}d`}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'documents',
      header: 'Documents',
      cell: (row) => {
        const attached = (row.documents || []).length;
        const checklist = row.checklist;
        // The checklist only matters until the licence is filed: other records keep the plain count
        if (!checklist || checklist.total === 0 || !['pending', 'ready_to_apply'].includes(row.status)) {
          return (
            <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
              <FileText size={13} className="text-sky-600 dark:text-sky-400" />
              <span>{attached} attached</span>
            </div>
          );
        }

        const complete = checklist.mandatoryTotal > 0 && checklist.mandatoryDone === checklist.mandatoryTotal;
        const share = checklist.mandatoryTotal > 0 ? (checklist.mandatoryDone / checklist.mandatoryTotal) * 100 : 0;
        return (
          <div
            className="w-32"
            title={`${checklist.mandatoryDone} of ${checklist.mandatoryTotal} mandatory documents uploaded (${checklist.done} of ${checklist.total} in all)`}
          >
            <div
              className={`text-xs flex items-center gap-1.5 whitespace-nowrap font-medium ${
                complete ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {complete ? (
                <CheckCircle2 size={13} />
              ) : (
                <FileText size={13} className="text-sky-600 dark:text-sky-400" />
              )}
              <span>
                {checklist.mandatoryDone} / {checklist.mandatoryTotal} required
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${complete ? 'bg-cyan-500' : 'bg-amber-400'}`}
                style={{ width: `${share}%` }}
              />
            </div>
          </div>
        );
      },
    },
    // The row itself opens the record; its own actions are the next step and delete
    ...(canDelete || canUpdateStatus
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (row: ComplianceRecordItem) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {row.status === 'ready_to_apply' && canUpdateStatus && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMarkApplied(row)}
                    className="whitespace-nowrap"
                  >
                    Mark as Applied
                  </Button>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      setRecordToDelete(row);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    title="Delete Record"
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
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Compliance Records
              </h1>
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
              {FEATURES.recordManualCreate && (
                <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsCreateModalOpen(true)}>
                  New Record
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary cards — click to filter */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 ${METRIC_CARDS.length > 6 ? 'xl:grid-cols-7' : 'xl:grid-cols-6'} gap-3`}
      >
        {METRIC_CARDS.map((card) => {
          const isActive = card.key === activeCard;
          // Records with every document in, waiting to be filed
          const waiting = card.key === 'ready_to_apply' && metricValue(card) > 0;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => handleCardClick(card.key)}
              aria-pressed={isActive}
              className={`text-left p-3 rounded-xl border shadow-sm dark:shadow-none transition-colors ${
                waiting ? 'bg-cyan-50 dark:bg-cyan-900/20' : 'bg-white dark:bg-slate-900/50'
              } ${
                isActive
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                  : waiting
                    ? 'border-cyan-300 dark:border-cyan-700/60 hover:border-cyan-400 dark:hover:border-cyan-600'
                    : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{card.label}</div>
                {/* Records waiting to be filed get a live dot, so nobody misses them */}
                {waiting && (
                  <span className="relative flex w-2 h-2" aria-hidden>
                    <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-75" />
                    <span className="relative w-2 h-2 rounded-full bg-cyan-500" />
                  </span>
                )}
              </div>
              <div className={`text-xl font-bold mt-1 ${card.color}`}>{metricValue(card)}</div>
              {waiting && (
                <div className="text-[10px] font-medium text-cyan-700 dark:text-cyan-300 mt-0.5">
                  {metricValue(card)} waiting to be filed
                </div>
              )}
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
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                // A unit from another state would leave the list empty
                setSelectedLocation('');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={SELECT_CLASS}
            >
              <option value="">All States</option>
              {/* A state from a dashboard link before the units have loaded */}
              {selectedState && !stateOptions.some((state) => state.toLowerCase() === selectedState.toLowerCase()) && (
                <option value={selectedState}>{selectedState}</option>
              )}
              {stateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">COM</label>
            <select
              value={selectedCom}
              onChange={(e) => {
                setSelectedCom(e.target.value);
                setSelectedLocation('');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={SELECT_CLASS}
            >
              <option value="">All COMs</option>
              {selectedCom && !comOptions.includes(selectedCom) && <option value={selectedCom}>{selectedCom}</option>}
              {comOptions.map((com) => (
                <option key={com} value={com}>
                  {com}
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
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Expires between</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="Expiry date from"
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
                aria-label="Expiry date to"
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

          {liveUnitsOnly && (
            <button
              type="button"
              onClick={() => {
                setLiveUnitsOnly(false);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-600/40 text-indigo-800 dark:text-indigo-200"
              title="Closed units are left out, as on the dashboard. Remove to see every record."
            >
              Open and planned units only ✕
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
            <Button variant="primary" onClick={handleCreateSubmit} isLoading={isCreating}>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!recordToApply}
        onClose={() => !isApplying && setRecordToApply(null)}
        title="Mark as Applied"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRecordToApply(null)} disabled={isApplying}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmMarkApplied} isLoading={isApplying}>
              Mark as Applied
            </Button>
          </div>
        }
      >
        {recordToApply && (
          <div className="space-y-4">
            <div className="rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 p-3 text-sm">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{recordToApply.rule?.name}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {recordToApply.recordNumber} · {recordToApply.entity?.name} · {recordToApply.location?.name}
              </div>
            </div>

            <Input
              label="Acknowledgement Number"
              value={applyForm.acknowledgementNumber}
              onChange={(e) => setApplyForm((prev) => ({ ...prev, acknowledgementNumber: e.target.value }))}
              placeholder="As printed on the acknowledgement"
              required
            />

            <div>
              <label
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                htmlFor="apply-acknowledgement-file"
              >
                Upload Acknowledgement *
              </label>
              <input
                id="apply-acknowledgement-file"
                type="file"
                accept={UPLOAD_ACCEPT}
                onChange={(e) => setApplyFile(pickUploadFile(e, toast.error))}
                className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 dark:file:bg-indigo-500/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                htmlFor="apply-comments"
              >
                Comments
              </label>
              <textarea
                id="apply-comments"
                rows={2}
                value={applyForm.comments}
                onChange={(e) => setApplyForm((prev) => ({ ...prev, comments: e.target.value }))}
                placeholder="Optional"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </Modal>

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
