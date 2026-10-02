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
