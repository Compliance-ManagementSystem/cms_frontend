import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LucideIcon } from 'lucide-react';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { SCORE_BANDS, scoreBandIndex, useChartTheme } from './chartTheme';

/**
 * At-a-glance charts for the operations dashboard. Every "% approved" figure is
 * coloured by the same approval bands as the India map and the state × licence grid,
 * so a colour means the same thing everywhere on the page. Each chart also prints
 * its values, so nothing is read from colour alone.
 */

/** Text that stays readable on a band colour: dark on the pale bands, white on the deep ones */
const useInkOn = () => {
  const chart = useChartTheme();
  return (band: number) => ((chart.dark ? band >= 2 : band <= 1) ? '#0f172a' : '#ffffff');
};

const BandLegend: React.FC<{ extra?: React.ReactNode }> = ({ extra }) => {
  const chart = useChartTheme();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-600 dark:text-slate-400">
      <span className="font-medium">Approved:</span>
      {SCORE_BANDS.map((band, index) => (
        <span key={band.label} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chart.scoreBands[index] }} />
          {band.label}
        </span>
      ))}
      {extra}
    </div>
  );
};

// ── 1. A row of % circles ────────────────────────────────────────────────────

export interface PercentItem {
  key: string;
  label: string;
  /** 0–100 */
  pct: number;
  /** Small line under the label, e.g. "679 of 895" */
  sub: string;
  onClick?: () => void;
  selected?: boolean;
}

const PercentCircle: React.FC<{ item: PercentItem; animate: boolean; delay: number }> = ({ item, animate, delay }) => {
  const chart = useChartTheme();
  const inkOn = useInkOn();
  const band = scoreBandIndex(item.pct);
  const shown = useAnimatedNumber(item.pct, animate, delay);
  return (
    <button
      type="button"
      onClick={item.onClick}
      disabled={!item.onClick}
      aria-pressed={item.selected}
      aria-label={`${item.label}: ${item.pct}% approved, ${item.sub}`}
      className="group flex flex-col items-center gap-1.5 min-w-[88px] p-1 rounded-lg enabled:hover:bg-slate-50 dark:enabled:hover:bg-slate-800/50"
    >
      <span
        className={`w-[68px] h-[68px] rounded-full flex items-center justify-center text-base font-bold tabular-nums shadow-sm transition-transform group-enabled:group-hover:scale-105 motion-reduce:transform-none ${
          item.selected ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900' : ''
        }`}
        style={{ backgroundColor: chart.scoreBands[band], color: inkOn(band) }}
      >
        {Math.round(shown)}%
      </span>
      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 text-center leading-tight">{item.label}</span>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{item.sub}</span>
    </button>
  );
};

export const PercentCircles: React.FC<{ items: PercentItem[]; animate: boolean }> = ({ items, animate }) => (
  <>
    <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-4">
      {items.map((item, index) => (
        <PercentCircle key={item.key} item={item} animate={animate} delay={index * 60} />
      ))}
    </div>
    <BandLegend />
  </>
);

// ── 2. Segmented ring, one per company ───────────────────────────────────────

const SEGMENTS = 36;
const SEGMENT_GAP_DEG = 3;

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcSegment = (start: number, end: number, rOuter: number, rInner: number) => {
  const a = polar(60, 60, rOuter, start);
  const b = polar(60, 60, rOuter, end);
  const c = polar(60, 60, rInner, end);
  const d = polar(60, 60, rInner, start);
  return `M ${a.x} ${a.y} A ${rOuter} ${rOuter} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${rInner} ${rInner} 0 0 0 ${d.x} ${d.y} Z`;
};

export const SegmentedRing: React.FC<{ item: PercentItem; animate: boolean; delay?: number }> = ({
  item,
  animate,
  delay = 0,
}) => {
  const chart = useChartTheme();
  const band = scoreBandIndex(item.pct);
  const shown = useAnimatedNumber(item.pct, animate, delay, 1000);
  const filled = Math.round((shown / 100) * SEGMENTS);
  const step = 360 / SEGMENTS;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 120" className="w-28 h-28" role="img" aria-label={`${item.label}: ${item.pct}% approved, ${item.sub}`}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <path
            key={index}
            d={arcSegment(index * step + SEGMENT_GAP_DEG / 2, (index + 1) * step - SEGMENT_GAP_DEG / 2, 54, 42)}
            fill={index < filled ? chart.scoreBands[band] : chart.noData}
          />
        ))}
        <text x={60} y={66} textAnchor="middle" fontSize={20} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
          {Math.round(shown)}%
        </text>
      </svg>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{item.label}</span>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{item.sub}</span>
    </div>
  );
};

