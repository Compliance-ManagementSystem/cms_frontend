import React, { useState, useEffect } from 'react';
import { MapPin, Save, Briefcase, Plus, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { z } from 'zod';
import FieldError, { fieldBorder } from '@/components/ui/FieldError';
import { FieldErrors, useFormErrors, required, optionalPincode, maxLength } from '@/utils/validation';
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
import { lookupService, LookupUser } from '@/services/lookupService';

/** The form element's id, so a button outside the form can submit it */
export const LOCATION_FORM_ID = 'location-form';

interface LocationFormProps {
  /** Existing location when editing; omit to create a new one */
  initial?: LocationItem;
  /** Pre-selects the entity for a new location */
  defaultEntityId?: string;
  isSubmitting: boolean;
  onSubmit: (payload: CreateLocationPayload) => void;
  onCancel: () => void;
  /** Field errors returned by the API for the last submit */
  serverErrors?: FieldErrors;
}

interface FormState {
  name: string;
  code: string;
  entity: string;
  locationType: string;
  manager: string;
  openingDate: string;
  isUpcoming: boolean;
  closingDate: string;
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

const locationSchema = z
  .object({
    name: required('Location name').pipe(maxLength('Location name', 200)),
    code: maxLength('Location code', 50),
    entity: z.string().min(1, 'Select an entity'),
    locationType: z.string().min(1, 'Select a location type'),
    openingDate: z.string(),
    closingDate: z.string(),
    address: z.object({
      line1: required('Address line 1'),
      state: z.string().trim().min(1, 'Select a state'),
      pincode: optionalPincode,
    }),
    coEntities: z.array(z.object({ entity: z.string(), openingDate: z.string() })),
  })
  .superRefine((values, ctx) => {
    if (values.closingDate && values.openingDate && values.closingDate < values.openingDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['closingDate'],
        message: 'The closing date cannot be before the opening date',
      });
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
  manager: loc?.manager?._id || '',
  openingDate: dateInput(loc?.openingDate),
  isUpcoming: !!loc?.isUpcoming && !loc?.openingDate,
  closingDate: dateInput(loc?.closingDate),
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

interface CoEntityRow {
  entity: string;
  openingDate: string;
}

const toCoEntityRows = (loc?: LocationItem): CoEntityRow[] =>
  (loc?.coEntities || [])
    .filter((co) => co.entity)
    .map((co) => ({ entity: co.entity!._id, openingDate: dateInput(co.openingDate) }));

const LocationForm: React.FC<LocationFormProps> = ({
  initial,
  defaultEntityId,
  isSubmitting,
  onSubmit,
  onCancel,
  serverErrors,
}) => {
  const { errors, validate, clear } = useFormErrors(serverErrors);
  const isEditing = !!initial;

  const [form, setForm] = useState<FormState>(() => toFormState(initial, defaultEntityId));
  const [coEntities, setCoEntities] = useState<CoEntityRow[]>(() => toCoEntityRows(initial));

  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [districts, setDistricts] = useState<MasterDataItem[]>([]);
  const [users, setUsers] = useState<LookupUser[]>([]);

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

  // Managers belong to the selected entity
  useEffect(() => {
    if (!form.entity) {
      setUsers([]);
      return;
    }
    lookupService
      .getUsers(form.entity)
      .then((res) => setUsers(res.users || []))
      .catch(() => setUsers([]));
  }, [form.entity]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Changing either date can resolve a date-order error shown on the closing date
    clear(field, ...(field === 'openingDate' ? ['closingDate'] : []));
  };

  const setAddress = (field: keyof FormState['address'], value: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    clear(`address.${field}`);
  };

  const handleEntityChange = (entity: string) => {
    // A manager from the previous entity no longer applies
    setForm((prev) => ({ ...prev, entity, manager: '' }));
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

  const updateCoEntity = (index: number, patch: Partial<CoEntityRow>) => {
    setCoEntities((prev) => prev.map((co, i) => (i === index ? { ...co, ...patch } : co)));
    clear('coEntities');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate(locationSchema, { ...form, coEntities })) return;

    // Rows left without an entity are dropped
    const chosenCoEntities = coEntities.filter((co) => co.entity);

    onSubmit({
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      entity: form.entity,
      locationType: form.locationType,
      manager: form.manager || null,
      openingDate: form.openingDate || null,
      isUpcoming: form.isUpcoming && !form.openingDate,
      closingDate: form.closingDate || null,
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
  };

  return (
    <form id={LOCATION_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Section 1: Location & entity */}
      <Card padding="lg">
        <Card.Header
          title="Location Details"
          description="The entity it belongs to, its type and who manages it"
          icon={<Briefcase size={18} className="text-emerald-600 dark:text-emerald-400" />}
        />

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

          <Input
            label="Location Code"
            name="code"
            error={errors.code}
            value={form.code}
            onChange={(e) => setField('code', e.target.value)}
            placeholder={isEditing ? 'e.g. LOC-KOR-01' : 'Leave blank to generate one'}
            hint="Unique within the entity"
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
            <label className={LABEL_CLASS} htmlFor="location-manager">
              Unit Manager
            </label>
            <select
              id="location-manager"
              value={form.manager}
              onChange={(e) => setField('manager', e.target.value)}
              className={fieldClass()}
            >
              <option value="">Not assigned</option>
              {/* Keep the current manager selectable even if outside the loaded list */}
              {initial?.manager && !users.some((u) => u._id === initial.manager?._id) && (
                <option value={initial.manager._id}>
                  {initial.manager.firstName} {initial.manager.lastName}
                </option>
              )}
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.firstName} {u.lastName}
                  {u.role?.name ? ` (${u.role.name})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              The manager is also assigned to this location in their user profile.
            </p>
          </div>

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
              type="date"
              value={form.openingDate}
              onChange={(e) => setField('openingDate', e.target.value)}
              className={fieldClass()}
            />
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

          <div className="md:col-span-2">
            <label className={LABEL_CLASS} htmlFor="location-description">
              Description
            </label>
            <textarea
              id="location-description"
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="What this location is used for"
              className={fieldClass()}
            />
          </div>
        </div>
      </Card>

      {/* Section 2: Address */}
      <Card padding="lg">
        <Card.Header
          title="Address"
          description="The state decides which compliance rules apply to this location"
          icon={<MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />}
        />

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
        </div>
      </Card>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
          {isEditing ? 'Save Changes' : 'Create Location'}
        </Button>
      </div>
    </form>
  );
};

export default LocationForm;
