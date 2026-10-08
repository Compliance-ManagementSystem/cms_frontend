import React, { useState, useEffect } from 'react';
import { MapPin, Save, Mail, Phone, User, Briefcase, Plus, Trash2, FileText } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import {
  locationService,
  CreateLocationPayload,
  LocationItem,
  LocationAgreement,
  AreaType,
  OperatingModel,
  AREA_TYPE_LABELS,
  OPERATING_MODEL_LABELS,
} from '@/services/locationService';
import { entityService, EntityItem } from '@/services/entityService';
import type { MasterDataItem } from '@/services/adminService';
import { lookupService, LookupUser } from '@/services/lookupService';
import { FEATURES } from '@/constants/features';

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
}

interface FormState {
  name: string;
  code: string;
  entity: string;
  locationType: string;
  manager: string;
  parentLocation: string;
  openingDate: string;
  isUpcoming: boolean;
  closingDate: string;
  areaType: AreaType | '';
  operatingModel: OperatingModel | '';
  description: string;
  area: string;
  areaUnit: 'sqft' | 'sqm';
  operatingHours: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
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
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none';
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
  parentLocation: loc?.parentLocation?._id || '',
  openingDate: dateInput(loc?.openingDate),
  isUpcoming: !!loc?.isUpcoming && !loc?.openingDate,
  closingDate: dateInput(loc?.closingDate),
  areaType: loc?.areaType || '',
  operatingModel: loc?.operatingModel || '',
  description: loc?.description || '',
  area: loc?.area ? String(loc.area) : '',
  areaUnit: loc?.areaUnit || 'sqft',
  operatingHours: loc?.operatingHours || '',
  contactPerson: loc?.contactPerson || '',
  contactEmail: loc?.contactEmail || '',
  contactPhone: loc?.contactPhone || '',
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

const toAgreementRows = (loc?: LocationItem): LocationAgreement[] =>
  (loc?.agreements || []).map((agr) => ({
    _id: agr._id,
    agreementType: agr.agreementType || 'lease',
    agreementNumber: agr.agreementNumber || '',
    startDate: dateInput(agr.startDate),
    endDate: dateInput(agr.endDate),
    renewalDate: dateInput(agr.renewalDate),
    parties: agr.parties || [],
    notes: agr.notes || '',
  }));

interface CoEntityRow {
  entity: string;
  openingDate: string;
}

const toCoEntityRows = (loc?: LocationItem): CoEntityRow[] =>
  (loc?.coEntities || [])
    .filter((co) => co.entity)
    .map((co) => ({ entity: co.entity!._id, openingDate: dateInput(co.openingDate) }));

const isBlankAgreement = (agr: LocationAgreement) =>
  !agr.agreementNumber.trim() && !agr.startDate && !agr.endDate && !agr.notes?.trim() && !(agr.parties || []).length;

const LocationForm: React.FC<LocationFormProps> = ({ initial, defaultEntityId, isSubmitting, onSubmit, onCancel }) => {
  const toast = useToast();
  const isEditing = !!initial;

  const [form, setForm] = useState<FormState>(() => toFormState(initial, defaultEntityId));
  const [agreements, setAgreements] = useState<LocationAgreement[]>(() => toAgreementRows(initial));
  const [coEntities, setCoEntities] = useState<CoEntityRow[]>(() => toCoEntityRows(initial));

  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [districts, setDistricts] = useState<MasterDataItem[]>([]);
  const [users, setUsers] = useState<LookupUser[]>([]);
  const [siblingLocations, setSiblingLocations] = useState<LocationItem[]>([]);

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

  // Managers and possible parents belong to the selected entity
  useEffect(() => {
    if (!form.entity) {
      setSiblingLocations([]);
      setUsers([]);
      return;
    }
    locationService
      .getLocations({ entity: form.entity, limit: 100 })
      // The entity filter also returns units this entity only shares; a parent must be one it owns
      .then((res) =>
        setSiblingLocations((res.locations || []).filter((l) => l._id !== initial?._id && l.entity?._id === form.entity))
      )
      .catch(() => setSiblingLocations([]));
    lookupService
      .getUsers(form.entity)
      .then((res) => setUsers(res.users || []))
      .catch(() => setUsers([]));
  }, [form.entity, initial?._id]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setAddress = (field: keyof FormState['address'], value: string) =>
    setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));

