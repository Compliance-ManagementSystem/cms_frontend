const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from today to the given date (negative when in the past). */
export const daysFromToday = (date: string | Date): number => {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
};

/** "today", "in 6 days", "7 days ago" */
export const formatRelativeDays = (date: string | Date): string => {
  const days = daysFromToday(date);
  if (days === 0) return 'today';
  const count = Math.abs(days);
  const unit = count === 1 ? 'day' : 'days';
  return days > 0 ? `in ${count} ${unit}` : `${count} ${unit} ago`;
};

/** "5 Nov 2027": day first and the month in words, so it never reads as 11 May */
export const formatDate = (date: string | Date): string =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** "5 Nov 2027, 14:30" */
export const formatDateTime = (date: string | Date): string =>
  new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
