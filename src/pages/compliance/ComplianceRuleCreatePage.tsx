import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Scale, ArrowLeft, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { complianceRuleService, ComplianceRuleItem, CreateRulePayload } from '@/services/complianceRuleService';
import { ROUTES } from '@/constants/routes';
import RuleForm, { RULE_FORM_ID } from './RuleForm';

export const ComplianceRuleCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get('cloneId');

  // When duplicating, the form waits for the rule being copied
  const [template, setTemplate] = useState<ComplianceRuleItem | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(!!cloneId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!cloneId) return;
    complianceRuleService
      .getRuleById(cloneId)
      .then(setTemplate)
      .catch(() => toast.error('Could not load the rule to duplicate; starting from a blank form'))
      .finally(() => setIsLoadingTemplate(false));
  }, [cloneId, toast]);

  const handleSubmit = async (payload: CreateRulePayload) => {
    setIsSubmitting(true);
    try {
      const res = await complianceRuleService.createRule(payload);
      toast.success(res.message || 'Compliance rule created');
      // Land on the coverage tab, where records for matching locations can be created
      navigate(`/compliance/rules/${res.data.rule._id}?tab=coverage`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create compliance rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => navigate(cloneId ? `/compliance/rules/${cloneId}` : ROUTES.COMPLIANCE_RULES);

  if (isLoadingTemplate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading rule...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {template ? 'Duplicate Rule' : 'Create Rule'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {template
                ? `A copy of ${template.name}; it starts inactive`
                : 'An obligation that applies to matching locations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={goBack} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={RULE_FORM_ID} variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
            Create Rule
          </Button>
        </div>
      </div>

      <RuleForm template={template || undefined} isSubmitting={isSubmitting} onSubmit={handleSubmit} onCancel={goBack} />
    </div>
  );
};

export default ComplianceRuleCreatePage;
