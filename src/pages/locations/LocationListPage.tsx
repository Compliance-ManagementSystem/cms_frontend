import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Building2,
  RefreshCw,
  AlertTriangle,
  Layers,
  CheckCircle2,
  ClipboardCheck,
  User,
  Download,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { locationService, LocationItem } from '@/services/locationService';
import { entityService, EntityItem } from '@/services/entityService';
import { adminService, MasterDataItem } from '@/services/adminService';
import { ROUTES } from '@/constants/routes';

export const LocationListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters & Search with Debounce
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const [metrics, setMetrics] = useState({
    activeCount: 0,
    totalCompliance: 0,
  });

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<LocationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Fetch Filter Prerequisites (Entities, Master Data Location Types & States)
  useEffect(() => {
    Promise.all([
      entityService.getEntities({ limit: 100 }).catch(() => ({ entities: [] })),
      adminService.getMasterData({ category: 'location_type' }).catch(() => ({ items: [] })),
      adminService.getMasterData({ category: 'state' }).catch(() => ({ items: [] })),
    ])
      .then(([entitiesRes, typesRes, statesRes]) => {
        setEntities(entitiesRes.entities || []);
        setLocationTypes(
          (typesRes.items || []).filter((item: MasterDataItem) => item.status === 'active')
        );
        setStates(
          (statesRes.items || []).filter((item: MasterDataItem) => item.status === 'active')
        );
      })
      .catch((err) => {
        console.error('Failed to load location prerequisites', err);
      });
  }, []);

  // Fetch Locations with filtering & pagination
  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await locationService.getLocations({
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        entity: selectedEntity || undefined,
        locationType: selectedType || undefined,
        status: selectedStatus || undefined,
        state: selectedState || undefined,
      });
      setLocations(data.locations);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
      }));
      setMetrics({
        activeCount: data.pagination.activeCount ?? data.locations.filter((l) => l.status === 'active').length,
        totalCompliance: data.pagination.totalCompliance ?? data.locations.reduce((acc, curr) => acc + (curr.complianceCount || 0), 0),
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    search,
    selectedEntity,
    selectedType,
    selectedStatus,
    selectedState,
    toast,
  ]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Search input handler with 300ms debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(val);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
  };

  const handleEntityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEntity(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Export Locations to CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const exportData = await locationService.getLocations({
        page: 1,
        limit: 1000,
        search: search.trim() || undefined,
        entity: selectedEntity || undefined,
        locationType: selectedType || undefined,
        status: selectedStatus || undefined,
        state: selectedState || undefined,
      });

      const headers = ['Location Name', 'Location Code', 'Parent Entity', 'Type', 'City', 'State', 'Unit Manager', 'Compliances', 'Status'];
      const rows = exportData.locations.map((loc) => [
        `"${(loc.name || '').replace(/"/g, '""')}"`,
        `"${loc.locationCode || loc.code || ''}"`,
        `"${(loc.entity?.name || 'Unassigned').replace(/"/g, '""')}"`,
        `"${loc.locationType?.label || loc.locationType?.code || 'Location'}"`,
        `"${(loc.address?.city || '').replace(/"/g, '""')}"`,
        `"${(loc.address?.state || '').replace(/"/g, '""')}"`,
        `"${loc.manager ? `${loc.manager.firstName} ${loc.manager.lastName}` : 'Unassigned'}"`,
        loc.complianceCount ?? 0,
        loc.status || 'active',
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `locations_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Locations exported to CSV successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export locations');
    } finally {
      setIsExporting(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (loc: LocationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocationToDelete(loc);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!locationToDelete) return;
    setIsDeleting(true);
    try {
      await locationService.deleteLocation(locationToDelete._id);
      toast.success(`Location "${locationToDelete.name}" deleted successfully`);
      setIsDeleteModalOpen(false);
      setLocationToDelete(null);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete location');
    } finally {
      setIsDeleting(false);
    }
  };

  // Table Columns
  const columns: Column<LocationItem>[] = [
    {
      key: 'name',
      header: 'Location Name & Code',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-semibold text-sm shadow-sm">
            <MapPin size={16} />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {row.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[11px] text-slate-400">CODE:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-300 font-semibold">{row.locationCode || row.code}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Parent Entity',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          {row.entity?._id ? (
            <span
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer underline-offset-2 hover:underline truncate max-w-[160px]"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/entities/${row.entity?._id}`);
              }}
            >
              {row.entity.name}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'locationType',
      header: 'Type',
      cell: (row) => (
        <Badge variant="info" size="sm">
          {row.locationType?.label || row.locationType?.code || 'Location'}
        </Badge>
      ),
    },
    {
      key: 'address',
      header: 'City & State',
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
      key: 'manager',
      header: 'Unit Manager',
      cell: (row) => (
        <div className="text-xs">
          {row.manager ? (
            <div className="flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {row.manager.firstName} {row.manager.lastName}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 italic">Not Assigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'complianceCount',
      header: 'Compliances',
      align: 'center',
      cell: (row) => (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none">
          <ClipboardCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
          <span>{row.complianceCount ?? 0}</span>
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
        const statusLabel = row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Active';
        return (
          <Badge
            variant={variantMap[row.status] || 'default'}
            size="sm"
            dot
          >
            {statusLabel}
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
            onClick={() => navigate(`/locations/${row._id}/edit`)}
            className="text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 p-1.5"
            title="Edit Location"
          >
            <Edit2 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => openDeleteModal(row, e)}
            className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-red-400 p-1.5"
            title="Delete Location"
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
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <MapPin size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Location Master</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage operational units, clinics, corporate offices, and physical compliance sites.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={handleExportCSV}
            isLoading={isExporting}
            leftIcon={<Download size={15} />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={fetchLocations}
            leftIcon={<RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(ROUTES.LOCATION_CREATE)}
            leftIcon={<Plus size={16} />}
          >
            Add Location
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card.Stat
          label="Total Operational Units"
          value={pagination.total}
          icon={<MapPin size={20} />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/30"
        />
        <Card.Stat
          label="Active Operating Sites"
          value={metrics.activeCount}
          icon={<CheckCircle2 size={20} />}
          iconBg="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/30"
        />
        <Card.Stat
          label="Active Compliance Records"
          value={metrics.totalCompliance}
          icon={<ClipboardCheck size={20} />}
          iconBg="bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/30"
        />
        <Card.Stat
          label="Configured Location Types"
          value={locationTypes.length}
          icon={<Layers size={20} />}
          iconBg="bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/30"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card padding="md">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="w-full xl:max-w-sm">
            <Input
              placeholder="Search by name, code, contact or city..."
              value={searchInput}
              onChange={handleSearchChange}
              leftAddon={<Search size={16} className="text-slate-400" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Entity Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 size={15} className="text-slate-500 dark:text-slate-400 hidden sm:inline" />
              <select
                value={selectedEntity}
                onChange={handleEntityChange}
                aria-label="Filter by Entity"
                className="h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none min-w-[130px]"
              >
                <option value="">All Entities</option>
                {entities.map((ent) => (
                  <option key={ent._id} value={ent._id}>
                    {ent.name} ({ent.entityCode || ent.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Location Type Filter */}
            <div className="flex items-center gap-1.5">
              <Filter size={15} className="text-slate-500 dark:text-slate-400 hidden sm:inline" />
              <select
                value={selectedType}
                onChange={handleTypeChange}
                aria-label="Filter by Location Type"
                className="h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none min-w-[130px]"
              >
                <option value="">All Types</option>
                {locationTypes.map((type) => (
                  <option key={type._id} value={type.code}>
                    {type.label} ({type.code})
                  </option>
                ))}
              </select>
            </div>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={handleStateChange}
              aria-label="Filter by State"
              className="h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none min-w-[110px]"
            >
              <option value="">All States</option>
              {states.map((s) => (
                <option key={s._id} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={handleStatusChange}
              aria-label="Filter by Status"
              className="h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none min-w-[110px]"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Location Data Table */}
      <Table
        id="location-table"
        columns={columns}
        data={locations}
        keyExtractor={(item) => item._id}
        isLoading={isLoading}
        emptyMessage="No locations found matching your filter criteria."
        onRowClick={(row) => navigate(`/locations/${row._id}`)}
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
        title="Delete Operational Unit"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-start gap-3">
            <AlertTriangle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-red-800 dark:text-red-200">
              <span className="font-semibold block mb-1">Warning: Irreversible Action</span>
              Are you sure you want to delete location{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">{locationToDelete?.name}</strong> (
              <span className="font-mono text-red-600 dark:text-red-300 font-semibold">{locationToDelete?.locationCode || locationToDelete?.code}</span>
              )?
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Deleting this location will remove its linkage under parent entity{' '}
            <strong className="text-slate-800 dark:text-slate-200">{locationToDelete?.entity?.name}</strong> and update audit records.
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

export default LocationListPage;
