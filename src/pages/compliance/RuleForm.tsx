import React, { useState, useEffect } from 'react';
import { Bell, CalendarClock, FileText, MapPin, Plus, Save, Scale, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { ComplianceRuleItem, CreateRulePayload } from '@/services/complianceRuleService';
import type { MasterDataItem } from '@/services/adminService';
import { lookupService } from '@/services/lookupService';
import RuleCoveragePreview from './RuleCoveragePreview';

/** The form element's id, so a button outside the form can submit it */
export const RULE_FORM_ID = 'rule-form';

interface RuleFormProps {
  /** Existing rule when editing; omit to create a new one */
  initial?: ComplianceRuleItem;
  /** Rule to copy settings from when creating a duplicate */
  template?: ComplianceRuleItem;
  isSubmitting: boolean;
  onSubmit: (payload: CreateRulePayload) => void;
  onCancel: () => void;
}

type Priority = 'low' | 'medium' | 'high' | 'critical';

interface RequiredDoc {
  documentType: string;
  label: string;
  isMandatory: boolean;
}

interface FormState {
  name: string;
  code: string;
  category: string;
  legalReference: string;
  description: string;
  priority: Priority;
  mandatory: boolean;
  entityTypes: string[];
  locationTypes: string[];
  states: string[];
  frequency: string;
  renewalCycle: string;
  approvalLevels: number;
  status: 'active' | 'inactive';
  requiredDocs: RequiredDoc[];
  reminderDays: number[];
}

const FIELD_CLASS =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none';
const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';
const CHECKBOX_CLASS =
  'w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500';

const REMINDER_PRESETS = [90, 60, 45, 30, 15, 7, 3, 1];

// Days between renewals implied by each frequency; the cycle field can still be changed
const FREQUENCY_CYCLE_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  HALF_YEARLY: 180,
  ANNUALLY: 365,
  BI_ANNUALLY: 730,
  ONETIME: 0,
  ONE_TIME: 0,
};

const RequiredMark = () => (
  <span className="text-red-500 dark:text-red-400 ml-0.5" aria-label="required">
    *
  </span>
);

const toFormState = (rule?: ComplianceRuleItem, isCopy = false): FormState => ({
  name: rule ? (isCopy ? `${rule.name} (Copy)` : rule.name) : '',
  // A copy gets a fresh generated code
  code: rule && !isCopy ? rule.code : '',
  category: rule?.category?._id || '',
  legalReference: rule?.legalReference || '',
  description: rule?.description || '',
  priority: rule?.priority || 'medium',
  mandatory: rule?.mandatory ?? true,
  entityTypes: (rule?.applicableEntityTypes || []).map((type) => type._id),
  locationTypes: (rule?.applicableLocationTypes || []).map((type) => type._id),
  states: rule?.applicableStates || [],
  frequency: rule?.frequency?._id || '',
  renewalCycle: String(rule?.renewalCycle ?? 365),
  approvalLevels: rule?.approvalLevels || 1,
  // A copy starts inactive so it takes effect only when someone switches it on
  status: isCopy ? 'inactive' : rule?.status === 'inactive' ? 'inactive' : 'active',
  requiredDocs: (rule?.requiredDocuments || []).map((doc) => ({
    documentType: doc.documentType?._id || '',
    label: doc.label || '',
    isMandatory: doc.isMandatory ?? true,
  })),
  reminderDays: rule?.notificationRules?.reminderDays || rule?.reminderDaysBefore || [30, 15, 7],
});

interface ChipGroupProps {
  label: string;
  /** Shown when nothing is selected, since an empty selection means "all" */
  allLabel: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
}

