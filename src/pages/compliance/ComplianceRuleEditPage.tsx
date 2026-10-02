import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scale, ArrowLeft, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { complianceRuleService, ComplianceRuleItem, CreateRulePayload } from '@/services/complianceRuleService';
import { ROUTES } from '@/constants/routes';
import RuleForm, { RULE_FORM_ID } from './RuleForm';

export const ComplianceRuleEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [rule, setRule] = useState<ComplianceRuleItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    complianceRuleService
      .getRuleById(id)
      .then(setRule)
      .catch((err: any) => {
        toast.error(err.message || 'Failed to load compliance rule');
        navigate(ROUTES.COMPLIANCE_RULES);
      });
  }, [id, toast, navigate]);

  const goBack = () => navigate(`/compliance/rules/${id}`);

  const handleSubmit = async (payload: CreateRulePayload) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const res = await complianceRuleService.updateRule(id, payload);
      toast.success(res.message || 'Compliance rule updated');
      // Land on the coverage tab, in case the change brought new locations into scope
      navigate(`/compliance/rules/${id}?tab=coverage`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update compliance rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rule) {
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
            aria-label="Back to rule"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Edit Rule</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {rule.name} · {rule.code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={goBack} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={RULE_FORM_ID} variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
            Save Changes
          </Button>
        </div>
      </div>

      <RuleForm initial={rule} isSubmitting={isSubmitting} onSubmit={handleSubmit} onCancel={goBack} />
    </div>
  );
};

export default ComplianceRuleEditPage;
