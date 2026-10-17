import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, CircleX, Clock, Hourglass } from 'lucide-react';
import type { OperationsDashboardData } from '@/services/dashboardService';
import { daysFromToday } from '@/utils/dates';
import { ROUTES } from '@/constants/routes';

/**
 * Expiry alert for approved licences. Urgency is shown three ways at once, never by
 * colour alone: the bucket a licence falls in, its countdown in days, and its place on
 * the 90-day timeline. Each licence is counted in exactly one bucket.
 */

const WINDOW_DAYS = 90;

type Urgency = 'expired' | 'soon' | 'mid' | 'later';

// Text, fills and chips per urgency; the same four everywhere in this panel
const URGENCY: Record<Urgency, { label: string; dot: string; chip: string; edge: string; icon: typeof Clock }> = {
  expired: {
    label: 'Expired',
    dot: 'bg-rose-600',
    chip: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
    edge: 'border-l-rose-600 dark:border-l-rose-600',
    icon: CircleX,
  },
  soon: {
    label: '0–30 days',
    dot: 'bg-orange-500',
    chip: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
    edge: 'border-l-orange-500 dark:border-l-orange-500',
    icon: AlertTriangle,
  },
  mid: {
    label: '31–60 days',
    dot: 'bg-amber-400',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
    edge: 'border-l-amber-400 dark:border-l-amber-400',
    icon: Hourglass,
  },
  later: {
    label: '61–90 days',
    dot: 'bg-sky-500',
    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
    edge: 'border-l-sky-500 dark:border-l-sky-500',
    icon: CalendarClock,
  },
};

const urgencyOf = (days: number): Urgency => (days < 0 ? 'expired' : days <= 30 ? 'soon' : days <= 60 ? 'mid' : 'later');

