import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  RefreshCw,
  AlertTriangle,
  Download,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { locationService, LocationItem, LocationHealth } from '@/services/locationService';
import { entityService, EntityItem } from '@/services/entityService';
import type { MasterDataItem } from '@/services/adminService';
import { lookupService } from '@/services/lookupService';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';

// Summary cards double as quick filters
type CardKey = 'active' | 'inactive' | 'attention';

const SELECT_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

// Full class names so Tailwind can see them
const scoreStyle = (percentage: number) =>
  percentage >= 80
    ? { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
    : percentage >= 60
    ? { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
    : { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };

const healthText = (health: LocationHealth) =>
  [
    [health.compliant, 'valid'],
    [health.expiringSoon, 'expiring'],
    [health.pending, 'pending'],
    [health.expired, 'expired'],
  ]
    .filter(([count]) => (count as number) > 0)
    .map(([count, label]) => `${count} ${label}`)
    .join(' · ');

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const LocationListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { can } = useAuth();
  const canCreate = can('location', 'create');
  const canUpdate = can('location', 'update');
  const canDelete = can('location', 'delete');

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCard, setActiveCard] = useState<CardKey | ''>('');
  // ?entity= lets other pages link to one entity's locations
  const [selectedEntity, setSelectedEntity] = useState(searchParams.get('entity') || '');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [metrics, setMetrics] = useState({ total: 0, active: 0, inactive: 0, attention: 0 });

  // Delete modal state
  const [locationToDelete, setLocationToDelete] = useState<LocationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter options
  useEffect(() => {
    Promise.all([
      entityService.getEntities({ limit: 100 }).catch(() => ({ entities: [] })),
      lookupService.getMasterData({ category: 'location_type' }).catch(() => ({ items: [] })),
      lookupService.getMasterData({ category: 'state' }).catch(() => ({ items: [] })),
    ]).then(([entitiesRes, typesRes, statesRes]) => {
      setEntities(entitiesRes.entities || []);
      setLocationTypes(typesRes.items || []);
      setStates(statesRes.items || []);
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
      entity: selectedEntity || undefined,
      locationType: selectedType || undefined,
      state: selectedState || undefined,
      status: activeCard === 'active' ? 'active' : activeCard === 'inactive' ? 'inactive' : selectedStatus || undefined,
      attention: activeCard === 'attention' ? ('true' as const) : undefined,
    }),
    [debouncedSearch, selectedEntity, selectedType, selectedState, selectedStatus, activeCard]
  );

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await locationService.getLocations({
        page: pagination.page,
        limit: pagination.limit,
        ...buildQuery(),
      });
      setLocations(data.locations);
      setPagination((prev) => ({ ...prev, total: data.pagination.total }));

      // Card counts describe the unfiltered-by-card view, so only refresh them when no card is active
      if (!activeCard) {
        setMetrics({
          total: data.pagination.total,
          active: data.pagination.activeCount ?? 0,
          inactive: data.pagination.inactiveCount ?? 0,
          attention: data.pagination.attentionCount ?? 0,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, buildQuery, activeCard, toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const resetPage = () => setPagination((p) => ({ ...p, page: 1 }));

  const handleCardClick = (key: CardKey | 'total') => {
    setActiveCard(key === 'total' || key === activeCard ? '' : key);
    setSelectedStatus('');
    resetPage();
  };

  const handleResetFilters = () => {
    setSearch('');
    setActiveCard('');
    setSelectedEntity('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedState('');
    resetPage();
  };

  const hasActiveFilters = !!(
    search ||
    activeCard ||
    selectedEntity ||
    selectedType ||
    selectedStatus ||
    selectedState
  );

  // Export every page of the current filter as CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // The API returns at most 100 rows per page, so collect every page
      const exportRows: LocationItem[] = [];
      for (let page = 1; ; page++) {
        const batch = await locationService.getLocations({ page, limit: 100, ...buildQuery() });
        exportRows.push(...batch.locations);
        if (page >= batch.pagination.totalPages || batch.locations.length === 0) break;
      }

      const headers = [
        'Location Name',
        'Location Code',
        'Entity',
        'Type',
        'City',
        'State',
        'Unit Manager',
        'Compliance Records',
        'Records Valid %',
        'Expired',
        'Status',
      ];
      const rows = exportRows.map((loc) =>
        [
          loc.name || '',
          loc.locationCode || loc.code || '',
          loc.entity?.name || '',
          loc.locationType?.label || loc.locationType?.code || '',
          loc.address?.city || '',
          loc.address?.state || '',
          loc.manager ? `${loc.manager.firstName} ${loc.manager.lastName}` : '',
          loc.health?.total ?? loc.complianceCount ?? 0,
          loc.health?.total ? loc.health.percentage : '',
          loc.health?.expired ?? 0,
          loc.status || 'active',
        ]
          .map(csvCell)
          .join(',')
      );

      // Byte-order mark so Excel reads the file as UTF-8
      const csv = '﻿' + [headers.map(csvCell).join(','), ...rows].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `locations_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportRows.length} ${exportRows.length === 1 ? 'location' : 'locations'} to CSV`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to export locations');
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;
    setIsDeleting(true);
    try {
      await locationService.deleteLocation(locationToDelete._id);
      toast.success(`Location "${locationToDelete.name}" deleted`);
      setLocationToDelete(null);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete location');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<LocationItem>[] = [
    {
      key: 'name',
      header: 'Location',
      cell: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 flex-shrink-0">
            <MapPin size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]" title={row.name}>
              {row.name}
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
              {row.locationCode || row.code}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      cell: (row) =>
        row.entity?._id ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/entities/${row.entity?._id}`);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:underline"
            title={row.entity.name}
          >
            <Building2 size={13} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="truncate max-w-[130px]">{row.entity.name}</span>
          </button>
        ) : (
          <span className="text-xs text-rose-600 dark:text-rose-400">Entity missing</span>
        ),
    },
    {
      key: 'locationType',
      header: 'Type',
      cell: (row) => (
        <span className="whitespace-nowrap">
          <Badge variant="info" size="sm">
            {row.locationType?.label || row.locationType?.code || '—'}
          </Badge>
        </span>
      ),
    },
    {
      key: 'address',
      header: 'City & State',
      cell: (row) => (
        <div className="text-xs whitespace-nowrap">
          <div className="font-medium text-slate-800 dark:text-slate-200">{row.address?.city || '—'}</div>
          <div className="text-slate-500 dark:text-slate-400">{row.address?.state || ''}</div>
        </div>
      ),
    },
    {
      key: 'manager',
      header: 'Manager',
      cell: (row) =>
        row.manager ? (
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
            {row.manager.firstName} {row.manager.lastName}
          </span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">Not assigned</span>
        ),
    },
    {
      key: 'health',
      header: 'Compliance',
      cell: (row) => {
        const health = row.health;
        if (!health || health.total === 0) {
          return <span className="text-xs text-slate-400 dark:text-slate-500">No records</span>;
        }
        const style = scoreStyle(health.percentage);
        return (
          <div className="min-w-[150px]">
            <div className="flex items-center gap-2">
              <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${health.percentage}%` }} />
              </div>
              <span className={`text-xs font-semibold ${style.text}`}>{health.percentage}%</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">
              {healthText(health)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge
          variant={row.status === 'active' ? 'success' : row.status === 'inactive' ? 'warning' : 'default'}
          size="sm"
        >
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    // Row actions only for roles that can use them
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (row: LocationItem) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => navigate(`/locations/${row._id}/edit`)}
                    className="p-1.5 rounded text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit location"
                    aria-label={`Edit ${row.name}`}
                  >
                    <Edit2 size={15} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setLocationToDelete(row)}
                    className="p-1.5 rounded text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete location"
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
    { key: 'total', label: 'Total Locations', value: metrics.total, color: 'text-slate-900 dark:text-white' },
    { key: 'active', label: 'Active', value: metrics.active, color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'inactive', label: 'Inactive', value: metrics.inactive, color: 'text-amber-600 dark:text-amber-400' },
    {
      key: 'attention',
      label: 'With Expired Compliance',
      value: metrics.attention,
      color: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <MapPin size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Locations</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Units, clinics and offices, with their compliance standing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download size={15} />} onClick={handleExportCSV} isLoading={isExporting}>
            Export CSV
          </Button>
          <Button variant="outline" leftIcon={<RefreshCw size={15} />} onClick={fetchLocations} isLoading={isLoading}>
            Refresh
          </Button>
          {canCreate && (
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => navigate(ROUTES.LOCATION_CREATE)}>
              Add Location
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
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search name, code, contact or city"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftAddon={<Search size={16} className="text-slate-400" />}
            />
          </div>

          <div className="w-44">
            <label className={LABEL_CLASS}>Entity</label>
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value);
                resetPage();
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Entities</option>
              {entities.map((entity) => (
                <option key={entity._id} value={entity._id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className={LABEL_CLASS}>Type</label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                resetPage();
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Types</option>
              {locationTypes.map((type) => (
                <option key={type._id} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className={LABEL_CLASS}>State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                resetPage();
              }}
              className={SELECT_CLASS}
            >
              <option value="">All States</option>
              {states.map((state) => (
                <option key={state._id} value={state.label}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-36">
            <label className={LABEL_CLASS}>Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setActiveCard('');
                resetPage();
              }}
              className={SELECT_CLASS}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={handleResetFilters} className="text-xs">
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Locations Table */}
      <Table<LocationItem>
        id="location-table"
        columns={columns}
        data={locations}
        keyExtractor={(item) => item._id}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/locations/${row._id}`)}
        emptyMessage={
          hasActiveFilters ? 'No locations match these filters.' : 'No locations yet. Add the first unit, clinic or office.'
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
        isOpen={!!locationToDelete}
        onClose={() => !isDeleting && setLocationToDelete(null)}
        title="Delete Location"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setLocationToDelete(null)} disabled={isDeleting}>
              Keep Location
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
              Delete Location
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-sm text-rose-800 dark:text-rose-200">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <p>
            Delete <strong>{locationToDelete?.name}</strong> ({locationToDelete?.locationCode || locationToDelete?.code})?
            This cannot be undone. A location that still has compliance records, tasks, documents, licences or
            sub-units cannot be deleted; set it to inactive instead.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default LocationListPage;
