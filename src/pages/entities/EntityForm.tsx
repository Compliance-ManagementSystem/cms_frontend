import React, { useState, useEffect } from 'react';
import { Briefcase, FileText, Mail, MapPin, Phone, Save, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CreateEntityPayload, EntityItem } from '@/services/entityService';
import type { MasterDataItem } from '@/services/adminService';
import { lookupService, LookupUser } from '@/services/lookupService';
import { z } from 'zod';
import FieldError, { fieldBorder } from '@/components/ui/FieldError';
import {
  FieldErrors,
  useFormErrors,
  required,
  email,
  phone,
  optionalPincode,
  optionalGstin,
  optionalPan,
  optionalCin,
  optionalCode,
} from '@/utils/validation';

/** The form element's id, so a button outside the form can submit it */
export const ENTITY_FORM_ID = 'entity-form';

interface EntityFormProps {
  /** Existing entity when editing; omit to create a new one */
  initial?: EntityItem;
  /**
   * Whether name, code, type, owner, status and statutory identifiers can be changed.
   * Entity Admins may only update contact details, address and description.
   */
  canEditCore?: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: CreateEntityPayload) => void;
  onCancel: () => void;
  /** Field errors returned by the API for the last submit */
  serverErrors?: FieldErrors;
}

interface FormState {
  name: string;
  code: string;
  entityType: string;
  owner: string;
  industry: string;
  registrationNumber: string;
  gstin: string;
  pan: string;
  cin: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
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
  'w-full bg-white dark:bg-slate-800 border rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed';
const fieldClass = (error?: string) => `${FIELD_CLASS} ${fieldBorder(error)}`;

// Contact details and address: editable by everyone who can edit the entity
const contactSchema = z.object({
  contactEmail: email,
  contactPhone: phone,
  address: z.object({
    line1: required('Address line 1'),
    city: required('City'),
    state: z.string().trim().min(1, 'Select a state'),
    pincode: optionalPincode,
  }),
});

// Details and statutory identifiers: administrators only
const coreSchema = contactSchema.extend({
  name: required('Entity name')
    .min(2, 'Entity name must be at least 2 characters')
    .max(150, 'Entity name must be at most 150 characters'),
  code: optionalCode('Entity code'),
  entityType: z.string().min(1, 'Select an entity type'),
  gstin: optionalGstin,
  pan: optionalPan,
  cin: optionalCin,
});

const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

const RequiredMark = () => (
  <span className="text-red-500 dark:text-red-400 ml-0.5" aria-label="required">
    *
  </span>
);

const toFormState = (ent?: EntityItem): FormState => ({
  name: ent?.name || '',
  code: ent?.entityCode || ent?.code || '',
  entityType: ent?.entityType?._id || '',
  owner: ent?.owner?._id || '',
  industry: ent?.industry?._id || '',
  registrationNumber: ent?.registrationNumber || '',
  gstin: ent?.gstin || '',
  pan: ent?.pan || '',
  cin: ent?.cin || '',
  contactPerson: ent?.contactPerson || '',
  contactEmail: ent?.contactEmail || '',
  contactPhone: ent?.contactPhone || '',
  description: ent?.description || '',
  status: ent?.status || 'active',
  address: {
    line1: ent?.address?.line1 || '',
    line2: ent?.address?.line2 || '',
    city: ent?.address?.city || '',
    district: ent?.address?.district || '',
    state: ent?.address?.state || '',
    pincode: ent?.address?.pincode || '',
    country: ent?.address?.country || 'India',
  },
});

const EntityForm: React.FC<EntityFormProps> = ({
  initial,
  canEditCore = true,
  isSubmitting,
  onSubmit,
  onCancel,
  serverErrors,
}) => {
  const { errors, validate, clear } = useFormErrors(serverErrors);
  const isEdit = !!initial;

  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [entityTypes, setEntityTypes] = useState<MasterDataItem[]>([]);
  const [industries, setIndustries] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [districts, setDistricts] = useState<MasterDataItem[]>([]);
  const [users, setUsers] = useState<LookupUser[]>([]);

  // Dropdown options
  useEffect(() => {
    const active = (items: MasterDataItem[] = []) => items.filter((item) => item.status === 'active');
    const noItems = { items: [] as MasterDataItem[] };
    Promise.all([
      lookupService.getMasterData({ category: 'entity_type' }).catch(() => noItems),
      lookupService.getMasterData({ category: 'industry' }).catch(() => noItems),
      lookupService.getMasterData({ category: 'state' }).catch(() => noItems),
      lookupService.getMasterData({ category: 'district' }).catch(() => noItems),
      lookupService.getUsers().catch(() => ({ users: [] as LookupUser[] })),
    ]).then(([typesRes, industriesRes, statesRes, districtsRes, usersRes]) => {
      setEntityTypes(active(typesRes.items));
      setIndustries(active(industriesRes.items));
      setStates(active(statesRes.items));
      setDistricts(active(districtsRes.items));
      setUsers(usersRes.users || []);
    });
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clear(key);
  };

  const setAddress = (key: keyof FormState['address'], value: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
    clear(`address.${key}`);
  };

  const handleStateChange = (state: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, state, district: '' } }));
    clear('address.state');
  };

  // Districts narrow to the chosen state when Master Data links them
  const selectedState = states.find((s) => s.label === form.address.state);
  const stateDistricts = selectedState ? districts.filter((d) => d.parent?._id === selectedState._id) : [];
  const districtOptions = stateDistricts.length > 0 ? stateDistricts : selectedState ? [] : districts;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Fields an Entity Admin cannot change are not re-checked for them
    if (!validate(canEditCore ? coreSchema : contactSchema, form)) return;

    const code = form.code.trim().toUpperCase() || undefined;
    onSubmit({
      name: form.name.trim(),
      code,
      entityCode: code,
      entityType: form.entityType,
      owner: form.owner || null,
      industry: form.industry || null,
      registrationNumber: form.registrationNumber.trim() || undefined,
      gstin: form.gstin.trim().toUpperCase() || undefined,
      pan: form.pan.trim().toUpperCase() || undefined,
      cin: form.cin.trim().toUpperCase() || undefined,
      contactPerson: form.contactPerson.trim() || undefined,
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      address: {
        line1: form.address.line1.trim(),
        line2: form.address.line2.trim() || undefined,
        city: form.address.city.trim(),
        district: form.address.district.trim() || undefined,
        state: form.address.state.trim(),
        pincode: form.address.pincode.trim() || undefined,
        country: form.address.country.trim() || 'India',
      },
    });
  };

  return (
    <form id={ENTITY_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
      {!canEditCore && (
        <p className="text-sm text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-600/40 rounded-lg px-4 py-3">
          You can update this entity's contact details, address and description. Its name, code, type, owner, status
          and statutory identifiers can only be changed by an administrator.
        </p>
      )}

      {/* Details and identifiers: administrators only */}
      <fieldset disabled={!canEditCore} className="space-y-6 disabled:opacity-70">
        <Card padding="lg">
          <Card.Header
            title="Entity Details"
            description="Legal name, type, industry and owner"
            icon={<Briefcase size={18} className="text-indigo-600 dark:text-indigo-400" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Input
                label="Entity Name"
                name="name"
                error={errors['name']}
                required
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. Apex Care Private Limited"
              />
            </div>

            <Input
              label="Entity Code"
              name="code"
                error={errors['code']}
              value={form.code}
              onChange={(e) => setField('code', e.target.value.toUpperCase())}
              placeholder="e.g. ACPL"
              hint={isEdit ? 'Short unique code shown across the system.' : 'Leave blank to generate one from the name.'}
            />

            <div>
              <label className={LABEL_CLASS} htmlFor="entity-type">
                Entity Type
                <RequiredMark />
              </label>
              <select
                id="entity-type"
                name="entityType"
                required
                value={form.entityType}
                onChange={(e) => setField('entityType', e.target.value)}
                className={fieldClass(errors.entityType)}
              >
                <option value="">Select entity type</option>
                {/* Keep the saved type selectable even if it has since been deactivated */}
                {initial?.entityType?._id && !entityTypes.some((t) => t._id === initial.entityType._id) && (
                  <option value={initial.entityType._id}>{initial.entityType.label || initial.entityType.code}</option>
                )}
                {entityTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.entityType} />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="entity-industry">
                Industry
              </label>
              <select
                id="entity-industry"
                name="industry"
                value={form.industry}
                onChange={(e) => setField('industry', e.target.value)}
                className={fieldClass()}
              >
                <option value="">Not specified</option>
                {industries.map((industry) => (
                  <option key={industry._id} value={industry._id}>
                    {industry.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="entity-owner">
                Owner
              </label>
              <select
                id="entity-owner"
                name="owner"
                value={form.owner}
                onChange={(e) => setField('owner', e.target.value)}
                className={fieldClass()}
              >
                <option value="">Not assigned</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="entity-status">
                Status
              </label>
              <select
                id="entity-status"
                name="status"
                value={form.status}
                onChange={(e) => setField('status', e.target.value as FormState['status'])}
                className={fieldClass()}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <Card.Header
            title="Statutory Identifiers"
            description="Tax and company registration numbers; each must be unique to one entity"
            icon={<FileText size={18} className="text-indigo-600 dark:text-indigo-400" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="GSTIN"
              name="gstin"
                error={errors['gstin']}
              value={form.gstin}
              onChange={(e) => setField('gstin', e.target.value.toUpperCase())}
              placeholder="e.g. 27AAAAA0000A1Z5"
              maxLength={15}
            />
            <Input
              label="PAN"
              name="pan"
                error={errors['pan']}
              value={form.pan}
              onChange={(e) => setField('pan', e.target.value.toUpperCase())}
              placeholder="e.g. AAAAA0000A"
              maxLength={10}
            />
            <Input
              label="CIN"
              name="cin"
                error={errors['cin']}
              value={form.cin}
              onChange={(e) => setField('cin', e.target.value.toUpperCase())}
              placeholder="e.g. U72200MH2020PTC123456"
              maxLength={21}
            />
            <Input
              label="Registration Number"
              name="registrationNumber"
              value={form.registrationNumber}
              onChange={(e) => setField('registrationNumber', e.target.value)}
              placeholder="Any other registration reference"
            />
          </div>
        </Card>
      </fieldset>

      <Card padding="lg">
        <Card.Header
          title="Contact"
          description="Who to reach about this entity's compliance"
          icon={<Mail size={18} className="text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input
            label="Contact Person"
            name="contactPerson"
            value={form.contactPerson}
            onChange={(e) => setField('contactPerson', e.target.value)}
            placeholder="e.g. Rajesh Kumar"
            leftAddon={<User size={15} />}
          />
          <Input
            label="Contact Email"
            name="contactEmail"
                error={errors['contactEmail']}
            type="email"
            required
            value={form.contactEmail}
            onChange={(e) => setField('contactEmail', e.target.value)}
            placeholder="e.g. compliance@apexcare.com"
            leftAddon={<Mail size={15} />}
          />
          <Input
            label="Contact Phone"
            name="contactPhone"
                error={errors['contactPhone']}
            required
            value={form.contactPhone}
            onChange={(e) => setField('contactPhone', e.target.value)}
            placeholder="e.g. +91 98765 43210"
            leftAddon={<Phone size={15} />}
          />

          <div className="md:col-span-3">
            <label className={LABEL_CLASS} htmlFor="entity-description">
              Description
            </label>
            <textarea
              id="entity-description"
              name="description"
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="What this entity does"
              className={fieldClass()}
            />
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <Card.Header
          title="Registered Address"
          description="Registered office; the state decides which state rules apply"
          icon={<MapPin size={18} className="text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Input
              label="Address Line 1"
              name="address.line1"
                error={errors['address.line1']}
              required
              value={form.address.line1}
              onChange={(e) => setAddress('line1', e.target.value)}
              placeholder="Building, floor, street"
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Address Line 2"
              name="address.line2"
              value={form.address.line2}
              onChange={(e) => setAddress('line2', e.target.value)}
              placeholder="Locality or landmark"
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="entity-state">
              State
              <RequiredMark />
            </label>
            {states.length > 0 ? (
              <select
                id="entity-state"
                name="address.state"
                required
                value={form.address.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className={fieldClass(errors['address.state'])}
              >
                <option value="">Select state</option>
                {form.address.state && !selectedState && (
                  <option value={form.address.state}>{form.address.state}</option>
                )}
                {states.map((state) => (
                  <option key={state._id} value={state.label}>
                    {state.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="entity-state"
                name="address.state"
                required
                value={form.address.state}
                onChange={(e) => setAddress('state', e.target.value)}
                placeholder="e.g. Maharashtra"
                className={fieldClass(errors['address.state'])}
              />
            )}
            <FieldError message={errors['address.state']} />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="entity-district">
              District
            </label>
            {districtOptions.length > 0 ? (
              <select
                id="entity-district"
                name="address.district"
                value={form.address.district}
                onChange={(e) => setAddress('district', e.target.value)}
                className={fieldClass()}
              >
                <option value="">Select district</option>
                {form.address.district && !districtOptions.some((d) => d.label === form.address.district) && (
                  <option value={form.address.district}>{form.address.district}</option>
                )}
                {districtOptions.map((district) => (
                  <option key={district._id} value={district.label}>
                    {district.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="entity-district"
                name="address.district"
                value={form.address.district}
                onChange={(e) => setAddress('district', e.target.value)}
                placeholder="e.g. Mumbai Suburban"
                className={fieldClass()}
              />
            )}
          </div>

          <Input
            label="City"
            name="address.city"
                error={errors['address.city']}
            required
            value={form.address.city}
            onChange={(e) => setAddress('city', e.target.value)}
            placeholder="e.g. Mumbai"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pincode"
              name="address.pincode"
                error={errors['address.pincode']}
              value={form.address.pincode}
              onChange={(e) => setAddress('pincode', e.target.value)}
              placeholder="e.g. 400001"
              maxLength={6}
            />
            <Input
              label="Country"
              name="address.country"
              value={form.address.country}
              onChange={(e) => setAddress('country', e.target.value)}
              placeholder="India"
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
          {isEdit ? 'Save Changes' : 'Create Entity'}
        </Button>
      </div>
    </form>
  );
};

export default EntityForm;
