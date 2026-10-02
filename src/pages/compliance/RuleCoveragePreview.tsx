import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { complianceRuleService, RuleCoveragePreviewResult } from '@/services/complianceRuleService';

interface RuleCoveragePreviewProps {
  entityTypes: string[];
  locationTypes: string[];
  states: string[];
}

/** Live count of the locations a rule's criteria would cover, shown in the rule form */
const RuleCoveragePreview: React.FC<RuleCoveragePreviewProps> = ({ entityTypes, locationTypes, states }) => {
  const [preview, setPreview] = useState<RuleCoveragePreviewResult | null>(null);
  const [failed, setFailed] = useState(false);

  // Stable key so the effect only reruns when the selection really changes
  const key = JSON.stringify([entityTypes, locationTypes, states]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      complianceRuleService
        .previewCoverage({
          applicableEntityTypes: entityTypes,
          applicableLocationTypes: locationTypes,
          applicableStates: states,
        })
        .then((result) => {
          if (cancelled) return;
          setPreview(result);
          setFailed(false);
        })
        .catch(() => !cancelled && setFailed(true));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (failed || !preview) return null;

  const none = preview.applicable === 0;
  const remaining = preview.applicable - preview.sample.length;

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm ${
        none
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-700/40 text-amber-900 dark:text-amber-200'
          : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200'
      }`}
    >
      <MapPin size={16} className="flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold">
          {none
            ? 'These criteria match no active location'
            : `Applies to ${preview.applicable} of ${preview.totalLocations} active location${preview.totalLocations === 1 ? '' : 's'}`}
        </div>
        {!none && (
          <div className="text-xs mt-0.5 opacity-90">
            {preview.sample.map((location) => location.name).join(', ')}
            {remaining > 0 && ` and ${remaining} more`}
          </div>
        )}
      </div>
    </div>
  );
};

export default RuleCoveragePreview;
