import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { locationService, CreateLocationPayload, LocationItem } from '@/services/locationService';
import { ROUTES } from '@/constants/routes';
import LocationForm, { LOCATION_FORM_ID } from './LocationForm';

export const LocationEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [location, setLocation] = useState<LocationItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    locationService
      .getLocationById(id)
      .then((res) => setLocation(res.location))
      .catch((err: any) => {
        toast.error(err.message || 'Failed to load location');
        navigate(ROUTES.LOCATIONS);
      });
  }, [id, toast, navigate]);

  const goBack = () => navigate(`/locations/${id}`);

  const handleSubmit = async (payload: CreateLocationPayload) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const res = await locationService.updateLocation(id, payload);
      toast.success(res.message || 'Location updated');
      goBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update location');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading location...</p>
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
            aria-label="Back to location"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <MapPin size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Edit Location</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {location.name} · {location.locationCode || location.code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={goBack} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={LOCATION_FORM_ID} variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
            Save Changes
          </Button>
        </div>
      </div>

      <LocationForm initial={location} isSubmitting={isSubmitting} onSubmit={handleSubmit} onCancel={goBack} />
    </div>
  );
};

export default LocationEditPage;
