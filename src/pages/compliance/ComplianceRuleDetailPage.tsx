import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Scale,
  ArrowLeft,
  Edit2,
  Trash2,
  Building2,
  MapPin,
  Clock,
  FileText,
  Bell,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { complianceRuleService, ComplianceRuleItem, RuleEvaluationResult } from '@/services/complianceRuleService';
import { entityService, EntityItem } from '@/services/entityService';
import { locationService, LocationItem } from '@/services/locationService';
import { ROUTES } from '@/constants/routes';

export const ComplianceRuleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [rule, setRule] = useState<ComplianceRuleItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'notifications' | 'simulator'>('overview');

  // Status toggle & Delete
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Simulator State
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<RuleEvaluationResult | null>(null);

  // Fetch Rule Details
  const fetchRule = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await complianceRuleService.getRuleById(id);
      setRule(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load compliance rule');
      navigate(ROUTES.COMPLIANCE_RULES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRule();
  }, [id]);

  // Load simulator entities & locations
  useEffect(() => {
    Promise.all([
      entityService.getEntities({ limit: 100 }).catch(() => ({ entities: [] })),
      locationService.getLocations({ limit: 100 }).catch(() => ({ locations: [] })),
    ]).then(([entRes, locRes]) => {
      setEntities(entRes.entities || []);
      setLocations(locRes.locations || []);
      if (entRes.entities?.length > 0) {
        setSelectedEntityId(entRes.entities[0]._id);
      }
    });
  }, []);

  // Filter locations based on selected entity for simulator
  const filteredLocations = selectedEntityId
    ? locations.filter((loc) => {
        const entId = typeof loc.entity === 'string' ? loc.entity : loc.entity?._id;
        return entId === selectedEntityId;
      })
    : locations;

  // Toggle active/inactive
  const handleToggleStatus = async () => {
    if (!rule) return;
    setIsTogglingStatus(true);
    try {
      const res = await complianceRuleService.toggleRuleStatus(rule._id);
      toast.success(res.message || 'Rule status updated');
      setRule(res.data.rule);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle rule status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Delete
  const confirmDelete = async () => {
    if (!rule) return;
    setIsDeleting(true);
    try {
      await complianceRuleService.deleteRule(rule._id);
      toast.success('Rule deleted successfully');
      navigate(ROUTES.COMPLIANCE_RULES);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete rule');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Run Applicability Evaluation Simulation
  const handleRunEvaluation = async () => {
    if (!rule) return;
    if (!selectedEntityId && !selectedLocationId) {
      toast.error('Please select an entity or location to test applicability');
      return;
    }

    setIsEvaluating(true);
    try {
      const result = await complianceRuleService.evaluateApplicability({
        ruleId: rule._id,
        entityId: selectedEntityId || undefined,
        locationId: selectedLocationId || undefined,
      });

      // Backend returns either an array of rules or a single rule result
      const evalData: RuleEvaluationResult = Array.isArray(result) ? result[0] : result;
      setEvaluationResult(evalData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to evaluate rule applicability');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading || !rule) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading rule details...</p>
        </div>
      </div>
    );
  }

  const isActive = rule.active && rule.status !== 'inactive';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.COMPLIANCE_RULES)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{rule.name}</h1>
              {rule.mandatory ? (
                <Badge variant="danger" size="sm">
                  Mandatory
                </Badge>
              ) : (
                <Badge variant="default" size="sm">
                  Optional
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{rule.code}</span>
              <span>•</span>
              <span className="text-slate-600 dark:text-slate-300">Category: {rule.category?.label || rule.category?.code}</span>
              {rule.legalReference && (
                <>
                  <span>•</span>
                  <span className="text-slate-500 dark:text-slate-400">Ref: {rule.legalReference}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleToggleStatus}
            isLoading={isTogglingStatus}
            leftIcon={isActive ? <ToggleRight className="text-emerald-500" size={16} /> : <ToggleLeft size={16} />}
          >
            {isActive ? 'Deactivate Rule' : 'Activate Rule'}
          </Button>
          <Button
            variant="outline"
            leftIcon={<Edit2 size={15} />}
            onClick={() => navigate(`/compliance/rules/${rule._id}/edit`)}
          >
            Edit Rule
          </Button>
          <Button
            variant="danger"
            leftIcon={<Trash2 size={15} />}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Scale size={16} />
          Overview & Scope Matrix
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText size={16} />
          Required Documents ({rule.requiredDocuments?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Bell size={16} />
          Notifications & Escalation
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Play size={16} className="text-emerald-500" />
          Applicability Simulator
        </button>
      </div>

      {/* Tab 1: Overview & Scope Matrix */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <div className="text-xs text-slate-500 dark:text-slate-400">Statutory Category</div>
              <div className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                {rule.category?.label || rule.category?.code}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Master Data Code: {rule.category?.code}</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <div className="text-xs text-slate-500 dark:text-slate-400">Frequency & Cycle</div>
              <div className="text-base font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                <Clock size={16} />
                {rule.frequency?.label || rule.frequency?.code}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Renewal Cycle: {rule.renewalCycle || 365} days</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <div className="text-xs text-slate-500 dark:text-slate-400">Priority Level</div>
              <div className="mt-1">
                <Badge
                  variant={
                    rule.priority === 'critical'
                      ? 'danger'
                      : rule.priority === 'high'
                      ? 'warning'
                      : 'info'
                  }
                  size="md"
                >
                  {rule.priority.toUpperCase()}
                </Badge>
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Enforcement Weight</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <div className="text-xs text-slate-500 dark:text-slate-400">Rule Engine Status</div>
              <div className="mt-1 flex items-center gap-2">
                {isActive ? (
                  <Badge variant="success" size="md">
                    ACTIVE & ENFORCED
                  </Badge>
                ) : (
                  <Badge variant="default" size="md">
                    INACTIVE / DRAFT
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Evaluated by Engine: {isActive ? 'Yes' : 'No'}</div>
            </Card>
          </div>

          {/* Statutory Description */}
          <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Statutory Description & Guidelines</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {rule.description || 'No statutory description provided for this rule.'}
            </p>
            {rule.legalReference && (
              <div className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                <strong>Legal Reference:</strong> <span className="text-indigo-600 dark:text-indigo-300">{rule.legalReference}</span>
              </div>
            )}
          </Card>

          {/* Applicability Matrix */}
          <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Building2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Applicability Scope Matrix</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target criteria configured for this statutory rule
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Entity Types */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                    Target Entity Types
                  </span>
                  <span className="text-xs text-slate-500">
                    {rule.applicableEntityTypes?.length === 0 ? 'All' : rule.applicableEntityTypes?.length}
                  </span>
                </div>
                {rule.applicableEntityTypes?.length === 0 ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                    ✓ Pan-Entity (Applies to all legal entity structures)
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {rule.applicableEntityTypes.map((et: any) => (
                      <Badge key={et._id || et.code} variant="info" size="sm">
                        {et.label || et.code}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Types */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
                    Target Location Types
                  </span>
                  <span className="text-xs text-slate-500">
                    {rule.applicableLocationTypes?.length === 0 ? 'All' : rule.applicableLocationTypes?.length}
                  </span>
                </div>
                {rule.applicableLocationTypes?.length === 0 ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                    ✓ Pan-Facility (Applies to all operating locations)
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {rule.applicableLocationTypes.map((lt: any) => (
                      <Badge key={lt._id || lt.code} variant="success" size="sm">
                        {lt.label || lt.code}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* States */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} className="text-amber-600 dark:text-amber-400" />
                    Target States / UTs
                  </span>
                  <span className="text-xs text-slate-500">
                    {rule.applicableStates?.length === 0 ? 'Pan-India' : rule.applicableStates?.length}
                  </span>
                </div>
                {rule.applicableStates?.length === 0 ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                    ✓ Pan-India (Enforced in all 28 states & 8 UTs)
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {rule.applicableStates.map((st: string) => (
                      <Badge key={st} variant="warning" size="sm">
                        {st}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Required Documents */}
      {activeTab === 'documents' && (
        <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Statutory Required Documents</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Documents and certificates mandatory for verifying compliance
              </p>
            </div>
            <Badge variant="info" size="md">
              {rule.requiredDocuments?.length || 0} Configured
            </Badge>
          </div>

          {!rule.requiredDocuments || rule.requiredDocuments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              No statutory documents required for this rule.
            </div>
          ) : (
            <div className="space-y-3">
              {rule.requiredDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg shadow-sm dark:shadow-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{doc.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Type: {doc.documentType?.label || doc.documentType?.code || 'Document'}
                      </div>
                    </div>
                  </div>

                  <div>
                    {doc.isMandatory ? (
                      <Badge variant="danger" size="sm">
                        Mandatory Evidence
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        Optional
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Notifications & Escalation */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Renewal Reminder Milestones</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Alert Cadence Prior to Expiration</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(rule.notificationRules?.reminderDays || [30, 15, 7]).map((day) => (
                    <Badge key={day} variant="info" size="md">
                      {day} Days Before
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Notified Roles</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(rule.notificationRules?.notifyRoles || ['compliance_officer', 'location_manager']).map((r) => (
                    <Badge key={r} variant="default" size="sm">
                      {r.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Enabled Channels</label>
                <div className="flex gap-2 mt-2">
                  {(rule.notificationRules?.channels || ['email', 'in_app']).map((c) => (
                    <Badge key={c} variant="success" size="sm">
                      {c.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Escalation Policy (Breaches)</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-600 dark:text-slate-300">Escalate After Overdue</span>
                <span className="font-semibold text-rose-600 dark:text-rose-300">
                  {rule.escalationRules?.escalateAfterDays || 7} Days
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-600 dark:text-slate-300">Escalate To Authority</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 uppercase">
                  {rule.escalationRules?.escalateToRole || 'admin'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-600 dark:text-slate-300">Auto Task Creation</span>
                <Badge
                  variant={rule.escalationRules?.autoTaskCreation ? 'danger' : 'default'}
                  size="sm"
                >
                  {rule.escalationRules?.autoTaskCreation ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>

              {rule.escalationRules?.escalationMessage && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Custom Escalation Notice:</span>
                  <span className="text-slate-700 dark:text-slate-200 italic">
                    "{rule.escalationRules.escalationMessage}"
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: Interactive Rule Applicability Simulator */}
      {activeTab === 'simulator' && (
        <Card className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Play size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Rule Applicability Simulator</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Evaluate live whether this rule is applicable to a specific corporate entity or operational location.
              </p>
            </div>
            <Button
              variant="primary"
              leftIcon={<Play size={15} />}
              onClick={handleRunEvaluation}
              isLoading={isEvaluating}
            >
              Test Applicability
            </Button>
          </div>

          {/* Test Target Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                Select Corporate Entity *
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => {
                  setSelectedEntityId(e.target.value);
                  setSelectedLocationId('');
                  setEvaluationResult(null);
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              >
                <option value="">-- Choose Entity --</option>
                {entities.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({e.entityType?.label || e.entityType?.code || 'Entity'}) - {e.address?.state || 'No State'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
                Select Operational Location (Optional)
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setEvaluationResult(null);
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              >
                <option value="">-- Evaluate At Entity Level Only --</option>
                {filteredLocations.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name} ({l.locationType?.label || l.locationType?.code}) - {l.address?.state || 'No State'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Evaluation Results Box */}
          {evaluationResult && (
            <div className="space-y-4 pt-2">
              <div
                className={`p-4 rounded-xl border flex items-start gap-4 ${
                  evaluationResult.isApplicable
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-600/40 text-rose-800 dark:text-rose-200'
                }`}
              >
                <div className="mt-0.5">
                  {evaluationResult.isApplicable ? (
                    <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle size={24} className="text-rose-600 dark:text-rose-400" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold">
                      {evaluationResult.isApplicable
                        ? 'RULE IS APPLICABLE'
                        : 'RULE IS NOT APPLICABLE'}
                    </h4>
                    <Badge
                      variant={evaluationResult.isApplicable ? 'success' : 'danger'}
                      size="sm"
                    >
                      {evaluationResult.isApplicable ? 'Mandatory Trigger' : 'Scope Mismatch'}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Evaluated rule <strong>{rule.name}</strong> ({rule.code}) against the specified target.
                  </p>
                </div>
              </div>

              {/* Match Criteria Diagnostics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Rule Active</div>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                    {evaluationResult.matches.statusMatch ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Active
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <XCircle size={13} /> Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Entity Type Match</div>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                    {evaluationResult.matches.entityTypeMatch ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Matched
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <XCircle size={13} /> Excluded
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Location Type Match</div>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                    {evaluationResult.matches.locationTypeMatch ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Matched
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <XCircle size={13} /> Excluded
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Geographic State Match</div>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                    {evaluationResult.matches.stateMatch ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Matched
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <XCircle size={13} /> Excluded
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Reasons list */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/40 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Rule Evaluation Reasons:
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {evaluationResult.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Compliance Rule"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              isLoading={isDeleting}
            >
              Delete Rule
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-lg flex items-start gap-3">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Confirm Deletion</p>
              <p className="mt-1 text-xs text-rose-300/80">
                Are you sure you want to permanently delete rule <strong>"{rule.name}"</strong>?
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ComplianceRuleDetailPage;
