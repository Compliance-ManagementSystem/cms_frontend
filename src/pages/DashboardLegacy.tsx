// The earlier compliance-health dashboard, kept for reference and no longer routed.
// The live dashboard is pages/Dashboard.tsx.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard,
  RefreshCw,
  ChevronRight,
  Globe2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table, { Column } from '@/components/ui/Table';
import {
  dashboardService,
  DashboardData,
  DashboardFilters,
  DashboardRating,
  FilterOptions,
  HealthCounts,
  LocationComplianceItem,
} from '@/services/dashboardService';
import { socketService } from '@/services/socketService';
import { useToast } from '@/hooks/useToast';
import { ROUTES } from '@/constants/routes';
import { formatRelativeDays } from '@/utils/dates';
import IndiaMap, { resolveStateId } from '@/components/charts/IndiaMap';
import { BUCKET_ORDER, BUCKET_LABELS, useChartTheme } from '@/components/charts/chartTheme';

// Record statuses behind the dashboard's "Pending Action" bucket
const PENDING_STATUSES = 'pending,submitted,resubmitted,under_review,correction,rejected,in_progress';

const RATING_META: Record<DashboardRating, { label: string; variant: 'success' | 'warning' | 'pending' | 'danger' }> = {
  green: { label: 'On track', variant: 'success' },
  yellow: { label: 'Renewals due', variant: 'warning' },
  orange: { label: 'Action pending', variant: 'pending' },
  red: { label: 'At risk', variant: 'danger' },
};

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

