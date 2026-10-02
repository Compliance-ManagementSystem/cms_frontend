import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { entityService, CreateEntityPayload } from '@/services/entityService';
import { ROUTES } from '@/constants/routes';
import EntityForm, { ENTITY_FORM_ID } from './EntityForm';

export const EntityCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (payload: CreateEntityPayload) => {
    setIsSubmitting(true);
    try {
      const res = await entityService.createEntity(payload);
      toast.success(res.message || 'Entity created');
      navigate(`/entities/${res.data.entity._id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create entity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => navigate(ROUTES.ENTITIES);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to entities"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Add Entity</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">A legal entity that owns locations and compliance records</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={goBack} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={ENTITY_FORM_ID} variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
            Create Entity
          </Button>
        </div>
      </div>

      <EntityForm isSubmitting={isSubmitting} onSubmit={handleSubmit} onCancel={goBack} />
    </div>
  );
};

export default EntityCreatePage;
