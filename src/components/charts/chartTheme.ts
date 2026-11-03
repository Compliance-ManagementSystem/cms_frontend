import { useTheme } from '@/contexts/ThemeContext';
import type { HealthBucket } from '@/services/dashboardService';

/**
 * Chart colours for the current theme.
 *
 * The four health-bucket colours are checked for colour-blind separation and
 * contrast against each surface, in this stacking order: compliant, pending,
 * expiring soon, expired. Keep that order wherever the buckets sit side by side.
 */

// Compliance-score bands for the map: one hue, stepped by magnitude
export const SCORE_BANDS = [
  { min: 0, label: 'Below 40%' },
  { min: 40, label: '40–59%' },
  { min: 60, label: '60–79%' },
  { min: 80, label: '80–100%' },
];

export const scoreBandIndex = (percentage: number): number =>
  percentage >= 80 ? 3 : percentage >= 60 ? 2 : percentage >= 40 ? 1 : 0;

export const useChartTheme = () => {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return {
    dark,
    /** Card background, used for the gap between adjacent fills */
    surface: dark ? '#0b1120' : '#ffffff',
    grid: '#94a3b8',
    axis: dark ? '#94a3b8' : '#64748b',
    bucket: {
      compliant: '#059669',
      pending: dark ? '#6366f1' : '#4f46e5',
      expiringSoon: dark ? '#d97706' : '#f59e0b',
      expired: '#e11d48',
    } as Record<HealthBucket, string>,
    /**
     * Licence status, in stacking order: approved, applied, to be applied, expired.
     * The same four validated hues as the health buckets.
     */
    licence: {
      approved: '#059669',
      applied: dark ? '#6366f1' : '#4f46e5',
      toBeApplied: dark ? '#d97706' : '#f59e0b',
      expired: '#e11d48',
    },
    /** Unit status: open, to be opened, closed */
    unit: {
      open: '#059669',
      toBeOpened: dark ? '#6366f1' : '#4f46e5',
      closed: '#e11d48',
    },
    /** Single-series bars */
    series: dark ? '#6366f1' : '#4f46e5',
    /**
     * Amber, blue and sky for the charts that only count things (openings,
     * districts, unit and area types). Blue leads, sky supports, amber highlights.
     * Kept off the licence-status charts, where amber means "to be applied".
     */
    trio: {
      blue: dark ? '#3b82f6' : '#2563eb',
      sky: dark ? '#38bdf8' : '#0ea5e9',
      amber: dark ? '#fbbf24' : '#f59e0b',
    },
    /** The trio, then deeper and lighter steps of it, for more than three categories */
    trioSteps: dark
      ? ['#3b82f6', '#38bdf8', '#fbbf24', '#1d4ed8', '#7dd3fc', '#fcd34d', '#93c5fd', '#b45309']
      : ['#2563eb', '#0ea5e9', '#f59e0b', '#1e3a8a', '#7dd3fc', '#fcd34d', '#93c5fd', '#b45309'],
    critical: '#e11d48',
    /** Low → high score; the low end recedes towards the surface in each theme */
    scoreBands: dark ? ['#184f95', '#256abf', '#5598e7', '#b7d3f6'] : ['#b7d3f6', '#6da7ec', '#2a78d6', '#104281'],
    noData: dark ? '#1e293b' : '#e2e8f0',
    mapStroke: dark ? '#0b1120' : '#ffffff',
    mapHoverStroke: dark ? '#f8fafc' : '#0f172a',
  };
};