// Legend text stays in neutral ink; the swatch beside it carries the colour
const legendLabel = (value: string) => <span className="text-slate-600 dark:text-slate-300">{value}</span>;

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
      <p className="font-semibold text-slate-800 dark:text-slate-200">{payload[0]?.payload?.name || label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const chart = useChartTheme();

  const [filters, setFilters] = useState<DashboardFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    states: [],
    entities: [],
    locations: [],
    categories: [],
  });
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    dashboardService
      .getFilterOptions()
      .then(setFilterOptions)
      .catch(() => {});
  }, []);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await dashboardService.getDashboardStats(filters));
      setLoadError(null);
    } catch (err: any) {
      const message = err.message || 'Failed to load dashboard';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  // Load on filter change and whenever a record or task changes elsewhere
  useEffect(() => {
    fetchDashboard();
    const unsubRecord = socketService.on('compliance:status_changed', fetchDashboard);
    const unsubTask = socketService.on('task:assigned', fetchDashboard);
    return () => {
      unsubRecord();
      unsubTask();
    };
  }, [fetchDashboard]);

  // Location options follow the selected state and entity
  const availableLocations = useMemo(
    () =>
      filterOptions.locations.filter(
        (loc) =>
          (!filters.entity || loc.entityId === filters.entity) &&
          (!filters.state || loc.state?.toLowerCase() === filters.state.toLowerCase())
      ),
    [filterOptions.locations, filters.entity, filters.state]
  );

  const hasFilters = !!(filters.state || filters.entity || filters.location || filters.category);

  // Links into the records list carry the dashboard's entity / location selection
  const recordsLink = (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params);
    if (filters.entity) query.set('entity', filters.entity);
    if (filters.location) query.set('location', filters.location);
    const qs = query.toString();
    return qs ? `${ROUTES.COMPLIANCE_RECORDS}?${qs}` : ROUTES.COMPLIANCE_RECORDS;
  };

  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center">
        {loadError ? (
          <>
            <AlertTriangle size={28} className="text-rose-500" />
            <p className="text-sm text-slate-700 dark:text-slate-300">{loadError}</p>
            <Button variant="outline" leftIcon={<RefreshCw size={15} />} onClick={fetchDashboard}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</p>
          </>
        )}
      </div>
    );
  }

  const { kpis, charts, level, alerts } = data;
  const score = kpis.compliancePercentage;
  const rating = data.overallRating ? RATING_META[data.overallRating] : null;

  // One level of breakdown below the current view; clicking a bar drills into it
  const breakdown =
    level === 'state'
      ? {
          title: 'Compliance by Entity',
          xKey: 'code',
          rows: charts.entityWiseCompliance,
          onSelect: (row: any) => setFilters((prev) => ({ ...prev, entity: row.entityId, location: undefined })),
        }
      : level === 'entity'
      ? {
          title: 'Compliance by Location',
          xKey: 'code',
          rows: charts.locationWiseCompliance,
          onSelect: (row: any) => setFilters((prev) => ({ ...prev, location: row.locationId })),
        }
      : null;

  const selectState = (state: string) =>
    setFilters((prev) => ({ ...prev, state, location: undefined }));

  // Weakest states first, beside the map
  const statesByScore = [...charts.stateWiseCompliance].sort((a, b) => a.percentage - b.percentage);
  const unmappedStates = charts.stateWiseCompliance.filter((s) => !resolveStateId(s.state));

  // Where each health bucket leads in the records list
  const bucketLink = {
    compliant: recordsLink({ status: 'approved' }),
    pending: recordsLink({ status: PENDING_STATUSES }),
    expiringSoon: recordsLink({ expiringWithin: '30' }),
    expired: recordsLink({ status: 'expired' }),
  };
  const statusSlices = BUCKET_ORDER.map((bucket) => ({
    bucket,
    name: BUCKET_LABELS[bucket],
    value: kpis[bucket],
  }));

  // Stacked health bars, always in the validated colour order with a surface gap between segments
  const healthBars = (maxBarSize: number, horizontal = false) =>
    BUCKET_ORDER.map((bucket, index) => (
      <Bar
        key={bucket}
        isAnimationActive={false}
        dataKey={bucket}
        name={BUCKET_LABELS[bucket]}
        stackId="health"
        fill={chart.bucket[bucket]}
        stroke={chart.surface}
        strokeWidth={2}
        maxBarSize={maxBarSize}
        radius={index === BUCKET_ORDER.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : undefined}
      />
    ));

  const kpiCards: Array<{ label: string; value: number; hint: string; color: string; to: string }> = [
    {
      label: 'Expired',
      value: kpis.expired,
      hint: 'Validity has lapsed',
      color: 'text-rose-600 dark:text-rose-400',
      to: recordsLink({ status: 'expired' }),
    },
    {
      label: 'Expiring in 30 Days',
      value: kpis.expiringSoon,
      hint: 'Valid, renewal due',
      color: 'text-amber-600 dark:text-amber-400',
      to: recordsLink({ expiringWithin: '30' }),
    },
    {
      label: 'Pending Action',
      value: kpis.pending,
      hint: 'Applied or still to be applied',
      color: 'text-sky-600 dark:text-sky-400',
      to: recordsLink({ status: PENDING_STATUSES }),
    },
    {
      label: 'Overdue Tasks',
      value: kpis.overdueTasks,
      hint: 'Past their due date',
      color: 'text-rose-600 dark:text-rose-400',
      to: ROUTES.TASKS_OVERDUE,
    },
    {
      label: 'Active Tasks',
      value: kpis.openTasks,
      hint: 'Open or in progress',
      color: 'text-sky-600 dark:text-sky-400',
      to: ROUTES.TASKS,
    },
  ];

  const breakdownText = (counts: HealthCounts) =>
    [
      [counts.compliant, 'compliant'],
      [counts.expiringSoon, 'expiring'],
      [counts.pending, 'pending'],
      [counts.expired, 'expired'],
    ]
      .filter(([n]) => (n as number) > 0)
      .map(([n, label]) => `${n} ${label}`)
      .join(' · ') || '—';

  const locationColumns: Column<LocationComplianceItem>[] = [
    {
      key: 'name',
      header: 'Location',
      cell: (loc) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{loc.name}</div>
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">{loc.code}</div>
        </div>
      ),
    },
    { key: 'entityName', header: 'Entity', cell: (loc) => <span className="text-xs">{loc.entityName}</span> },
    { key: 'state', header: 'State', cell: (loc) => <span className="text-xs">{loc.state}</span> },
    { key: 'total', header: 'Records', cell: (loc) => <span className="font-semibold">{loc.total}</span> },
    {
      key: 'percentage',
      header: 'Score',
      cell: (loc) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreStyle(loc.percentage).bar}`}
              style={{ width: `${loc.percentage}%` }}
            />
          </div>
          <span className="text-xs font-semibold">{loc.percentage}%</span>
        </div>
      ),
    },
    {
      key: 'breakdown',
      header: 'Breakdown',
      cell: (loc) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{breakdownText(loc)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (loc) => (
        <Button
          variant="ghost"
          size="sm"
          rightIcon={<ArrowUpRight size={13} />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`${ROUTES.COMPLIANCE_RECORDS}?location=${loc.locationId}`);
          }}
        >
          Records
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Compliance Dashboard
              </h1>
              {rating && <Badge variant={rating.variant} size="md">{rating.label}</Badge>}
            </div>

            {/* Breadcrumb — each level returns to that view */}
            <nav aria-label="Dashboard level" className="flex items-center flex-wrap gap-1.5 text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ category: prev.category }))}
                className={`inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 ${
                  level === 'national' ? 'font-semibold text-slate-900 dark:text-slate-100' : ''
                }`}
              >
                <Globe2 size={13} />
                All locations
              </button>
              {data.selectedState && (
                <>
                  <ChevronRight size={12} className="text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ category: prev.category, state: prev.state }))}
                    className={`hover:text-indigo-600 dark:hover:text-indigo-400 ${
                      level === 'state' ? 'font-semibold text-slate-900 dark:text-slate-100' : ''
                    }`}
                  >
                    {data.selectedState}
                  </button>
                </>
              )}
              {data.selectedEntity && (
                <>
                  <ChevronRight size={12} className="text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, location: undefined }))}
                    className={`hover:text-indigo-600 dark:hover:text-indigo-400 ${
                      level === 'entity' ? 'font-semibold text-slate-900 dark:text-slate-100' : ''
                    }`}
                  >
                    {data.selectedEntity.name}
                  </button>
                </>
              )}
              {data.selectedLocation && (
                <>
                  <ChevronRight size={12} className="text-slate-400" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{data.selectedLocation.name}</span>
                </>
              )}
            </nav>
          </div>
        </div>

        <Button variant="outline" leftIcon={<RefreshCw size={15} />} onClick={fetchDashboard} isLoading={isLoading}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <label className={LABEL_CLASS}>State</label>
            <select
              value={filters.state || ''}
              onChange={(e) => setFilters({ ...filters, state: e.target.value || undefined, location: undefined })}
              className={SELECT_CLASS}
            >
              <option value="">All States</option>
              {filterOptions.states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className={LABEL_CLASS}>Entity</label>
            <select
              value={filters.entity || ''}
              onChange={(e) => setFilters({ ...filters, entity: e.target.value || undefined, location: undefined })}
              className={SELECT_CLASS}
            >
              <option value="">All Entities</option>
              {filterOptions.entities.map((entity) => (
                <option key={entity._id} value={entity._id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className={LABEL_CLASS}>Location</label>
            <select
              value={filters.location || ''}
              onChange={(e) => setFilters({ ...filters, location: e.target.value || undefined })}
              className={SELECT_CLASS}
            >
              <option value="">All Locations</option>
              {availableLocations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-48">
            <label className={LABEL_CLASS}>Category</label>
            <select
              value={filters.category || ''}
              onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
              className={SELECT_CLASS}
            >
              <option value="">All Categories</option>
              {filterOptions.categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <Button variant="ghost" onClick={() => setFilters({})} className="text-xs">
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Key numbers — each opens the matching list */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => navigate(recordsLink())}
          className="text-left p-4 rounded-xl border bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm dark:shadow-none transition-colors"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Compliance Score</div>
          {score === null ? (
            <>
              <div className="text-2xl font-bold text-slate-400 dark:text-slate-600 mt-1">—</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">No records in this view</div>
            </>
          ) : (
            <>
              <div className={`text-2xl font-bold mt-1 ${scoreStyle(score).text}`}>
                {score}%
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${scoreStyle(score).bar}`} style={{ width: `${score}%` }} />
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                {kpis.compliant + kpis.expiringSoon} of {kpis.total} records valid
              </div>
            </>
          )}
        </button>

        {kpiCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => navigate(card.to)}
            className="text-left p-4 rounded-xl border bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm dark:shadow-none transition-colors"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</div>
            <div className={`text-2xl font-bold mt-1 ${card.value > 0 ? card.color : 'text-slate-400 dark:text-slate-600'}`}>
              {card.value}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{card.hint}</div>
          </button>
        ))}
      </div>

      {/* Needs attention */}
      {alerts.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Needs Attention</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">({alerts.length})</span>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-start gap-3 min-w-0">
                  <Badge variant={alert.severity === 'critical' ? 'danger' : 'warning'} size="sm">
                    {alert.type === 'expired_compliance' ? 'Expired' : alert.type === 'overdue_task' ? 'Overdue task' : 'Critical task'}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={alert.title}>
                      {alert.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {alert.locationName} · {alert.entityName} · {formatRelativeDays(alert.date)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() =>
                    navigate(
                      alert.recordId
                        ? `${ROUTES.COMPLIANCE_RECORDS}/${alert.recordId}`
                        : `${ROUTES.TASKS}?task=${alert.taskId}`
                    )
                  }
                >
                  {alert.recordId ? 'Open record' : 'Open task'}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Row 1: where (map or next-level breakdown) + overall status mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {level === 'national' ? (
          <Card padding="md" className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Compliance by State</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Share of records currently valid. Select a state to drill down.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-3">
              <div className="md:col-span-3">
                <IndiaMap data={charts.stateWiseCompliance} onSelect={selectState} />
              </div>

              <div className="md:col-span-2">
                {statesByScore.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No compliance records yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto">
                    {statesByScore.map((state) => (
                      <li key={state.state}>
                        <button
                          type="button"
                          onClick={() => selectState(state.state)}
                          className="w-full flex items-center justify-between gap-3 py-2 px-1 text-left rounded hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {state.state}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {state.total} {state.total === 1 ? 'record' : 'records'}
                            </span>
                          </span>
                          <span className={`text-sm font-semibold ${scoreStyle(state.percentage).text}`}>
                            {state.percentage}%
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {unmappedStates.length > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Not shown on the map (state name not recognised): {unmappedStates.map((s) => s.state).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ) : breakdown ? (
          <Card padding="md" className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{breakdown.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select a bar to drill down</p>

            <div className="h-72 mt-3">
              {breakdown.rows.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={breakdown.rows}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    onClick={(e: any) => {
                      const row = e?.activePayload?.[0]?.payload;
                      if (row) breakdown.onSelect(row);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} opacity={0.25} vertical={false} />
                    <XAxis dataKey={breakdown.xKey} stroke={chart.axis} fontSize={11} />
                    <YAxis stroke={chart.axis} fontSize={11} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.grid, opacity: 0.1 }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={legendLabel} />
                    {healthBars(72)}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  No compliance records in this view.
                </div>
              )}
            </div>
          </Card>
        ) : null}

        <Card padding="md" className={level === 'location' ? 'lg:col-span-3' : ''}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status Mix</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All records by current health</p>

          {kpis.total === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No compliance records in this view.
            </div>
          ) : (
            <>
              <div className="h-52 relative flex items-center justify-center mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusSlices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      startAngle={90}
                      endAngle={-270}
                      stroke={chart.surface}
                      strokeWidth={2}
                      isAnimationActive={false}
                      cursor="pointer"
                      onClick={(slice: any) => navigate(bucketLink[slice.bucket as keyof typeof bucketLink])}
                    >
                      {statusSlices.map((slice) => (
                        <Cell key={slice.bucket} fill={chart.bucket[slice.bucket]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <span className="block text-2xl font-bold text-slate-900 dark:text-slate-100">{score}%</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">valid</span>
                </div>
              </div>

              <ul className="mt-3 space-y-1">
                {statusSlices.map((slice) => (
                  <li key={slice.bucket}>
                    <button
                      type="button"
                      onClick={() => navigate(bucketLink[slice.bucket])}
                      className="w-full flex items-center justify-between gap-3 px-1 py-1 rounded text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chart.bucket[slice.bucket] }} />
                        {slice.name}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {slice.value}
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          {' '}
                          ({Math.round((slice.value / kpis.total) * 100)}%)
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Row 2: what kind of obligation + when validity ends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Compliance by Category</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Records in each regulatory area by health</p>

          <div className="mt-3" style={{ height: Math.max(220, charts.categoryWiseCompliance.length * 44 + 70) }}>
            {charts.categoryWiseCompliance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.categoryWiseCompliance}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} opacity={0.25} horizontal={false} />
                  <XAxis type="number" stroke={chart.axis} fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke={chart.axis} fontSize={11} width={150} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.grid, opacity: 0.1 }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={legendLabel} />
                  {healthBars(26, true)}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No compliance records in this view.
              </div>
            )}
          </div>
        </Card>

        <Card padding="md">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upcoming Expiries</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Valid records by the month their validity ends, next 12 months
          </p>

          <div className="h-64 mt-3">
            {charts.upcomingExpiries.some((m) => m.expiring > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.upcomingExpiries} margin={{ top: 18, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} opacity={0.25} vertical={false} />
                  <XAxis dataKey="month" stroke={chart.axis} fontSize={10} interval={0} />
                  <YAxis stroke={chart.axis} fontSize={11} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.grid, opacity: 0.1 }} />
                  <Bar
                    isAnimationActive={false}
                    dataKey="expiring"
                    name="Expiring"
                    fill={chart.bucket.expiringSoon}
                    maxBarSize={32}
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="expiring"
                      position="top"
                      fontSize={11}
                      fill={chart.axis}
                      formatter={(value: number) => (value > 0 ? value : '')}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 text-center px-4">
                Nothing expires in the next 12 months.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: who is carrying the task load + how stale the backlog is */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="md" className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Task Workload by Assignee</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Active tasks per person, busiest first</p>

          <div className="mt-3" style={{ height: Math.max(200, charts.taskWorkload.length * 40 + 70) }}>
            {charts.taskWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.taskWorkload} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} opacity={0.25} horizontal={false} />
                  <XAxis type="number" stroke={chart.axis} fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke={chart.axis} fontSize={11} width={130} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.grid, opacity: 0.1 }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={legendLabel} />
                  <Bar
                    isAnimationActive={false}
                    dataKey="onTime"
                    name="On time"
                    stackId="load"
                    fill={chart.series}
                    stroke={chart.surface}
                    strokeWidth={2}
                    maxBarSize={24}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="overdue"
                    name="Overdue"
                    stackId="load"
                    fill={chart.critical}
                    stroke={chart.surface}
                    strokeWidth={2}
                    maxBarSize={24}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No active tasks in this view.
              </div>
            )}
          </div>
        </Card>

        <Card padding="md">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Overdue Task Age</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">How long overdue tasks have been waiting</p>

          <div className="h-56 mt-3">
            {kpis.overdueTasks > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.overdueAgeing} margin={{ top: 18, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} opacity={0.25} vertical={false} />
                  <XAxis dataKey="bucket" stroke={chart.axis} fontSize={11} />
                  <YAxis stroke={chart.axis} fontSize={11} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.grid, opacity: 0.1 }} />
                  <Bar
                    isAnimationActive={false}
                    dataKey="tasks"
                    name="Overdue tasks"
                    fill={chart.critical}
                    maxBarSize={48}
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList dataKey="tasks" position="top" fontSize={11} fill={chart.axis} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No overdue tasks.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Locations */}
      {level !== 'location' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Locations</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select a location to view its dashboard
            </p>
          </div>
          <Table<LocationComplianceItem>
            columns={locationColumns}
            data={charts.locationWiseCompliance}
            keyExtractor={(loc) => loc.locationId}
            onRowClick={(loc) => setFilters((prev) => ({ ...prev, location: loc.locationId }))}
            emptyMessage="No locations with compliance records in this view."
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
