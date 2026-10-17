import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard,
  RefreshCw,
  ChevronRight,
  Box,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  dashboardService,
  OperationsDashboardData,
  OperationsFilters,
  LicenceBucket,
  UnitBucket,
  StateComplianceItem,
} from '@/services/dashboardService';
import { socketService } from '@/services/socketService';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import { daysFromToday } from '@/utils/dates';
import IndiaMap, { resolveStateId } from '@/components/charts/IndiaMap';
import { SCORE_BANDS, scoreBandIndex, useChartTheme } from '@/components/charts/chartTheme';
import { StatusRings, StatusGauge, type StatusSlice } from '@/components/charts/StatusMeters';
import RankedStackRows from '@/components/charts/RankedStackRows';
import {
  LICENCE_ORDER,
  LICENCE_LABELS,
  LICENCE_STATUS_PARAM,
  pct,
  withQuery,
  ChartTooltip,
  Legend,
  StatCard,
  ShareRows,
  LicenceTypeChart,
  buildUnitCards,
} from '@/components/dashboard/operationsParts';

const REFRESH_MS = 60_000;

// Chart entrance timings
const BAR_MS = 600;
const STACK_STAGGER_MS = 200;
const LINE_MS = 1400;

// Column headings for the state × licence grid, as the Location Master sheet abbreviates them
const LICENCE_SHORT_NAMES: Record<string, string> = {
  'FIRE-NOC': 'Fire NOC',
  'OCCUPANCY-CERT': 'Occupancy',
  'CE-CERT-CCPL': 'CE',
  'BMW-PC-CCPL': 'BMW PC',
  'DRUG-LICENCE-CPPL': 'Drug Lic.',
  'TRADE-LICENCE-CCPL': 'Trade CCPL',
  'TRADE-LICENCE-CPPL': 'Trade CPPL',
  'SHOP-ESTAB-CCPL': 'S&E CCPL',
  'SHOP-ESTAB-CPPL': 'S&E CPPL',
  'GP-NOC': 'GP NOC',
  'FSSAI-CPPL': 'FSSAI',
  'GST-APOB-CCPL': 'GST CCPL',
  'GST-APOB-CPPL': 'GST CPPL',
};

const UNIT_ORDER: UnitBucket[] = ['open', 'toBeOpened', 'closed'];
const UNIT_LABELS: Record<UnitBucket, string> = { open: 'Open', toBeOpened: 'To be opened', closed: 'Closed' };

const SELECT_CLASS =
  'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none';

const TrendTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { month: string; opened: number; total: number };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
      <p className="font-semibold text-slate-800 dark:text-slate-200">{point.month}</p>
      <p className="text-slate-500 dark:text-slate-400">
        Opened so far: <span className="font-semibold text-slate-900 dark:text-slate-100">{point.total}</span>
      </p>
      <p className="text-slate-500 dark:text-slate-400">
        Opened that month: <span className="font-semibold text-slate-900 dark:text-slate-100">{point.opened}</span>
      </p>
    </div>
  );
};

const Panel: React.FC<{
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, className = '', action, children }) => (
  <Card padding="md" className={className}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </Card>
);

const EmptyState: React.FC<{ children: React.ReactNode; height?: string }> = ({ children, height = 'h-56' }) => (
  <div className={`${height} flex items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 px-4`}>
    {children}
  </div>
);

/** One labelled horizontal bar per row; used where there is a single measure */
const BarList: React.FC<{
  rows: Array<{ key: string; label: string; hint?: string; value: number }>;
  color: string;
}> = ({ rows, color }) => {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-2 text-xs">
          <span className="truncate text-slate-700 dark:text-slate-300" title={row.hint ? `${row.label} (${row.hint})` : row.label}>
            {row.label}
            {row.hint && <span className="text-slate-400 dark:text-slate-500"> · {row.hint}</span>}
          </span>
          <span className="h-3 rounded-r bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <span className="block h-full rounded-r" style={{ width: `${(row.value / max) * 100}%`, backgroundColor: color }} />
          </span>
          <span className="text-right font-semibold text-slate-900 dark:text-slate-100">{row.value}</span>
        </li>
      ))}
    </ul>
  );
};

