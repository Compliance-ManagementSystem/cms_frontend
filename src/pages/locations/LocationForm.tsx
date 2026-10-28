import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Save,
  Briefcase,
  Plus,
  Trash2,
  Camera,
  X,
  Star,
  Loader2,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { z } from 'zod';
import FieldError, { fieldBorder } from '@/components/ui/FieldError';
import {
  FieldErrors,
  useFormErrors,
  validateForm,
  focusFirstError,
  required,
  optionalPincode,
  maxLength,
} from '@/utils/validation';
import {
  CreateLocationPayload,
  LocationItem,
  AreaType,
  OperatingModel,
  AREA_TYPE_LABELS,
  OPERATING_MODEL_LABELS,
} from '@/services/locationService';
import { entityService, EntityItem } from '@/services/entityService';
import type { MasterDataItem } from '@/services/adminService';
import { lookupService } from '@/services/lookupService';
import { locationService } from '@/services/locationService';
import LocationPhoto from '@/components/locations/LocationPhoto';
import { openLocationPhoto } from '@/utils/locationPhoto';
import { getErrorMessage } from '@/utils/errors';
import { useAuth } from '@/hooks/useAuth';
import { loadLocationDraft, saveLocationDraft, removeLocationDraft } from '@/utils/locationDraft';

/** The form element's id, so a button outside the form can submit it */
export const LOCATION_FORM_ID = 'location-form';

interface LocationFormProps {
  /** Existing location when editing; omit to create a new one */
  initial?: LocationItem;
  /** Pre-selects the entity for a new location */
  defaultEntityId?: string;
  isSubmitting: boolean;
  /** Resolves true once saved, so the unsaved draft can be dropped */
  onSubmit: (payload: CreateLocationPayload) => Promise<boolean>;
  onCancel: () => void;
  /** Field errors returned by the API for the last submit */
  serverErrors?: FieldErrors;
}

interface FormState {
  name: string;
  code: string;
  entity: string;
  locationType: string;
  unitIncharge: string;
  /** Clinic Operations Manager */
  com: string;
  /** Clinic photo keys; the first is the avatar */
  photos: string[];
  noticePhoto: string;
  openingDate: string;
  isUpcoming: boolean;
  closingDate: string;
  /** Kept as typed text; converted to numbers on submit */
  latitude: string;
  longitude: string;
  areaType: AreaType | '';
  operatingModel: OperatingModel | '';
  description: string;
  status: 'active' | 'inactive' | 'archived';
  address: {
    line1: string;
    line2: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    country: string;
  };
}

const FIELD_CLASS =
  'w-full bg-white dark:bg-slate-800 border rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none';
const fieldClass = (error?: string) => `${FIELD_CLASS} ${fieldBorder(error)}`;

/** Optional decimal degrees within ±limit */
const coordinate = (label: string, limit: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (/^-?\d+(\.\d+)?$/.test(v) && Math.abs(Number(v)) <= limit), {
      message: `${label} must be a number between -${limit} and ${limit}`,
    });

/** Each field on its own */
const fieldSchema = z.object({
  name: required('Location name').pipe(maxLength('Location name', 200)),
  entity: z.string().min(1, 'Select an entity'),
  locationType: z.string().min(1, 'Select a location type'),
  unitIncharge: required('Unit In-charge').pipe(maxLength('Unit In-charge', 200)),
  com: required('COM').pipe(maxLength('COM', 200)),
  latitude: coordinate('Latitude', 90),
  longitude: coordinate('Longitude', 180),
  address: z.object({
    line1: required('Address line 1'),
    state: z.string().trim().min(1, 'Select a state'),
    pincode: optionalPincode,
  }),
});

/**
 * Rules across fields. Kept apart from the field checks so they run even while
 * other steps are still incomplete (a refinement only runs once its shape is valid).
 */
