import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { entityService, CreateEntityPayload, EntityItem } from '@/services/entityService';
import { ROUTES } from '@/constants/routes';
import EntityForm, { ENTITY_FORM_ID } from './EntityForm';

export const EntityEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasRole } = useAuth();
  // Name, code, type, status and statutory identifiers are for administrators
  const canEditCore = hasRole(['super_admin', 'admin']);

  const [entity, setEntity] = useState<EntityItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    entityService
      .getEntityById(id)
      .then((res) => setEntity(res.entity))
      .catch((err: any) => {
        toast.error(err.message || 'Failed to load entity');
        navigate(ROUTES.ENTITIES);
      });
  }, [id, toast, navigate]);

  const goBack = () => navigate(`/entities/${id}`);

  const handleSubmit = async (payload: CreateEntityPayload) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const res = await entityService.updateEntity(id, payload);
      toast.success(res.message || 'Entity updated');
      goBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update entity');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading entity...</p>
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
            aria-label="Back to entity"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Edit Entity</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {entity.name} · {entity.entityCode || entity.code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={goBack} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={ENTITY_FORM_ID} variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
            Save Changes
          </Button>
        </div>
      </div>

      <EntityForm
        initial={entity}
        canEditCore={canEditCore}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={goBack}
      />
    </div>
  );
};

export default EntityEditPage;