/** Multi-select as toggle chips; selecting nothing means the rule applies to all */
const ChipGroup: React.FC<ChipGroupProps> = ({ label, allLabel, options, selected, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {selected.length === 0 ? allLabel : `${selected.length} selected`}
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear
          </button>
        )}
      </span>
    </div>
    {options.length === 0 ? (
      <p className="text-xs text-slate-500 dark:text-slate-400">None defined in Master Data.</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              type="button"
              key={option.value}
              aria-pressed={isSelected}
              onClick={() =>
                onChange(isSelected ? selected.filter((v) => v !== option.value) : [...selected, option.value])
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isSelected
                  ? 'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

const RuleForm: React.FC<RuleFormProps> = ({ initial, template, isSubmitting, onSubmit, onCancel }) => {
  const toast = useToast();
  const isEdit = !!initial;
  const isArchived = initial?.status === 'archived';

  const [form, setForm] = useState<FormState>(() => toFormState(initial || template, !initial && !!template));
  const [categories, setCategories] = useState<MasterDataItem[]>([]);
  const [frequencies, setFrequencies] = useState<MasterDataItem[]>([]);
  const [entityTypes, setEntityTypes] = useState<MasterDataItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [docTypes, setDocTypes] = useState<MasterDataItem[]>([]);

  // Dropdown options
  useEffect(() => {
    const load = (category: string) =>
      lookupService
        .getMasterData({ category })
        .then((res) => (res.items || []).filter((item) => item.status === 'active'))
        .catch(() => [] as MasterDataItem[]);

    Promise.all([
      load('compliance_category'),
      load('compliance_frequency'),
      load('entity_type'),
      load('location_type'),
      load('state'),
      load('document_type'),
    ]).then(([cats, freqs, entTypes, locTypes, stateItems, docs]) => {
      setCategories(cats);
      setFrequencies(freqs);
      setEntityTypes(entTypes);
      setLocationTypes(locTypes);
      setStates(stateItems);
      setDocTypes(docs);
    });
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Choosing a frequency fills in its usual cycle
  const handleFrequencyChange = (frequencyId: string) => {
    const code = frequencies.find((f) => f._id === frequencyId)?.code.toUpperCase();
    const cycle = code !== undefined ? FREQUENCY_CYCLE_DAYS[code] : undefined;
    setForm((prev) => ({
      ...prev,
      frequency: frequencyId,
      renewalCycle: cycle !== undefined ? String(cycle) : prev.renewalCycle,
    }));
  };

  const addDocument = () => {
    if (docTypes.length === 0) {
      toast.error('No document types are defined in Master Data');
      return;
    }
    // Start with a type that is not on the list yet
    const unused = docTypes.find((type) => !form.requiredDocs.some((doc) => doc.documentType === type._id)) || docTypes[0];
    setField('requiredDocs', [...form.requiredDocs, { documentType: unused._id, label: unused.label, isMandatory: true }]);
  };

  const updateDocument = (index: number, changes: Partial<RequiredDoc>) =>
    setField(
      'requiredDocs',
      form.requiredDocs.map((doc, i) => (i === index ? { ...doc, ...changes } : doc))
    );

  const toggleReminder = (day: number) =>
    setField(
      'reminderDays',
      form.reminderDays.includes(day)
        ? form.reminderDays.filter((d) => d !== day)
        : [...form.reminderDays, day].sort((a, b) => b - a)
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cycle = Number(form.renewalCycle);
    const missing =
      (!form.name.trim() && 'Rule name is required') ||
      (!form.category && 'Please select a category') ||
      (!form.frequency && 'Please select a frequency') ||
      ((form.renewalCycle === '' || !Number.isInteger(cycle) || cycle < 0) &&
        'Renewal cycle must be a whole number of days, or 0 for a one-time rule') ||
      (form.requiredDocs.some((doc) => !doc.documentType || !doc.label.trim()) &&
        'Each required document needs a type and a name');
    if (missing) {
      toast.error(missing);
      return;
    }

    onSubmit({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase() || undefined,
      description: form.description.trim(),
      legalReference: form.legalReference.trim(),
      category: form.category,
      frequency: form.frequency,
      renewalCycle: cycle,
      priority: form.priority,
      mandatory: form.mandatory,
      // An archived rule keeps its status; it is restored from the rule page
      ...(isArchived ? {} : { status: form.status }),
      applicableEntityTypes: form.entityTypes,
      applicableLocationTypes: form.locationTypes,
      applicableStates: form.states,
      requiredDocuments: form.requiredDocs.map((doc) => ({
        documentType: doc.documentType,
        label: doc.label.trim(),
        isMandatory: doc.isMandatory,
      })),
      notificationRules: { reminderDays: form.reminderDays },
      approvalLevels: form.approvalLevels,
    });
  };

  const cycleNumber = Number(form.renewalCycle);
  const reminderOptions = [...new Set([...REMINDER_PRESETS, ...form.reminderDays])].sort((a, b) => b - a);

  return (
    <form id={RULE_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
      <Card padding="lg">
        <Card.Header
          title="Rule Details"
          description="What the obligation is and the law it comes from"
          icon={<Scale size={18} className="text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Input
              label="Rule Name"
              name="name"
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Fire NOC Renewal"
            />
          </div>

          <Input
            label="Rule Code"
            name="code"
            value={form.code}
            onChange={(e) => setField('code', e.target.value.toUpperCase())}
            placeholder="e.g. FIRE-NOC-ANNUAL"
            hint={isEdit ? 'Short unique code shown across the system.' : 'Leave blank to generate one.'}
          />

          <div>
            <label className={LABEL_CLASS} htmlFor="rule-category">
              Category
              <RequiredMark />
            </label>
            <select
              id="rule-category"
              name="category"
              required
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Legal Reference"
            name="legalReference"
            value={form.legalReference}
            onChange={(e) => setField('legalReference', e.target.value)}
            placeholder="e.g. Section 13, Fire Services Act"
          />

          <div>
            <label className={LABEL_CLASS} htmlFor="rule-priority">
              Priority
            </label>
            <select
              id="rule-priority"
              name="priority"
              value={form.priority}
              onChange={(e) => setField('priority', e.target.value as Priority)}
              className={FIELD_CLASS}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tasks raised for this rule are at least this urgent.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className={LABEL_CLASS} htmlFor="rule-description">
              Description
            </label>
            <textarea
              id="rule-description"
              name="description"
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="What must be done to comply"
              className={FIELD_CLASS}
            />
          </div>

          <label className="md:col-span-2 flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="mandatory"
              checked={form.mandatory}
              onChange={(e) => setField('mandatory', e.target.checked)}
              className={CHECKBOX_CLASS}
            />
            <span className="text-sm text-slate-800 dark:text-slate-200">
              Mandatory by law <span className="text-slate-500 dark:text-slate-400">(untick for recommended practice)</span>
            </span>
          </label>
        </div>
      </Card>

      <Card padding="lg">
        <Card.Header
          title="Where It Applies"
          description="Leave a group empty to apply the rule to all of them"
          icon={<MapPin size={18} className="text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="space-y-5">
          <ChipGroup
            label="Entity types"
            allLabel="All entity types"
            options={entityTypes.map((type) => ({ value: type._id, label: type.label }))}
            selected={form.entityTypes}
            onChange={(next) => setField('entityTypes', next)}
          />
          <ChipGroup
            label="Location types"
            allLabel="All location types"
            options={locationTypes.map((type) => ({ value: type._id, label: type.label }))}
            selected={form.locationTypes}
            onChange={(next) => setField('locationTypes', next)}
          />
          <ChipGroup
            label="States"
            allLabel="All states"
            options={states.map((state) => ({ value: state.label, label: state.label }))}
            selected={form.states}
            onChange={(next) => setField('states', next)}
          />

          <RuleCoveragePreview entityTypes={form.entityTypes} locationTypes={form.locationTypes} states={form.states} />
        </div>
      </Card>

      <Card padding="lg">
        <Card.Header
          title="Schedule & Approval"
          description="How often it renews and how many sign-offs a record needs"
          icon={<CalendarClock size={18} className="text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS} htmlFor="rule-frequency">
              Frequency
              <RequiredMark />
            </label>
            <select
              id="rule-frequency"
              name="frequency"
              required
              value={form.frequency}
              onChange={(e) => handleFrequencyChange(e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">Select frequency</option>
              {frequencies.map((frequency) => (
                <option key={frequency._id} value={frequency._id}>
                  {frequency.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Renewal Cycle (days)"
            name="renewalCycle"
            type="number"
            min={0}
            required
            value={form.renewalCycle}
            onChange={(e) => setField('renewalCycle', e.target.value)}
            hint={
              form.renewalCycle !== '' && cycleNumber === 0
                ? 'One-time: an approved record does not expire.'
                : 'An approved record expires this many days after approval. Use 0 for one-time.'
            }
          />

          <div>
            <label className={LABEL_CLASS} htmlFor="rule-approval-levels">
              Approvals Required
            </label>
            <select
              id="rule-approval-levels"
              name="approvalLevels"
              value={form.approvalLevels}
              onChange={(e) => setField('approvalLevels', Number(e.target.value))}
              className={FIELD_CLASS}
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {form.approvalLevels > 1
                ? `Each record needs ${form.approvalLevels} approvals, each from a different approver.`
                : 'One approval signs off a record.'}
            </p>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="rule-status">
              Status
            </label>
            {isArchived ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 py-2.5">
                Archived. Restore it from the rule page to use it again.
              </p>
            ) : (
              <>
                <select
                  id="rule-status"
                  name="status"
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value as FormState['status'])}
                  className={FIELD_CLASS}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Only active rules create compliance records.
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <Card.Header
          title="Required Documents"
          description="Evidence a record needs; mandatory ones block submission and approval until uploaded"
          icon={<FileText size={18} className="text-indigo-600 dark:text-indigo-400" />}
          action={
            <Button type="button" variant="outline" size="sm" leftIcon={<Plus size={14} />} onClick={addDocument}>
              Add Document
            </Button>
          }
        />

        {form.requiredDocs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No documents required. Records under this rule can be submitted without evidence.
          </p>
        ) : (
          <div className="space-y-3">
            {form.requiredDocs.map((doc, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto_auto] gap-3 items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40"
              >
                <select
                  aria-label={`Document ${index + 1} type`}
                  value={doc.documentType}
                  onChange={(e) => {
                    const type = docTypes.find((t) => t._id === e.target.value);
                    // Follow the type's name unless the name was customised
                    const previous = docTypes.find((t) => t._id === doc.documentType);
                    const keepLabel = doc.label.trim() && doc.label !== previous?.label;
                    updateDocument(index, {
                      documentType: e.target.value,
                      label: keepLabel ? doc.label : type?.label || doc.label,
                    });
                  }}
                  className={FIELD_CLASS}
                >
                  {!docTypes.some((type) => type._id === doc.documentType) && <option value="">Select type</option>}
                  {docTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Document ${index + 1} name`}
                  value={doc.label}
                  onChange={(e) => updateDocument(index, { label: e.target.value })}
                  placeholder="Name shown on the record's checklist"
                  className={FIELD_CLASS}
                />
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={doc.isMandatory}
                    onChange={(e) => updateDocument(index, { isMandatory: e.target.checked })}
                    className={CHECKBOX_CLASS}
                  />
                  Mandatory
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setField(
                      'requiredDocs',
                      form.requiredDocs.filter((_, i) => i !== index)
                    )
                  }
                  className="p-2 rounded text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors justify-self-start"
                  title="Remove document"
                  aria-label={`Remove document ${index + 1}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="lg">
        <Card.Header
          title="Expiry Reminders"
          description="A renewal task and notification go to the person responsible this many days before a record expires"
          icon={<Bell size={18} className="text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="flex flex-wrap gap-2">
          {reminderOptions.map((day) => {
            const selected = form.reminderDays.includes(day);
            return (
              <button
                type="button"
                key={day}
                aria-pressed={selected}
                onClick={() => toggleReminder(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selected
                    ? 'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {day} {day === 1 ? 'day' : 'days'}
              </button>
            );
          })}
        </div>
        {form.reminderDays.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            None selected, so the system default reminder days apply.
          </p>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
          {isEdit ? 'Save Changes' : 'Create Rule'}
        </Button>
      </div>
    </form>
  );
};

export default RuleForm;
