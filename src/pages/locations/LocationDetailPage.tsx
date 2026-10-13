import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  Edit2,
  Building2,
  FileText,
  ClipboardCheck,
  CheckSquare,
  History,
  AlertCircle,
  ExternalLink,
  Plus,
  Eye,
  FileCheck2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import {
  locationService,
  LocationDetailData,
  AREA_TYPE_LABELS,
  OPERATING_MODEL_LABELS,
} from '@/services/locationService';
import { ROUTES } from '@/constants/routes';
import { openDocumentInNewTab } from '@/utils/documentFile';
import DocumentUploadModal from '@/components/documents/DocumentUploadModal';

type TabType = 'overview' | 'compliance' | 'documents' | 'tasks' | 'history';

export const LocationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canUpdate = can('location', 'update');
  const canUploadDocument = can('document', 'upload');

  // Dialogs
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<LocationDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocationDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const details = await locationService.getLocationById(id);
      setData(details);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch location details');
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchLocationDetails();
  }, [fetchLocationDetails]);

  const handleViewDocument = (documentId: string) => {
    openDocumentInNewTab(documentId).catch((err) =>
      toast.error(err.message || 'Failed to open document')
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading location profile...</p>
      </div>
    );
  }

  if (!data || !data.location) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Location Not Found</h2>
        <p className="text-sm text-slate-400">
          The requested unit could not be retrieved or you do not have permission to view it.
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.LOCATIONS)}>
          Back to Locations
        </Button>
      </div>
    );
  }

  const { location, health, complianceStats, complianceRecords, documents, tasks, auditLogs } = data;

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <MapPin size={16} /> },
    { key: 'compliance', label: 'Compliance', icon: <ClipboardCheck size={16} />, count: complianceStats?.total || 0 },
    {
      key: 'documents',
      label: 'Documents',
      icon: <FileText size={16} />,
      count: documents.length,
    },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} />, count: tasks.length },
    { key: 'history', label: 'History', icon: <History size={16} /> },
  ];

  // Full class names so Tailwind can see them
  const scoreStyle =
    health.percentage >= 80
      ? { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
      : health.percentage >= 60
      ? { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
      : { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };

  const statusLabel = location.status
    ? location.status.charAt(0).toUpperCase() + location.status.slice(1)
    : 'Active';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.LOCATIONS)}
            leftIcon={<ArrowLeft size={16} />}
          >
            Locations
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            {location.entity?._id ? (
              <span
                className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium"
                onClick={() => navigate(`/entities/${location.entity?._id}`)}
              >
                {location.entity.name}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic">Unassigned Entity</span>
            )}
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{location.name}</span>
          </div>
        </div>

        {canUpdate && (
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/locations/${location._id}/edit`)}
              leftIcon={<Edit2 size={15} />}
            >
              Edit Location
            </Button>
          </div>
        )}
      </div>

      {/* Location Banner */}
      <Card
        padding="lg"
        className="border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-r from-slate-50 via-emerald-50/40 to-slate-50 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 shadow-sm dark:shadow-none"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-2xl shadow-sm dark:shadow-inner flex-shrink-0">
              <MapPin size={30} />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{location.name}</h1>
                <Badge
                  variant={
                    location.status === 'active'
                      ? 'success'
                      : location.status === 'inactive'
                      ? 'warning'
                      : 'default'
                  }
                  size="sm"
                  dot
                >
                  {statusLabel}
                </Badge>
                <Badge variant="info" size="sm">
                  {location.locationType?.label || location.locationType?.code || 'Location'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-slate-400 dark:text-slate-500">CODE:</span>
                  <span className="text-emerald-600 dark:text-emerald-300 font-semibold">{location.locationCode || location.code}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  {location.entity?._id ? (
                    <span
                      className="text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer font-medium"
                      onClick={() => navigate(`/entities/${location.entity?._id}`)}
                    >
                      {location.entity.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned Entity</span>
                  )}
                </div>
                {location.address?.city && (
                  <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <MapPin size={13} className="text-slate-400 dark:text-slate-500" />
                    <span>
                      {location.address.city}, {location.address.state}
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-150 border-b-2 whitespace-nowrap',
              activeTab === tab.key
                ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-t-lg'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700',
            ].join(' ')}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-full ${
                  activeTab === tab.key
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unit Specifications */}
            <Card padding="lg">
              <Card.Header
                title="Operational Unit Specifications"
                icon={<MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />}
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unit Name</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-200">{location.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Location Code</dt>
                  <dd className="mt-1 font-mono text-emerald-600 dark:text-emerald-300 font-semibold">
                    {location.locationCode || location.code}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Classification</dt>
                  <dd className="mt-1">
                    <Badge variant="info" size="sm">
                      {location.locationType?.label || location.locationType?.code || 'Location'}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Opening Date</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    {location.openingDate
                      ? new Date(location.openingDate).toLocaleDateString()
                      : location.isUpcoming
                        ? 'To be opened'
                        : '—'}
                  </dd>
                </div>
                {location.closingDate && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Closing Date</dt>
                    <dd className="mt-1 text-slate-900 dark:text-slate-200">
                      {new Date(location.closingDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Area Type</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    {location.areaType ? AREA_TYPE_LABELS[location.areaType] : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Operating Model</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    {location.operatingModel ? OPERATING_MODEL_LABELS[location.operatingModel] : '—'}
                  </dd>
                </div>
                {(location.coEntities || []).map((co) => (
                  <div key={co.entity?._id}>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Also Operated By</dt>
                    <dd className="mt-1 text-slate-900 dark:text-slate-200">
                      {co.entity?.name || '—'}
                      {co.openingDate ? ` (since ${new Date(co.openingDate).toLocaleDateString()})` : ''}
                    </dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                    {location.description || 'No specific description provided for this operational unit.'}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Site Address */}
            <Card padding="lg">
              <Card.Header
                title="Physical Site Address"
                icon={<MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />}
              />
              <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5 mt-3">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{location.address?.line1 || 'No street address specified'}</p>
                {location.address?.line2 && <p>{location.address.line2}</p>}
                <p>
                  {location.address?.city}
                  {location.address?.district ? `, ${location.address.district}` : ''}
                </p>
                <p>
                  {location.address?.state} {location.address?.pincode ? `- ${location.address.pincode}` : ''}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">
                  {location.address?.country || 'India'}
                </p>
              </div>
            </Card>

            {/* Unit Communication */}

            {/* Governance & Corporate Hierarchy */}
            <Card padding="lg">
              <Card.Header
                title="Governance & Corporate Hierarchy"
                icon={<Building2 size={18} className="text-emerald-600 dark:text-emerald-400" />}
              />
              <div className="space-y-3.5 mt-3 text-sm">
                {/* Parent Entity Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Parent Business Entity
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      {location.entity?.name || 'Unassigned'}
                    </span>
                    {location.entity?.entityCode && (
                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                        {location.entity.entityCode}
                      </span>
                    )}
                  </div>
                  {location.entity?._id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/entities/${location.entity?._id}`)}
                      rightIcon={<ExternalLink size={13} />}
                    >
                      View Entity
                    </Button>
                  )}
                </div>

                {/* Designated Unit Manager Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Designated Unit Manager
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      {location.manager
                        ? `${location.manager.firstName} ${location.manager.lastName}`
                        : 'Unassigned'}
                    </span>
                    {location.manager?.email && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        {location.manager.email}
                      </span>
                    )}
                  </div>
                  {canUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/locations/${location._id}/edit`)}
                      rightIcon={<Edit2 size={13} />}
                    >
                      {location.manager ? 'Change' : 'Assign'}
                    </Button>
                  )}
                </div>

                {/* Parent Location / Campus Linkage (if sub-unit) */}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Compliance ── */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                Compliance Obligations & Audit Records
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any obligation row below to inspect audit evidence, filing history, and checklists.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Record # & Rule</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Expiry</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {complianceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                        No compliance records registered for this location.
                      </td>
                    </tr>
                  ) : (
                    complianceRecords.map((rec) => (
                      <tr
                        key={rec._id}
                        onClick={() => navigate(`/compliance/records/${rec._id}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                            {rec.complianceRule?.name || 'Obligation'}
                          </div>
                          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-300">
                            {rec.recordNumber || rec.complianceRule?.code}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {rec.complianceRule?.category?.label || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {rec.expiryDate ? (
                            <div>Expires {new Date(rec.expiryDate).toLocaleDateString()}</div>
                          ) : (
                            <div>—</div>
                          )}
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
                            {rec.status === 'pending'
                              ? 'TO BE APPLIED'
                              : rec.status === 'in_progress'
                              ? 'APPLIED'
                              : rec.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/compliance/records/${rec._id}`)}
                            className="text-slate-500 hover:text-emerald-600 p-1.5"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Section A: Site Documents */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
                  Site Documents Repository
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Floor layouts, property records, NOCs, and municipal sanctions for this location.
                </p>
              </div>
              {canUploadDocument && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsUploadOpen(true)}
                  leftIcon={<Plus size={15} />}
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
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Validity</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                        No statutory documents currently uploaded for this location.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200">{doc.title}</td>
                        <td className="px-4 py-3">
                          <Badge variant="default" size="sm">
                            {doc.documentType?.label || doc.documentType?.code || 'Doc'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}` : 'Permanent / N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={doc.status === 'active' ? 'success' : 'default'} size="sm" dot>
                            {doc.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc._id)}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline p-1 text-xs"
                            leftIcon={<ExternalLink size={13} />}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Property Leases & Site Agreements */}
        </div>
      )}

      {/* ── Tasks ── */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckSquare size={18} className="text-emerald-600 dark:text-emerald-400" />
                  Operational Compliance Tasks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Scheduled inspections, renewal tasks, and remediation items assigned to unit personnel.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`${ROUTES.TASKS}?location=${location._id}`)}
                leftIcon={<Plus size={15} />}
              >
                Create Task
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Task Title</th>
                    <th className="px-4 py-3 text-left">Assignee</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                    <th className="px-4 py-3 text-center">Priority</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                        No operational tasks queued for this location.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200">{task.title}</td>
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
                            {task.status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History size={18} className="text-emerald-600 dark:text-emerald-400" />
                Audit Trail & Modification History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable ledger of edits, administrative actions, and status updates for this unit.
              </p>
            </div>

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
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No audit history entries recorded for this location.
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
        </div>
      )}

      <DocumentUploadModal
        title="Upload Location Document"
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={fetchLocationDetails}
        locationId={location._id}
        entityId={location.entity?._id || ''}
      />
    </div>
  );
};

export default LocationDetailPage;
