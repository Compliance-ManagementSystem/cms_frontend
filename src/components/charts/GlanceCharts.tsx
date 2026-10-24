import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  Treemap,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
import type { LicenceBucket } from '@/services/dashboardService';

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
  /** Fill: a status colour from the chart theme */
  color: string;
  animate: boolean;
  delay?: number;
  onClick?: () => void;
}> = ({ pct, label, sub, color, animate, delay = 0, onClick }) => {
  const { dark } = useChartTheme();
  const shown = useAnimatedNumber(pct, animate, delay, 1200);
  const level = Math.min(Math.max(shown, 0), 100);
  // Above the fill the text takes the colour (lifted a little on the dark surface); below it, white
  const ink = dark ? `color-mix(in srgb, ${color} 60%, white)` : color;
  const content = (
    <>
      <span className="text-4xl font-bold tabular-nums leading-none">{Math.round(shown)}%</span>
      <span>
        <span className="block text-sm font-semibold mt-3">{label}</span>
        <span className="block text-[11px] opacity-90 leading-snug">{sub}</span>
      </span>
    </>
  );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={`${label}: ${pct}%`}
      className="relative overflow-hidden text-left rounded-xl shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md motion-reduce:transform-none min-h-[180px]"
      style={{ backgroundColor: `color-mix(in srgb, ${color} ${dark ? 18 : 12}%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)` }}
    >
      {/* The empty part: coloured text on the tint */}
      <span className="absolute inset-0 p-4 flex flex-col justify-between" style={{ color: ink }}>
        {content}
      </span>
      {/* The filled part: the same layout in white, cut off at the fill line */}
      <span
        aria-hidden
        className="absolute inset-0 p-4 flex flex-col justify-between text-white"
        style={{
          backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${color} 80%, white), ${color} 40%)`,
          clipPath: `inset(${100 - level}% 0 0 0)`,
        }}
      >
        {content}
      </span>
      {/* A soft highlight along the fill line */}
      {level > 0 && level < 100 && (
        <span
          aria-hidden
          className="absolute inset-x-0 h-px bg-white/60"
          style={{ bottom: `${level}%` }}
        />
      )}
    </button>
  );
};

// ── 5. States against a target as a race track: one ring per state ────────────

// The tracks sweep three quarters of a circle from 12 o'clock, leaving the top-left quarter for names
const SWEEP = 0.75;
const MAX_TRACKS = 10;

export const RaceTrack: React.FC<{
  rows: PercentItem[];
  /** 0–100 */
  target: number;
  animate: boolean;
}> = ({ rows, target, animate }) => {
  const chart = useChartTheme();
  const [hovered, setHovered] = React.useState<string | null>(null);
  const targetLine = chart.dark ? '#f8fafc' : '#0f172a';
  const tracks = rows.slice(0, MAX_TRACKS);
  const size = 320;
  const centre = size / 2;
  const outer = centre - 12;
  const step = Math.min(16, (outer - 28) / Math.max(tracks.length - 1, 1));
  const stroke = Math.max(step - 4, 5);
  const inner = outer - step * (tracks.length - 1);
  // The target as a finish line across every track
  const angle = (-90 + 360 * SWEEP * (target / 100)) * (Math.PI / 180);
  const at = (radius: number) => ({ x: centre + radius * Math.cos(angle), y: centre + radius * Math.sin(angle) });
  const lineFrom = at(inner - stroke);
  const lineTo = at(outer + stroke);
  const labelAt = at(outer + stroke + 8);

  const reached = rows.filter((row) => row.pct >= target);
  const behind = rows.filter((row) => row.pct < target).sort((a, b) => b.pct - a.pct);

  return (
    <>
      <div className="mt-2 flex flex-col sm:flex-row items-center gap-6">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px] shrink-0" role="img" aria-label={`States against a ${target}% target`}>
          {tracks.map((row, index) => (
            <Track
              key={row.key}
              row={row}
              radius={outer - step * index}
              stroke={stroke}
              centre={centre}
              animate={animate}
              delay={index * 70}
              dimmed={hovered !== null && hovered !== row.key}
              onHover={setHovered}
            />
          ))}
          <line x1={lineFrom.x} y1={lineFrom.y} x2={lineTo.x} y2={lineTo.y} stroke={targetLine} strokeWidth={2} strokeDasharray="3 3" />
          <text x={labelAt.x} y={labelAt.y} fill={targetLine} fontSize={11} fontWeight={700} textAnchor="middle">
            {target}%
          </text>
        </svg>

        {/* The story in words: who has made it, who is close, who is far off */}
        <div className="w-full min-w-0 space-y-4">
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {reached.length}
              <span className="text-base font-semibold text-slate-400 dark:text-slate-500"> of {rows.length}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">states have reached {target}%</p>
          </div>
          {behind.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                Closest to the line
              </p>
              <ul className="space-y-1">
                {behind.slice(0, 3).map((row) => (
                  <GapRow key={row.key} row={row} target={target} onHover={setHovered} />
                ))}
              </ul>
            </div>
          )}
          {behind.length > 3 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                Furthest behind
              </p>
              <ul className="space-y-1">
                {behind
                  .slice(Math.max(3, behind.length - 2))
                  .reverse()
                  .map((row) => (
                    <GapRow key={row.key} row={row} target={target} onHover={setHovered} />
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <BandLegend
        extra={
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dashed" style={{ borderColor: targetLine }} />
              Target {target}%
            </span>
            {rows.length > MAX_TRACKS && <span>Largest {MAX_TRACKS} states shown</span>}
          </>
        }
      />
    </>
  );
};

const Track: React.FC<{
  row: PercentItem;
  radius: number;
  stroke: number;
  centre: number;
  animate: boolean;
  delay: number;
  dimmed: boolean;
  onHover: (key: string | null) => void;
}> = ({ row, radius, stroke, centre, animate, delay, dimmed, onHover }) => {
  const chart = useChartTheme();
  const shown = useAnimatedNumber(row.pct, animate, delay);
  const circumference = 2 * Math.PI * radius;
  const track = circumference * SWEEP;
  const filled = track * (Math.min(shown, 100) / 100);
  return (
    <g
      onClick={row.onClick}
      onMouseEnter={() => onHover(row.key)}
      onMouseLeave={() => onHover(null)}
      className={row.onClick ? 'cursor-pointer' : undefined}
      style={{ opacity: dimmed ? 0.25 : 1, transition: 'opacity 150ms' }}
    >
      <title>{`${row.label}: ${row.pct}% approved (${row.sub})`}</title>
      <circle
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        stroke={chart.noData}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${track} ${circumference}`}
        transform={`rotate(-90 ${centre} ${centre})`}
      />
      {shown > 0 && (
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke={chart.scoreBands[scoreBandIndex(row.pct)]}
          strokeWidth={row.selected ? stroke + 2 : stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${centre} ${centre})`}
        />
      )}
      {/* Name and share at the start of the track, in the open quarter */}
      <text
        x={centre - 8}
        y={centre - radius + 3.5}
        textAnchor="end"
        fontSize={10}
        fontWeight={row.selected ? 800 : 600}
        fill={chart.axis}
      >
        {row.label} <tspan fontWeight={800} fill={chart.dark ? '#f8fafc' : '#0f172a'}>{row.pct}%</tspan>
      </text>
    </g>
  );
};

const GapRow: React.FC<{ row: PercentItem; target: number; onHover: (key: string | null) => void }> = ({ row, target, onHover }) => {
  const chart = useChartTheme();
  return (
    <li>
      <button
        type="button"
        onClick={row.onClick}
        disabled={!row.onClick}
        onMouseEnter={() => onHover(row.key)}
        onMouseLeave={() => onHover(null)}
        className="w-full flex items-center gap-2 text-xs rounded px-1.5 py-1 enabled:hover:bg-slate-50 dark:enabled:hover:bg-slate-800/50"
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: chart.scoreBands[scoreBandIndex(row.pct)] }} />
        <span className="truncate text-left text-slate-700 dark:text-slate-300">{row.label}</span>
        <span className="ml-auto tabular-nums font-semibold text-slate-900 dark:text-slate-100">{row.pct}%</span>
        <span className="w-14 text-right tabular-nums text-slate-400 dark:text-slate-500">{target - row.pct} to go</span>
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

// ── 6b. Districts as a treemap: tile size is the unit count, colour the state ──

// Kept clear of the four status colours, so a category never reads as a licence status
// (green, indigo, amber and red are taken, and so are their near neighbours)
const CATEGORY_HUES = ['#0891b2', '#c026d3', '#7c3aed', '#db2777', '#0284c7', '#a16207', '#475569', '#9333ea'];

export const DistrictTreemap: React.FC<{
  rows: Array<{ district: string; state: string; units: number }>;
  animate: boolean;
}> = ({ rows, animate }) => {
  // States take a hue in order of their biggest district, so the largest state is always the first hue
  const states = [...new Set(rows.map((row) => row.state))];
  const hueOf = (state: string) => CATEGORY_HUES[states.indexOf(state) % CATEGORY_HUES.length];
  const max = Math.max(...rows.map((row) => row.units), 1);
  const data = rows.map((row) => ({ name: row.district, size: row.units, state: row.state }));

  const Tile = ({ x, y, width, height, name, size, state, depth }: any) => {
    if (depth !== 1 || width <= 0 || height <= 0) return null;
    const hue = hueOf(state);
    const id = `district-${name}-${state}`.replace(/\W/g, '');
    // Smaller districts step back a little within their state's hue
    const strength = 0.7 + 0.3 * (size / max);
    const roomy = width > 70 && height > 46;
    const fits = width > 34 && height > 22;
    return (
      <g>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={hue} stopOpacity={strength} />
            <stop offset="100%" stopColor={hue} stopOpacity={strength * 0.78} />
          </linearGradient>
        </defs>
        <rect
          x={x + 2}
          y={y + 2}
          width={Math.max(width - 4, 0)}
          height={Math.max(height - 4, 0)}
          rx={10}
          fill={`url(#${id})`}
          className="transition-opacity hover:opacity-85"
        />
        {roomy && (
          <>
            <text x={x + 12} y={y + 24} fill="#ffffff" fontSize={13} fontWeight={700}>
              {name.length * 7.5 > width - 20 ? `${name.slice(0, Math.max(Math.floor((width - 28) / 7.5), 3))}…` : name}
            </text>
            <text x={x + 12} y={y + 40} fill="#ffffff" fillOpacity={0.8} fontSize={11}>
              {state}
            </text>
          </>
        )}
        {fits && (
          <text
            x={roomy ? x + width - 12 : x + width / 2}
            y={roomy ? y + height - 12 : y + height / 2 + 6}
            textAnchor={roomy ? 'end' : 'middle'}
            fill="#ffffff"
            fontSize={roomy ? 22 : 14}
            fontWeight={800}
          >
            {size}
          </text>
        )}
      </g>
    );
  };

  return (
    <>
      <div className="h-72 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            aspectRatio={4 / 3}
            isAnimationActive={animate}
            animationDuration={700}
            content={<Tile />}
          >
            <Tooltip
              content={({ active, payload }: any) =>
                active && payload?.length ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{payload[0].payload.name}</p>
                    <p className="text-slate-500 dark:text-slate-400">{payload[0].payload.state}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Units: <span className="font-semibold text-slate-900 dark:text-slate-100">{payload[0].payload.size}</span>
                    </p>
                  </div>
                ) : null
              }
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
      {/* Which colour is which state; one state needs no key */}
      {states.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-600 dark:text-slate-400">
          {states.map((state) => (
            <span key={state} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: hueOf(state) }} />
              {state}
            </span>
          ))}
        </div>
      )}
    </>
  );
};

