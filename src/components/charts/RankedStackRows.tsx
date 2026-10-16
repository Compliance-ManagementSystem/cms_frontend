import React, { useEffect, useState } from 'react';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';

export interface RankedSeries {
  key: string;
  label: string;
  color: string;
}

export interface RankedRow {
  key: string;
  label: string;
  values: Record<string, number>;
}

type Mode = 'count' | 'share';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
// Lighter at the top edge, the series colour at the bottom
const fillOf = (color: string) => `linear-gradient(180deg, color-mix(in srgb, ${color} 70%, white), ${color})`;

const Row: React.FC<{
  row: RankedRow;
  series: RankedSeries[];
  max: number;
  mode: Mode;
  index: number;
  animate: boolean;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  tipAbove: boolean;
  onHover: (key: string | null) => void;
  onSelect: (key: string) => void;
}> = ({ row, series, max, mode, index, animate, selected, hovered, dimmed, tipAbove, onHover, onSelect }) => {
  const total = series.reduce((sum, item) => sum + (row.values[item.key] || 0), 0);
  const shownTotal = useAnimatedNumber(total, animate, index * 60);
  // Bars start empty and grow once the row is on the page
  const [ready, setReady] = useState(!animate);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const filled = series.filter((item) => row.values[item.key] > 0);
  const lastKey = filled[filled.length - 1]?.key;
  const width = !ready || total === 0 ? '0%' : mode === 'share' ? '100%' : `${(total / max) * 100}%`;

  return (
    <li className="relative">
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(row.key)}
        onMouseEnter={() => onHover(row.key)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(row.key)}
        onBlur={() => onHover(null)}
        className={`w-full grid grid-cols-[minmax(0,7.5rem)_1fr_2.25rem] items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-[opacity,background-color] duration-200 motion-reduce:transition-none ${
          selected
            ? 'bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:ring-blue-500/30'
            : hovered
              ? 'bg-slate-50 dark:bg-slate-800/60'
              : ''
        } ${dimmed ? 'opacity-40' : ''}`}
      >
        <span
          className={`truncate ${
            selected || hovered ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {row.label}
        </span>
        <span className="h-3 rounded-r-md bg-slate-100 dark:bg-slate-800">
          <span
            className="flex h-full rounded-r-md overflow-hidden origin-left motion-reduce:transition-none"
            style={{
              width,
              // Keeps a one-unit state visible beside one with hundreds
              minWidth: ready && total > 0 ? 10 : 0,
              transform: hovered ? 'scaleY(1.35)' : 'none',
              transition: `width 700ms ${EASE} ${index * 45}ms, transform 150ms`,
            }}
          >
            {series.map((item) => {
              const value = row.values[item.key] || 0;
              return (
                <span
                  key={item.key}
                  className="motion-reduce:transition-none"
                  style={{
                    flexGrow: value,
                    flexBasis: 0,
                    minWidth: value > 0 ? 3 : 0,
                    // The gap between segments shows the card surface, not a border
                    marginRight: value > 0 && item.key !== lastKey ? 2 : 0,
                    backgroundImage: fillOf(item.color),
                    filter: hovered ? 'saturate(1.2) brightness(1.08)' : 'none',
                    transition: `flex-grow 500ms ${EASE}, filter 150ms`,
                  }}
                />
              );
            })}
          </span>
        </span>
        <span className="text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
          {Math.round(shownTotal).toLocaleString()}
        </span>
      </button>

      {hovered && total > 0 && (
        <div
          className={`absolute left-[8.25rem] z-20 pointer-events-none min-w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-xs space-y-1 ${
            tipAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <p className="font-semibold text-slate-800 dark:text-slate-200">{row.label}</p>
          {series.map((item) => {
            const value = row.values[item.key] || 0;
            return (
              <p key={item.key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-500 dark:text-slate-400">{item.label}:</span>
                <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {value.toLocaleString()}
                  <span className="font-normal text-slate-500 dark:text-slate-400"> ({Math.round((value / total) * 100)}%)</span>
                </span>
              </p>
            );
          })}
          <p className="pt-1 border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            Total: <span className="font-semibold text-slate-900 dark:text-slate-100">{total.toLocaleString()}</span>
          </p>
        </div>
      )}
    </li>
  );
};

/**
 * One row per item, largest first, each bar split by series. The legend switches
 * a series off and on, and the toggle swaps counts for each row's own make-up.
 */
const RankedStackRows: React.FC<{
  rows: RankedRow[];
  series: RankedSeries[];
  animate: boolean;
  selected?: string;
  onSelect: (key: string) => void;
}> = ({ rows, series, animate, selected, onSelect }) => {
  const [mode, setMode] = useState<Mode>('count');
  const [hidden, setHidden] = useState<string[]>([]);
  const [hover, setHover] = useState<string | null>(null);

  const shown = series.filter((item) => !hidden.includes(item.key));
  const totalOf = (row: RankedRow, items: RankedSeries[]) => items.reduce((sum, item) => sum + (row.values[item.key] || 0), 0);
  // Ranked on every series, so switching one off does not shuffle the rows
  const ranked = [...rows].sort((a, b) => totalOf(b, series) - totalOf(a, series));
  const max = Math.max(...ranked.map((row) => totalOf(row, shown)), 1);

  const toggle = (key: string) =>
    setHidden((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      // The last series left on stays on
      return prev.length + 1 >= series.length ? prev : [...prev, key];
    });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-2">
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
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
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color, opacity: off ? 0.35 : 1 }} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
          {(['count', 'share'] as Mode[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                mode === option
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {option === 'count' ? 'Count' : 'Share %'}
            </button>
          ))}
        </div>
      </div>

      <ul className={`mt-3 space-y-0.5 ${ranked.length > 12 ? 'max-h-96 overflow-y-auto pr-1' : ''}`}>
        {ranked.map((row, index) => (
          <Row
            key={row.key}
            row={row}
            series={shown}
            max={max}
            mode={mode}
            index={index}
            animate={animate}
            selected={selected === row.key}
            hovered={hover === row.key}
            dimmed={hover !== null && hover !== row.key}
            tipAbove={index > 0 && index >= ranked.length / 2}
            onHover={setHover}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </>
  );
};

export default RankedStackRows;
