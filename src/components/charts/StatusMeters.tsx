import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useChartTheme } from './chartTheme';

export interface StatusSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  to?: string;
}

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** Legend that carries every value; a row opens the matching list when it has a link */
const SliceList: React.FC<{
  slices: StatusSlice[];
  total: number;
  active?: string | null;
  onHover?: (key: string | null) => void;
}> = ({ slices, total, active, onHover }) => {
  const navigate = useNavigate();
  return (
    <ul className="mt-2 space-y-0.5">
      {slices.map((slice) => (
        <li key={slice.key}>
          <button
            type="button"
            disabled={!slice.to}
            onClick={() => slice.to && navigate(slice.to)}
            onMouseEnter={() => onHover?.(slice.key)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(slice.key)}
            onBlur={() => onHover?.(null)}
            className={`w-full flex items-center justify-between gap-3 px-1 py-1 rounded text-xs transition-colors enabled:hover:bg-slate-50 dark:enabled:hover:bg-slate-800/50 ${
              active === slice.key ? 'bg-slate-50 dark:bg-slate-800/50' : ''
            }`}
          >
            <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: slice.color }} />
              {slice.label}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {slice.value.toLocaleString()}
              <span className="font-normal text-slate-500 dark:text-slate-400"> ({pct(slice.value, total)}%)</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

const RING_STROKE = 11;
const RING_RADII = [86, 70, 54, 38];

const Ring: React.FC<{
  slice: StatusSlice;
  share: number;
  radius: number;
  delay: number;
  animate: boolean;
  dimmed: boolean;
  track: string;
  onHover: (key: string | null) => void;
  onOpen: () => void;
}> = ({ slice, share, radius, delay, animate, dimmed, track, onHover, onOpen }) => {
  const shown = useAnimatedNumber(share, animate, delay);
  const length = 2 * Math.PI * radius;

  return (
    <g
      opacity={dimmed ? 0.3 : 1}
      style={{ transition: 'opacity 150ms', cursor: slice.to ? 'pointer' : 'default' }}
      onMouseEnter={() => onHover(slice.key)}
      onMouseLeave={() => onHover(null)}
      onClick={onOpen}
    >
      <circle cx={100} cy={100} r={radius} fill="none" stroke={track} strokeWidth={RING_STROKE} />
      {shown > 0 && (
        <circle
          cx={100}
          cy={100}
          r={radius}
          fill="none"
          stroke={slice.color}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${length * Math.min(shown, 1)} ${length}`}
          transform="rotate(-90 100 100)"
        />
      )}
      {/* Wider than the ring, so a thin ring is still easy to point at */}
      <circle cx={100} cy={100} r={radius} fill="none" stroke="transparent" strokeWidth={RING_STROKE + 5} pointerEvents="stroke" />
    </g>
  );
};

/**
 * One ring per status, each filled to that status's share of the total. The
 * centre shows the total, or the status being pointed at.
 */
export const StatusRings: React.FC<{
  slices: StatusSlice[];
  total: number;
  centreLabel: string;
  animate: boolean;
}> = ({ slices, total, centreLabel, animate }) => {
  const chart = useChartTheme();
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const shownTotal = useAnimatedNumber(total, animate);
  const focus = slices.find((slice) => slice.key === active);

  return (
    <>
      <div className="h-48 relative flex items-center justify-center mt-2">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full"
          role="img"
          aria-label={slices.map((slice) => `${slice.label}: ${slice.value} (${pct(slice.value, total)}%)`).join(', ')}
        >
          {slices.slice(0, RING_RADII.length).map((slice, index) => (
            <Ring
              key={slice.key}
              slice={slice}
              share={total > 0 ? slice.value / total : 0}
              radius={RING_RADII[index]}
              delay={index * 150}
              animate={animate}
              dimmed={active !== null && active !== slice.key}
              track={chart.noData}
              onHover={setActive}
              onOpen={() => slice.to && navigate(slice.to)}
            />
          ))}
        </svg>
        <div className="absolute text-center pointer-events-none">
          <span className="block text-2xl font-bold text-slate-900 dark:text-slate-100">
            {focus ? focus.value.toLocaleString() : Math.round(shownTotal).toLocaleString()}
          </span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">{focus ? focus.label : centreLabel}</span>
        </div>
      </div>

      <SliceList slices={slices} total={total} active={active} onHover={setActive} />
    </>
  );
};

const GAUGE_RADIUS = 84;
const GAUGE_STROKE = 14;
const GAUGE_LENGTH = Math.PI * GAUGE_RADIUS;
const GAUGE_ARC = `M ${100 - GAUGE_RADIUS} 100 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${100 + GAUGE_RADIUS} 100`;

/**
 * Half-circle meter for one headline share, with the full breakdown listed below.
 * `headline` is the slice the meter measures.
 */
export const StatusGauge: React.FC<{
  slices: StatusSlice[];
  total: number;
  headline: string;
  animate: boolean;
}> = ({ slices, total, headline, animate }) => {
  const chart = useChartTheme();
  const measured = slices.find((slice) => slice.key === headline);
  const share = measured && total > 0 ? measured.value / total : 0;
  const shown = useAnimatedNumber(share, animate, 0, 1100);
  const label = measured?.label.toLowerCase() ?? '';

  return (
    <>
      <div className="h-40 mt-2">
        <svg viewBox="0 0 200 120" className="h-full w-full" role="img" aria-label={`${pct(measured?.value ?? 0, total)}% ${label}`}>
          <path d={GAUGE_ARC} fill="none" stroke={chart.noData} strokeWidth={GAUGE_STROKE} strokeLinecap="round" />
          {shown > 0 && (
            <path
              d={GAUGE_ARC}
              fill="none"
              stroke={measured?.color}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${GAUGE_LENGTH * Math.min(shown, 1)} ${GAUGE_LENGTH}`}
            />
          )}
          <text x={100} y={86} textAnchor="middle" fontSize={32} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            {Math.round(shown * 100)}%
          </text>
          <text x={100} y={101} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            {(measured?.value ?? 0).toLocaleString()} of {total.toLocaleString()} {label}
          </text>
          <text x={100 - GAUGE_RADIUS} y={118} textAnchor="middle" fontSize={9} fill={chart.axis}>
            0%
          </text>
          <text x={100 + GAUGE_RADIUS} y={118} textAnchor="middle" fontSize={9} fill={chart.axis}>
            100%
          </text>
        </svg>
      </div>

      <SliceList slices={slices} total={total} />
    </>
  );
};
