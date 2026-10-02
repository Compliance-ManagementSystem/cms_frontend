import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, ArrowLeft, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { locationService, CreateLocationPayload } from '@/services/locationService';
import { ROUTES } from '@/constants/routes';
import LocationForm, { LOCATION_FORM_ID } from './LocationForm';

export const LocationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (payload: CreateLocationPayload) => {
    setIsSubmitting(true);
    try {
      const res = await locationService.createLocation(payload);
      toast.success(res.message || 'Location created');
      navigate(`/locations/${res.data.location._id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => navigate(ROUTES.LOCATIONS);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to locations"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <MapPin size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Add Location</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">A unit, clinic or office that belongs to an entity</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={goBack} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={LOCATION_FORM_ID} variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
            Create Location
          </Button>
        </div>
      </div>

      <LocationForm
        defaultEntityId={searchParams.get('entityId') || undefined}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={goBack}
      />
    </div>
  );
};

export default LocationCreatePage;
