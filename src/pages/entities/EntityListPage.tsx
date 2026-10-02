import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Download,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { entityService, EntityItem } from '@/services/entityService';
import { adminService, MasterDataItem } from '@/services/adminService';
import { ROUTES } from '@/constants/routes';

export const EntityListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [entityTypes, setEntityTypes] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<EntityItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [totalLocationsCount, setTotalLocationsCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch Entity Types from Master Data
  useEffect(() => {
    adminService
      .getMasterData({ category: 'entity_type' })
      .then((res) => setEntityTypes(res.items.filter((item: MasterDataItem) => item.status === 'active')))
      .catch((err) => {
        console.error('Failed to load entity types', err);
      });
  }, []);

  // Fetch Entities with filtering & pagination
  const fetchEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await entityService.getEntities({
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        entityType: selectedType || undefined,
        status: selectedStatus || undefined,
      });
      setEntities(data.entities);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
      }));
      setActiveCount(data.pagination.activeCount ?? 0);
      setTotalLocationsCount(data.pagination.totalLocations ?? 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch entities');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, selectedType, selectedStatus, toast]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Handle Search Input (debounced 300ms)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(val);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Export Entities to CSV
  const handleExportCSV = () => {
    if (entities.length === 0) {
      toast.warning('No entities available to export');
      return;
    }
    const headers = [
      'Entity Name',
      'Entity Code',
      'Classification',
      'Owner',
      'Contact Person',
      'Contact Email',
      'Contact Phone',
      'City',
      'State',
      'Status',
      'Units / Locations',
    ];
    const rows = entities.map((ent) => [
      `"${(ent.name || '').replace(/"/g, '""')}"`,
      `"${ent.entityCode || ent.code || ''}"`,
      `"${(ent.entityType?.label || ent.entityType?.code || '').replace(/"/g, '""')}"`,
      `"${(ent.owner?.fullName || (ent.owner ? `${ent.owner.firstName} ${ent.owner.lastName}` : '') || '').replace(/"/g, '""')}"`,
      `"${(ent.contactPerson || '').replace(/"/g, '""')}"`,
      `"${ent.contactEmail || ''}"`,
      `"${ent.contactPhone || ''}"`,
      `"${(ent.address?.city || '').replace(/"/g, '""')}"`,
      `"${(ent.address?.state || '').replace(/"/g, '""')}"`,
      `"${ent.status || ''}"`,
      ent.locationCount || 0,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `entities_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Entities exported to CSV successfully');
  };

  // Open Delete Modal
  const openDeleteModal = (entity: EntityItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEntityToDelete(entity);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!entityToDelete) return;
    setIsDeleting(true);
    try {
      await entityService.deleteEntity(entityToDelete._id);
      toast.success(`Entity "${entityToDelete.name}" deleted successfully`);
      setIsDeleteModalOpen(false);
      setEntityToDelete(null);
      fetchEntities();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete entity');
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics
  const totalCount = pagination.total;
  const totalLocations =
    totalLocationsCount ||
    entities.reduce((acc, curr) => acc + (curr.locationCount || 0), 0);

  // Table Columns
  const columns: Column<EntityItem>[] = [
    {
      key: 'name',
      header: 'Entity Name & Code',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-semibold text-sm shadow-sm">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
              {row.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[11px] text-slate-400">CODE:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{row.entityCode || row.code}</span>
              {row.cin && (
                <>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">CIN: {row.cin}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'entityType',
      header: 'Type',
      cell: (row) => (
        <Badge variant="info" size="sm">
          {row.entityType?.label || row.entityType?.code || 'N/A'}
        </Badge>
      ),
    },
    {
      key: 'location',
      header: 'HQ Location',
      cell: (row) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800 dark:text-slate-200">{row.address?.city || '—'}</div>
          <div className="text-slate-500 dark:text-slate-400">
            {row.address?.district ? `${row.address.district}, ` : ''}
            {row.address?.state || ''}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <div className="text-xs">
          {row.contactPerson && (
            <div className="font-medium text-slate-800 dark:text-slate-200">{row.contactPerson}</div>
          )}
          <div className="text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{row.contactEmail}</div>
        </div>
      ),
    },
    {
      key: 'locationCount',
      header: 'Units / Locations',
      align: 'center',
      cell: (row) => (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none">
          <MapPin size={13} className="text-indigo-600 dark:text-indigo-400" />
          <span>{row.locationCount ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (row) => {
        const variantMap: Record<string, 'success' | 'warning' | 'default'> = {
          active: 'success',
          inactive: 'warning',
          archived: 'default',
        };
        return (
          <Badge
            variant={variantMap[row.status] || 'default'}
            size="sm"
            dot
          >
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/entities/${row._id}/edit`)}
            className="text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 p-1.5"
            title="Edit Entity"
          >
            <Edit2 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => openDeleteModal(row, e)}
            className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-red-400 p-1.5"
            title="Delete Entity"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Entity Management</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage enterprise business entities, legal units, and organizational hierarchies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={handleExportCSV}
            leftIcon={<Download size={15} />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={fetchEntities}
            leftIcon={<RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(ROUTES.ENTITY_CREATE)}
            leftIcon={<Plus size={16} />}
          >
            Add Entity
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card.Stat
          label="Total Registered Entities"
          value={totalCount}
          icon={<Building2 size={20} />}
          iconBg="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/30"
        />
        <Card.Stat
          label="Active Operating Entities"
          value={activeCount}
          icon={<CheckCircle2 size={20} />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/30"
        />
        <Card.Stat
          label="Associated Locations / Units"
          value={totalLocations}
          icon={<MapPin size={20} />}
          iconBg="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/30"
        />
        <Card.Stat
          label="Configured Entity Types"
          value={entityTypes.length}
          icon={<Layers size={20} />}
          iconBg="bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/30"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search by entity name, code, contact or city..."
              value={searchInput}
              onChange={handleSearchChange}
              leftAddon={<Search size={16} className="text-slate-400" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Entity Type Filter */}
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-500 dark:text-slate-400" />
              <select
                value={selectedType}
                onChange={handleTypeChange}
                aria-label="Filter by Entity Type"
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              >
                <option value="">All Entity Types</option>
                {entityTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.label} ({type.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={handleStatusChange}
              aria-label="Filter by Status"
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Entity Data Table */}
      <Table
        id="entity-table"
        columns={columns}
        data={entities}
        keyExtractor={(item) => item._id}
        isLoading={isLoading}
        emptyMessage="No entities found matching your filter criteria."
        onRowClick={(row) => navigate(`/entities/${row._id}`)}
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          onPageChange: (newPage) => setPagination((prev) => ({ ...prev, page: newPage })),
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Business Entity"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-start gap-3">
            <AlertTriangle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-red-800 dark:text-red-200">
              <span className="font-semibold block mb-1">Warning: Irreversible Action</span>
              Are you sure you want to delete entity{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">{entityToDelete?.name}</strong> (
              <span className="font-mono text-red-600 dark:text-red-300 font-semibold">{entityToDelete?.entityCode || entityToDelete?.code}</span>
              )?
            </div>
          </div>

          {entityToDelete && (entityToDelete.locationCount ?? 0) > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
              This entity has <strong>{entityToDelete.locationCount}</strong> active location(s) assigned.
              You must reassign or remove all dependent locations before this entity can be deleted.
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Deleting this entity will update system audit records and remove administrative access scopes.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={confirmDelete}
              isLoading={isDeleting}
              leftIcon={<Trash2 size={16} />}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EntityListPage;