const rulesSchema = z
  .object({
    entity: z.string(),
    openingDate: z.string(),
    closingDate: z.string(),
    isUpcoming: z.boolean(),
    latitude: z.string(),
    longitude: z.string(),
    coEntities: z.array(z.object({ entity: z.string(), openingDate: z.string() })),
    photos: z.array(z.string()),
    noticePhoto: z.string(),
    // Photos are required for new locations, and for older ones once they have them
    requirePhotos: z.boolean(),
    requireNotice: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.requirePhotos && values.photos.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['photos'], message: 'Add at least one clinic photo' });
    }
    if (values.requireNotice && !values.noticePhoto) {
      ctx.addIssue({ code: 'custom', path: ['noticePhoto'], message: 'Add the notice photo' });
    }
    // A map pin needs both values
    if (!!values.latitude.trim() !== !!values.longitude.trim()) {
      const missing = values.latitude.trim() ? 'longitude' : 'latitude';
      ctx.addIssue({ code: 'custom', path: [missing], message: 'Enter both latitude and longitude, or neither' });
    }
    // A closing date needs an opening date before it; a unit not yet opened cannot have closed
    if (values.closingDate) {
      if (values.isUpcoming && !values.openingDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['closingDate'],
          message: "A unit that hasn't opened yet can't have a closing date",
        });
      } else if (!values.openingDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['openingDate'],
          message: 'Enter the opening date before a closing date',
        });
      } else if (values.closingDate < values.openingDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['closingDate'],
          message: 'The closing date cannot be before the opening date',
        });
      }
    }
    // Rows left without an entity are dropped on submit
    const chosen = values.coEntities.map((co) => co.entity).filter(Boolean);
    if (chosen.includes(values.entity)) {
      ctx.addIssue({
        code: 'custom',
        path: ['coEntities'],
        message: 'A co-entity must be different from the owning entity',
      });
    } else if (new Set(chosen).size !== chosen.length) {
      ctx.addIssue({ code: 'custom', path: ['coEntities'], message: 'The same co-entity is listed more than once' });
    }
  });

/** All errors in the form; a field's own error wins over a rule on the same field */
const validateLocation = (values: unknown): FieldErrors => ({
  ...validateForm(rulesSchema, values),
  ...validateForm(fieldSchema, values),
});

const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

const RequiredMark = () => (
  <span className="text-red-500 dark:text-red-400 ml-0.5" aria-label="required">
    *
  </span>
);

const dateInput = (value?: string) => (value ? value.split('T')[0] : '');

const toFormState = (loc?: LocationItem, defaultEntityId = ''): FormState => ({
  name: loc?.name || '',
  code: loc?.locationCode || loc?.code || '',
  entity: loc?.entity?._id || defaultEntityId,
  // Location types are submitted by their Master Data code
  locationType: loc?.locationType?.code || '',
  unitIncharge: loc?.unitIncharge || '',
  com: loc?.com || '',
  photos: loc?.photos || [],
  noticePhoto: loc?.noticePhoto || '',
  openingDate: dateInput(loc?.openingDate),
  isUpcoming: !!loc?.isUpcoming && !loc?.openingDate,
  closingDate: dateInput(loc?.closingDate),
  latitude: loc?.geoCoordinates?.latitude != null ? String(loc.geoCoordinates.latitude) : '',
  longitude: loc?.geoCoordinates?.longitude != null ? String(loc.geoCoordinates.longitude) : '',
  areaType: loc?.areaType || '',
  operatingModel: loc?.operatingModel || '',
  description: loc?.description || '',
  status: loc?.status || 'active',
  address: {
    line1: loc?.address?.line1 || '',
    line2: loc?.address?.line2 || '',
    city: loc?.address?.city || '',
    district: loc?.address?.district || '',
    state: loc?.address?.state || '',
    pincode: loc?.address?.pincode || '',
    country: loc?.address?.country || 'India',
  },
});

const MAX_CLINIC_PHOTOS = 4;
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

interface PhotoTileProps {
  photoKey: string;
  label: string;
  /** Marks the photo used as the location's avatar */
  isAvatar?: boolean;
  onRemove?: () => void;
  onMakeAvatar?: () => void;
}

const PhotoTile: React.FC<PhotoTileProps> = ({ photoKey, label, isAvatar, onRemove, onMakeAvatar }) => (
  <div className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
    <button type="button" onClick={() => openLocationPhoto(photoKey)} className="w-full h-full" title="Open full size">
      <LocationPhoto
        photoKey={photoKey}
        alt={label}
        className="w-full h-full"
        fallback={<Camera size={20} className="m-auto text-slate-400" />}
      />
    </button>
    {isAvatar && (
      <span className="absolute left-1.5 top-1.5 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        Avatar
      </span>
    )}
    <div className="absolute right-1.5 top-1.5 flex gap-1">
      {onMakeAvatar && (
        <button
          type="button"
          onClick={onMakeAvatar}
          className="rounded-md bg-white/90 dark:bg-slate-900/90 p-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 shadow-sm"
          title="Use as avatar"
          aria-label="Use as avatar"
        >
          <Star size={13} />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md bg-white/90 dark:bg-slate-900/90 p-1 text-slate-600 dark:text-slate-300 hover:text-red-600 shadow-sm"
          title="Remove photo"
          aria-label="Remove photo"
        >
          <X size={13} />
        </button>
      )}
    </div>
  </div>
);

interface AddPhotoTileProps {
  id: string;
  label: string;
  multiple?: boolean;
  uploading: boolean;
  error?: string;
  onFiles: (files: File[]) => void;
}

