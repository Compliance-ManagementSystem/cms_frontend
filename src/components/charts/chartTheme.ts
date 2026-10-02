import { useTheme } from '@/contexts/ThemeContext';
import type { HealthBucket } from '@/services/dashboardService';

/**
 * Chart colours for the current theme.
 *
 * The four health-bucket colours are checked for colour-blind separation and
 * contrast against each surface, in this stacking order: compliant, pending,
 * expiring soon, expired. Keep that order wherever the buckets sit side by side.
 */
export const BUCKET_ORDER: HealthBucket[] = ['compliant', 'pending', 'expiringSoon', 'expired'];

export const BUCKET_LABELS: Record<HealthBucket, string> = {
  compliant: 'Compliant',
  pending: 'Pending Action',
  expiringSoon: 'Expiring Soon',
  expired: 'Expired',
};

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
      compliant: '#0ca30c',
      pending: dark ? '#3987e5' : '#2a78d6',
      expiringSoon: dark ? '#c98500' : '#eda100',
      expired: '#d03b3b',
    } as Record<HealthBucket, string>,
    /** Single-series bars */
    series: dark ? '#3987e5' : '#2a78d6',
    critical: '#d03b3b',
    /** Low → high score; the low end recedes towards the surface in each theme */
    scoreBands: dark
      ? ['#184f95', '#256abf', '#5598e7', '#b7d3f6']
      : ['#b7d3f6', '#6da7ec', '#2a78d6', '#104281'],
    noData: dark ? '#1e293b' : '#e2e8f0',
    mapStroke: dark ? '#0b1120' : '#ffffff',
    mapHoverStroke: dark ? '#f8fafc' : '#0f172a',
  };
};
