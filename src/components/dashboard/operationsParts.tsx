/**
 * Pieces shared by the operations dashboard and the 3D map page, so both show the
 * same figures the same way: the unit cards, the licence legend and tooltip, the
 * per-company status rows and the licence-by-type chart.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, CheckCircle2, XCircle, Clock, Settings2, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { LicenceBucket, LicenceCounts, OperationsDashboardData, OperationsFilters } from '@/services/dashboardService';
import { useChartTheme } from '@/components/charts/chartTheme';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { ROUTES } from '@/constants/routes';

// Chart entrance timings
const BAR_MS = 600;
const STACK_STAGGER_MS = 200;

// Stacking order is fixed everywhere the statuses sit side by side
export const LICENCE_ORDER: LicenceBucket[] = ['approved', 'applied', 'toBeApplied', 'expired'];
export const LICENCE_LABELS: Record<LicenceBucket, string> = {
  approved: 'Approved',
  applied: 'Applied',
  toBeApplied: 'To be applied',
  expired: 'Expired',
};
// The matching filter on the Compliance Records list
export const LICENCE_STATUS_PARAM: Record<LicenceBucket, string> = {
  approved: 'approved,expiring_soon',
  applied: 'in_progress',
  toBeApplied: 'pending',
  expired: 'expired',
};

export const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export const withQuery = (path: string, params: Record<string, string | undefined>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value && query.set(key, value));
  const text = query.toString();
  return text ? `${path}?${text}` : path;
};

/** Units list filtered to the current view and, optionally, a status and opening window */
export const unitsLink = (filters: OperationsFilters, status?: string, opening?: string): string =>
  withQuery(ROUTES.LOCATIONS, { entity: filters.entity, state: filters.state, status, opening });

export const ChartTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((entry: any) => entry.value !== undefined && entry.value !== null);
  const total = rows.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
      <p className="font-semibold text-slate-800 dark:text-slate-200">{payload[0]?.payload?.fullName || label}</p>
      {rows.map((entry: any) => (
        <p key={entry.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill }} />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {unit ? Math.round(entry.value) : entry.value}
            {unit || ''}
          </span>
        </p>
      ))}
      {rows.length > 1 && !unit && (
        <p className="pt-1 border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
          Total: <span className="font-semibold text-slate-900 dark:text-slate-100">{total}</span>
        </p>
      )}
    </div>
  );
};

/** Swatch + label row above a multi-series chart */
export const Legend: React.FC<{ items: Array<{ label: string; color: string }> }> = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-600 dark:text-slate-400">
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
        {item.label}
      </span>
    ))}
  </div>
);

export interface StatCardData {
  key: string;
  label: string;
  value: number;
  share?: number;
  hint: string;
  icon: LucideIcon;
  tone: string;
  /** Fill of the share meter under the figure */
  bar: string;
  to?: string;
}

/** Top-row figure that counts up, with a meter for its share where it has one */
export const StatCard: React.FC<{ card: StatCardData; animate: boolean; delay: number }> = ({ card, animate, delay }) => {
  const navigate = useNavigate();
  const Icon = card.icon;
  const value = useAnimatedNumber(card.value, animate, delay);
  const share = useAnimatedNumber(card.share ?? 0, animate, delay);

  return (
    <button
      type="button"
      disabled={!card.to}
      onClick={() => card.to && navigate(card.to)}
      className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none transition enabled:hover:border-slate-300 dark:enabled:hover:border-slate-600 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md motion-reduce:transform-none flex items-center gap-3"
    >
      <span className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${card.tone}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">{card.label}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {Math.round(value).toLocaleString()}
          </span>
          {card.share !== undefined && (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{Math.round(share)}%</span>
          )}
        </span>
        <span className="block text-[11px] leading-tight text-slate-500 dark:text-slate-400">{card.hint}</span>
        {card.share !== undefined && (
          <span className="block mt-1.5 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <span className={`block h-full rounded-full ${card.bar}`} style={{ width: `${Math.min(share, 100)}%` }} />
          </span>
        )}
      </span>
    </button>
  );
};