/** States down the side, licences across the top, each cell the share approved */
const LicenceGrid: React.FC<{
  grid: OperationsDashboardData['licenceGrid'];
  onOpen: (ruleId: string) => void;
}> = ({ grid, onOpen }) => {
  const chart = useChartTheme();
  // Dark ink on the two pale bands, white on the two deep ones, in either theme
  const inkOn = (band: number) => ((chart.dark ? band >= 2 : band <= 1) ? '#0f172a' : '#ffffff');

  return (
    <>
      <div className="overflow-x-auto mt-3">
        <table className="w-full border-separate border-spacing-[2px] text-[11px]">
          <thead>
            <tr>
              <th className="text-left font-medium text-slate-500 dark:text-slate-400 pr-2">State</th>
              {grid.licences.map((licence) => (
                <th
                  key={licence.ruleId}
                  title={licence.name}
                  className="font-medium text-slate-500 dark:text-slate-400 px-0.5 pb-1 align-bottom leading-tight min-w-[44px]"
                >
                  {LICENCE_SHORT_NAMES[licence.code] || licence.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.state}>
                <th className="text-left font-medium text-slate-700 dark:text-slate-300 pr-2 whitespace-nowrap">{row.state}</th>
                {grid.licences.map((licence) => {
                  const cell = row.cells[licence.ruleId];
                  if (!cell) {
                    return (
                      <td
                        key={licence.ruleId}
                        title={`${row.state} · ${licence.name}: not applicable`}
                        className="h-8 text-center rounded-sm text-slate-400 dark:text-slate-500"
                        style={{ backgroundColor: chart.noData }}
                      >
                        –
                      </td>
                    );
                  }
                  const share = pct(cell.approved, cell.total);
                  const band = scoreBandIndex(share);
                  return (
                    <td key={licence.ruleId} className="p-0">
                      <button
                        type="button"
                        onClick={() => onOpen(licence.ruleId)}
                        title={`${row.state} · ${licence.name}: ${cell.approved} of ${cell.total} approved`}
                        className="w-full h-8 rounded-sm font-semibold hover:ring-2 hover:ring-slate-400 dark:hover:ring-slate-300"
                        style={{ backgroundColor: chart.scoreBands[band], color: inkOn(band) }}
                      >
                        {share}%
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-600 dark:text-slate-400">
        <span className="font-medium">Approved:</span>
        {SCORE_BANDS.map((band, index) => (
          <span key={band.label} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: chart.scoreBands[index] }} />
            {band.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: chart.noData }} />
          Not applicable
        </span>
      </div>
    </>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const chart = useChartTheme();
  const { can } = useAuth();

  // The 3D map links back here with ?state= to open that state
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<OperationsFilters>(() => ({
    state: searchParams.get('state') || undefined,
  }));
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  // The map always shows every state, so another one can be picked while a state filter is on
  const [mapStates, setMapStates] = useState<OperationsDashboardData['byState']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);
  // Charts animate on a load the user asked for, not on a background refresh
  const [animate, setAnimate] = useState(true);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const motion = animate && !reducedMotion;
  // Company the loaded map data belongs to; null until the first load
  const mapEntity = useRef<string | null>(null);

  // `silent` refreshes keep the current figures on screen while new ones load
  const fetchOverview = useCallback(
    async (silent = false) => {
      const id = ++requestId.current;
      if (!silent) setIsLoading(true);
      try {
        const next = await dashboardService.getOverview(filters);
        if (id !== requestId.current) return;
        setData(next);
        setAnimate(!silent);

        // The map data depends on the company only, so picking a state reuses what is
        // already loaded. It is fetched again, without holding up the page, when the
        // company changed or on a background refresh.
        const mapKey = filters.entity || '';
        if (!filters.state) {
          setMapStates(next.byState);
          mapEntity.current = mapKey;
        } else if (silent || mapEntity.current !== mapKey) {
          dashboardService
            .getOverview({ entity: filters.entity })
            .then((allStates) => {
              if (id !== requestId.current) return;
              setMapStates(allStates.byState);
              mapEntity.current = mapKey;
            })
            .catch(() => undefined);
        }
        setLoadError(null);
      } catch (err: any) {
        if (id !== requestId.current) return;
        if (!silent) setLoadError(err.response?.data?.message || err.message || 'Failed to load the dashboard');
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    },
    [filters]
  );

  // Load on filter change, when a record changes elsewhere, and once a minute
  useEffect(() => {
    fetchOverview();
    const refresh = () => fetchOverview(true);
    const unsubscribe = socketService.on('compliance:status_changed', refresh);
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [fetchOverview]);

  // Recharts replays its animation whenever a chart is handed a new data array,
  // so these are rebuilt only when a load brings new figures
  const stateUnitRows = useMemo(
    () => (data?.byState ?? []).map((row) => ({ key: row.state, label: row.state, values: { ...row.units } })),
    [data]
  );
  const stateLicenceRows = useMemo(
    () =>
      (data?.byState ?? [])
        .filter((row) => row.licences.total > 0)
        .map((row) => ({
          key: row.state,
          label: row.state,
          values: Object.fromEntries(LICENCE_ORDER.map((bucket) => [bucket, row.licences[bucket]])),
        })),
    [data]
  );
  const stateShareRows = useMemo(
    () =>
      (data?.byState ?? [])
        .filter((row) => row.licences.total > 0)
        .map((row) => {
          const total = row.licences.total;
          // Unrounded, so every row adds up to exactly 100
          const shares = Object.fromEntries(LICENCE_ORDER.map((bucket) => [bucket, (row.licences[bucket] / total) * 100]));
          return { name: row.state, fullName: `${row.state} (${total} licences)`, ...shares } as Record<string, any>;
        })
        .sort((a, b) => b.approved - a.approved),
    [data]
  );
  const licenceRows = useMemo(
    () =>
      (data?.byLicence ?? []).map((row) => ({
        ...row,
        fullName: row.name,
        name: row.name.length > 34 ? `${row.name.slice(0, 33)}…` : row.name,
      })),
    [data]
  );

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Operations Dashboard</h1>
        <Card padding="lg">
          <EmptyState>
            {loadError ? (
              <span>
                {loadError}
                <br />
                <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchOverview()}>
                  Try again
                </Button>
              </span>
            ) : (
              'Loading the dashboard…'
            )}
          </EmptyState>
        </Card>
      </div>
    );
  }

  const { units, licences, expiring } = data;
  const scopeParams = { entity: filters.entity, state: filters.state };
  const recordsLink = (bucket: LicenceBucket, extra: Record<string, string | undefined> = {}) =>
    withQuery(ROUTES.COMPLIANCE_RECORDS, { status: LICENCE_STATUS_PARAM[bucket], entity: filters.entity, ...extra });
  const unitsLink = (status?: string, opening?: string) => withQuery(ROUTES.LOCATIONS, { ...scopeParams, status, opening });

  const licenceLegend = LICENCE_ORDER.filter((bucket) => bucket !== 'expired' || licences.expired > 0).map((bucket) => ({
    label: LICENCE_LABELS[bucket],
    color: chart.licence[bucket],
  }));
  const shownLicenceBuckets = LICENCE_ORDER.filter((bucket) => bucket !== 'expired' || licences.expired > 0);

  // ── Top cards ────────────────────────────────────────────────────────────────
  const cards = buildUnitCards(data, filters);

  // ── Chart data ───────────────────────────────────────────────────────────────
  const mapData: StateComplianceItem[] = mapStates
    .filter((row) => row.licences.total > 0)
    .map((row) => ({
      state: row.state,
      total: row.licences.total,
      compliant: row.licences.approved,
      expiringSoon: 0,
      pending: row.licences.applied + row.licences.toBeApplied,
      expired: row.licences.expired,
      percentage: row.licences.approvedPct ?? 0,
    }));
  const unmappedStates = mapStates.filter((row) => !resolveStateId(row.state)).map((row) => row.state);

  const trend = data.openingsTrend;
  const trendTickGap = Math.max(1, Math.ceil(trend.length / 6));

  const unitSlices: StatusSlice[] = UNIT_ORDER.map((bucket) => ({
    key: bucket,
    label: UNIT_LABELS[bucket],
    value: units[bucket],
    color: chart.unit[bucket],
    to: bucket === 'open' ? unitsLink('active', 'opened') : bucket === 'closed' ? unitsLink('inactive') : unitsLink('active', 'upcoming'),
  }));
  const licenceSlices: StatusSlice[] = shownLicenceBuckets.map((bucket) => ({
    key: bucket,
    label: LICENCE_LABELS[bucket],
    value: licences[bucket],
    color: chart.licence[bucket],
    to: recordsLink(bucket),
  }));

  const axisTick = { fill: chart.axis, fontSize: 11 };
  const selectState = (state: string) => setFilters((prev) => ({ ...prev, state }));
  // A second click on the state already picked clears the filter
  const toggleState = (state: string) =>
    setFilters((prev) => ({ ...prev, state: prev.state === state ? undefined : state }));
  const selectedEntity = data.filterOptions.entities.find((entity) => entity._id === filters.entity);
  const viewLabel = [selectedEntity?.code, filters.state].filter(Boolean).join(' · ') || 'All India';

  return (
    <div className="space-y-6 pb-8">
      {/* Header and filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Operations Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Units and licence status · {viewLabel} · updated{' '}
              {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by state"
            value={filters.state || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value || undefined }))}
            className={SELECT_CLASS}
          >
            <option value="">All India</option>
            {data.filterOptions.states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {data.filterOptions.entities.length > 1 && (
            <select
              aria-label="Filter by company"
              value={filters.entity || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, entity: e.target.value || undefined }))}
              className={SELECT_CLASS}
            >
              <option value="">All companies</option>
              {data.filterOptions.entities.map((entity) => (
                <option key={entity._id} value={entity._id}>
                  {entity.code}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" leftIcon={<RefreshCw size={15} />} isLoading={isLoading} onClick={() => fetchOverview()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card, index) => (
          <StatCard key={card.key} card={card} animate={motion} delay={index * 70} />
        ))}
      </div>

      {units.total === 0 ? (
        <Card padding="lg">
          <EmptyState>No units match this view.</EmptyState>
        </Card>
      ) : (
        <>
          {/* Row 1: where the units are */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Panel
              title="India Map: Licences Approved"
              subtitle="Share of applicable licences approved. Click a state to filter."
              className="lg:col-span-4"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Box size={14} />}
                  onClick={() => navigate(ROUTES.DASHBOARD_MAP_3D)}
                  className="shrink-0"
                >
                  3D map
                </Button>
              }
            >
              <IndiaMap
                data={mapData}
                onSelect={selectState}
                selected={filters.state}
                measure={{ legend: 'Licences approved:', valid: 'approved', unit: 'licences' }}
              />
              {unmappedStates.length > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Not on the map: {unmappedStates.join(', ')}
                </p>
              )}
            </Panel>

            <Panel
              title="Units by State"
              subtitle="Largest first. Click a state to filter, or a status to hide it."
              className="lg:col-span-5"
            >
              <RankedStackRows
                rows={stateUnitRows}
                series={UNIT_ORDER.map((bucket) => ({ key: bucket, label: UNIT_LABELS[bucket], color: chart.unit[bucket] }))}
                animate={motion}
                selected={filters.state}
                onSelect={toggleState}
              />
            </Panel>

            <Panel title="Overall Unit Status" subtitle="Every unit in this view" className="lg:col-span-3">
              <StatusRings slices={unitSlices} total={units.total} centreLabel="Units" animate={motion} />
            </Panel>
          </div>

          {/* Row 2: growth and licence status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Panel title="Units Opened Over Time" subtitle="Running total, by opening date" className="lg:col-span-4">
              {trend.length < 2 ? (
                <EmptyState height="h-72">No opening dates entered for this view.</EmptyState>
              ) : (
                <div className="h-72 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 18, right: 28, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={chart.grid} strokeOpacity={0.25} />
                      <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} interval={trendTickGap - 1} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<TrendTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Units opened so far"
                        stroke={chart.series}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, stroke: chart.surface, strokeWidth: 2 }}
                        isAnimationActive={motion}
                        animationDuration={LINE_MS}
                      >
                        {/* Label the latest point only */}
                        <LabelList
                          dataKey="total"
                          content={({ x, y, value, index }: any) =>
                            index === trend.length - 1 ? (
                              <text x={x} y={y - 8} textAnchor="middle" fill={chart.axis} fontSize={11} fontWeight={600}>
                                {value}
                              </text>
                            ) : null
                          }
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel
              title="Licence Status by State"
              subtitle="Applicable licences at open and planned units. Click a state to filter."
              className="lg:col-span-5"
            >
              {stateLicenceRows.length === 0 ? (
                <EmptyState height="h-72">No licence records in this view.</EmptyState>
              ) : (
                <RankedStackRows
                  rows={stateLicenceRows}
                  series={shownLicenceBuckets.map((bucket) => ({
                    key: bucket,
                    label: LICENCE_LABELS[bucket],
                    color: chart.licence[bucket],
                  }))}
                  animate={motion}
                  selected={filters.state}
                  onSelect={toggleState}
                />
              )}
            </Panel>

            <Panel title="Licence Completion" subtitle="All applicable licences in this view" className="lg:col-span-3">
              {licences.total === 0 ? (
                <EmptyState>No licence records in this view.</EmptyState>
              ) : (
                <>
                  <StatusGauge slices={licenceSlices} total={licences.total} headline="approved" animate={motion} />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    {licences.notApplicable.toLocaleString()} more are marked not applicable and are left out.
                  </p>
                </>
              )}
            </Panel>
          </div>

          {/* Row 3: districts, state comparison, expiries */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Panel title="Top 10 Districts by Unit Count" subtitle="Open and planned units" className="lg:col-span-4">
              {data.topDistricts.length === 0 ? (
                <EmptyState>No districts entered for this view.</EmptyState>
              ) : (
                <BarList
                  color={chart.series}
                  rows={data.topDistricts.map((row) => ({
                    key: `${row.district}|${row.state}`,
                    label: row.district,
                    hint: filters.state ? undefined : row.state,
                    value: row.units,
                  }))}
                />
              )}
            </Panel>

            <Panel title="Licence Status by State (Percentage)" subtitle="Highest share approved first" className="lg:col-span-5">
              {stateShareRows.length === 0 ? (
                <EmptyState>No licence records in this view.</EmptyState>
              ) : (
                <>
                  <Legend items={licenceLegend} />
                  <div className="mt-2" style={{ height: Math.max(120, stateShareRows.length * 30 + 30) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stateShareRows} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                          allowDataOverflow
                          tick={axisTick}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <YAxis type="category" dataKey="name" width={104} tick={axisTick} tickLine={false} axisLine={false} interval={0} />
                        <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: chart.grid, fillOpacity: 0.12 }} />
                        {shownLicenceBuckets.map((bucket, index) => (
                          <Bar
                            key={bucket}
                            dataKey={bucket}
                            name={LICENCE_LABELS[bucket]}
                            stackId="share"
                            fill={chart.licence[bucket]}
                            stroke={chart.surface}
                            strokeWidth={2}
                            maxBarSize={18}
                            isAnimationActive={motion}
                            animationBegin={index * STACK_STAGGER_MS}
                            animationDuration={BAR_MS}
                          >
                            {bucket === 'approved' && (
                              <LabelList
                                dataKey="approved"
                                position="insideLeft"
                                fill="#ffffff"
                                fontSize={11}
                                fontWeight={700}
                                formatter={(value: number) => (value >= 14 ? `${Math.round(value)}%` : '')}
                              />
                            )}
                          </Bar>
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </Panel>

            <Panel
              title="Licences Expiring Soon"
              subtitle="Approved licences reaching their expiry date"
              className="lg:col-span-3"
            >
              {expiring.withExpiryDate === 0 ? (
                <EmptyState>
                  No expiry dates entered yet. Add them with Update Status on a record and they will appear here.
                </EmptyState>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      { label: '30 days', value: expiring.next30, days: '30' },
                      { label: '60 days', value: expiring.next60, days: '60' },
                      { label: '90 days', value: expiring.next90, days: '90' },
                    ].map((window) => (
                      <button
                        key={window.days}
                        type="button"
                        onClick={() =>
                          navigate(withQuery(ROUTES.COMPLIANCE_RECORDS, { expiringWithin: window.days, entity: filters.entity }))
                        }
                        className="text-left p-2 rounded-lg border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                      >
                        <span className="block text-xl font-bold text-slate-900 dark:text-white">{window.value}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">within {window.label}</span>
                      </button>
                    ))}
                  </div>
                  {expiring.items.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Nothing expires in the next 90 days.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                      {expiring.items.map((item) => {
                        const days = daysFromToday(item.expiryDate);
                        return (
                          <li key={item.recordId}>
                            <button
                              type="button"
                              onClick={() => navigate(ROUTES.COMPLIANCE_RECORD_DETAILS.replace(':id', item.recordId))}
                              className="w-full text-left py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded"
                            >
                              <span className="block font-medium text-slate-800 dark:text-slate-200 truncate">{item.licence}</span>
                              <span className="block text-slate-500 dark:text-slate-400 truncate">
                                {item.unit} · {days <= 0 ? 'expires today' : `in ${days} ${days === 1 ? 'day' : 'days'}`}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                    {expiring.withExpiryDate.toLocaleString()} of {licences.approved.toLocaleString()} approved licences have an
                    expiry date entered.
                  </p>
                </>
              )}
            </Panel>
          </div>

          {/* Row 4: licence types and unit make-up */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Panel
              title="Licence Status by Type"
              subtitle="Each licence across the units it applies to. Click a bar to open those records."
              className="lg:col-span-8"
            >
              {licenceRows.length === 0 ? (
                <EmptyState>No licence records in this view.</EmptyState>
              ) : (
                <>
                  <Legend items={licenceLegend} />
                  <LicenceTypeChart
                    rows={licenceRows}
                    buckets={shownLicenceBuckets}
                    animate={motion}
                    onOpen={(bucket, ruleId) => navigate(recordsLink(bucket, { rule: ruleId }))}
                  />
                </>
              )}
            </Panel>

            <div className="lg:col-span-4 space-y-6">
              <Panel title="Unit Types" subtitle="Open and planned units">
                <BarList
                  color={chart.series}
                  rows={data.unitTypes.map((row) => ({ key: row.code, label: row.label, value: row.units }))}
                />
              </Panel>
              <Panel title="Area Types" subtitle="The local body each unit falls under">
                <BarList
                  color={chart.series}
                  rows={data.areaTypes.map((row) => ({ key: row.areaType, label: row.areaType, value: row.units }))}
                />
              </Panel>
            </div>
          </div>

          {/* Row 5: which licence is stuck where, and how the companies compare */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Panel
              title="Licences Approved: State by Licence"
              subtitle="Share approved for each licence in each state. Click a cell to open that licence's records."
              className="lg:col-span-8"
            >
              {data.licenceGrid.rows.length === 0 ? (
                <EmptyState>No licence records in this view.</EmptyState>
              ) : (
                <LicenceGrid
                  grid={data.licenceGrid}
                  onOpen={(ruleId) => navigate(withQuery(ROUTES.COMPLIANCE_RECORDS, { rule: ruleId, entity: filters.entity }))}
                />
              )}
            </Panel>

            <Panel title="Company Comparison" subtitle="Units operated and licence status" className="lg:col-span-4">
              {data.byCompany.length === 0 ? (
                <EmptyState>No companies in this view.</EmptyState>
              ) : (
                <>
                  <Legend items={licenceLegend} />
                  <ShareRows
                    buckets={shownLicenceBuckets}
                    rows={data.byCompany.map((company) => ({
                      key: company.entityId,
                      label: company.code,
                      hint: `${company.units} ${company.units === 1 ? 'unit' : 'units'} · ${company.total} licences`,
                      counts: company,
                    }))}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                    A unit shared by two companies is counted for both.
                  </p>
                </>
              )}
            </Panel>
          </div>

          {/* Row 6: growth by year, and whether newer units are behind */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Panel title="Units Opened per Year" subtitle="By opening date, closed units included" className="lg:col-span-5">
              {data.openingsByYear.length === 0 ? (
                <EmptyState>No opening dates entered for this view.</EmptyState>
              ) : (
                <div className="h-64 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.openingsByYear} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={chart.grid} strokeOpacity={0.25} />
                      <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={false} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.grid, fillOpacity: 0.12 }} />
                      <Bar
                        dataKey="opened"
                        name="Units opened"
                        fill={chart.series}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                        isAnimationActive={motion}
                        animationDuration={BAR_MS}
                      >
                        <LabelList dataKey="opened" position="top" fill={chart.axis} fontSize={11} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel
              title="Licence Progress by Opening Year"
              subtitle="Open and planned units, grouped by the year they opened"
              className="lg:col-span-7"
            >
              {data.byOpeningYear.length === 0 ? (
                <EmptyState>No licence records in this view.</EmptyState>
              ) : (
                <>
                  <Legend items={licenceLegend} />
                  <ShareRows
                    buckets={shownLicenceBuckets}
                    rows={data.byOpeningYear.map((row) => ({
                      key: row.year,
                      label: row.year === 'No date' ? 'No opening date' : `Opened ${row.year}`,
                      hint: `${row.units} ${row.units === 1 ? 'unit' : 'units'} · ${row.total} licences`,
                      counts: row,
                    }))}
                  />
                </>
              )}
            </Panel>
          </div>

          {/* Row 7: where to start, and what changed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Panel
              title="Needs Attention"
              subtitle="Open units with the most licences still to settle"
              className={data.recentActivity.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'}
            >
              {data.attention.length === 0 ? (
                <EmptyState height="h-32">Every open unit has all its licences approved.</EmptyState>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {data.attention.map((unit) => (
                    <li key={unit.locationId}>
                      <button
                        type="button"
                        onClick={() => navigate(ROUTES.LOCATION_DETAILS.replace(':id', unit.locationId))}
                        className="w-full flex items-center justify-between gap-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded"
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900 dark:text-slate-100 truncate">{unit.name}</span>
                          <span className="block text-slate-500 dark:text-slate-400 truncate">
                            {unit.code} · {unit.state}
                          </span>
                        </span>
                        <span className="shrink-0 inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{unit.open}</span> of {unit.total}{' '}
                            pending
                          </span>
                          <ChevronRight size={14} className="text-slate-400" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {data.recentActivity.length > 0 && (
              <Panel
                title="Recent Activity"
                subtitle="Latest changes made in the app"
                className="lg:col-span-6"
                action={
                  can('audit_log', 'read') ? (
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.AUDIT_LOGS)}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                    >
                      View all
                    </button>
                  ) : undefined
                }
              >
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recentActivity.map((entry) => (
                    <li key={entry.id} className="py-2 text-xs">
                      <span className="block text-slate-800 dark:text-slate-200">{entry.description}</span>
                      <span className="block text-slate-500 dark:text-slate-400 mt-0.5">
                        {entry.by} ·{' '}
                        {new Date(entry.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