  const handleEntityChange = (entity: string) =>
    // A manager or parent from the previous entity no longer applies
    setForm((prev) => ({ ...prev, entity, manager: '', parentLocation: '' }));

  const handleStateChange = (state: string) =>
    setForm((prev) => ({ ...prev, address: { ...prev.address, state, district: '' } }));

  // Districts of the selected state, when the master data links them
  const selectedState = states.find((s) => s.label === form.address.state);
  const stateDistricts = selectedState ? districts.filter((d) => d.parent?._id === selectedState._id) : [];
  const districtOptions = stateDistricts.length > 0 ? stateDistricts : selectedState ? [] : districts;

  const updateCoEntity = (index: number, patch: Partial<CoEntityRow>) =>
    setCoEntities((prev) => prev.map((co, i) => (i === index ? { ...co, ...patch } : co)));

  const updateAgreement = (index: number, patch: Partial<LocationAgreement>) =>
    setAgreements((prev) => prev.map((agr, i) => (i === index ? { ...agr, ...patch } : agr)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const missing = [
      [!form.name.trim(), 'Location name'],
      [!form.entity, 'Entity'],
      [!form.locationType, 'Location type'],
      [!form.address.line1.trim(), 'Address line 1'],
      [!form.address.state.trim(), 'State'],
    ]
      .filter(([isMissing]) => isMissing)
      .map(([, label]) => label);
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    // Rows left without an entity are dropped
    const chosenCoEntities = coEntities.filter((co) => co.entity);
    if (chosenCoEntities.some((co) => co.entity === form.entity)) {
      toast.error('A co-entity must be different from the owning entity');
      return;
    }
    if (new Set(chosenCoEntities.map((co) => co.entity)).size !== chosenCoEntities.length) {
      toast.error('The same co-entity is listed more than once');
      return;
    }
    if (form.closingDate && form.openingDate && form.closingDate < form.openingDate) {
      toast.error('The closing date cannot be before the opening date');
      return;
    }

    // Untouched agreement rows are dropped; partly filled ones must be completed
    const filledAgreements = agreements.filter((agr) => !isBlankAgreement(agr));
    const incomplete = filledAgreements.findIndex((agr) => !agr.agreementNumber.trim() || !agr.startDate || !agr.endDate);
    if (incomplete !== -1) {
      toast.error(`Agreement ${agreements.indexOf(filledAgreements[incomplete]) + 1} needs a number, start date and end date`);
      return;
    }
    if (filledAgreements.some((agr) => agr.endDate < agr.startDate)) {
      toast.error('An agreement cannot end before it starts');
      return;
    }

    onSubmit({
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      entity: form.entity,
      locationType: form.locationType,
      manager: form.manager || null,
      parentLocation: form.parentLocation || null,
      openingDate: form.openingDate || null,
      isUpcoming: form.isUpcoming && !form.openingDate,
      closingDate: form.closingDate || null,
      areaType: form.areaType || null,
      operatingModel: form.operatingModel || null,
      coEntities: chosenCoEntities.map((co) => ({ entity: co.entity, openingDate: co.openingDate || null })),
      description: form.description.trim(),
      area: form.area ? Number(form.area) : null,
      areaUnit: form.areaUnit,
      operatingHours: form.operatingHours.trim(),
      contactPerson: form.contactPerson.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
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
      agreements: filledAgreements.map((agr) => ({
        agreementType: agr.agreementType,
        agreementNumber: agr.agreementNumber.trim(),
        startDate: agr.startDate,
        endDate: agr.endDate,
        renewalDate: agr.renewalDate || undefined,
        parties: agr.parties || [],
        notes: agr.notes?.trim() || undefined,
      })),
    });
  };

  return (
    <form id={LOCATION_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
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
              value={form.entity}
              onChange={(e) => handleEntityChange(e.target.value)}
              required
              className={FIELD_CLASS}
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
            {isEditing && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                A location can only move to another entity while it has no records, tasks, documents, licences or sub-units.
              </p>
            )}
          </div>

          <Input
            label="Location Name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Koramangala Day Care Clinic"
            required
          />

          <Input
            label="Location Code"
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
              value={form.locationType}
              onChange={(e) => setField('locationType', e.target.value)}
              required
              className={FIELD_CLASS}
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
          </div>

          {FEATURES.locationSiteDetails && (
          <>
          <div>
            <label className={LABEL_CLASS} htmlFor="location-parent">
              Parent Location
            </label>
            <select
              id="location-parent"
              value={form.parentLocation}
              onChange={(e) => setField('parentLocation', e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">None (top-level site)</option>
              {siblingLocations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name} ({loc.locationCode || loc.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Set this for a wing or sub-unit of another site.</p>
          </div>
          </>
          )}

          <div>
            <label className={LABEL_CLASS} htmlFor="location-manager">
              Unit Manager
            </label>
            <select
              id="location-manager"
              value={form.manager}
              onChange={(e) => setField('manager', e.target.value)}
              className={FIELD_CLASS}
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
              className={FIELD_CLASS}
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
              className={FIELD_CLASS}
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
              type="date"
              value={form.closingDate}
              onChange={(e) => setField('closingDate', e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="location-model">
              Operating Model
            </label>
            <select
              id="location-model"
              value={form.operatingModel}
              onChange={(e) => setField('operatingModel', e.target.value as FormState['operatingModel'])}
              className={FIELD_CLASS}
            >
              <option value="">Not set</option>
              {(Object.keys(OPERATING_MODEL_LABELS) as OperatingModel[]).map((model) => (
                <option key={model} value={model}>
                  {OPERATING_MODEL_LABELS[model]}
                </option>
              ))}
            </select>
          </div>

          {FEATURES.locationSiteDetails && (
          <>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Floor Area"
              type="number"
              min={0}
              value={form.area}
              onChange={(e) => setField('area', e.target.value)}
              placeholder="e.g. 5000"
            />
            <div>
              <label className={LABEL_CLASS} htmlFor="location-area-unit">
                Unit
              </label>
              <select
                id="location-area-unit"
                value={form.areaUnit}
                onChange={(e) => setField('areaUnit', e.target.value as FormState['areaUnit'])}
                className={FIELD_CLASS}
              >
                <option value="sqft">Sq. feet</option>
                <option value="sqm">Sq. metres</option>
              </select>
            </div>
          </div>

          <Input
            label="Operating Hours"
            value={form.operatingHours}
            onChange={(e) => setField('operatingHours', e.target.value)}
            placeholder="e.g. Mon-Sat: 08:00 - 20:00"
          />
          </>
          )}

          <div className="md:col-span-2">
            <span className={LABEL_CLASS}>Other Companies at this Unit</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              For example a pharmacy run by another group company inside this clinic.
            </p>
            <div className="space-y-2">
              {coEntities.map((co, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                  <select
                    aria-label={`Co-entity ${index + 1}`}
                    value={co.entity}
                    onChange={(e) => updateCoEntity(index, { entity: e.target.value })}
                    className={FIELD_CLASS}
                  >
                    <option value="">Select entity</option>
                    {/* Keep a saved co-entity selectable even if it is no longer active */}
                    {co.entity && !entities.some((ent) => ent._id === co.entity) && (
                      <option value={co.entity}>
                        {initial?.coEntities?.find((saved) => saved.entity?._id === co.entity)?.entity?.name || co.entity}
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
                    className={FIELD_CLASS}
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
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </Card>

      {/* Section 2: Contact */}
      {FEATURES.locationContact && (
      <>
      <Card padding="lg">
        <Card.Header
          title="Contact"
          description="Who to reach at this location"
          icon={<Mail size={18} className="text-emerald-600 dark:text-emerald-400" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input
            label="Contact Person"
            value={form.contactPerson}
            onChange={(e) => setField('contactPerson', e.target.value)}
            placeholder="e.g. Dr. Rajesh Sharma"
            leftAddon={<User size={15} className="text-slate-400" />}
          />
          <Input
            label="Contact Email"
            type="email"
            value={form.contactEmail}
            onChange={(e) => setField('contactEmail', e.target.value)}
            placeholder="e.g. unit@company.com"
            leftAddon={<Mail size={15} className="text-slate-400" />}
          />
          <Input
            label="Contact Phone"
            value={form.contactPhone}
            onChange={(e) => setField('contactPhone', e.target.value)}
            placeholder="e.g. +91 80 4455 6677"
            leftAddon={<Phone size={15} className="text-slate-400" />}
          />
        </div>
      </Card>
      </>
      )}

      {/* Section 3: Address */}
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
                value={form.address.state}
                onChange={(e) => handleStateChange(e.target.value)}
                required
                className={FIELD_CLASS}
              >
                <option value="">Select state</option>
                {/* Keep a saved state that is not in the master list */}
                {form.address.state && !selectedState && <option value={form.address.state}>{form.address.state}</option>}
                {states.map((s) => (
                  <option key={s._id} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="location-state"
                value={form.address.state}
                onChange={(e) => setAddress('state', e.target.value)}
                placeholder="e.g. Karnataka"
                required
                className={FIELD_CLASS}
              />
            )}
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
                className={FIELD_CLASS}
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
                className={FIELD_CLASS}
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
              className={FIELD_CLASS}
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

      {/* Section 4: Agreements */}
      {FEATURES.locationAgreements && (
        <>
        <Card padding="lg">
        <Card.Header
          title="Leases & Agreements"
          description="Lease contracts, MOUs and other agreements for this site"
          icon={<FileText size={18} className="text-emerald-600 dark:text-emerald-400" />}
        />

        <div className="space-y-4">
          {agreements.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              No agreements recorded.
            </p>
          ) : (
            agreements.map((agr, index) => (
              <fieldset
                key={agr._id || index}
                className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">Agreement {index + 1}</legend>
                  <button
                    type="button"
                    onClick={() => setAgreements((prev) => prev.filter((_, i) => i !== index))}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Type</label>
                    <select
                      value={agr.agreementType}
                      onChange={(e) => updateAgreement(index, { agreementType: e.target.value })}
                      className={FIELD_CLASS}
                    >
                      <option value="lease">Lease</option>
                      <option value="license">Licence</option>
                      <option value="mou">MOU</option>
                      <option value="service_agreement">Service agreement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>
                      Agreement Number
                      <RequiredMark />
                    </label>
                    <input
                      value={agr.agreementNumber}
                      onChange={(e) => updateAgreement(index, { agreementNumber: e.target.value })}
                      placeholder="e.g. LEASE-2026-001"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>Parties</label>
                    <input
                      value={(agr.parties || []).join(', ')}
                      onChange={(e) =>
                        updateAgreement(index, {
                          parties: e.target.value
                            .split(',')
                            .map((p) => p.trimStart())
                            .filter((p, i, all) => p || i === all.length - 1),
                        })
                      }
                      placeholder="Names, separated by commas"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>
                      Start Date
                      <RequiredMark />
                    </label>
                    <input
                      type="date"
                      value={agr.startDate}
                      onChange={(e) => updateAgreement(index, { startDate: e.target.value })}
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>
                      End Date
                      <RequiredMark />
                    </label>
                    <input
                      type="date"
                      value={agr.endDate}
                      min={agr.startDate || undefined}
                      onChange={(e) => updateAgreement(index, { endDate: e.target.value })}
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>Renewal / Notice Date</label>
                    <input
                      type="date"
                      value={agr.renewalDate || ''}
                      onChange={(e) => updateAgreement(index, { renewalDate: e.target.value })}
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className={LABEL_CLASS}>Notes</label>
                    <textarea
                      rows={2}
                      value={agr.notes || ''}
                      onChange={(e) => updateAgreement(index, { notes: e.target.value })}
                      placeholder="Key terms, escalation clauses, renewal conditions"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              </fieldset>
            ))
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus size={15} />}
            onClick={() =>
              setAgreements((prev) => [
                ...prev,
                { agreementType: 'lease', agreementNumber: '', startDate: '', endDate: '', renewalDate: '', parties: [], notes: '' },
              ])
            }
          >
            Add Agreement
          </Button>
        </div>
      </Card>
        </>
      )}

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
