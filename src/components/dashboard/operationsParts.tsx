/**
 * Pieces shared by the operations dashboard and the 3D map page, so both show the
 * same figures the same way: the unit cards, the licence legend and tooltip, the
 * per-company status rows and the licence-by-type chart.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

/** One column per opening year, filled by status as shares of 100%, against the approval target */
export const YearColumnsChart: React.FC<{
  rows: Array<{ key: string; label: string; hint: string; counts: LicenceCounts }>;
  buckets: LicenceBucket[];
  animate: boolean;
  /** 0–100; drawn as a dashed line across the columns */
  target?: number;
}> = ({ rows, buckets, animate, target = 90 }) => {
  const chart = useChartTheme();
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [grown, setGrown] = React.useState(!animate);
  React.useEffect(() => {
    if (!animate) return setGrown(true);
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  const share = (row: (typeof rows)[number], bucket: LicenceBucket) =>
    row.counts.total > 0 ? (row.counts[bucket] / row.counts.total) * 100 : 0;
  const dated = rows.filter((row) => row.key !== 'No date');
  const undated = rows.filter((row) => row.key === 'No date');
  const best = dated.reduce<(typeof rows)[number] | null>((top, row) => (!top || (row.counts.approvedPct ?? 0) > (top.counts.approvedPct ?? 0) ? row : top), null);
  const newest = dated[dated.length - 1];
  const behind = dated.filter((row) => (row.counts.approvedPct ?? 0) < target).length;
  const targetLine = chart.dark ? '#f8fafc' : '#0f172a';
  // Approved share as a badge: green at the target, amber close to it, red well short
  const badge = (pct: number) =>
    pct >= target
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
      : pct >= 60
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';

  const column = (row: (typeof rows)[number], index: number) => {
    const pct = row.counts.approvedPct ?? 0;
    const dim = hovered !== null && hovered !== row.key;
    const units = row.hint.split(' · ')[0];
    return (
      <div
        key={row.key}
        className="relative flex-1 min-w-0 flex flex-col items-center"
        onMouseEnter={() => setHovered(row.key)}
        onMouseLeave={() => setHovered(null)}
        style={{ opacity: dim ? 0.4 : 1, transition: 'opacity 150ms' }}
      >
        <span className={`mb-2 h-6 inline-flex items-center rounded-full px-2 text-xs font-extrabold tabular-nums ${badge(pct)}`}>{pct}%</span>
        <div
          className="relative w-full max-w-[58px] h-52 rounded-2xl overflow-hidden flex flex-col-reverse gap-[2px] bg-slate-100 dark:bg-slate-800 transition-transform duration-200"
          style={{ transform: hovered === row.key ? 'translateY(-3px)' : 'none', boxShadow: hovered === row.key ? '0 8px 18px -8px rgba(15,23,42,0.35)' : 'none' }}
        >
          {buckets
            .filter((bucket) => row.counts[bucket] > 0)
            .map((bucket) => {
              const part = share(row, bucket);
              return (
                <span
                  key={bucket}
                  className="relative flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                  style={{
                    height: grown ? `${part}%` : '0%',
                    minHeight: grown ? 3 : 0,
                    backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${chart.licence[bucket]} 75%, white), ${chart.licence[bucket]})`,
                    transition: `height 800ms cubic-bezier(0.22, 1, 0.36, 1) ${animate ? index * 90 : 0}ms`,
                  }}
                >
                  {part >= 12 ? `${Math.round(part)}%` : null}
                </span>
              );
            })}
        </div>
        <span className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">{row.label === 'No date' ? 'No date' : row.label}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-full">{units}</span>

        {hovered === row.key && (
          <div className="absolute z-20 top-8 left-1/2 -translate-x-1/2 pointer-events-none min-w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {row.key === 'No date' ? 'No opening date' : `Opened ${row.label}`}
            </p>
            <p className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.hint}</p>
            {buckets.map((bucket) => (
              <p key={bucket} className="flex items-center gap-2 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chart.licence[bucket] }} />
                <span className="text-slate-500 dark:text-slate-400">{LICENCE_LABELS[bucket]}:</span>
                <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100">
                  {Math.round(share(row, bucket))}% ({row.counts[bucket]})
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* The story in one line each: the best year, the newest, and how many fall short */}
      {best && newest && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Best year</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {best.counts.approvedPct ?? 0}%<span className="text-xs font-semibold text-slate-500 dark:text-slate-400"> · {best.label}</span>
            </p>
          </div>
          <div className="rounded-xl px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Newest units</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {newest.counts.approvedPct ?? 0}%<span className="text-xs font-semibold text-slate-500 dark:text-slate-400"> · {newest.label}</span>
            </p>
          </div>
          <div className="rounded-xl px-3 py-2 bg-rose-50 dark:bg-rose-500/10">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">Below {target}%</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {behind}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400"> of {dated.length} years</span>
            </p>
          </div>
        </div>
      )}

      <div className="relative mt-4 flex items-end gap-2 sm:gap-3">
        {/* The target across every column: each box starts 32px down (24px badge + 8px gap) and is 208px tall */}
        <div
          className="absolute inset-x-0 z-10 pointer-events-none border-t-2 border-dashed"
          style={{ top: 32 + 208 * (1 - target / 100), borderColor: targetLine, opacity: 0.55 }}
        >
          <span className="absolute -top-2.5 right-0 rounded px-1 text-[10px] font-bold bg-white dark:bg-slate-900" style={{ color: targetLine }}>
            {target}%
          </span>
        </div>
        {dated.map((row, index) => column(row, index))}
        {undated.length > 0 && (
          <>
            <span className="self-stretch w-px bg-slate-200 dark:bg-slate-700 mx-1" />
            {undated.map((row) => column(row, dated.length))}
          </>
        )}
      </div>
    </>
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
