import React, { useMemo, useRef, useState } from 'react';
// State outlines: @svg-maps/india, licensed CC BY 4.0
import indiaMap from '@svg-maps/india';
import type { StateComplianceItem } from '@/services/dashboardService';
import { SCORE_BANDS, scoreBandIndex, useChartTheme } from './chartTheme';

interface MapLocation {
  id: string;
  name: string;
  path: string;
}

const map = indiaMap as unknown as { viewBox: string; locations: MapLocation[] };

const normalise = (name: string) => name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');

// Names used in addresses that differ from the map's labels. The outlines predate
// the 2019–2020 reorganisation, so Ladakh and the merged Dadra/Daman territory
// map onto the older shapes.
const ALIASES: Record<string, string> = {
  orissa: 'or',
  uttaranchal: 'ut',
  pondicherry: 'py',
  nctofdelhi: 'dl',
  newdelhi: 'dl',
  ladakh: 'jk',
  jammukashmir: 'jk',
  dadraandnagarhavelianddamananddiu: 'dn',
  andamanandnicobar: 'an',
};

const idByName = new Map(map.locations.map((loc) => [normalise(loc.name), loc.id]));

export const resolveStateId = (state: string): string | undefined => {
  const key = normalise(state);
  return idByName.get(key) || ALIASES[key];
};

interface IndiaMapProps {
  data: StateComplianceItem[];
  onSelect: (state: string) => void;
  /** What the percentage measures and what is counted; defaults describe compliance records */
  measure?: { legend: string; valid: string; unit: string; breakdown?: boolean };
}

const DEFAULT_MEASURE = { legend: 'Records valid:', valid: 'valid', unit: 'records', breakdown: true };

const IndiaMap: React.FC<IndiaMapProps> = ({ data, onSelect, measure = DEFAULT_MEASURE }) => {
  const chart = useChartTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);

  const dataById = useMemo(() => {
    const byId = new Map<string, StateComplianceItem>();
    data.forEach((item) => {
      const id = resolveStateId(item.state);
      if (id) byId.set(id, item);
    });
    return byId;
  }, [data]);

  const hovered = hover ? map.locations.find((loc) => loc.id === hover.id) : null;
  const hoveredData = hover ? dataById.get(hover.id) : undefined;

  const trackPointer = (id: string, e: React.MouseEvent) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (box) setHover({ id, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox={map.viewBox}
        role="group"
        aria-label="Map of India showing compliance score by state"
        className="w-full h-[360px]"
      >
        {map.locations.map((loc) => {
          const item = dataById.get(loc.id);
          const isHovered = hover?.id === loc.id;
          return (
            <path
              key={loc.id}
              d={loc.path}
              fill={item ? chart.scoreBands[scoreBandIndex(item.percentage)] : chart.noData}
              stroke={isHovered ? chart.mapHoverStroke : chart.mapStroke}
              strokeWidth={isHovered ? 1.5 : 0.75}
              style={{ cursor: item ? 'pointer' : 'default', outline: 'none' }}
              {...(item
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `${loc.name}: ${item.percentage}% ${measure.valid}, ${item.total} ${measure.unit}. Open state view.`,
                    onClick: () => onSelect(item.state),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(item.state);
                      }
                    },
                    onFocus: () => setHover({ id: loc.id, x: 16, y: 16 }),
                    onBlur: () => setHover(null),
                  }
                : { 'aria-hidden': true })}
              onMouseMove={(e) => trackPointer(loc.id, e)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>

      {hovered && hover && (
        <div
          className="absolute z-10 pointer-events-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2 text-xs whitespace-nowrap"
          style={{ left: Math.min(hover.x + 14, (containerRef.current?.clientWidth || 0) - 190), top: hover.y + 14 }}
        >
          <p className="font-semibold text-slate-900 dark:text-slate-100">{hovered.name}</p>
          {hoveredData ? (
            <>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                {hoveredData.percentage}% {measure.valid} · {hoveredData.total} {measure.unit}
              </p>
              {measure.breakdown ? (
                <p className="text-slate-500 dark:text-slate-400">
                  {hoveredData.compliant} compliant · {hoveredData.expiringSoon} expiring · {hoveredData.pending} pending ·{' '}
                  {hoveredData.expired} expired
                </p>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">
                  {hoveredData.compliant} approved · {hoveredData.pending} pending
                  {hoveredData.expired > 0 ? ` · ${hoveredData.expired} expired` : ''}
                </p>
              )}
            </>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">No {measure.unit}</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-600 dark:text-slate-400">
        <span className="font-medium">{measure.legend}</span>
        {SCORE_BANDS.map((band, index) => (
          <span key={band.label} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: chart.scoreBands[index] }} />
            {band.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: chart.noData }} />
          No {measure.unit}
        </span>
      </div>
    </div>
  );
};

export default IndiaMap;
