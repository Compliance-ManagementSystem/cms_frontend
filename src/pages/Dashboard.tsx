import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Building2,
  MapPin,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  CheckSquare,
  RefreshCw,
  Filter,
  X,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  Globe2,
  Loader2,
} from 'lucide-react';
import {
  dashboardService,
  DashboardData,
  DashboardFilters,
  DashboardLevel,
  FilterOptions,
} from '@/services/dashboardService';
import { ROUTES } from '@/constants/routes';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // ── Filters & Level State ──────────────────────────────────────────────────
  const [level, setLevel] = useState<DashboardLevel>('national');
  const [filters, setFilters] = useState<DashboardFilters>({
    period: '90d',
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    states: [],
    entities: [],
    locations: [],
    categories: [],
  });

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Fetch Filter Options on Mount ──────────────────────────────────────────
  useEffect(() => {
    dashboardService.getFilterOptions().then((opts) => {
      setFilterOptions(opts);
    }).catch((err) => {
      console.error('Failed to load filter options:', err);
    });
  }, []);

  // ── Fetch Dashboard Data ───────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const stats = await dashboardService.getDashboardStats(filters);
      setData(stats);
      setLevel(stats.level);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Filtered location options based on selected entity & state
  const availableLocations = useMemo(() => {
    return filterOptions.locations.filter((loc) => {
      if (filters.entity && loc.entityId !== filters.entity) return false;
      if (filters.state && loc.state?.toLowerCase() !== filters.state.toLowerCase()) return false;
      return true;
    });
  }, [filterOptions.locations, filters.entity, filters.state]);

  // ── Drill Down Handlers ────────────────────────────────────────────────────
  const handleSelectState = (stateName: string) => {
    setFilters((prev) => ({
      ...prev,
      state: stateName,
      location: undefined, // reset child location
    }));
  };

  const handleSelectEntity = (entityId: string) => {
    setFilters((prev) => ({
      ...prev,
      entity: entityId,
      location: undefined,
    }));
  };

  const handleSelectLocation = (locationId: string) => {
    setFilters((prev) => ({
      ...prev,
      location: locationId,
    }));
  };

  const handleResetToNational = () => {
    setFilters((prev) => ({
      period: prev.period,
    }));
  };

  const handleResetToState = () => {
    setFilters((prev) => ({
      period: prev.period,
      state: prev.state,
    }));
  };

  const handleResetToEntity = () => {
    setFilters((prev) => ({
      period: prev.period,
      state: prev.state,
      entity: prev.entity,
    }));
  };

  // ── Custom Tooltips for Recharts ──────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-500 dark:text-slate-400 capitalize">{entry.name}:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const kpis = data?.kpis;
  const traffic = data?.trafficLights;
  const charts = data?.charts;

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <div className="text-center">
          <p className="text-base font-medium text-slate-800 dark:text-slate-200">Loading Dashboard Analytics...</p>
          <p className="text-xs text-slate-500 mt-1">Aggregating live statutory records and compliance telemetry</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Level Bar & Interactive Drilldown Breadcrumbs ────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          {/* Breadcrumb Hierarchy */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1 flex-wrap">
            <button
              onClick={handleResetToNational}
              className={`flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium ${
                level === 'national' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''
              }`}
            >
              <Globe2 size={13} />
              National
            </button>

            {data?.selectedState && (
              <>
                <ChevronRight size={12} className="text-slate-400 dark:text-slate-600" />
                <button
                  onClick={handleResetToState}
                  className={`hover:text-indigo-600 dark:hover:text-indigo-400 font-medium ${
                    level === 'state' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''
                  }`}
                >
                  State: {data.selectedState}
                </button>
              </>
            )}

            {data?.selectedEntity && (
              <>
                <ChevronRight size={12} className="text-slate-400 dark:text-slate-600" />
                <button
                  onClick={handleResetToEntity}
                  className={`hover:text-indigo-600 dark:hover:text-indigo-400 font-medium ${
                    level === 'entity' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''
                  }`}
                >
                  Entity: {data.selectedEntity.name} ({data.selectedEntity.code})
                </button>
              </>
            )}

            {data?.selectedLocation && (
              <>
                <ChevronRight size={12} className="text-slate-400 dark:text-slate-600" />
                <span className="text-indigo-600 dark:text-indigo-300 font-bold">
                  Unit: {data.selectedLocation.name}
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            {level === 'national' && 'Pan-India National Compliance Dashboard'}
            {level === 'state' && `State Compliance Overview: ${data?.selectedState}`}
            {level === 'entity' && `Corporate Entity Dashboard: ${data?.selectedEntity?.name}`}
            {level === 'location' && `Facility Unit Audit: ${data?.selectedLocation?.name}`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated real-time metrics, statutory obligations, and risk traffic lights.
          </p>
        </div>

        {/* Dashboard Level Switcher Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs shadow-sm dark:shadow-none">
            <button
              onClick={() => handleResetToNational()}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                level === 'national'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              National
            </button>
            <button
              onClick={() => {
                if (filterOptions.states.length > 0 && !filters.state) {
                  handleSelectState(filterOptions.states[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                level === 'state'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              State
            </button>
            <button
              onClick={() => {
                if (filterOptions.entities.length > 0 && !filters.entity) {
                  handleSelectEntity(filterOptions.entities[0]._id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                level === 'entity'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Entity
            </button>
            <button
              onClick={() => {
                if (filterOptions.locations.length > 0 && !filters.location) {
                  handleSelectLocation(filterOptions.locations[0]._id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                level === 'location'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Unit
            </button>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 transition-all shadow-sm dark:shadow-none"
            title="Refresh dashboard"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
          </button>
        </div>
      </div>

      {/* ── Multi-dimension Filters Bar ───────────────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-2.5 text-xs shadow-sm dark:shadow-none">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mr-1 font-medium">
          <Filter size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>Filters:</span>
        </div>

        {/* State Filter */}
        <select
          value={filters.state || ''}
          onChange={(e) => setFilters({ ...filters, state: e.target.value || undefined, location: undefined })}
          className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All States</option>
          {filterOptions.states.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* Entity Filter */}
        <select
          value={filters.entity || ''}
          onChange={(e) => setFilters({ ...filters, entity: e.target.value || undefined, location: undefined })}
          className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Entities</option>
          {filterOptions.entities.map((ent) => (
            <option key={ent._id} value={ent._id}>
              {ent.name} ({ent.code})
            </option>
          ))}
        </select>

        {/* Location Filter */}
        <select
          value={filters.location || ''}
          onChange={(e) => setFilters({ ...filters, location: e.target.value || undefined })}
          className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Locations</option>
          {availableLocations.map((loc) => (
            <option key={loc._id} value={loc._id}>
              {loc.name} ({loc.code})
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={filters.category || ''}
          onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
          className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Categories</option>
          {filterOptions.categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
          className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="approved">Compliant (Approved)</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>

        {/* Period Selector */}
        <select
          value={filters.period || '90d'}
          onChange={(e) => setFilters({ ...filters, period: e.target.value as any })}
          className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last 1 Year</option>
          <option value="all">All Time</option>
        </select>

        {/* Reset Filter Button */}
        {(filters.state || filters.entity || filters.location || filters.category || filters.status) && (
          <button
            onClick={() => setFilters({ period: '90d' })}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors ml-auto"
          >
            <X size={13} />
            Reset
          </button>
        )}
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Entities */}
        <div
          onClick={() => navigate(ROUTES.ENTITIES)}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80 group shadow-sm dark:shadow-none"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Entities</span>
            <Building2 size={16} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{kpis?.totalEntities ?? 0}</p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Active Legal Units</span>
        </div>

        {/* Total Locations */}
        <div
          onClick={() => navigate(ROUTES.LOCATIONS)}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80 group shadow-sm dark:shadow-none"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Locations</span>
            <MapPin size={16} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{kpis?.totalLocations ?? 0}</p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Operating Facilities</span>
        </div>

        {/* Total Compliance Records */}
        <div
          onClick={() => navigate(ROUTES.COMPLIANCE_RECORDS)}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80 group shadow-sm dark:shadow-none"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Statutory Records</span>
            <ClipboardCheck size={16} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{kpis?.totalComplianceRecords ?? 0}</p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Under Tracking</span>
        </div>

        {/* Overall Compliance Health Score */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 dark:from-indigo-950/40 to-white dark:to-slate-900/60 border border-indigo-200 dark:border-indigo-500/30 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300">
            <span className="text-xs font-medium">Compliance Score</span>
            <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-indigo-950 dark:text-indigo-100">{kpis?.compliancePercentage ?? 0}%</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {kpis && kpis.compliancePercentage >= 80 ? 'Good' : 'Needs Action'}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (kpis?.compliancePercentage ?? 0) >= 80
                  ? 'bg-emerald-500'
                  : (kpis?.compliancePercentage ?? 0) >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${kpis?.compliancePercentage ?? 0}%` }}
            />
          </div>
        </div>

        {/* Open Tasks */}
        <div
          onClick={() => navigate(ROUTES.TASKS)}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80 group shadow-sm dark:shadow-none"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Open Tasks</span>
            <CheckSquare size={16} className="text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-sky-600 dark:text-sky-300 mt-2">{kpis?.openTasks ?? 0}</p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Pending Completion</span>
        </div>

        {/* Completed Tasks */}
        <div
          onClick={() => navigate(`${ROUTES.TASKS}?status=completed`)}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80 group shadow-sm dark:shadow-none"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Completed Tasks</span>
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300 mt-2">{kpis?.completedTasks ?? 0}</p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Successfully Resolved</span>
        </div>
      </div>

      {/* ── Traffic Light Risk Matrix ─────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full animate-pulse ${
                  traffic?.overallRating === 'green'
                    ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                    : traffic?.overallRating === 'yellow'
                    ? 'bg-amber-400 shadow-lg shadow-amber-400/50'
                    : traffic?.overallRating === 'orange'
                    ? 'bg-orange-500 shadow-lg shadow-orange-500/50'
                    : 'bg-rose-500 shadow-lg shadow-rose-500/50'
                }`}
              />
              Statutory Traffic Light Matrix
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (Overall Health Status:{' '}
              <strong className="uppercase text-slate-800 dark:text-slate-200">{traffic?.overallRating || 'green'}</strong>)
            </span>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-slate-500">Click any indicator to view filtered records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* GREEN: Compliant */}
          <div
            onClick={() => navigate(`${ROUTES.COMPLIANCE_RECORDS}?status=approved`)}
            className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-500 cursor-pointer transition-all hover:bg-emerald-100/60 dark:hover:bg-emerald-950/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Compliant</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Valid & Approved</p>
              </div>
            </div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-200">{traffic?.green ?? 0}</p>
          </div>

          {/* YELLOW: Expiring Soon */}
          <div
            onClick={() => navigate(`${ROUTES.COMPLIANCE_RECORDS}?status=expiring_soon`)}
            className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 hover:border-amber-500 cursor-pointer transition-all hover:bg-amber-100/60 dark:hover:bg-amber-950/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Expiring Soon</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Due within 30 days</p>
              </div>
            </div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-200">{traffic?.yellow ?? 0}</p>
          </div>

          {/* ORANGE: Pending */}
          <div
            onClick={() => navigate(`${ROUTES.COMPLIANCE_RECORDS}?status=pending`)}
            className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-500/30 hover:border-orange-500 cursor-pointer transition-all hover:bg-orange-100/60 dark:hover:bg-orange-950/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">Pending Action</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Review & Corrections</p>
              </div>
            </div>
            <p className="text-xl font-bold text-orange-700 dark:text-orange-200">{traffic?.orange ?? 0}</p>
          </div>

          {/* RED: Expired / Overdue */}
          <div
            onClick={() => navigate(`${ROUTES.COMPLIANCE_RECORDS}?status=expired`)}
            className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 hover:border-rose-500 cursor-pointer transition-all hover:bg-rose-100/60 dark:hover:bg-rose-950/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <AlertOctagon size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">Expired / Overdue</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Statutory breaches</p>
              </div>
            </div>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-200">{traffic?.red ?? 0}</p>
          </div>
        </div>
      </div>

      {/* ── Charts Grid (Row 1: Status Donut + State/Entity Breakdown) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Status Distribution (Donut Chart) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
              Compliance Status Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ratio of statutory records by lifecycle health</p>
          </div>

          <div className="h-64 my-2 relative flex items-center justify-center">
            {charts?.statusDistribution && charts.statusDistribution.reduce((sum, item) => sum + item.value, 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.statusDistribution}
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(entry) => {
                      if (entry.statusKey) {
                        navigate(`${ROUTES.COMPLIANCE_RECORDS}?status=${entry.statusKey}`);
                      }
                    }}
                    cursor="pointer"
                  >
                    {charts.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400 dark:text-slate-500 text-center">No compliance record data available</div>
            )}

            {/* Inner Center Label */}
            {charts?.statusDistribution && charts.statusDistribution.reduce((sum, item) => sum + item.value, 0) > 0 && (
              <div className="absolute text-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis?.compliancePercentage ?? 0}%</span>
                <span className="block text-[10px] text-slate-400">Compliant</span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800/80">
            {charts?.statusDistribution?.map((item) => (
              <div
                key={item.name}
                onClick={() => navigate(`${ROUTES.COMPLIANCE_RECORDS}?status=${item.statusKey}`)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-500 dark:text-slate-400 truncate">{item.name}:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* State-wise or Entity-wise Compliance Comparison Bar Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" />
                {level === 'national' ? 'State-wise Compliance Comparison' : 'Entity-wise Compliance Comparison'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {level === 'national'
                  ? 'Click any state bar to drill down into that state'
                  : 'Click any entity bar to drill down into that entity'}
              </p>
            </div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Interactive Drilldown</span>
          </div>

          <div className="h-72 mt-3">
            {level === 'national' && charts?.stateWiseCompliance && charts.stateWiseCompliance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.stateWiseCompliance}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  onClick={(e: any) => {
                    if (e && e.activeLabel) {
                      handleSelectState(e.activeLabel);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                  <XAxis dataKey="state" stroke="#64748b" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="compliant" name="Compliant" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="expiringSoon" name="Expiring Soon" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="#f97316" />
                  <Bar dataKey="expired" name="Expired" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : charts?.entityWiseCompliance && charts.entityWiseCompliance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.entityWiseCompliance}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]?.payload?.entityId) {
                      handleSelectEntity(e.activePayload[0].payload.entityId);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                  <XAxis dataKey="code" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="compliant" name="Compliant" stackId="a" fill="#10b981" />
                  <Bar dataKey="expiringSoon" name="Expiring Soon" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="#f97316" />
                  <Bar dataKey="expired" name="Expired" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                No breakdown data available for current selection.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts Grid (Row 2: Expiry Timeline Trends + Task Trends) ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiry Trends Timeline */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock size={16} className="text-amber-500 dark:text-amber-400" />
              Statutory Expiry Trends & Upcoming Renewals
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Projected statutory expiration volumes over upcoming months</p>
          </div>

          <div className="h-64">
            {charts?.expiryTrends && charts.expiryTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.expiryTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExpiring" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRenewed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="expiring"
                    name="Expiring Soon"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#colorExpiring)"
                  />
                  <Area
                    type="monotone"
                    dataKey="renewed"
                    name="Renewed / Approved"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorRenewed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                No trend data available.
              </div>
            )}
          </div>
        </div>

        {/* Task Remediation Trends */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
              Remediation Action Item Trends
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Task resolution and overdue remediation velocity</p>
          </div>

          <div className="h-64">
            {charts?.taskTrends && charts.taskTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.taskTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="open" name="Open" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                No task trend data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Location-wise Performance & Drilldown Table ─────────────────────── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MapPin size={16} className="text-indigo-600 dark:text-indigo-400" />
              Location Performance Drill-Down
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any location to inspect facility-level compliance obligations
            </p>
          </div>
          <button
            onClick={() => navigate(ROUTES.LOCATIONS)}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            View all locations <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Location / Unit</th>
                <th className="py-3 px-4 font-semibold">Entity</th>
                <th className="py-3 px-4 font-semibold">State</th>
                <th className="py-3 px-4 font-semibold">Records</th>
                <th className="py-3 px-4 font-semibold">Health Score</th>
                <th className="py-3 px-4 font-semibold">Status Breakdown</th>
                <th className="py-3 px-4 font-semibold text-right">Drill Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {charts?.locationWiseCompliance && charts.locationWiseCompliance.length > 0 ? (
                charts.locationWiseCompliance.map((loc) => {
                  const rating =
                    loc.expired > 0
                      ? 'red'
                      : loc.expiringSoon > 0
                      ? 'yellow'
                      : loc.pending > 0
                      ? 'orange'
                      : 'green';

                  return (
                    <tr
                      key={loc.locationId}
                      onClick={() => handleSelectLocation(loc.locationId)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              rating === 'green'
                                ? 'bg-emerald-500'
                                : rating === 'yellow'
                                ? 'bg-amber-500'
                                : rating === 'orange'
                                ? 'bg-orange-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                              {loc.name}
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono">{loc.code}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{loc.entityName || '—'}</td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                          {loc.state}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200">{loc.total}</td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                loc.percentage >= 80
                                ? 'bg-emerald-500'
                                : loc.percentage >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                              }`}
                              style={{ width: `${loc.percentage}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{loc.percentage}%</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium" title="Compliant">
                            {loc.compliant} ✓
                          </span>
                          <span className="text-slate-400 dark:text-slate-600">/</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium" title="Expiring Soon">
                            {loc.expiringSoon} ⏱
                          </span>
                          <span className="text-slate-400 dark:text-slate-600">/</span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium" title="Expired">
                            {loc.expired} ✗
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${ROUTES.COMPLIANCE_RECORDS}?location=${loc.locationId}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-medium transition-colors"
                        >
                          View Records →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No locations match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Critical Alerts & Urgent Attention ───────────────────────────────── */}
      {data?.criticalAlerts && data.criticalAlerts.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-rose-300 flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-400 animate-pulse" />
              Critical Statutory Action Items ({data.criticalAlerts.length})
            </h3>
            <span className="text-[11px] text-rose-400">Immediate Remediation Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/20 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <p className="font-semibold text-slate-100">{alert.title}</p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Facility: <span className="text-slate-300">{alert.locationName}</span> &middot; Entity:{' '}
                    <span className="text-slate-300">{alert.entityName}</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (alert.recordId) {
                      navigate(`/compliance/records/${alert.recordId}`);
                    } else if (alert.taskId) {
                      navigate(ROUTES.TASKS);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-medium flex-shrink-0 transition-colors"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