/** One thin bar split by licence status; the gap between segments shows the card surface */
export const StatusStrip: React.FC<{ counts: LicenceCounts; buckets: LicenceBucket[]; className?: string }> = ({
  counts,
  buckets,
  className = '',
}) => {
  const chart = useChartTheme();
  return (
    <div className={`flex gap-[2px] overflow-hidden ${className}`}>
      {buckets
        .filter((bucket) => counts[bucket] > 0)
        .map((bucket) => (
          <span
            key={bucket}
            title={`${LICENCE_LABELS[bucket]}: ${counts[bucket]} of ${counts.total}`}
            style={{ flexGrow: counts[bucket], flexBasis: 0, minWidth: 3, backgroundColor: chart.licence[bucket] }}
          />
        ))}
    </div>
  );
};

/** One 100% bar per row, split by licence status, with the approved share at the end */
export const ShareRows: React.FC<{
  rows: Array<{ key: string; label: string; hint: string; counts: LicenceCounts }>;
  buckets: LicenceBucket[];
}> = ({ rows, buckets }) => (
  <ul className="mt-3 space-y-3">
    {rows.map((row) => (
      <li key={row.key}>
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {row.label}
            <span className="font-normal text-slate-500 dark:text-slate-400"> · {row.hint}</span>
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {row.counts.approvedPct ?? 0}%<span className="font-normal text-slate-500 dark:text-slate-400"> approved</span>
          </span>
        </div>
        <StatusStrip counts={row.counts} buckets={buckets} className="mt-1.5 h-3 rounded" />
      </li>
    ))}
  </ul>
);

