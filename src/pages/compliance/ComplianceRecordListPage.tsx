import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Plus,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Calendar,
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
import {
  complianceRecordService,
  ComplianceRecordItem,
  ComplianceRecordStatus,
} from '@/services/complianceRecordService';
import { complianceRuleService, ComplianceRuleItem } from '@/services/complianceRuleService';
import { entityService, EntityItem } from '@/services/entityService';
import { locationService, LocationItem } from '@/services/locationService';
import { adminService, UserItem } from '@/services/adminService';

export const ComplianceRecordListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

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
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedRule, setSelectedRule] = useState('');
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
      locationService.getLocations({ limit: 100 }).catch(() => ({ locations: [] })),
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
          const locsForFirst = (locRes.locations || []).filter((l: any) => {
            const eId = typeof l.entity === 'string' ? l.entity : l.entity?._id;
            return eId === firstEnt;
          });
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

  // Fetch Compliance Records
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await complianceRecordService.getRecords({
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        status: selectedStatus || undefined,
        entity: selectedEntity || undefined,
        location: selectedLocation || undefined,
        rule: selectedRule || undefined,
        dueDateFrom: dueDateFrom || undefined,
        dueDateTo: dueDateTo || undefined,
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
    search,
    selectedStatus,
    selectedEntity,
    selectedLocation,
    selectedRule,
    dueDateFrom,
    dueDateTo,
    toast,
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handlers
  const handleResetFilters = () => {
    setSearch('');
    setSelectedStatus('');
    setSelectedEntity('');
    setSelectedLocation('');
    setSelectedRule('');
    setDueDateFrom('');
    setDueDateTo('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

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
      case 'expiring_soon':
        return <Badge variant="warning" size="sm">EXPIRING SOON</Badge>;
      case 'expired':
        return <Badge variant="danger" size="sm">EXPIRED</Badge>;
      case 'rejected':
        return <Badge variant="danger" size="sm">REJECTED</Badge>;
      case 'pending':
      default:
        return <Badge variant="warning" size="sm">PENDING</Badge>;
    }
  };

  // Table Columns
  const columns: Column<ComplianceRecordItem>[] = [
    {
      key: 'recordNumber',
      header: 'Record & Statutory Rule',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm flex-shrink-0">
            <ClipboardCheck size={16} />
          </div>
          <div>
            <div
              className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              onClick={() => navigate(`/compliance/records/${row._id}`)}
            >
              {row.rule?.name || 'Compliance Obligation'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{row.recordNumber}</span>
              <span className="text-slate-400">&bull;</span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.rule?.code}</span>
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
      key: 'dates',
      header: 'Due / Expiry Date',
      cell: (row) => {
        const dueDateObj = row.dueDate ? new Date(row.dueDate) : null;
        const expiryDateObj = row.expiryDate ? new Date(row.expiryDate) : null;
        const isOverdue = dueDateObj && dueDateObj.getTime() < Date.now() && row.status !== 'approved';

        return (
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className={isOverdue ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'} />
              <span className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                Due: {dueDateObj ? dueDateObj.toLocaleDateString() : '—'}
              </span>
            </div>
            {expiryDateObj && (
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Calendar size={11} />
                <span>Exp: {expiryDateObj.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'assignedUser',
      header: 'Assigned Stakeholder',
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
      cell: (row) => (
        <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <FileText size={13} className="text-sky-600 dark:text-sky-400" />
          <span>{row.documents?.length || 0} attached</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/compliance/records/${row._id}`)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="View Details & Documents"
          >
            <Eye size={15} />
          </button>
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
          <Button
            variant="outline"
            leftIcon={<Zap size={15} className="text-amber-500 dark:text-amber-400" />}
            onClick={() => setIsGenerateModalOpen(true)}
          >
            Auto-Generate for Unit
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Record
          </Button>
        </div>
      </div>

      {/* Real MongoDB Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Records</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{metrics.total || pagination.total || 0}</div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending Action</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{metrics.pending || 0}</div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Submitted</div>
          <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">{metrics.submitted || 0}</div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Under Review</div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{metrics.under_review || 0}</div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Approved & Active</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{metrics.approved || 0}</div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Expired / Overdue</div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{metrics.expired || 0}</div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search by record #, rule, notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              leftAddon={<Search size={16} className="text-slate-400" />}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Entity</label>
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Entities</option>
              {entities.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Locations</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rule Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Compliance Rule</label>
            <select
              value={selectedRule}
              onChange={(e) => {
                setSelectedRule(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Rules</option>
              {rules.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date From</label>
            <input
              type="date"
              value={dueDateFrom}
              onChange={(e) => {
                setDueDateFrom(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date To</label>
            <input
              type="date"
              value={dueDateTo}
              onChange={(e) => {
                setDueDateTo(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            {(search || selectedStatus || selectedEntity || selectedLocation || selectedRule || dueDateFrom || dueDateTo) && (
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Records Table */}
      <div className="overflow-hidden">
        <Table<ComplianceRecordItem>
          columns={columns}
          data={records}
          keyExtractor={(item) => item._id}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/compliance/records/${row._id}`)}
          emptyMessage="No compliance tracking records found. Initialize compliance for an operating facility."
        />

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 rounded-b-xl border border-slate-200 dark:border-slate-800 mt-2">
            <div>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
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
                const locs = locations.filter((l) => {
                  const eId = typeof l.entity === 'string' ? l.entity : l.entity?._id;
                  return eId === ent;
                });
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
                .filter((l) => {
                  if (!createForm.entity) return true;
                  const eId = typeof l.entity === 'string' ? l.entity : l.entity?._id;
                  return eId === createForm.entity;
                })
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Due Date"
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Statutory Expiry Date"
                type="date"
                value={createForm.expiryDate}
                onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
              />
            </div>
          </div>

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