// ── 3. Speedometer ───────────────────────────────────────────────────────────

const DIAL_R = 70;
// The dial sweeps 180°, from 0% on the left to 100% on the right
const dialPoint = (pct: number, r: number) => {
  const angle = Math.PI * (1 - pct / 100);
  return { x: 100 + r * Math.cos(angle), y: 100 - r * Math.sin(angle) };
};

export const Speedometer: React.FC<{ label: string; pct: number; sub: string; animate: boolean }> = ({
  label,
  pct,
  sub,
  animate,
}) => {
  const chart = useChartTheme();
  const shown = useAnimatedNumber(pct, animate, 0, 1200);
  const band = scoreBandIndex(pct);
  const end = dialPoint(Math.min(shown, 100), DIAL_R);
  const needle = dialPoint(Math.min(shown, 100), DIAL_R - 18);
  const largeArc = 0;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 132" className="w-full max-w-[220px]" role="img" aria-label={`${label}: ${pct}%`}>
        {/* Track and filled arc */}
        <path
          d={`M ${100 - DIAL_R} 100 A ${DIAL_R} ${DIAL_R} 0 0 1 ${100 + DIAL_R} 100`}
          fill="none"
          stroke={chart.noData}
          strokeWidth={14}
        />
        {shown > 0 && (
          <path
            d={`M ${100 - DIAL_R} 100 A ${DIAL_R} ${DIAL_R} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={chart.scoreBands[band]}
            strokeWidth={14}
          />
        )}
        {/* Ticks every 10%, labelled every 20% */}
        {Array.from({ length: 11 }, (_, index) => {
          const value = index * 10;
          const outer = dialPoint(value, DIAL_R + 10);
          const inner = dialPoint(value, DIAL_R + (value % 20 === 0 ? 4 : 7));
          const text = dialPoint(value, DIAL_R + 19);
          return (
            <g key={value}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={chart.axis} strokeWidth={1} />
              {value % 20 === 0 && (
                <text x={text.x} y={text.y + 3} textAnchor="middle" fontSize={8} fill={chart.axis}>
                  {value}
                </text>
              )}
            </g>
          );
        })}
        {/* Needle */}
        <line x1={100} y1={100} x2={needle.x} y2={needle.y} stroke={chart.dark ? '#f8fafc' : '#0f172a'} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={100} cy={100} r={5} fill={chart.dark ? '#f8fafc' : '#0f172a'} />
        {/* Below the pivot, clear of the needle */}
        <text x={100} y={128} textAnchor="middle" fontSize={20} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
          {Math.round(shown)}%
        </text>
      </svg>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{label}</span>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">{sub}</span>
    </div>
  );
};

// ── 4. Big % tile ────────────────────────────────────────────────────────────

export const BigPercentTile: React.FC<{
  pct: number;
  label: string;
  sub: string;
  /** Background: a status colour from the chart theme */
  color: string;
  animate: boolean;
  delay?: number;
  onClick?: () => void;
}> = ({ pct, label, sub, color, animate, delay = 0, onClick }) => {
  const shown = useAnimatedNumber(pct, animate, delay);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="text-left rounded-xl p-4 text-white shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md motion-reduce:transform-none flex flex-col justify-between min-h-[132px]"
      style={{ backgroundColor: color }}
    >
      <span className="text-4xl font-bold tabular-nums leading-none">{Math.round(shown)}%</span>
      <span>
        <span className="block text-sm font-semibold mt-3">{label}</span>
        <span className="block text-[11px] opacity-90 leading-snug">{sub}</span>
      </span>
    </button>
  );
};

// ── 5. Bullet bars: actual against a target ──────────────────────────────────

export const BulletBars: React.FC<{
  rows: PercentItem[];
  /** 0–100 */
  target: number;
  animate: boolean;
}> = ({ rows, target, animate }) => {
  const chart = useChartTheme();
  const targetLine = chart.dark ? '#f8fafc' : '#0f172a';
  return (
    <>
      <ul className="mt-3 space-y-2.5">
        {rows.map((row, index) => (
          <BulletRow key={row.key} row={row} target={target} targetLine={targetLine} animate={animate} delay={index * 50} />
        ))}
      </ul>
      <BandLegend
        extra={
          <span className="inline-flex items-center gap-1.5">
            <span className="w-0.5 h-3" style={{ backgroundColor: targetLine }} />
            Target {target}%
          </span>
        }
      />
    </>
  );
};

const BulletRow: React.FC<{ row: PercentItem; target: number; targetLine: string; animate: boolean; delay: number }> = ({
  row,
  target,
  targetLine,
  animate,
  delay,
}) => {
  const chart = useChartTheme();
  const shown = useAnimatedNumber(row.pct, animate, delay);
  const metTarget = row.pct >= target;
  return (
    <li>
      <button
        type="button"
        onClick={row.onClick}
        disabled={!row.onClick}
        title={`${row.label}: ${row.pct}% approved (${row.sub}) · target ${target}%`}
        className={`w-full grid grid-cols-[minmax(0,7.5rem)_1fr_4.5rem] items-center gap-3 text-xs rounded px-1 py-0.5 enabled:hover:bg-slate-50 dark:enabled:hover:bg-slate-800/50 ${
          row.selected ? 'bg-slate-50 dark:bg-slate-800/50' : ''
        }`}
      >
        <span className="truncate text-left text-slate-700 dark:text-slate-300">{row.label}</span>
        <span className="relative h-3.5 rounded bg-slate-100 dark:bg-slate-800">
          <span
            className="absolute inset-y-0 left-0 rounded"
            style={{ width: `${Math.min(shown, 100)}%`, backgroundColor: chart.scoreBands[scoreBandIndex(row.pct)] }}
          />
          <span className="absolute -top-1 -bottom-1 w-0.5" style={{ left: `${target}%`, backgroundColor: targetLine }} />
        </span>
        <span className="text-right tabular-nums">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.round(shown)}%</span>
          <span className={`ml-1 ${metTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {metTarget ? '✓' : `−${target - row.pct}`}
          </span>
        </span>
      </button>
    </li>
  );
};

// ── 6. Units opened per month: this year as a solid line, last year dashed ────

export const MonthlyTrend: React.FC<{
  rows: Array<{ month: string; current: number; previous: number | null }>;
  animate: boolean;
}> = ({ rows, animate }) => {
  const chart = useChartTheme();
  const axisTick = { fill: chart.axis, fontSize: 11 };
  const previousColor = chart.dark ? '#f59e0b' : '#d97706';
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: chart.series }} />
          Last 12 months
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: previousColor }} />
          Same month a year before
        </span>
      </div>
      <div className="h-60 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 20, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chart.grid} strokeOpacity={0.25} />
            {/* Month only on the axis ("Nov '25" → "Nov"); the tooltip gives the year */}
            <XAxis
              dataKey="month"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickFormatter={(month: string) => month.slice(0, 3)}
            />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ stroke: chart.grid, strokeOpacity: 0.5 }}
              content={({ active, payload }: any) =>
                active && payload?.length ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{payload[0].payload.month}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Opened: <span className="font-semibold text-slate-900 dark:text-slate-100">{payload[0].payload.current}</span>
                    </p>
                    {payload[0].payload.previous !== null && (
                      <p className="text-slate-500 dark:text-slate-400">
                        A year before:{' '}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{payload[0].payload.previous}</span>
                      </p>
                    )}
                  </div>
                ) : null
              }
            />
            {/* Last year first, so this year's line draws on top */}
            <Line
              type="monotone"
              dataKey="previous"
              name="A year before"
              stroke={previousColor}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, fill: previousColor, stroke: chart.surface, strokeWidth: 2 }}
              isAnimationActive={animate}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              name="Opened"
              stroke={chart.series}
              strokeWidth={2.5}
              dot={{ r: 3, fill: chart.series, stroke: chart.surface, strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: chart.series, stroke: chart.surface, strokeWidth: 2 }}
              isAnimationActive={animate}
            >
              <LabelList dataKey="current" position="top" offset={8} fill={chart.axis} fontSize={10} fontWeight={600} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

// ── 7. Icon counters ─────────────────────────────────────────────────────────

export interface CounterItem {
  key: string;
  label: string;
  value: number | null;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip */
  tone: string;
  to?: string;
}

const Counter: React.FC<{ item: CounterItem; animate: boolean; delay: number }> = ({ item, animate, delay }) => {
  const navigate = useNavigate();
  const value = useAnimatedNumber(item.value ?? 0, animate, delay);
  const Icon = item.icon;
  return (
    <button
      type="button"
      disabled={!item.to}
      onClick={() => item.to && navigate(item.to)}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-left enabled:hover:bg-slate-50 dark:enabled:hover:bg-slate-800/50"
    >
      <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${item.tone}`}>
        <Icon size={19} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
          {item.value === null ? '—' : Math.round(value).toLocaleString()}
        </span>
        <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{item.label}</span>
      </span>
    </button>
  );
};

export const IconCounters: React.FC<{ items: CounterItem[]; animate: boolean }> = ({ items, animate }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
    {items.map((item, index) => (
      <Counter key={item.key} item={item} animate={animate} delay={index * 60} />
    ))}
  </div>
);
