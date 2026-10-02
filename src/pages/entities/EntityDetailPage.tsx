import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Edit2,
  MapPin,
  ClipboardCheck,
  FileText,
  CheckSquare,
  History,
  Mail,
  Phone,
  User,
  AlertCircle,
  Info,
  ExternalLink,
  Plus,
  Upload,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { entityService, EntityDetailData } from '@/services/entityService';
import { ROUTES } from '@/constants/routes';
import { openDocumentInNewTab } from '@/utils/documentFile';
import { useAuth } from '@/hooks/useAuth';
import DocumentUploadModal from '@/components/documents/DocumentUploadModal';

type TabType = 'overview' | 'locations' | 'compliance' | 'documents' | 'tasks' | 'audit';

export const EntityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canUpdate = can('entity', 'update');
  const canUploadDocument = can('document', 'upload');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<EntityDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntityDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const details = await entityService.getEntityById(id);
      setData(details);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch entity details');
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchEntityDetails();
  }, [fetchEntityDetails]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading entity details...</p>
      </div>
    );
  }

  if (!data || !data.entity) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Entity Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The requested business entity could not be retrieved or you do not have permission to view it.
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.ENTITIES)}>
          Back to Entities
        </Button>
      </div>
    );
  }

  const { entity, health, locations, complianceStats, complianceRecords, documents, tasks, auditLogs } = data;

  // Full class names so Tailwind can see them
  const scoreStyle =
    health.percentage >= 80
      ? { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
      : health.percentage >= 60
      ? { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
      : { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <Building2 size={16} /> },
    { key: 'locations', label: 'Locations', icon: <MapPin size={16} />, count: locations.length },
    {
      key: 'compliance',
      label: 'Compliance Summary',
      icon: <ClipboardCheck size={16} />,
      count: complianceStats?.total || 0,
    },
    { key: 'documents', label: 'Documents', icon: <FileText size={16} />, count: documents.length },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} />, count: tasks.length },
    { key: 'audit', label: 'Audit History', icon: <History size={16} />, count: auditLogs.length },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.ENTITIES)}
            leftIcon={<ArrowLeft size={16} />}
          >
            Entities
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="text-slate-900 dark:text-slate-100 font-medium">{entity.name}</span>
          </div>
        </div>

        {canUpdate && (
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/entities/${entity._id}/edit`)}
              leftIcon={<Edit2 size={15} />}
            >
              Edit Entity
            </Button>
          </div>
        )}
      </div>

      {/* Entity Profile Banner */}
      <Card padding="lg" className="border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 shadow-sm dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl shadow-sm dark:shadow-inner">
              {entity.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{entity.name}</h1>
                <Badge
                  variant={
                    entity.status === 'active'
                      ? 'success'
                      : entity.status === 'inactive'
                      ? 'warning'
                      : 'default'
                  }
                  size="sm"
                  dot
                >
                  {entity.status.charAt(0).toUpperCase() + entity.status.slice(1)}
                </Badge>
                <Badge variant="info" size="sm">
                  {entity.entityType?.label || entity.entityType?.code || 'Entity'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold" title="Entity code">
                  {entity.entityCode || entity.code}
                </span>
                {entity.industry && <span className="text-slate-700 dark:text-slate-300">{entity.industry.label}</span>}
                {entity.parentEntity && (
                  <span
                    className="text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer font-medium"
                    onClick={() => navigate(`/entities/${entity.parentEntity?._id}`)}
                  >
                    Part of {entity.parentEntity.name}
                  </span>
                )}
                {entity.address?.city && (
                  <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <MapPin size={13} className="text-slate-400 dark:text-slate-500" />
                    <span>
                      {entity.address.city}, {entity.address.state}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compliance health — same definition as the dashboard */}
          <button
            type="button"
            onClick={() => setActiveTab('compliance')}
            className="text-left border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 min-w-[220px] rounded-r-lg hover:opacity-90"
            title="View compliance records"
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Compliance
            </span>
            {health.total === 0 ? (
              <span className="block text-sm text-slate-500 dark:text-slate-400 mt-1">No compliance records yet</span>
            ) : (
              <>
                <span className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-3xl font-bold ${scoreStyle.text}`}>{health.percentage}%</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {health.compliant + health.expiringSoon} of {health.total} valid
                  </span>
                </span>
                <span className="block w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <span className={`block h-full rounded-full ${scoreStyle.bar}`} style={{ width: `${health.percentage}%` }} />
                </span>
                <span className="block text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                  {[
                    [health.expiringSoon, 'expiring soon'],
                    [health.pending, 'pending'],
                    [health.expired, 'expired'],
                  ]
                    .filter(([count]) => (count as number) > 0)
                    .map(([count, label]) => `${count} ${label}`)
                    .join(' · ') || 'All records valid'}
                </span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* 6 Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-150 border-b-2 whitespace-nowrap',
              activeTab === tab.key
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-t-lg font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700',
            ].join(' ')}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-full ${
                  activeTab === tab.key
                    ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business & Corporate Profile */}
            <Card padding="lg">
              <Card.Header
                title="Business Entity Details"
                icon={<Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />}
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Legal Name</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-200">{entity.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Entity Code</dt>
                  <dd className="mt-1 font-mono text-indigo-600 dark:text-indigo-300 font-semibold">
                    {entity.entityCode || entity.code}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Classification</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    <Badge variant="info" size="sm">
                      {entity.entityType?.label || entity.entityType?.code}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned Owner</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    {entity.owner ? (
                      <span className="flex items-center gap-1.5 font-medium">
                        <User size={14} className="text-slate-400 dark:text-slate-500" />
                        {entity.owner.firstName} {entity.owner.lastName} ({entity.owner.email})
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic">None assigned</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Industry</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    {entity.industry ? (
                      <Badge variant="default" size="sm">
                        {entity.industry.label || entity.industry.code}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic">General / Unspecified</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Parent Entity</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    {entity.parentEntity ? (
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {entity.parentEntity.name} ({entity.parentEntity.code})
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">Top-Level Entity (Independent)</span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Corporate Scope / Description
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                    {entity.description || 'No corporate description provided.'}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Statutory Registrations */}
            <Card padding="lg">
              <Card.Header
                title="Statutory & Tax Identifiers"
                icon={<FileText size={18} className="text-indigo-600 dark:text-indigo-400" />}
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">GSTIN</dt>
                  <dd className="mt-1 font-mono text-slate-900 dark:text-slate-200">{entity.gstin || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">PAN</dt>
                  <dd className="mt-1 font-mono text-slate-900 dark:text-slate-200">{entity.pan || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">CIN</dt>
                  <dd className="mt-1 font-mono text-slate-900 dark:text-slate-200">{entity.cin || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registration No.</dt>
                  <dd className="mt-1 font-mono text-slate-900 dark:text-slate-200">{entity.registrationNumber || '—'}</dd>
                </div>
              </dl>
            </Card>

            {/* Contact Information */}
            <Card padding="lg">
              <Card.Header
                title="Primary Contact Information"
                icon={<Mail size={18} className="text-indigo-600 dark:text-indigo-400" />}
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact Person</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-200">{entity.contactPerson || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    <a
                      href={`mailto:${entity.contactEmail}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                    >
                      <Mail size={14} />
                      {entity.contactEmail}
                    </a>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone Number</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <Phone size={14} className="text-slate-400 dark:text-slate-500" />
                    {entity.contactPhone}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Registered Address */}
            <Card padding="lg">
              <Card.Header
                title="Registered Office Address"
                icon={<MapPin size={18} className="text-indigo-600 dark:text-indigo-400" />}
              />
              <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{entity.address?.line1}</p>
                {entity.address?.line2 && <p>{entity.address.line2}</p>}
                <p>
                  {entity.address?.city}
                  {entity.address?.district ? `, ${entity.address.district}` : ''}
                </p>
                <p>
                  {entity.address?.state} {entity.address?.pincode ? `- ${entity.address.pincode}` : ''}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-1">
                  {entity.address?.country || 'India'}
                </p>
              </div>
            </Card>
          </div>

          {/* Compliance Health Snapshot in Overview */}
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                  Compliance Health Overview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Where this entity's compliance records stand today.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('compliance')}
                className="text-indigo-600 dark:text-indigo-400"
              >
                View Full Compliance Tab →
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Records</span>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{health.total}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-center">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-medium">Valid</span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{health.compliant}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-center">
                <span className="text-xs text-amber-700 dark:text-amber-400 block font-medium">Expiring Soon</span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-400">{health.expiringSoon}</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-center">
                <span className="text-xs text-blue-700 dark:text-blue-400 block font-medium">Pending</span>
                <span className="text-xl font-bold text-blue-700 dark:text-blue-400">{health.pending}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-center">
                <span className="text-xs text-rose-700 dark:text-rose-400 block font-medium">Expired</span>
                <span className="text-xl font-bold text-rose-700 dark:text-rose-400">{health.expired}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: LOCATIONS */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm dark:shadow-none">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900 dark:text-indigo-200">
                <span className="font-semibold block mb-0.5">Associated Locations & Units</span>
                Physical operational units, clinics, and offices belonging to <strong>{entity.name}</strong>.
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/locations/create?entityId=${entity._id}`)}
              leftIcon={<Plus size={15} />}
              className="flex-shrink-0"
            >
              Add Location
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Location Name & Code</th>
                  <th className="px-4 py-3 text-left">Location Type</th>
                  <th className="px-4 py-3 text-left">City & State</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      No locations currently affiliated with this entity. Click "Add Location" to register one.
                    </td>
                  </tr>
                ) : (
                  locations.map((loc: any) => (
                    <tr
                      key={loc._id}
                      onClick={() => navigate(`/locations/${loc._id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                          {loc.name}
                        </div>
                        <div className="text-xs font-mono text-emerald-600 dark:text-emerald-300">
                          {loc.locationCode || loc.code}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info" size="sm">
                          {loc.locationType?.label || loc.locationType?.code || 'Location'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <div>{loc.address?.city || '—'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{loc.address?.state || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={loc.status === 'active' ? 'success' : 'default'}
                          size="sm"
                          dot
                        >
                          {loc.status.charAt(0).toUpperCase() + loc.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/locations/${loc._id}`);
                          }}
                          className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                        >
                          View Unit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: COMPLIANCE SUMMARY */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Status Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card padding="sm" className="text-center shadow-sm dark:shadow-none">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Obligations</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{complianceStats?.total || 0}</p>
            </Card>
            <Card padding="sm" className="text-center bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30 shadow-sm dark:shadow-none">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Compliant / Approved</span>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{complianceStats?.approved || 0}</p>
            </Card>
            <Card padding="sm" className="text-center bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30 shadow-sm dark:shadow-none">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Pending Review</span>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{complianceStats?.pending || 0}</p>
            </Card>
            <Card padding="sm" className="text-center bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30 shadow-sm dark:shadow-none">
              <span className="text-xs text-red-700 dark:text-red-400 font-medium">Expired / Overdue</span>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">{complianceStats?.expired || 0}</p>
            </Card>
            <Card padding="sm" className="text-center bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/30 shadow-sm dark:shadow-none">
              <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">Rejected</span>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">{complianceStats?.rejected || 0}</p>
            </Card>
          </div>

          {/* Compliance Records Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Record # & Rule</th>
                  <th className="px-4 py-3 text-left">Unit / Location</th>
                  <th className="px-4 py-3 text-left">Validity Period</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {complianceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      No compliance records registered for this entity.
                    </td>
                  </tr>
                ) : (
                  complianceRecords.map((rec) => (
                    <tr
                      key={rec._id}
                      onClick={() => navigate(`/compliance/records/${rec._id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-200">
                          {rec.complianceRule?.name || 'Compliance Obligation'}
                        </div>
                        <div className="text-xs font-mono text-indigo-600 dark:text-indigo-300">
                          {rec.recordNumber || rec.complianceRule?.code}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {rec.location?.name || 'Entity-wide'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        <div>Due {rec.dueDate ? new Date(rec.dueDate).toLocaleDateString() : '—'}</div>
                        {rec.expiryDate && <div>Expires {new Date(rec.expiryDate).toLocaleDateString()}</div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            rec.status === 'approved'
                              ? 'success'
                              : rec.status === 'expired' || rec.status === 'rejected'
                              ? 'expired'
                              : rec.status === 'not_applicable'
                              ? 'default'
                              : 'pending'
                          }
                          size="sm"
                          dot
                        >
                          {rec.status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: DOCUMENTS */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 shadow-sm dark:shadow-none">
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900 dark:text-indigo-200">
                <span className="font-semibold block mb-0.5">Statutory & Compliance Documents ({documents.length})</span>
                Official documents, registration certificates, and licenses archived for <strong>{entity.name}</strong>.
              </div>
            </div>
            {canUploadDocument && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                leftIcon={<Upload size={14} />}
                className="flex-shrink-0"
              >
                Upload Document
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Document Title</th>
                  <th className="px-4 py-3 text-left">Category / Type</th>
                  <th className="px-4 py-3 text-left">Validity</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      No documents stored for this entity yet.
                      {canUploadDocument && ' Use "Upload Document" to add one.'}
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                          <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />
                          <span>{doc.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default" size="sm">
                          {doc.documentType?.label || doc.documentType?.code || 'Document'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {doc.expiryDate
                          ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`
                          : 'No expiry date recorded'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={doc.status === 'active' ? 'success' : 'default'}
                          size="sm"
                          dot
                        >
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {can('document', 'read') ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDocumentInNewTab(doc._id).catch((err) =>
                                toast.error(err.message || 'Failed to open document')
                              );
                            }}
                          >
                            <ExternalLink size={13} />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 5: TASKS */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 shadow-sm dark:shadow-none">
            <div className="flex items-start gap-3">
              <CheckSquare size={20} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900 dark:text-indigo-200">
                <span className="font-semibold block mb-0.5">Operational Tasks ({tasks.length})</span>
                Assigned action items and review requirements for <strong>{entity.name}</strong>.
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`${ROUTES.TASKS}?entity=${entity._id}`)}
              leftIcon={<Plus size={15} />}
              className="flex-shrink-0"
            >
              Create Task
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Task Title</th>
                  <th className="px-4 py-3 text-left">Unit / Location</th>
                  <th className="px-4 py-3 text-left">Assignee</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      No operational tasks currently queued for this entity. Click "Create Task" to assign one.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200">{task.title}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{task.location?.name || 'Entity-wide'}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                        {task.assignedTo
                          ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                          : 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            task.priority === 'urgent'
                              ? 'danger'
                              : task.priority === 'high'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {task.priority.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={task.status === 'completed' ? 'success' : 'pending'}
                          size="sm"
                          dot
                        >
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 6: AUDIT HISTORY */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      No audit history entries recorded for this entity.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info" size="sm">
                          {log.action.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                        <div className="font-medium text-slate-900 dark:text-slate-200">{log.actorEmail || 'System'}</div>
                        {log.actorRole && (
                          <div className="text-slate-500 text-[11px]">{log.actorRole}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">{log.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DocumentUploadModal
        title="Upload Entity Document"
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={fetchEntityDetails}
        entityId={entity._id}
      />
    </div>
  );
};

export default EntityDetailPage;