/** One column per opening year, stacked by status as shares of 100%, with the share approved on top */
export const YearColumnsChart: React.FC<{
  rows: Array<{ key: string; label: string; hint: string; counts: LicenceCounts }>;
  buckets: LicenceBucket[];
  animate: boolean;
}> = ({ rows, buckets, animate }) => {
  const chart = useChartTheme();
  const [active, setActive] = React.useState<number | null>(null);
  const axisTick = { fill: chart.axis, fontSize: 12, fontWeight: 600 };
  const data = rows.map((row) => ({
    ...row,
    // Unrounded, so every year adds up to exactly 100
    ...Object.fromEntries(buckets.map((bucket) => [bucket, (row.counts[bucket] / row.counts.total) * 100])),
  }));
  // Only the top segment of each column gets the rounded corners
  const topBucket = data.map((row) => [...buckets].reverse().find((bucket) => row.counts[bucket] > 0));
  return (
    <div className="h-72 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
          barCategoryGap="22%"
          onMouseMove={(state: any) => setActive(state?.activeTooltipIndex ?? null)}
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            {buckets.map((bucket) => (
              <linearGradient key={bucket} id={`yearColumns-${bucket}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chart.licence[bucket]} stopOpacity={1} />
                <stop offset="100%" stopColor={chart.licence[bucket]} stopOpacity={0.72} />
              </linearGradient>
            ))}
          </defs>
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
          {/* Every column reaches 100%, so the share approved sits in a row along the top */}
          <XAxis
            xAxisId="approved"
            orientation="top"
            dataKey="key"
            tickLine={false}
            axisLine={false}
            height={30}
            tick={({ x, y, payload }: any) => {
              const row = data.find((item) => item.key === payload.value);
              return (
                <text x={x} y={y - 6} textAnchor="middle" fill={chart.licence.approved} fontSize={16} fontWeight={800}>
                  {row?.counts.approvedPct ?? 0}%
                </text>
              );
            }}
          />
          <YAxis hide domain={[0, 100]} allowDataOverflow />
          <Tooltip
            cursor={false}
            content={({ active: shown, payload }: any) => {
              if (!shown || !payload?.length) return null;
              const row = payload[0].payload;
              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {row.key === 'No date' ? 'No opening date' : `Opened ${row.label}`}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">{row.hint}</p>
                  {buckets.map((bucket) => (
                    <p key={bucket} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chart.licence[bucket] }} />
                      <span className="text-slate-500 dark:text-slate-400">{LICENCE_LABELS[bucket]}:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {Math.round(row[bucket])}% ({row.counts[bucket]})
                      </span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {buckets.map((bucket, index) => (
            <Bar
              key={bucket}
              dataKey={bucket}
              name={LICENCE_LABELS[bucket]}
              stackId="share"
              stroke={chart.surface}
              strokeWidth={2}
              maxBarSize={64}
              isAnimationActive={animate}
              animationBegin={index * STACK_STAGGER_MS}
              animationDuration={BAR_MS}
            >
              {data.map((row, rowIndex) => (
                <Cell
                  key={row.key}
                  fill={`url(#yearColumns-${bucket})`}
                  // The hovered year stays bright, the rest step back
                  fillOpacity={active === null || active === rowIndex ? 1 : 0.35}
                  radius={(topBucket[rowIndex] === bucket ? [10, 10, 0, 0] : 0) as any}
                />
              ))}
              {/* The share approved, inside the green segment when it fits */}
              {bucket === 'approved' && (
                <LabelList
                  dataKey="approved"
                  position="center"
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
  );
};

/** The six unit figures across the top of the dashboard */
export const buildUnitCards = (data: OperationsDashboardData, filters: OperationsFilters): StatCardData[] => {
  const { units, byState } = data;
  const unitsLinkFor = (status?: string, opening?: string) => unitsLink(filters, status, opening);
  const openUnits = units.open;
  const cards: StatCardData[] = [
    {
      key: 'total',
      label: 'Total Units',
      value: units.total,
      hint: `Across ${byState.length} ${byState.length === 1 ? 'state' : 'states'}`,
      icon: Building2,
      tone: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
      bar: 'bg-blue-500',
      to: unitsLinkFor(),
    },
    {
      key: 'open',
      label: 'Open',
      value: units.open,
      share: pct(units.open, units.total),
      hint: 'Operating now',
      icon: CheckCircle2,
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      bar: 'bg-emerald-500',
      to: unitsLinkFor('active', 'opened'),
    },
    {
      key: 'closed',
      label: 'Closed',
      value: units.closed,
      share: pct(units.closed, units.total),
      hint: 'Not operating',
      icon: XCircle,
      tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      bar: 'bg-rose-500',
      to: unitsLinkFor('inactive'),
    },
    {
      key: 'toBeOpened',
      label: 'To Be Opened',
      value: units.toBeOpened,
      share: pct(units.toBeOpened, units.total),
      hint: 'Planned units',
      icon: Clock,
      tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      bar: 'bg-amber-500',
      to: unitsLinkFor('active', 'upcoming'),
    },
    {
      key: 'underProcess',
      label: 'Under Process',
      value: units.underProcess,
      share: pct(units.underProcess, openUnits),
      hint: 'Licences pending',
      icon: Settings2,
      tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      bar: 'bg-indigo-500',
      to: withQuery(ROUTES.COMPLIANCE_RECORDS, { status: 'in_progress,pending', entity: filters.entity }),
    },
    {
      key: 'fullyApproved',
      label: 'Fully Approved',
      value: units.fullyApproved,
      share: pct(units.fullyApproved, openUnits),
      hint: 'All licences approved',
      icon: ShieldCheck,
      tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
      bar: 'bg-violet-500',
    },
  ];
  return cards;
};

/** Each licence as one bar, stacked by status; a click opens those records */
export const LicenceTypeChart: React.FC<{
  rows: Array<Record<string, any>>;
  buckets: LicenceBucket[];
  animate: boolean;
  onOpen: (bucket: LicenceBucket, ruleId: string) => void;
  /** Room for the licence names on the left */
  yAxisWidth?: number;
}> = ({ rows, buckets, animate, onOpen, yAxisWidth = 226 }) => {
  const chart = useChartTheme();
  const axisTick = { fill: chart.axis, fontSize: 11 };
  return (
    <div className="mt-2" style={{ height: Math.max(140, rows.length * 30 + 30) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={chart.grid} strokeOpacity={0.25} />
          <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={yAxisWidth} tick={axisTick} tickLine={false} axisLine={false} interval={0} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.grid, fillOpacity: 0.12 }} />
          {buckets.map((bucket, index) => (
            <Bar
              key={bucket}
              dataKey={bucket}
              name={LICENCE_LABELS[bucket]}
              stackId="types"
              fill={chart.licence[bucket]}
              stroke={chart.surface}
              strokeWidth={2}
              maxBarSize={18}
              isAnimationActive={animate}
              animationBegin={index * STACK_STAGGER_MS}
              animationDuration={BAR_MS}
              cursor="pointer"
              onClick={(row: any) => onOpen(bucket, row.ruleId)}
            >
              {index === buckets.length - 1 && (
                <LabelList dataKey="total" position="right" fill={chart.axis} fontSize={11} fontWeight={600} />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