// ── 6c. Licences as a radar: one spoke per licence, dents show the weak ones ──

const RADAR_BUCKET_LABELS: Record<LicenceBucket, string> = {
  approved: 'Approved',
  applied: 'Applied',
  toBeApplied: 'To be applied',
  expired: 'Expired',
};

export interface LicenceSpoke {
  ruleId: string;
  /** Short name for the spoke */
  label: string;
  name: string;
  counts: Record<LicenceBucket, number> & { total: number };
}

export const LicenceRadar: React.FC<{
  rows: LicenceSpoke[];
  buckets: LicenceBucket[];
  /** 0–100 */
  target: number;
  animate: boolean;
  onOpen: (bucket: LicenceBucket, ruleId: string) => void;
}> = ({ rows, buckets, target, animate, onOpen }) => {
  const chart = useChartTheme();
  const targetLine = chart.dark ? '#f8fafc' : '#0f172a';
  const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
  const data = rows.map((row) => ({
    ...row,
    approvedPct: share(row.counts.approved, row.counts.total),
    // Approved, or applied and waiting on the authority
    underwayPct: share(row.counts.approved + row.counts.applied, row.counts.total),
    target,
  }));
  const weakest = [...data].sort((a, b) => a.approvedPct - b.approvedPct || b.counts.total - a.counts.total).slice(0, 5);

  return (
    <div className="mt-2 grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-center">
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chart.licence.approved }} />
            Approved
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm opacity-60" style={{ backgroundColor: chart.licence.applied }} />
            Approved or applied
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed" style={{ borderColor: targetLine }} />
            Target {target}%
          </span>
        </div>
        <div className="h-[460px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="78%" margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
              <defs>
                <radialGradient id="licenceRadarApproved" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={chart.licence.approved} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={chart.licence.approved} stopOpacity={0.6} />
                </radialGradient>
              </defs>
              <PolarGrid stroke={chart.grid} strokeOpacity={0.3} />
              <PolarAngleAxis
                dataKey="label"
                tick={({ x, y, payload, textAnchor }: any) => {
                  const row = data[payload.index];
                  return (
                    <g className="cursor-pointer" onClick={() => row && onOpen('approved', row.ruleId)}>
                      <title>{row ? `${row.name}: ${row.approvedPct}% approved` : payload.value}</title>
                      <text x={x} y={y} textAnchor={textAnchor} fill={chart.axis} fontSize={11} fontWeight={600}>
                        {payload.value}
                      </text>
                      {row && (
                        <text x={x} y={y + 13} textAnchor={textAnchor} fill={chart.licence.approved} fontSize={11} fontWeight={800}>
                          {row.approvedPct}%
                        </text>
                      )}
                    </g>
                  );
                }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
              <Radar
                dataKey="target"
                name={`Target ${target}%`}
                stroke={targetLine}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
                isAnimationActive={false}
              />
              <Radar
                dataKey="underwayPct"
                name="Approved or applied"
                stroke={chart.licence.applied}
                strokeWidth={1.5}
                fill={chart.licence.applied}
                fillOpacity={0.15}
                isAnimationActive={animate}
                animationDuration={800}
              />
              <Radar
                dataKey="approvedPct"
                name="Approved"
                stroke={chart.licence.approved}
                strokeWidth={2.5}
                fill="url(#licenceRadarApproved)"
                dot={{ r: 4, fill: chart.licence.approved, stroke: chart.surface, strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: chart.surface, strokeWidth: 2, onClick: (_: any, point: any) => onOpen('approved', point.payload.ruleId) } as any}
                isAnimationActive={animate}
                animationDuration={1000}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</p>
                      <p className="text-slate-500 dark:text-slate-400">{row.counts.total} units it applies to</p>
                      {buckets.map((bucket) => (
                        <p key={bucket} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chart.licence[bucket] }} />
                          <span className="text-slate-500 dark:text-slate-400">{RADAR_BUCKET_LABELS[bucket]}:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{row.counts[bucket]}</span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* The dents, spelled out: each segment opens those records */}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Needs the most work</p>
        <ul className="space-y-3">
          {weakest.map((row) => (
            <li key={row.ruleId}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate font-semibold text-slate-900 dark:text-slate-100" title={row.name}>
                  {row.name}
                </span>
                <span className="whitespace-nowrap font-bold" style={{ color: chart.licence.approved }}>
                  {row.approvedPct}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 flex gap-[2px] rounded-full overflow-hidden">
                {buckets
                  .filter((bucket) => row.counts[bucket] > 0)
                  .map((bucket) => (
                    <button
                      key={bucket}
                      type="button"
                      onClick={() => onOpen(bucket, row.ruleId)}
                      title={`${RADAR_BUCKET_LABELS[bucket]}: ${row.counts[bucket]} of ${row.counts.total}. Click to open.`}
                      className="h-full hover:opacity-80"
                      style={{ flexGrow: row.counts[bucket], flexBasis: 0, minWidth: 4, backgroundColor: chart.licence[bucket] }}
                    />
                  ))}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">Click a licence on the radar, or a colour here, to open those records.</p>
      </div>
    </div>
  );
};

// ── 6d. Waffle: a 10 × 10 grid, one square per 1% ─────────────────────────────

/** Squares out of 100 for each value: every non-zero value gets at least one, the rest go by largest remainder */
const toSquares = (values: number[]): number[] => {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return values.map(() => 0);
  const exact = values.map((value) => (value / total) * 100);
  const squares = exact.map((share, index) => (values[index] > 0 ? Math.max(1, Math.floor(share)) : 0));
  let left = 100 - squares.reduce((sum, count) => sum + count, 0);
  const order = exact.map((share, index) => ({ index, rest: share - Math.floor(share) })).sort((a, b) => b.rest - a.rest);
  for (let i = 0; left > 0; i = (i + 1) % order.length) {
    if (values[order[i].index] > 0) {
      squares[order[i].index] += 1;
      left -= 1;
    }
  }
  // The minimum of one square can overshoot: take it back from the largest
  while (left < 0) {
    const largest = squares.indexOf(Math.max(...squares));
    squares[largest] -= 1;
    left += 1;
  }
  return squares;
};

export const Waffle: React.FC<{
  rows: Array<{ key: string; label: string; value: number }>;
  /** What one row counts, e.g. "units" */
  noun: string;
  animate: boolean;
}> = ({ rows, noun, animate }) => {
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [shown, setShown] = React.useState(!animate);
  React.useEffect(() => {
    if (!animate) return setShown(true);
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const squares = toSquares(rows.map((row) => row.value));
  const hueOf = (index: number) => CATEGORY_HUES[index % CATEGORY_HUES.length];
  // Square by square, in row order, so each category is one block
  const cells = rows.flatMap((row, index) => Array.from({ length: squares[index] }, () => ({ key: row.key, index })));

  return (
    <div className="mt-3 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
      <div className="grid grid-cols-10 gap-[3px] w-full max-w-[200px] shrink-0" role="img" aria-label={`Share of ${total} ${noun}`}>
        {cells.map((cell, position) => (
          <span
            key={position}
            className="aspect-square rounded-[4px]"
            style={{
              backgroundColor: hueOf(cell.index),
              opacity: hovered !== null && hovered !== cell.key ? 0.18 : 1,
              transform: shown ? 'scale(1)' : 'scale(0)',
              transition: `transform 300ms ease-out ${animate ? position * 6 : 0}ms, opacity 150ms`,
            }}
          />
        ))}
      </div>
      <ul className="w-full min-w-0 space-y-1.5">
        {rows.map((row, index) => (
          <li
            key={row.key}
            onMouseEnter={() => setHovered(row.key)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center gap-2 text-xs rounded px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: hueOf(index) }} />
            <span className="truncate text-slate-700 dark:text-slate-300" title={row.label}>
              {row.label}
            </span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-slate-100">{row.value}</span>
            <span className="w-9 text-right tabular-nums text-slate-400 dark:text-slate-500">
              {total === 0 ? '0%' : row.value / total < 0.005 ? '<1%' : `${Math.round((row.value / total) * 100)}%`}
            </span>
          </li>
        ))}
        <li className="pt-1.5 mt-1 border-t border-slate-200 dark:border-slate-700 flex text-xs text-slate-500 dark:text-slate-400 px-1.5">
          Each square is 1% · {total} {noun}
        </li>
      </ul>
    </div>
  );
};

// ── 6e. Half donut: shares of a whole, with the total in the middle ──────────

export const HalfDonut: React.FC<{
  rows: Array<{ key: string; label: string; value: number }>;
  /** What the total counts, e.g. "units" */
  noun: string;
  /** Labels that mean "not entered", drawn in grey */
  unsetLabels?: string[];
  animate: boolean;
}> = ({ rows, noun, unsetLabels = [], animate }) => {
  const chart = useChartTheme();
  const [hovered, setHovered] = React.useState<number | null>(null);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  // Start further along the palette than the waffle beside it, so the two panels don't share colours
  const colourOf = (index: number) =>
    unsetLabels.includes(rows[index].label) ? chart.noData : CATEGORY_HUES[(index + 4) % CATEGORY_HUES.length];
  const focus = hovered !== null ? rows[hovered] : null;

  return (
    <div className="mt-2">
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="92%"
              startAngle={180}
              endAngle={0}
              innerRadius="105%"
              outerRadius="160%"
              paddingAngle={2}
              cornerRadius={8}
              stroke="none"
              isAnimationActive={animate}
              animationDuration={900}
              onMouseEnter={(_: any, index: number) => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              {rows.map((row, index) => (
                <Cell
                  key={row.key}
                  fill={colourOf(index)}
                  fillOpacity={hovered === null || hovered === index ? 1 : 0.3}
                  style={{ transition: 'fill-opacity 150ms', outline: 'none' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* The total, or the hovered slice, in the hollow */}
        <div className="absolute inset-x-0 bottom-1 text-center pointer-events-none">
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
            {focus ? focus.value : total}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate px-8">
            {focus ? `${focus.label} · ${total > 0 ? Math.round((focus.value / total) * 100) : 0}%` : `${noun} in all`}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {rows.map((row, index) => (
          <li
            key={row.key}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center gap-2 text-xs rounded px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colourOf(index) }} />
            <span className="truncate text-slate-700 dark:text-slate-300" title={row.label}>
              {row.label}
            </span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-slate-100">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── 6f. Bubbles: one circle per state, sized by count, ringed by status ──────

// Short names for bubbles too small for the full one
const STATE_CODES: Record<string, string> = {
  'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', Assam: 'AS', Bihar: 'BR', Chhattisgarh: 'CG', Goa: 'GA',
  Gujarat: 'GJ', Haryana: 'HR', 'Himachal Pradesh': 'HP', Jharkhand: 'JH', Karnataka: 'KA', Kerala: 'KL',
  'Madhya Pradesh': 'MP', Maharashtra: 'MH', Manipur: 'MN', Meghalaya: 'ML', Mizoram: 'MZ', Nagaland: 'NL',
  Odisha: 'OD', Punjab: 'PB', Rajasthan: 'RJ', Sikkim: 'SK', 'Tamil Nadu': 'TN', Telangana: 'TG', Tripura: 'TR',
  'Uttar Pradesh': 'UP', Uttarakhand: 'UK', 'West Bengal': 'WB', Delhi: 'DL', 'Jammu and Kashmir': 'JK',
};

const BUBBLE_GAP = 6;

/** Packs circles, largest first, each as close to the middle as it fits without overlapping */
const packCircles = (radii: number[]): Array<{ x: number; y: number }> => {
  const placed: Array<{ x: number; y: number; r: number }> = [];
  const fits = (x: number, y: number, r: number) =>
    placed.every((c) => Math.hypot(c.x - x, c.y - y) >= c.r + r + BUBBLE_GAP - 0.01);
  for (const r of radii) {
    if (placed.length === 0) {
      placed.push({ x: 0, y: 0, r });
      continue;
    }
    const candidates: Array<{ x: number; y: number }> = [];
    // Touching one placed circle, at a spread of angles
    for (const c of placed) {
      for (let step = 0; step < 24; step++) {
        const angle = (step / 24) * Math.PI * 2;
        const d = c.r + r + BUBBLE_GAP;
        candidates.push({ x: c.x + d * Math.cos(angle), y: c.y + d * Math.sin(angle) });
      }
    }
    // Touching two placed circles at once: where the two "touching" circles cross
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const ra = a.r + r + BUBBLE_GAP;
        const rb = b.r + r + BUBBLE_GAP;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d === 0 || d > ra + rb || d < Math.abs(ra - rb)) continue;
        const along = (ra * ra - rb * rb + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(ra * ra - along * along, 0));
        const mx = a.x + (along * (b.x - a.x)) / d;
        const my = a.y + (along * (b.y - a.y)) / d;
        candidates.push({ x: mx + (h * (b.y - a.y)) / d, y: my - (h * (b.x - a.x)) / d });
        candidates.push({ x: mx - (h * (b.y - a.y)) / d, y: my + (h * (b.x - a.x)) / d });
      }
    }
    // Slightly wider than tall suits the panel
    const best = candidates
      .filter((c) => fits(c.x, c.y, r))
      .sort((p, q) => Math.hypot(p.x * 0.8, p.y) - Math.hypot(q.x * 0.8, q.y))[0];
    placed.push({ ...(best ?? { x: 0, y: 0 }), r });
  }
  return placed.map(({ x, y }) => ({ x, y }));
};

export const StateBubbles: React.FC<{
  rows: Array<{ key: string; label: string; values: Record<string, number> }>;
  series: Array<{ key: string; label: string; color: string }>;
  animate: boolean;
  selected?: string;
  onSelect: (key: string) => void;
}> = ({ rows, series, animate, selected, onSelect }) => {
  const chart = useChartTheme();
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [shown, setShown] = React.useState(!animate);
  React.useEffect(() => {
    if (!animate) return setShown(true);
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  const visible = series.filter((item) => !hidden.includes(item.key));
  const totalOf = (row: (typeof rows)[number]) => visible.reduce((sum, item) => sum + (row.values[item.key] || 0), 0);
  const items = rows
    .map((row) => ({ ...row, total: totalOf(row) }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  // Area follows the count; the smallest still has room for its short name and number
  const max = Math.max(...items.map((row) => row.total), 1);
  const radii = items.map((row) => Math.max(26, 92 * Math.sqrt(row.total / max)));
  const layout = React.useMemo(() => packCircles(radii), [radii.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const pad = 8;
  const minX = Math.min(...layout.map((c, i) => c.x - radii[i]), 0) - pad;
  const maxX = Math.max(...layout.map((c, i) => c.x + radii[i]), 0) + pad;
  const minY = Math.min(...layout.map((c, i) => c.y - radii[i]), 0) - pad;
  const maxY = Math.max(...layout.map((c, i) => c.y + radii[i]), 0) + pad;
  const ink = chart.dark ? '#f8fafc' : '#0f172a';
  const focus = items.find((row) => row.key === hovered);

  const toggle = (key: string) =>
    setHidden((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : prev.length + 1 >= series.length ? prev : [...prev, key]));

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 mt-2 text-[11px]">
        {series.map((item) => {
          const off = hidden.includes(item.key);
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={!off}
              title={off ? `Show ${item.label}` : `Hide ${item.label}`}
              onClick={() => toggle(item.key)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors ${
                off
                  ? 'border-transparent text-slate-400 dark:text-slate-500 line-through'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color, opacity: off ? 0.35 : 1 }} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="relative mt-2">
        <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="w-full max-h-[340px]" role="img" aria-label="Units by state">
          <defs>
            <radialGradient id="stateBubbleFill" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor={chart.dark ? '#334155' : '#ffffff'} />
              <stop offset="100%" stopColor={chart.dark ? '#1e293b' : '#e2e8f0'} />
            </radialGradient>
          </defs>
          {items.map((row, index) => {
            const { x, y } = layout[index];
            const r = radii[index];
            const ringR = r - 4;
            const ringWidth = Math.max(4, Math.min(9, r * 0.12));
            const circumference = 2 * Math.PI * ringR;
            const big = r >= 44;
            const isSelected = selected === row.key;
            let offset = 0;
            return (
              <g
                key={row.key}
                onClick={() => onSelect(row.key)}
                onMouseEnter={() => setHovered(row.key)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
                style={{
                  transform: `translate(${x}px, ${y}px) scale(${shown ? 1 : 0})`,
                  transition: `transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${animate ? index * 70 : 0}ms, opacity 150ms`,
                  opacity: hovered !== null && hovered !== row.key ? 0.35 : 1,
                }}
              >
                <title>{`${row.label}: ${row.total} units`}</title>
                <circle r={r} fill="url(#stateBubbleFill)" stroke={isSelected ? ink : 'none'} strokeWidth={2} />
                {/* Status ring, starting at 12 o'clock */}
                {visible.map((item) => {
                  const value = row.values[item.key] || 0;
                  if (value === 0) return null;
                  const length = (value / row.total) * circumference;
                  const gap = visible.filter((v) => (row.values[v.key] || 0) > 0).length > 1 ? 2 : 0;
                  const arc = (
                    <circle
                      key={item.key}
                      r={ringR}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={ringWidth}
                      strokeDasharray={`${Math.max(length - gap, 1)} ${circumference}`}
                      strokeDashoffset={-offset}
                      transform="rotate(-90)"
                    />
                  );
                  offset += length;
                  return arc;
                })}
                <text textAnchor="middle" y={big ? -2 : 4} fontSize={big ? Math.min(r * 0.42, 34) : 13} fontWeight={800} fill={ink}>
                  {row.total}
                </text>
                <text
                  textAnchor="middle"
                  y={big ? Math.min(r * 0.42, 34) * 0.55 + 4 : -9}
                  fontSize={big ? 12 : 9}
                  fontWeight={600}
                  fill={chart.axis}
                  style={{ display: big || r >= 26 ? undefined : 'none' }}
                >
                  {big ? row.label : STATE_CODES[row.label] || row.label.slice(0, 2).toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Details for the hovered state */}
        {focus && (
          <div className="absolute top-0 right-0 pointer-events-none min-w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">{focus.label}</p>
            {visible.map((item) => {
              const value = focus.values[item.key] || 0;
              return (
                <p key={item.key} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-500 dark:text-slate-400">{item.label}:</span>
                  <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {value}
                    <span className="font-normal text-slate-500 dark:text-slate-400"> ({Math.round((value / focus.total) * 100)}%)</span>
                  </span>
                </p>
              );
            })}
            <p className="pt-1 border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              Total: <span className="font-semibold text-slate-900 dark:text-slate-100">{focus.total}</span>
            </p>
          </div>
        )}
      </div>
    </>
  );
};

// ── 6g. Sankey: states on the left flowing into statuses on the right ────────

const SANKEY_W = 640;
const SANKEY_H = 300;
const SANKEY_NODE = 12;
const SANKEY_GAP = 8;
const SANKEY_MIN = 6;
// Room for the names either side
const SANKEY_LEFT = 150;
const SANKEY_RIGHT = SANKEY_W - 170;
// States beyond this many are grouped into one node
const SANKEY_STATES = 5;

interface SankeyNode {
  key: string;
  label: string;
  total: number;
  y: number;
  h: number;
  /** Where the next ribbon leaves or arrives */
  cursor: number;
}

/** Stacks nodes top to bottom, each sized by its total, with a minimum so small ones stay visible */
const stackNodes = <T extends { key: string; label: string; total: number }>(items: T[]): Array<T & SankeyNode> => {
  const sum = items.reduce((acc, item) => acc + item.total, 0) || 1;
  const room = SANKEY_H - SANKEY_GAP * (items.length - 1);
  const raw = items.map((item) => (item.total / sum) * room);
  // Whatever the minimum adds is taken back from the others in proportion
  const extra = raw.reduce((acc, h) => acc + Math.max(SANKEY_MIN - h, 0), 0);
  const big = raw.reduce((acc, h) => acc + (h > SANKEY_MIN ? h : 0), 0) || 1;
  let y = 0;
  return items.map((item, index) => {
    const h = raw[index] < SANKEY_MIN ? SANKEY_MIN : raw[index] - (extra * raw[index]) / big;
    const node = { ...item, y, h, cursor: y };
    y += h + SANKEY_GAP;
    return node;
  });
};

export const StateSankey: React.FC<{
  rows: Array<{ key: string; label: string; values: Record<string, number> }>;
  series: Array<{ key: string; label: string; color: string }>;
  animate: boolean;
  selected?: string;
  onSelect: (key: string) => void;
}> = ({ rows, series, animate, selected, onSelect }) => {
  const chart = useChartTheme();
  const [focus, setFocus] = React.useState<{ state?: string; status?: string } | null>(null);
  const [shown, setShown] = React.useState(!animate);
  React.useEffect(() => {
    if (!animate) return setShown(true);
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  const ink = chart.dark ? '#f8fafc' : '#0f172a';
  const sumOf = (values: Record<string, number>) => series.reduce((acc, item) => acc + (values[item.key] || 0), 0);
  const ranked = rows
    .map((row) => ({ ...row, total: sumOf(row.values) }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  // The largest states keep their own node; two or more small ones share one
  const grouped = ranked.length > SANKEY_STATES + 1;
  const rest = grouped ? ranked.slice(SANKEY_STATES) : [];
  const states = grouped
    ? [
        ...ranked.slice(0, SANKEY_STATES),
        {
          key: '__other',
          label: `${rest.length} other states`,
          values: Object.fromEntries(series.map((item) => [item.key, rest.reduce((acc, row) => acc + (row.values[item.key] || 0), 0)])),
          total: rest.reduce((acc, row) => acc + row.total, 0),
        },
      ]
    : ranked;
  const grand = states.reduce((acc, row) => acc + row.total, 0);
  const statuses = series
    .map((item) => ({ ...item, total: states.reduce((acc, row) => acc + (row.values[item.key] || 0), 0) }))
    .filter((item) => item.total > 0);

  const left = stackNodes(states);
  const right = stackNodes(statuses);

  // One ribbon per state and status: leaving in status order, arriving in state order
  const ribbons = left.flatMap((state) =>
    right
      .filter((status) => (state.values[status.key] || 0) > 0)
      .map((status) => {
        const value = state.values[status.key] || 0;
        const fromH = (value / state.total) * state.h;
        const toH = (value / status.total) * status.h;
        const ribbon = { state, status, value, y0: state.cursor, y1: state.cursor + fromH, t0: status.cursor, t1: status.cursor + toH };
        state.cursor += fromH;
        status.cursor += toH;
        return ribbon;
      })
  );

  const x0 = SANKEY_LEFT + SANKEY_NODE;
  const x1 = SANKEY_RIGHT;
  const mid = (x0 + x1) / 2;
  const lit = (stateKey: string, statusKey: string) =>
    !focus || (focus.state ? focus.state === stateKey : true) && (focus.status ? focus.status === statusKey : true);
  const hoveredRibbon = focus?.state && focus?.status ? ribbons.find((r) => r.state.key === focus.state && r.status.key === focus.status) : null;

  return (
    <div className="relative mt-3">
      <svg viewBox={`0 -4 ${SANKEY_W} ${SANKEY_H + 8}`} className="w-full" role="img" aria-label="Licences flowing from each state to their status">
        <defs>
          {ribbons.map((r) => (
            <linearGradient key={`${r.state.key}-${r.status.key}`} id={`sankey-${r.state.key}-${r.status.key}`.replace(/\W/g, '')} x1="0" x2="1">
              <stop offset="0%" stopColor={r.status.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={r.status.color} stopOpacity={0.65} />
            </linearGradient>
          ))}
        </defs>

        {ribbons.map((r, index) => (
          <path
            key={`${r.state.key}-${r.status.key}`}
            d={`M ${x0} ${r.y0} C ${mid} ${r.y0}, ${mid} ${r.t0}, ${x1} ${r.t0} L ${x1} ${r.t1} C ${mid} ${r.t1}, ${mid} ${r.y1}, ${x0} ${r.y1} Z`}
            fill={`url(#${`sankey-${r.state.key}-${r.status.key}`.replace(/\W/g, '')})`}
            onMouseEnter={() => setFocus({ state: r.state.key, status: r.status.key })}
            onMouseLeave={() => setFocus(null)}
            style={{
              opacity: !shown ? 0 : lit(r.state.key, r.status.key) ? 1 : 0.15,
              transition: `opacity ${shown && focus ? 150 : 500}ms ease-out ${focus ? 0 : animate ? index * 25 : 0}ms`,
            }}
          />
        ))}

        {/* States */}
        {left.map((state) => {
          const other = state.key === '__other';
          const isSelected = selected === state.key;
          return (
            <g
              key={state.key}
              onMouseEnter={() => setFocus({ state: state.key })}
              onMouseLeave={() => setFocus(null)}
              onClick={other ? undefined : () => onSelect(state.key)}
              className={other ? undefined : 'cursor-pointer'}
            >
              <title>
                {other
                  ? rest.map((row) => `${row.label}: ${row.total}`).join('\n')
                  : `${state.label}: ${state.total} licences. Click to filter.`}
              </title>
              <rect x={SANKEY_LEFT} y={state.y} width={SANKEY_NODE} height={state.h} rx={3} fill={other ? chart.grid : ink} fillOpacity={other ? 0.6 : 0.85} />
              <text
                x={SANKEY_LEFT - 8}
                y={state.y + state.h / 2}
                dy="0.35em"
                textAnchor="end"
                fontSize={12}
                fontWeight={isSelected ? 800 : 600}
                fill={other ? chart.axis : ink}
              >
                {state.label}
                <tspan fill={chart.axis} fontWeight={500}> {state.total.toLocaleString()}</tspan>
              </text>
            </g>
          );
        })}

        {/* Statuses */}
        {right.map((status) => (
          <g key={status.key} onMouseEnter={() => setFocus({ status: status.key })} onMouseLeave={() => setFocus(null)}>
            <rect x={SANKEY_RIGHT} y={status.y} width={SANKEY_NODE} height={status.h} rx={3} fill={status.color} />
            <text x={SANKEY_RIGHT + SANKEY_NODE + 8} y={status.y + status.h / 2} dy="-0.2em" fontSize={12} fontWeight={700} fill={ink}>
              {status.label}
            </text>
            <text x={SANKEY_RIGHT + SANKEY_NODE + 8} y={status.y + status.h / 2} dy="1.05em" fontSize={11} fill={chart.axis}>
              {status.total.toLocaleString()} · {grand > 0 ? Math.round((status.total / grand) * 100) : 0}%
            </text>
          </g>
        ))}
      </svg>

      {hoveredRibbon && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{hoveredRibbon.state.label}</span>
          <span className="text-slate-400"> → </span>
          <span className="font-semibold" style={{ color: hoveredRibbon.status.color }}>
            {hoveredRibbon.status.label}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            : {hoveredRibbon.value.toLocaleString()} ({Math.round((hoveredRibbon.value / hoveredRibbon.state.total) * 100)}% of the state)
          </span>
        </div>
      )}
    </div>
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
