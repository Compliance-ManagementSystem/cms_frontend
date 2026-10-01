import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Scale,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Clock,
  Building2,
  MapPin,
  FileText,
  Bell,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { complianceRuleService, UpdateRulePayload } from '@/services/complianceRuleService';
import { adminService, MasterDataItem } from '@/services/adminService';
import { ROUTES } from '@/constants/routes';

export const ComplianceRuleEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [isLoadingPrereqs, setIsLoadingPrereqs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master Data collections
  const [categories, setCategories] = useState<MasterDataItem[]>([]);
  const [frequencies, setFrequencies] = useState<MasterDataItem[]>([]);
  const [entityTypes, setEntityTypes] = useState<MasterDataItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [docTypes, setDocTypes] = useState<MasterDataItem[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [legalReference, setLegalReference] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // Scope
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);

  // Schedule & Frequencies
  const [frequency, setFrequency] = useState('');
  const [renewalCycle, setRenewalCycle] = useState<number>(365);
  const [mandatory, setMandatory] = useState<boolean>(true);
  const [active, setActive] = useState<boolean>(true);

  // Dynamic Required Documents
  const [requiredDocs, setRequiredDocs] = useState<
    Array<{ documentType: string; label: string; isMandatory: boolean }>
  >([]);

  // Notifications
  const [reminderDays, setReminderDays] = useState<number[]>([30, 15, 7]);
  const [notifyRoles, setNotifyRoles] = useState<string[]>([
    'compliance_officer',
    'location_manager',
  ]);
  const [channels, setChannels] = useState<string[]>(['email', 'in_app']);

  // Escalation
  const [escalateAfterDays, setEscalateAfterDays] = useState<number>(7);
  const [escalateToRole, setEscalateToRole] = useState<string>('admin');
  const [autoTaskCreation, setAutoTaskCreation] = useState<boolean>(true);
  const [escalationMessage, setEscalationMessage] = useState<string>('');

  // Load Prerequisites & Rule Data
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setIsLoadingPrereqs(true);
      try {
        const [catsRes, freqsRes, entTypesRes, locTypesRes, statesRes, docsRes, ruleData] =
          await Promise.all([
            adminService.getMasterData({ category: 'compliance_category' }).catch(() => ({ items: [] })),
            adminService.getMasterData({ category: 'compliance_frequency' }).catch(() => ({ items: [] })),
            adminService.getMasterData({ category: 'entity_type' }).catch(() => ({ items: [] })),
            adminService.getMasterData({ category: 'location_type' }).catch(() => ({ items: [] })),
            adminService.getMasterData({ category: 'state' }).catch(() => ({ items: [] })),
            adminService.getMasterData({ category: 'document_type' }).catch(() => ({ items: [] })),
            complianceRuleService.getRuleById(id),
          ]);

        const activeCats = (catsRes.items || []).filter((i: MasterDataItem) => i.status === 'active');
        const activeFreqs = (freqsRes.items || []).filter((i: MasterDataItem) => i.status === 'active');
        const activeEntTypes = (entTypesRes.items || []).filter((i: MasterDataItem) => i.status === 'active');
        const activeLocTypes = (locTypesRes.items || []).filter((i: MasterDataItem) => i.status === 'active');
        const activeStates = (statesRes.items || []).filter((i: MasterDataItem) => i.status === 'active');
        const activeDocTypes = (docsRes.items || []).filter((i: MasterDataItem) => i.status === 'active');

        setCategories(activeCats);
        setFrequencies(activeFreqs);
        setEntityTypes(activeEntTypes);
        setLocationTypes(activeLocTypes);
        setStates(activeStates);
        setDocTypes(activeDocTypes);

        // Pre-fill form from existing rule
        setName(ruleData.name || '');
        setCode(ruleData.code || '');
        setDescription(ruleData.description || '');
        setLegalReference(ruleData.legalReference || '');
        setPriority(ruleData.priority || 'medium');
        setCategory(ruleData.category?._id || activeCats[0]?._id || '');
        setFrequency(ruleData.frequency?._id || activeFreqs[0]?._id || '');
        setRenewalCycle(ruleData.renewalCycle ?? 365);
        setMandatory(ruleData.mandatory ?? true);
        setActive(ruleData.active ?? (ruleData.status !== 'inactive'));

        // Scope IDs
        setSelectedEntityTypes((ruleData.applicableEntityTypes || []).map((et: any) => et._id || et));
        setSelectedLocationTypes((ruleData.applicableLocationTypes || []).map((lt: any) => lt._id || lt));
        setSelectedStates(ruleData.applicableStates || []);

        // Required Documents
        setRequiredDocs(
          (ruleData.requiredDocuments || []).map((rd: any) => ({
            documentType: rd.documentType?._id || rd.documentType,
            label: rd.label || '',
            isMandatory: rd.isMandatory ?? true,
          }))
        );

        // Notifications & Escalation
        if (ruleData.notificationRules) {
          if (ruleData.notificationRules.reminderDays) setReminderDays(ruleData.notificationRules.reminderDays);
          if (ruleData.notificationRules.notifyRoles) setNotifyRoles(ruleData.notificationRules.notifyRoles);
          if (ruleData.notificationRules.channels) setChannels(ruleData.notificationRules.channels);
        }

        if (ruleData.escalationRules) {
          if (ruleData.escalationRules.escalateAfterDays !== undefined) {
            setEscalateAfterDays(ruleData.escalationRules.escalateAfterDays);
          }
          if (ruleData.escalationRules.escalateToRole) setEscalateToRole(ruleData.escalationRules.escalateToRole);
          if (ruleData.escalationRules.autoTaskCreation !== undefined) {
            setAutoTaskCreation(ruleData.escalationRules.autoTaskCreation);
          }
          if (ruleData.escalationRules.escalationMessage) {
            setEscalationMessage(ruleData.escalationRules.escalationMessage);
          }
        }
      } catch (err: any) {
        toast.error('Failed to load compliance rule for editing');
        navigate(ROUTES.COMPLIANCE_RULES);
      } finally {
        setIsLoadingPrereqs(false);
      }
    };

    loadData();
  }, [id, toast]);

  // Toggle helpers for multi-select
  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Add Dynamic Document Row
  const handleAddDocumentRow = () => {
    if (docTypes.length === 0) {
      toast.error('No document types available in master data');
      return;
    }
    const defaultDoc = docTypes[0];
    setRequiredDocs([
      ...requiredDocs,
      {
        documentType: defaultDoc._id,
        label: defaultDoc.label,
        isMandatory: true,
      },
    ]);
  };

  const handleRemoveDocumentRow = (index: number) => {
    setRequiredDocs(requiredDocs.filter((_, i) => i !== index));
  };

  const handleUpdateDocumentRow = (index: number, field: string, val: any) => {
    setRequiredDocs(
      requiredDocs.map((item, i) => {
        if (i !== index) return item;
        if (field === 'documentType') {
          const doc = docTypes.find((d) => d._id === val);
          return {
            ...item,
            documentType: val,
            label: doc?.label || item.label,
          };
        }
        return { ...item, [field]: val };
      })
    );
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    if (!category) {
      toast.error('Category is required');
      return;
    }
    if (!frequency) {
      toast.error('Frequency is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateRulePayload = {
        name: name.trim(),
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        description: description.trim() || undefined,
        legalReference: legalReference.trim() || undefined,
        category,
        frequency,
        renewalCycle: Number(renewalCycle) || 365,
        priority,
        mandatory,
        active,
        status: active ? 'active' : 'inactive',
        applicableEntityTypes: selectedEntityTypes,
        applicableLocationTypes: selectedLocationTypes,
        applicableStates: selectedStates,
        requiredDocuments: requiredDocs.map((d) => ({
          documentType: d.documentType,
          label: d.label,
          isMandatory: d.isMandatory,
        })),
        notificationRules: {
          reminderDays,
          notifyRoles,
          channels,
        },
        escalationRules: {
          escalateAfterDays: Number(escalateAfterDays) || 7,
          escalateToRole,
          autoTaskCreation,
          escalationMessage: escalationMessage.trim() || undefined,
        },
      };

      const result = await complianceRuleService.updateRule(id, payload);
      toast.success(result.message || 'Compliance rule updated successfully');
      navigate(`/compliance/rules/${id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update compliance rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPrereqs) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading rule details and configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/compliance/rules/${id}`)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Edit Compliance Rule</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Update statutory obligations, applicability matrix, renewal cadence, or escalation rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate(`/compliance/rules/${id}`)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            leftIcon={<Save size={16} />}
            isLoading={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Section 1: Identification & Statutory Category */}
      <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Scale size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Rule Identification & Statutory Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Rule Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              label="Rule Code *"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Statutory Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.label} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Legal / Act Reference"
              value={legalReference}
              onChange={(e) => setLegalReference(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical (Strict Statutory)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Statutory Description & Guidelines
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed statutory provisions, inspection requirements, and compliance instructions..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 resize-none shadow-sm dark:shadow-none"
            />
          </div>
        </div>
      </Card>

      {/* Section 2: Applicability Criteria */}
      <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Multi-Tier Applicability Scope</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Determine which Entities and Locations evaluate this rule. Leaving a section empty applies to ALL.
              </p>
            </div>
          </div>
        </div>

        {/* Entity Types */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
              Applicable Entity Types
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedEntityTypes(entityTypes.map((t) => t._id))}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setSelectedEntityTypes([])}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Clear (All Entities)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {entityTypes.map((t) => {
              const selected = selectedEntityTypes.includes(t._id);
              return (
                <button
                  type="button"
                  key={t._id}
                  onClick={() => toggleItem(selectedEntityTypes, setSelectedEntityTypes, t._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-200'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {selectedEntityTypes.length === 0 && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400/90 italic">
              ✓ Applies to all corporate entity legal structures
            </p>
          )}
        </div>

        {/* Location Types */}
        <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
              Applicable Location Types
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedLocationTypes(locationTypes.map((t) => t._id))}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setSelectedLocationTypes([])}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Clear (All Locations)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {locationTypes.map((t) => {
              const selected = selectedLocationTypes.includes(t._id);
              return (
                <button
                  type="button"
                  key={t._id}
                  onClick={() => toggleItem(selectedLocationTypes, setSelectedLocationTypes, t._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-emerald-50 dark:bg-emerald-600/30 border-emerald-300 dark:border-emerald-500 text-emerald-700 dark:text-emerald-200'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {selectedLocationTypes.length === 0 && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400/90 italic">
              ✓ Applies across all operational location facilities
            </p>
          )}
        </div>

        {/* Geographical States */}
        <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin size={14} className="text-amber-600 dark:text-amber-400" />
              Applicable States / Regions
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedStates(states.map((s) => s.label))}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setSelectedStates([])}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Pan-India (All States)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
            {states.map((s) => {
              const selected = selectedStates.includes(s.label);
              return (
                <button
                  type="button"
                  key={s._id}
                  onClick={() => toggleItem(selectedStates, setSelectedStates, s.label)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-amber-50 dark:bg-amber-600/30 border-amber-300 dark:border-amber-500 text-amber-700 dark:text-amber-200'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          {selectedStates.length === 0 && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400/90 italic">
              ✓ Pan-India rule (Applies across all states & Union Territories)
            </p>
          )}
        </div>
      </Card>

      {/* Section 3: Frequency, Cycle & Mandatory Flags */}
      <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Clock size={18} className="text-amber-600 dark:text-amber-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Renewal Cycle & Mandate Flags</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Recurrence Frequency *
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
            >
              {frequencies.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.label} ({f.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Renewal Cycle (Days) *"
              type="number"
              min="0"
              value={renewalCycle}
              onChange={(e) => setRenewalCycle(parseInt(e.target.value) || 0)}
              required
            />
          </div>

          <div className="flex flex-col justify-center">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Mandatory Requirement</label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={mandatory}
                onChange={(e) => setMandatory(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-500 focus:ring-rose-500 focus:ring-offset-white dark:focus:ring-offset-slate-900"
              />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {mandatory ? 'Strictly Mandatory' : 'Optional / Advisory'}
              </span>
            </label>
          </div>

          <div className="flex flex-col justify-center">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Rule Status</label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-white dark:focus:ring-offset-slate-900"
              />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {active ? 'Active & Enforced' : 'Inactive (Draft)'}
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Section 4: Required Documents Dynamic Builder */}
      <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-sky-600 dark:text-sky-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Required Statutory Documents</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Specify document attachments required for verifying compliance with this rule
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={handleAddDocumentRow}
          >
            Add Document
          </Button>
        </div>

        {requiredDocs.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-xs">
            No specific documents required yet. Click "Add Document" to require statutory evidence.
          </div>
        ) : (
          <div className="space-y-3">
            {requiredDocs.map((doc, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg shadow-sm dark:shadow-none"
              >
                <div className="w-full sm:w-1/3">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Document Type (Master Data)
                  </label>
                  <select
                    value={doc.documentType}
                    onChange={(e) => handleUpdateDocumentRow(idx, 'documentType', e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                  >
                    {docTypes.map((dt) => (
                      <option key={dt._id} value={dt._id}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:flex-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Label / Evidence Name
                  </label>
                  <input
                    type="text"
                    value={doc.label}
                    onChange={(e) => handleUpdateDocumentRow(idx, 'label', e.target.value)}
                    placeholder="e.g. Approved NOC Certificate Copy"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                  />
                </div>

                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={doc.isMandatory}
                      onChange={(e) => handleUpdateDocumentRow(idx, 'isMandatory', e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-500"
                    />
                    Mandatory
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveDocumentRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section 5: Notification & Escalation Rules */}
      <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Notifications & Escalation Flow</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure alert milestones prior to renewal deadline and overdue escalation policies
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
              Reminder Milestones
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Send Reminders (Days Before Expiry)
              </label>
              <div className="flex flex-wrap gap-2">
                {[90, 60, 45, 30, 15, 7, 3, 1].map((day) => {
                  const selected = reminderDays.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => {
                        if (selected) setReminderDays(reminderDays.filter((d) => d !== day));
                        else setReminderDays([...reminderDays, day].sort((a, b) => b - a));
                      }}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {day}d
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Notify Stakeholders
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { role: 'compliance_officer', label: 'Compliance Officer' },
                  { role: 'location_manager', label: 'Unit Manager' },
                  { role: 'entity_admin', label: 'Entity Admin' },
                  { role: 'admin', label: 'Central Admin' },
                ].map((item) => {
                  const selected = notifyRoles.includes(item.role);
                  return (
                    <button
                      type="button"
                      key={item.role}
                      onClick={() => {
                        if (selected) setNotifyRoles(notifyRoles.filter((r) => r !== item.role));
                        else setNotifyRoles([...notifyRoles, item.role]);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Notification Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'email', label: 'Email' },
                  { id: 'in_app', label: 'In-App Alerts' },
                  { id: 'sms', label: 'SMS' },
                ].map((item) => {
                  const selected = channels.includes(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        if (selected) setChannels(channels.filter((c) => c !== item.id));
                        else setChannels([...channels, item.id]);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-emerald-50 dark:bg-emerald-600/30 border-emerald-300 dark:border-emerald-500 text-emerald-700 dark:text-emerald-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Escalation Rules */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-300 uppercase tracking-wider">
              Escalation Matrix (Overdue Obligations)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Escalate After (Days)"
                  type="number"
                  min="1"
                  value={escalateAfterDays}
                  onChange={(e) => setEscalateAfterDays(parseInt(e.target.value) || 7)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Escalate To Role
                </label>
                <select
                  value={escalateToRole}
                  onChange={(e) => setEscalateToRole(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                >
                  <option value="admin">System Admin</option>
                  <option value="super_admin">Super Administrator</option>
                  <option value="compliance_officer">Compliance Head</option>
                  <option value="entity_admin">Entity Principal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoTaskCreation}
                  onChange={(e) => setAutoTaskCreation(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-500"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Auto-create high priority task upon breach
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Custom Escalation Message
              </label>
              <input
                type="text"
                value={escalationMessage}
                onChange={(e) => setEscalationMessage(e.target.value)}
                placeholder="Statutory breach alert: immediate resolution required"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Form Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate(`/compliance/rules/${id}`)}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          leftIcon={<Save size={16} />}
          isLoading={isSubmitting}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default ComplianceRuleEditPage;