const countdown = (days: number) =>
  days < 0 ? `${-days} ${days === -1 ? 'day' : 'days'} ago` : days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`;

export const ExpiryAlert: React.FC<{
  expiring: OperationsDashboardData['expiring'];
  expiredCount: number;
  approvedCount: number;
  /** Records list links: by expiry window in days, expired, and approved */
  links: { within: (days: number) => string; expired: string; approved: string };
}> = ({ expiring, expiredCount, approvedCount, links }) => {
  const navigate = useNavigate();

  // The server's counts are cumulative (60 includes 30); split them so each licence counts once
  const buckets: Array<{ key: Urgency; value: number; to: string }> = [
    { key: 'expired', value: expiredCount, to: links.expired },
    { key: 'soon', value: expiring.next30, to: links.within(30) },
    { key: 'mid', value: expiring.next60 - expiring.next30, to: links.within(60) },
    { key: 'later', value: expiring.next90 - expiring.next60, to: links.within(90) },
  ];

  const items = expiring.items.map((item) => ({ ...item, days: daysFromToday(item.expiryDate) }));
  const soonest = items[0];
  const missing = Math.max(0, approvedCount - expiring.withExpiryDate);
  const openRecord = (id: string) => navigate(ROUTES.COMPLIANCE_RECORD_DETAILS.replace(':id', id));

  return (
    <div className="mt-3 space-y-3">
      {/* Banner */}
      {expiring.next30 > 0 ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5 dark:border-orange-500/40 dark:bg-orange-500/10">
          <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
          </span>
          <p className="text-xs text-orange-900 dark:text-orange-100">
            <span className="font-semibold">
              {expiring.next30} {expiring.next30 === 1 ? 'licence expires' : 'licences expire'} within 30 days
            </span>
            {soonest && (
              <span className="block text-orange-800/80 dark:text-orange-200/80">
                Soonest: {soonest.unit}, {soonest.days <= 0 ? 'today' : `in ${countdown(soonest.days)}`}
              </span>
            )}
          </p>
        </div>
      ) : expiring.withExpiryDate === 0 ? null : (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold">Nothing expires in the next 30 days</span>
        </div>
      )}

      {/* Buckets: each licence once */}
      <div className="grid grid-cols-2 gap-2">
        {buckets.map((bucket) => {
          const style = URGENCY[bucket.key];
          const Icon = style.icon;
          return (
            <button
              key={bucket.key}
              type="button"
              onClick={() => navigate(bucket.to)}
              className={`text-left rounded-lg border border-slate-200 dark:border-slate-700/60 border-l-4 ${style.edge} px-2.5 py-2 transition hover:shadow-sm hover:-translate-y-0.5 motion-reduce:transform-none`}
            >
              <span className="flex items-center justify-between">
                <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{bucket.value.toLocaleString()}</span>
                <Icon size={15} className="text-slate-400 dark:text-slate-500" />
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">{style.label}</span>
            </button>
          );
        })}
      </div>

      {/* 90-day timeline */}
      {items.length > 0 && (
        <div>
          <div className="relative h-7">
            {/* The three windows as a pale band, so position reads at a glance */}
            <div className="absolute inset-x-0 top-3 h-1.5 flex rounded-full overflow-hidden">
              <span className="flex-1 bg-orange-200 dark:bg-orange-500/30" />
              <span className="flex-1 bg-amber-100 dark:bg-amber-500/20 mx-px" />
              <span className="flex-1 bg-sky-100 dark:bg-sky-500/20" />
            </div>
            {items.map((item, index) => {
              const urgency = urgencyOf(item.days);
              const left = (Math.min(Math.max(item.days, 0), WINDOW_DAYS) / WINDOW_DAYS) * 100;
              // Licences on the same day sit side by side rather than on top of each other
              const sameBefore = items.slice(0, index).filter((other) => other.days === item.days).length;
              return (
                <button
                  key={item.recordId}
                  type="button"
                  onClick={() => openRecord(item.recordId)}
                  title={`${item.licence} · ${item.unit} · ${countdown(item.days)}`}
                  aria-label={`${item.licence}, ${item.unit}, expires in ${countdown(item.days)}`}
                  className={`absolute top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white dark:border-slate-900 shadow ${URGENCY[urgency].dot} hover:scale-125 transition-transform motion-reduce:transform-none`}
                  style={{ left: `calc(${left}% + ${sameBefore * 10}px)` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-medium">Today</span>
            <span>30d</span>
            <span>60d</span>
            <span>90d</span>
          </div>
        </div>
      )}

      {/* The licences themselves */}
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const style = URGENCY[urgencyOf(item.days)];
            const elapsed = 1 - Math.min(Math.max(item.days, 0), WINDOW_DAYS) / WINDOW_DAYS;
            return (
              <li key={item.recordId}>
                <button
                  type="button"
                  onClick={() => openRecord(item.recordId)}
                  className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2" title={item.licence}>
                        {item.licence}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.unit}
                        {item.state ? ` · ${item.state}` : ''}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${style.chip}`}>
                      {countdown(item.days)}
                    </span>
                  </span>
                  {/* How much of the 90-day window has already passed */}
                  <span className="mt-1.5 block h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <span className={`block h-full rounded-full ${style.dot}`} style={{ width: `${Math.max(elapsed * 100, 4)}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        expiring.withExpiryDate > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">No approved licence expires in the next 90 days.</p>
        )
      )}
      {expiring.next90 > items.length && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Showing the soonest {items.length} of {expiring.next90}.{' '}
          <button type="button" onClick={() => navigate(links.within(90))} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            See all
          </button>
        </p>
      )}

      {/* The real risk: approved licences that can never raise a reminder */}
      {missing > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-500/40 dark:bg-amber-500/10">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs text-amber-900 dark:text-amber-100">
            <p>
              <span className="font-semibold">
                {missing.toLocaleString()} of {approvedCount.toLocaleString()} approved licences
              </span>{' '}
              have no expiry date, so no renewal reminder will be sent for them.
            </p>
            <button
              type="button"
              onClick={() => navigate(links.approved)}
              className="mt-1 font-semibold underline-offset-2 hover:underline"
            >
              Review approved licences →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