const AddPhotoTile: React.FC<AddPhotoTileProps> = ({ id, label, multiple, uploading, error, onFiles }) => (
  <label
    htmlFor={id}
    className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-colors ${
      error
        ? 'border-red-300 dark:border-red-500/60 text-red-500'
        : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600'
    } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
  >
    {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
    {uploading ? 'Uploading…' : label}
    <input
      id={id}
      type="file"
      accept={PHOTO_ACCEPT}
      multiple={multiple}
      className="sr-only"
      disabled={uploading}
      onChange={(e) => {
        onFiles(Array.from(e.target.files || []));
        e.target.value = '';
      }}
    />
  </label>
);

interface CoEntityRow {
  entity: string;
  openingDate: string;
}

const toCoEntityRows = (loc?: LocationItem): CoEntityRow[] =>
  (loc?.coEntities || [])
    .filter((co) => co.entity)
    .map((co) => ({ entity: co.entity!._id, openingDate: dateInput(co.openingDate) }));

/** The form's steps, in order */
const STEPS = [
  { title: 'Basic Info', description: 'The entity it belongs to and what kind of location it is', icon: Briefcase },
  { title: 'People & Operations', description: 'Who runs the unit, its status and dates', icon: Users },
  { title: 'Address', description: 'The state decides which compliance rules apply to this location', icon: MapPin },
  { title: 'Photos', description: 'JPG, PNG or WEBP, up to 10 MB each', icon: Camera },
];

/** Fields on each step; a field name or a prefix such as "address." */
const STEP_FIELDS: string[][] = [
  ['entity', 'name', 'code', 'locationType', 'operatingModel', 'description'],
  ['unitIncharge', 'com', 'status', 'openingDate', 'closingDate', 'isUpcoming', 'coEntities'],
  ['address.', 'areaType', 'latitude', 'longitude', 'geoCoordinates'],
  ['photos', 'noticePhoto'],
];

const stepOfField = (field: string): number => {
  const index = STEP_FIELDS.findIndex((fields) =>
    fields.some((f) => (f.endsWith('.') ? field.startsWith(f) : field === f || field.startsWith(`${f}.`)))
  );
  return index === -1 ? 0 : index;
};

/** What a draft keeps: everything typed plus where the user was */
interface DraftData {
  form: FormState;
  coEntities: CoEntityRow[];
  step: number;
  reached: number;
}

const LEAVE_MESSAGE = 'You have unsaved changes. Your draft is kept and restored when you come back. Leave this page?';

const LocationForm: React.FC<LocationFormProps> = ({
  initial,
  defaultEntityId,
  isSubmitting,
  onSubmit,
  onCancel,
  serverErrors,
}) => {
  const { errors, setErrors, clear } = useFormErrors(serverErrors);
  const isEditing = !!initial;

  const userId = useAuth().user?._id;

  // An unsaved draft from an earlier visit (refresh, crash, closed tab) is picked up once
  const [draft] = useState(() =>
    userId ? loadLocationDraft<DraftData>(userId, initial?._id, initial?.updatedAt) : null
  );
  const [restoredAt, setRestoredAt] = useState<string | null>(draft?.savedAt ?? null);

  const [form, setForm] = useState<FormState>(() => draft?.data.form ?? toFormState(initial, defaultEntityId));
  const [coEntities, setCoEntities] = useState<CoEntityRow[]>(() => draft?.data.coEntities ?? toCoEntityRows(initial));
  const [uploading, setUploading] = useState<{ photos: boolean; noticePhoto: boolean }>({
    photos: false,
    noticePhoto: false,
  });
  const requirePhotos = !isEditing || (initial?.photos?.length ?? 0) > 0;
  const requireNotice = !isEditing || !!initial?.noticePhoto;

  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [districts, setDistricts] = useState<MasterDataItem[]>([]);

  // Reference data
  useEffect(() => {
    Promise.all([
      entityService.getEntities({ limit: 100 }).catch(() => ({ entities: [] as EntityItem[] })),
      lookupService.getMasterData({ category: 'location_type' }).catch(() => ({ items: [] as MasterDataItem[] })),
      lookupService.getMasterData({ category: 'state' }).catch(() => ({ items: [] as MasterDataItem[] })),
      lookupService.getMasterData({ category: 'district' }).catch(() => ({ items: [] as MasterDataItem[] })),
    ]).then(([entitiesRes, typesRes, statesRes, districtsRes]) => {
      const activeEntities = (entitiesRes.entities || []).filter((e) => e.status === 'active');
      setEntities(activeEntities);
      setLocationTypes(typesRes.items || []);
      setStates(statesRes.items || []);
      setDistricts(districtsRes.items || []);

      // A new location starts on the only available entity, if there is just one
      if (!initial && activeEntities.length === 1) {
        setForm((prev) => (prev.entity ? prev : { ...prev, entity: activeEntities[0]._id }));
      }
    });
  }, [initial]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // The dates and the "to be opened" mark are checked together, so a change to one can resolve the others
    const dateFields = ['openingDate', 'closingDate', 'isUpcoming'];
    if (!dateFields.includes(field)) {
      clear(field);
      return;
    }
    clear(...dateFields);
    // A clash between values already entered shows at once; a missing opening date waits for Next,
    // since it may be the next thing typed
    const clash = validateForm(rulesSchema, { ...formValues(), [field]: value }).closingDate;
    if (clash) setErrors((prev) => ({ ...prev, closingDate: clash }));
  };

  const setAddress = (field: keyof FormState['address'], value: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    clear(`address.${field}`);
  };

  const handleEntityChange = (entity: string) => {
    setForm((prev) => ({ ...prev, entity }));
    clear('entity', 'coEntities');
  };

  const handleStateChange = (state: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, state, district: '' } }));
    clear('address.state');
  };

  // Districts of the selected state, when the master data links them
  const selectedState = states.find((s) => s.label === form.address.state);
  const stateDistricts = selectedState ? districts.filter((d) => d.parent?._id === selectedState._id) : [];
  const districtOptions = stateDistricts.length > 0 ? stateDistricts : selectedState ? [] : districts;

  /** Uploads each file as it is picked; the keys are saved with the location */
  const uploadPhotos = async (field: 'photos' | 'noticePhoto', files: File[]) => {
    const room = field === 'photos' ? MAX_CLINIC_PHOTOS - form.photos.length : 1;
    if (files.length === 0 || room <= 0) return;
    if (files.length > room) {
      setErrors((prev) => ({
        ...prev,
        photos: `Only ${room} more photo${room === 1 ? '' : 's'} can be added, so the first ${room} were used`,
      }));
    } else {
      clear(field);
    }

    setUploading((prev) => ({ ...prev, [field]: true }));
    try {
      for (const file of files.slice(0, room)) {
        const key = await locationService.uploadPhoto(file);
        setForm((prev) =>
          field === 'photos' ? { ...prev, photos: [...prev.photos, key] } : { ...prev, noticePhoto: key }
        );
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, [field]: getErrorMessage(err, 'The photo could not be uploaded') }));
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const removePhoto = (key: string) => setForm((prev) => ({ ...prev, photos: prev.photos.filter((k) => k !== key) }));

  const makeAvatar = (key: string) =>
    setForm((prev) => ({ ...prev, photos: [key, ...prev.photos.filter((k) => k !== key)] }));

  const updateCoEntity = (index: number, patch: Partial<CoEntityRow>) => {
    setCoEntities((prev) => prev.map((co, i) => (i === index ? { ...co, ...patch } : co)));
    clear('coEntities');
  };

  // ── Steps ──
  const LAST_STEP = STEPS.length - 1;
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(draft?.data.step ?? 0);
  // Furthest step reached; a new location moves forward one checked step at a time
  const [reached, setReached] = useState(draft?.data.reached ?? (isEditing ? LAST_STEP : 0));

  // ── Unsaved draft ──
  // The values the form opened with. A new location's entity may be filled in
  // automatically, so it alone does not count as a change.
  const [pristine] = useState(() =>
    JSON.stringify({
      form: { ...toFormState(initial, defaultEntityId), entity: '' },
      coEntities: toCoEntityRows(initial),
    })
  );
  const isDirty =
    JSON.stringify({ form: { ...form, entity: '' }, coEntities }) !== pristine ||
    (isEditing && form.entity !== (initial?.entity?._id || ''));

  // Set once the form is saved or cancelled, so nothing writes the draft back
  const leavingRef = useRef(false);
  const latestRef = useRef({ isDirty, data: { form, coEntities, step, reached } as DraftData });
  latestRef.current = { isDirty, data: { form, coEntities, step, reached } };

  const persistDraft = useCallback(() => {
    if (!userId || leavingRef.current) return;
    const { isDirty: dirty, data } = latestRef.current;
    if (dirty) {
      saveLocationDraft(userId, initial?._id, {
        savedAt: new Date().toISOString(),
        baseUpdatedAt: initial?.updatedAt,
        data,
      });
    } else {
      removeLocationDraft(userId, initial?._id);
    }
  }, [userId, initial?._id, initial?.updatedAt]);

  // Saved shortly after each change
  useEffect(() => {
    const timer = setTimeout(persistDraft, 500);
    return () => clearTimeout(timer);
  }, [form, coEntities, step, reached, persistDraft]);

  // Saved at once when the page is left, and a warning before a refresh, a closed tab or a link
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      persistDraft();
      if (latestRef.current.isDirty && !leavingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    // In-app links (sidebar, navbar) are caught before the router handles them
    const onLinkClick = (e: MouseEvent) => {
      if (!latestRef.current.isDirty || leavingRef.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.origin !== window.location.origin) return;
      if (link.pathname === window.location.pathname) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onLinkClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onLinkClick, true);
      persistDraft();
    };
  }, [persistDraft]);

  const discardDraft = () => {
    if (userId) removeLocationDraft(userId, initial?._id);
    setForm(toFormState(initial, defaultEntityId));
    setCoEntities(toCoEntityRows(initial));
    setStep(0);
    setReached(isEditing ? LAST_STEP : 0);
    setErrors({});
    setRestoredAt(null);
  };

  const handleCancel = () => {
    leavingRef.current = true;
    if (userId) removeLocationDraft(userId, initial?._id);
    onCancel();
  };

  const showStep = (index: number) => {
    setStep(index);
    setReached((prev) => Math.max(prev, index));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** Shows the step holding the first error and focuses that field once it renders */
  const showErrors = (found: FieldErrors) => {
    const steps = Object.keys(found).map(stepOfField);
    if (steps.length === 0) return;
    showStep(Math.min(...steps));
    setTimeout(() => focusFirstError(found), 50);
  };

  // Errors returned by the API may belong to a step that is not on screen
  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length > 0) showErrors(serverErrors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrors]);

  const formValues = () => ({ ...form, coEntities, requirePhotos, requireNotice });

  const goNext = () => {
    const stepErrors = Object.fromEntries(
      Object.entries(validateLocation(formValues())).filter(([field]) => stepOfField(field) === step)
    );
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      focusFirstError(stepErrors);
      return;
    }
    showStep(step + 1);
  };

  const stepHasErrors = (index: number) => Object.keys(errors).some((field) => stepOfField(field) === index);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enter in a field moves a new location to the next step rather than saving it
    if (!isEditing && step < LAST_STEP) {
      goNext();
      return;
    }
    if (uploading.photos || uploading.noticePhoto) {
      setErrors((prev) => ({ ...prev, photos: 'Wait for the photos to finish uploading' }));
      return;
    }
    const found = validateLocation(formValues());
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }

    // Rows left without an entity are dropped
    const chosenCoEntities = coEntities.filter((co) => co.entity);

    leavingRef.current = true;
    const saved = await onSubmit({
      name: form.name.trim(),
      entity: form.entity,
      locationType: form.locationType,
      unitIncharge: form.unitIncharge.trim(),
      com: form.com.trim(),
      photos: form.photos,
      noticePhoto: form.noticePhoto || null,
      openingDate: form.openingDate || null,
      isUpcoming: form.isUpcoming && !form.openingDate,
      closingDate: form.closingDate || null,
      geoCoordinates:
        form.latitude.trim() && form.longitude.trim()
          ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
          : null,
      areaType: form.areaType || null,
      operatingModel: form.operatingModel || null,
      coEntities: chosenCoEntities.map((co) => ({ entity: co.entity, openingDate: co.openingDate || null })),
      description: form.description.trim(),
      status: form.status,
      address: {
        line1: form.address.line1.trim(),
        line2: form.address.line2.trim(),
        city: form.address.city.trim(),
        district: form.address.district.trim(),
        state: form.address.state.trim(),
        pincode: form.address.pincode.trim(),
        country: form.address.country.trim() || 'India',
      },
    });
    if (saved) {
      if (userId) removeLocationDraft(userId, initial?._id);
    } else {
      leavingRef.current = false;
    }
  };

  const entityName = entities.find((ent) => ent._id === form.entity)?.name || initial?.entity?.name;
  const typeLabel =
    locationTypes.find((type) => type.code === form.locationType)?.label || initial?.locationType?.label;
  const current = STEPS[step];

  return (
    <form id={LOCATION_FORM_ID} ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6 scroll-mt-24">
      {restoredAt && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          <span className="flex items-center gap-2">
            <RotateCcw size={16} className="flex-shrink-0" />
            We restored your unsaved draft from{' '}
            {new Date(restoredAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.
          </span>
          <span className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRestoredAt(null)}>
              Keep
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={discardDraft}>
              Discard draft
            </Button>
          </span>
        </div>
      )}

      {/* Step indicator; every step is open when editing */}
      <Card padding="md">
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STEPS.map((item, index) => {
            const isCurrent = index === step;
            const canOpen = isEditing || index <= reached;
            const hasErrors = stepHasErrors(index);
            const isDone = !isCurrent && index < reached && !hasErrors;
            return (
              <li key={item.title}>
                <button
                  type="button"
                  onClick={() => canOpen && showStep(index)}
                  disabled={!canOpen}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isCurrent
                      ? 'bg-emerald-50 dark:bg-emerald-900/30'
                      : canOpen
                        ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        : ''
                  } disabled:cursor-default`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                      hasErrors
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                        : isCurrent
                          ? 'bg-emerald-600 text-white'
                          : isDone
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isDone ? <Check size={16} /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold truncate ${
                        isCurrent ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-500 truncate">
                      Step {index + 1} of {STEPS.length}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card padding="lg">
        <Card.Header
          title={current.title}
          description={current.description}
          icon={<current.icon size={18} className="text-emerald-600 dark:text-emerald-400" />}
        />

        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={LABEL_CLASS} htmlFor="location-entity">
                Entity
                <RequiredMark />
              </label>
              <select
                id="location-entity"
                name="entity"
                value={form.entity}
                onChange={(e) => handleEntityChange(e.target.value)}
                required
                className={fieldClass(errors.entity)}
              >
                <option value="">Select entity</option>
                {/* Keep the current entity selectable even if it is no longer active */}
                {initial?.entity && !entities.some((ent) => ent._id === initial.entity?._id) && (
                  <option value={initial.entity._id}>{initial.entity.name}</option>
                )}
                {entities.map((ent) => (
                  <option key={ent._id} value={ent._id}>
                    {ent.name} ({ent.entityCode || ent.code})
                  </option>
                ))}
              </select>
              <FieldError message={errors.entity} />
              {isEditing && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  A location can only move to another entity while it has no records, tasks, documents, licences or
                  sub-units.
                </p>
              )}
            </div>
            <Input
              label="Location Name"
              name="name"
              error={errors.name}
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Koramangala Day Care Clinic"
              required
            />
            {/* Generated by the server on create and fixed after that */}
            <Input
              label="Location Code"
              name="code"
              value={form.code}
              placeholder="Auto-generated on save"
              hint={
                isEditing
                  ? 'Location codes cannot be changed'
                  : 'e.g. CC-OD-26109001: entity, state, year, month, number'
              }
              readOnly
              disabled
            />
            <div>
              <label className={LABEL_CLASS} htmlFor="location-type">
                Location Type
                <RequiredMark />
              </label>
              <select
                id="location-type"
                name="locationType"
                value={form.locationType}
                onChange={(e) => setField('locationType', e.target.value)}
                required
                className={fieldClass(errors.locationType)}
              >
                <option value="">Select type</option>
                {/* Keep the current type selectable even if it is no longer active */}
                {initial?.locationType && !locationTypes.some((type) => type.code === initial.locationType.code) && (
                  <option value={initial.locationType.code}>{initial.locationType.label}</option>
                )}
                {locationTypes.map((type) => (
                  <option key={type._id} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.locationType} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="location-model">
                Operating Model
              </label>
              <select
                id="location-model"
                value={form.operatingModel}
                onChange={(e) => setField('operatingModel', e.target.value as FormState['operatingModel'])}
                className={fieldClass()}
              >
                <option value="">Not set</option>
                {(Object.keys(OPERATING_MODEL_LABELS) as OperatingModel[]).map((model) => (
                  <option key={model} value={model}>
                    {OPERATING_MODEL_LABELS[model]}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={LABEL_CLASS} htmlFor="location-description">
                Description
              </label>
              <textarea
                id="location-description"
                rows={2}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="What this location is used for"
                className={fieldClass()}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Unit In-charge"
              name="unitIncharge"
              error={errors.unitIncharge}
              value={form.unitIncharge}
              onChange={(e) => setField('unitIncharge', e.target.value)}
              placeholder="Full name"
              required
            />
            <Input
              label="COM (Clinic Operations Manager)"
              name="com"
              error={errors.com}
              value={form.com}
              onChange={(e) => setField('com', e.target.value)}
              placeholder="Full name"
              required
            />
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={LABEL_CLASS} htmlFor="location-status">
                  Status
                </label>
                <select
                  id="location-status"
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value as FormState['status'])}
                  className={fieldClass()}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="location-opening">
                  Opening Date
                </label>
                <input
                  id="location-opening"
                  name="openingDate"
                  type="date"
                  value={form.openingDate}
                  onChange={(e) => setField('openingDate', e.target.value)}
                  className={fieldClass(errors.openingDate)}
                />
                <FieldError message={errors.openingDate} />
                {/* A planned unit: a future date, or this mark when the date is not fixed */}
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={form.isUpcoming && !form.openingDate}
                    disabled={!!form.openingDate}
                    onChange={(e) => setField('isUpcoming', e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  To be opened (date not fixed yet)
                </label>
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="location-closing">
                  Closing Date
                </label>
                <input
                  id="location-closing"
                  name="closingDate"
                  type="date"
                  value={form.closingDate}
                  onChange={(e) => setField('closingDate', e.target.value)}
                  className={fieldClass(errors.closingDate)}
                />
                <FieldError message={errors.closingDate} />
              </div>
            </div>
            <div className="md:col-span-2">
              <span className={LABEL_CLASS}>Other Companies at this Unit</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                For example a pharmacy run by another group company inside this clinic.
              </p>
              <div className="space-y-2">
                {coEntities.map((co, index) => (
                  <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                    <select
                      name={index === 0 ? 'coEntities' : undefined}
                      aria-label={`Co-entity ${index + 1}`}
                      value={co.entity}
                      onChange={(e) => updateCoEntity(index, { entity: e.target.value })}
                      className={fieldClass()}
                    >
                      <option value="">Select entity</option>
                      {/* Keep a saved co-entity selectable even if it is no longer active */}
                      {co.entity && !entities.some((ent) => ent._id === co.entity) && (
                        <option value={co.entity}>
                          {initial?.coEntities?.find((saved) => saved.entity?._id === co.entity)?.entity?.name ||
                            co.entity}
                        </option>
                      )}
                      {entities
                        .filter((ent) => ent._id !== form.entity)
                        .map((ent) => (
                          <option key={ent._id} value={ent._id}>
                            {ent.name} ({ent.entityCode || ent.code})
                          </option>
                        ))}
                    </select>
                    <input
                      type="date"
                      aria-label={`Co-entity ${index + 1} opening date`}
                      title="Opening date for this company"
                      value={co.openingDate}
                      onChange={(e) => updateCoEntity(index, { openingDate: e.target.value })}
                      className={fieldClass()}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove co-entity ${index + 1}`}
                      onClick={() => setCoEntities((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                ))}
              </div>
              <FieldError message={errors.coEntities} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                leftIcon={<Plus size={15} />}
                onClick={() => setCoEntities((prev) => [...prev, { entity: '', openingDate: '' }])}
              >
                Add company
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Input
                label="Address Line 1"
                name="address.line1"
                error={errors['address.line1']}
                value={form.address.line1}
                onChange={(e) => setAddress('line1', e.target.value)}
                placeholder="Building, floor, street"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Address Line 2"
                value={form.address.line2}
                onChange={(e) => setAddress('line2', e.target.value)}
                placeholder="Locality, landmark"
              />
            </div>

            <Input
              label="City"
              value={form.address.city}
              onChange={(e) => setAddress('city', e.target.value)}
              placeholder="e.g. Bengaluru"
            />

            <div>
              <label className={LABEL_CLASS} htmlFor="location-state">
                State
                <RequiredMark />
              </label>
              {states.length > 0 ? (
                <select
                  id="location-state"
                  name="address.state"
                  value={form.address.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  required
                  className={fieldClass(errors['address.state'])}
                >
                  <option value="">Select state</option>
                  {/* Keep a saved state that is not in the master list */}
                  {form.address.state && !selectedState && (
                    <option value={form.address.state}>{form.address.state}</option>
                  )}
                  {states.map((s) => (
                    <option key={s._id} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="location-state"
                  name="address.state"
                  value={form.address.state}
                  onChange={(e) => setAddress('state', e.target.value)}
                  placeholder="e.g. Karnataka"
                  required
                  className={fieldClass(errors['address.state'])}
                />
              )}
              <FieldError message={errors['address.state']} />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="location-district">
                District
              </label>
              {districtOptions.length > 0 ? (
                <select
                  id="location-district"
                  value={form.address.district}
                  onChange={(e) => setAddress('district', e.target.value)}
                  className={fieldClass()}
                >
                  <option value="">Select district</option>
                  {form.address.district && !districtOptions.some((d) => d.label === form.address.district) && (
                    <option value={form.address.district}>{form.address.district}</option>
                  )}
                  {districtOptions.map((d) => (
                    <option key={d._id} value={d.label}>
                      {d.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="location-district"
                  value={form.address.district}
                  onChange={(e) => setAddress('district', e.target.value)}
                  placeholder="e.g. Bengaluru Urban"
                  className={fieldClass()}
                />
              )}
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="location-area-type">
                Area Type
              </label>
              <select
                id="location-area-type"
                value={form.areaType}
                onChange={(e) => setField('areaType', e.target.value as FormState['areaType'])}
                className={fieldClass()}
              >
                <option value="">Not set</option>
                {(Object.keys(AREA_TYPE_LABELS) as AreaType[]).map((type) => (
                  <option key={type} value={type}>
                    {AREA_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The local body the unit falls under.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Pincode"
                name="address.pincode"
                error={errors['address.pincode']}
                maxLength={6}
                value={form.address.pincode}
                onChange={(e) => setAddress('pincode', e.target.value)}
                placeholder="e.g. 560034"
              />
              <Input
                label="Country"
                value={form.address.country}
                onChange={(e) => setAddress('country', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude"
                name="latitude"
                inputMode="decimal"
                error={errors.latitude}
                value={form.latitude}
                onChange={(e) => setField('latitude', e.target.value)}
                placeholder="e.g. 20.296059"
              />
              <Input
                label="Longitude"
                name="longitude"
                inputMode="decimal"
                error={errors.longitude}
                value={form.longitude}
                onChange={(e) => setField('longitude', e.target.value)}
                placeholder="e.g. 85.824539"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <span className={LABEL_CLASS}>
                Clinic Photos
                {requirePhotos && <RequiredMark />}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Up to {MAX_CLINIC_PHOTOS} photos. The first one is used as the location's avatar; use the star to change
                it.
              </p>
              <div className="grid grid-cols-4 gap-3">
                {form.photos.map((key, index) => (
                  <PhotoTile
                    key={key}
                    photoKey={key}
                    label={`Clinic photo ${index + 1}`}
                    isAvatar={index === 0}
                    onMakeAvatar={index === 0 ? undefined : () => makeAvatar(key)}
                    // A location that needs photos keeps at least one
                    onRemove={
                      requirePhotos && form.photos.length === 1 && isEditing ? undefined : () => removePhoto(key)
                    }
                  />
                ))}
                {form.photos.length < MAX_CLINIC_PHOTOS && (
                  <AddPhotoTile
                    id="location-photos"
                    label="Add photo"
                    multiple
                    uploading={uploading.photos}
                    error={errors.photos}
                    onFiles={(files) => uploadPhotos('photos', files)}
                  />
                )}
              </div>
              <FieldError message={errors.photos} />
            </div>
            <div>
              <span className={LABEL_CLASS}>
                Notice Photo
                {requireNotice && <RequiredMark />}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                A photo of the notice or board displayed at the unit, inside or outside.
              </p>
              <div className="grid grid-cols-4 gap-3">
                {form.noticePhoto ? (
                  <PhotoTile
                    photoKey={form.noticePhoto}
                    label="Notice photo"
                    // Replaced rather than removed once required
                    onRemove={requireNotice && isEditing ? undefined : () => setField('noticePhoto', '')}
                  />
                ) : (
                  <AddPhotoTile
                    id="location-notice-photo"
                    label="Add photo"
                    uploading={uploading.noticePhoto}
                    error={errors.noticePhoto}
                    onFiles={(files) => uploadPhotos('noticePhoto', files)}
                  />
                )}
                {form.noticePhoto && (
                  <AddPhotoTile
                    id="location-notice-photo"
                    label="Replace photo"
                    uploading={uploading.noticePhoto}
                    onFiles={(files) => uploadPhotos('noticePhoto', files)}
                  />
                )}
              </div>
              <FieldError message={errors.noticePhoto} />
            </div>
          </div>
        )}
      </Card>

      {/* A last look before a new location is created */}
      {step === LAST_STEP && !isEditing && (
        <Card padding="lg">
          <Card.Header
            title="Review"
            description="Check the details before creating the location"
            icon={<ClipboardList size={18} className="text-emerald-600 dark:text-emerald-400" />}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: 0,
                rows: [
                  ['Entity', entityName],
                  ['Name', form.name],
                  ['Type', typeLabel],
                  ['Operating Model', form.operatingModel ? OPERATING_MODEL_LABELS[form.operatingModel] : ''],
                ],
              },
              {
                step: 1,
                rows: [
                  ['Unit In-charge', form.unitIncharge],
                  ['COM', form.com],
                  ['Status', form.status.charAt(0).toUpperCase() + form.status.slice(1)],
                  ['Opening Date', form.openingDate || (form.isUpcoming ? 'To be opened' : '')],
                ],
              },
              {
                step: 2,
                rows: [
                  ['Address', [form.address.line1, form.address.line2].filter(Boolean).join(', ')],
                  ['City / District', [form.address.city, form.address.district].filter(Boolean).join(', ')],
                  ['State', form.address.state],
                  ['Pincode', form.address.pincode],
                ],
              },
            ].map((group) => (
              <div
                key={group.step}
                className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {STEPS[group.step].title}
                  </span>
                  <button
                    type="button"
                    onClick={() => showStep(group.step)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
                <dl className="space-y-2 text-sm">
                  {group.rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400 flex-shrink-0">{label}</dt>
                      <dd
                        className="text-slate-900 dark:text-slate-100 font-medium text-right truncate"
                        title={value || ''}
                      >
                        {value || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions stay in view while scrolling */}
      <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
          Step {step + 1} of {STEPS.length}: {current.title}
        </span>
        <div className="flex items-center gap-3 ml-auto">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => showStep(step - 1)}
              leftIcon={<ChevronLeft size={16} />}
            >
              Back
            </Button>
          )}
          {step < LAST_STEP && (
            <Button
              type="button"
              variant={isEditing ? 'outline' : 'primary'}
              onClick={goNext}
              rightIcon={<ChevronRight size={16} />}
            >
              Next
            </Button>
          )}
          {(isEditing || step === LAST_STEP) && (
            <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
              {isEditing ? 'Save Changes' : 'Create Location'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default LocationForm;
