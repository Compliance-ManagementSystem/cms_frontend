import React from 'react';
import type { ComplianceRecordStatus } from '@/services/complianceRecordService';

/**
 * A compliance record's status as a small coloured dot and a plain word, the same
 * wherever a status is shown. The colours follow the licence statuses on the dashboard.
 */
const STATUS: Record<string, { label: string; dot: string }> = {
  pending: { label: 'To be applied', dot: 'bg-amber-500' },
  ready_to_apply: { label: 'Ready to apply', dot: 'bg-cyan-500' },
  in_progress: { label: 'Applied', dot: 'bg-indigo-500' },
  submitted: { label: 'Submitted', dot: 'bg-indigo-500' },
  under_review: { label: 'Under review', dot: 'bg-indigo-500' },
  resubmitted: { label: 'Resubmitted', dot: 'bg-indigo-500' },
  correction: { label: 'Correction requested', dot: 'bg-orange-500' },
  approved: { label: 'Approved', dot: 'bg-emerald-500' },
  expiring_soon: { label: 'Expiring soon', dot: 'bg-amber-500' },
  expired: { label: 'Expired', dot: 'bg-rose-500' },
  rejected: { label: 'Rejected', dot: 'bg-rose-500' },
  not_applicable: { label: 'Not applicable', dot: 'border border-slate-400 dark:border-slate-500' },
};

const recordStatusLabel = (status: ComplianceRecordStatus | string): string =>
  STATUS[status]?.label ?? status.replace(/_/g, ' ');

const RecordStatus: React.FC<{ status: ComplianceRecordStatus | string; size?: 'sm' | 'md' }> = ({
  status,
  size = 'sm',
}) => {
  const style = STATUS[status] ?? { label: recordStatusLabel(status), dot: 'bg-slate-400' };
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 ${
        size === 'md' ? 'text-sm' : 'text-xs'
      }`}
    >
      <span className={`shrink-0 rounded-full ${size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'} ${style.dot}`} />
      {style.label}
    </span>
  );
};

export default RecordStatus;
