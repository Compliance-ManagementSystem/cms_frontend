import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  Edit2,
  Building2,
  FileText,
  Award,
  ClipboardCheck,
  CheckSquare,
  History,
  Mail,
  Phone,
  AlertCircle,
  ExternalLink,
  Plus,
  Eye,
  FileCheck2,
  ArrowUpRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { locationService, LocationDetailData } from '@/services/locationService';
import { ROUTES } from '@/constants/routes';

type TabType = 'overview' | 'compliance_licences' | 'documents_records' | 'tasks_audit';

export const LocationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

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

  const handleDocumentUploadClick = () => {
    toast.info('Document upload dialog: select a statutory document or lease agreement to upload.');
  };

  const handleAddLicenceClick = () => {
    toast.info('Add Licence dialog: enter statutory operating licence or clearance details.');
  };

  const handleViewFile = (url?: string, name?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.info(`Preview not available for ${name || 'this item'}. File stored securely.`);
    }
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

  const { location, complianceStats, complianceRecords, documents, licences, tasks, auditLogs } = data;

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview & Hierarchy', icon: <MapPin size={16} /> },
    {
      key: 'compliance_licences',
      label: 'Compliance & Licences',
      icon: <ClipboardCheck size={16} />,
      count: (complianceStats?.total || 0) + licences.length,
    },
    {
      key: 'documents_records',
      label: 'Documents & Records',
      icon: <FileText size={16} />,
      count: documents.length + (location.agreements?.length || 0),
    },
    {
      key: 'tasks_audit',
      label: 'Tasks & Audit Trail',
      icon: <History size={16} />,
      count: tasks.length,
    },
  ];

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
                {location.parentLocation && (
                  <Badge variant="default" size="sm">
                    Sub-unit of {location.parentLocation.name}
                  </Badge>
                )}
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

          {/* Quick Compliance Metrics */}
          <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
            <div className="text-center px-3">
              <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {complianceStats?.approved || 0}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Compliant</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="text-center px-3">
              <span className="block text-2xl font-bold text-amber-600 dark:text-amber-400">
                {complianceStats?.pending || 0}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="text-center px-3">
              <span className="block text-2xl font-bold text-rose-600 dark:text-rose-400">
                {complianceStats?.expired || 0}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Expired</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation — 4 Clean Tabs */}
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

      {/* ── Tab 1: Overview & Hierarchy ── */}
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
                    {location.openingDate ? new Date(location.openingDate).toLocaleDateString() : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Floor Area</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    {location.area ? `${location.area.toLocaleString()} ${location.areaUnit || 'sqft'}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Operating Hours</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">{location.operatingHours || 'Standard Business Hours'}</dd>
                </div>
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
            <Card padding="lg">
              <Card.Header
                title="Unit Communication & Contact"
                icon={<Mail size={18} className="text-emerald-600 dark:text-emerald-400" />}
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Primary Contact Person</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-200">{location.contactPerson || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unit Email</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    {location.contactEmail ? (
                      <a
                        href={`mailto:${location.contactEmail}`}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                      >
                        <Mail size={14} />
                        {location.contactEmail}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unit Contact Phone</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">
                    {location.contactPhone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400 dark:text-slate-500" />
                        {location.contactPhone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </Card>

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/locations/${location._id}/edit`)}
                    rightIcon={<Edit2 size={13} />}
                  >
                    {location.manager ? 'Change' : 'Assign'}
                  </Button>
                </div>

                {/* Parent Location / Campus Linkage (if sub-unit) */}
                {location.parentLocation && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                        Parent Site / Main Campus
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        {location.parentLocation.name}
                      </span>
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        {location.parentLocation.code}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/locations/${location.parentLocation?._id}`)}
                      rightIcon={<ArrowUpRight size={13} />}
                    >
                      Open Site
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Compliance Health Snapshot Widget */}
          <Card padding="lg" className="border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                  Compliance & Regulatory Snapshot
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Overview of current statutory obligations, valid licenses, and pending reviews.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('compliance_licences')}
                rightIcon={<ArrowUpRight size={14} />}
              >
                View Full Compliance Records
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block">Compliant</span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {complianceStats?.approved || 0}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block">Pending Review</span>
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {complianceStats?.pending || 0}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 block">Expired / Overdue</span>
                <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                  {complianceStats?.expired || 0}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 block">Active Licences</span>
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {licences.length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab 2: Compliance & Licences ── */}
      {activeTab === 'compliance_licences' && (
        <div className="space-y-6">
          {/* Compliance Stats Bar */}
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

          {/* Section A: Statutory Operating Licences */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Award size={18} className="text-emerald-600 dark:text-emerald-400" />
                  Statutory Operating Licences & Clearances
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Municipal trade licenses, Clinical Establishment Act permits, Fire NOC, and pollution clearances.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddLicenceClick}
                leftIcon={<Plus size={15} />}
              >
                Add Licence
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Licence Number & Name</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Issuing Authority</th>
                    <th className="px-4 py-3 text-left">Expiry Date</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {licences.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No statutory licences registered for this location yet.
                      </td>
                    </tr>
                  ) : (
                    licences.map((lic) => (
                      <tr key={lic._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200">{lic.licenceNumber}</td>
                        <td className="px-4 py-3">
                          <Badge variant="info" size="sm">
                            {lic.licenceType?.label || lic.licenceType?.code || 'Licence'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{lic.issuingAuthority || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString() : 'Permanent / N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={lic.status === 'active' ? 'success' : 'default'} size="sm" dot>
                            {lic.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewFile(lic.latestVersionUrl || (lic as any).fileUrl, lic.licenceNumber)}
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

          {/* Section B: Compliance Obligations */}
          <div className="space-y-3 pt-2">
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
                    <th className="px-4 py-3 text-left">Validity Period</th>
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
                          {rec.complianceRule?.category || 'General'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {rec.validFrom ? new Date(rec.validFrom).toLocaleDateString() : '—'}
                          {' to '}
                          {rec.validTo ? new Date(rec.validTo).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              rec.status === 'approved'
                                ? 'success'
                                : rec.status === 'pending'
                                ? 'pending'
                                : rec.status === 'expired'
                                ? 'expired'
                                : 'default'
                            }
                            size="sm"
                            dot
                          >
                            {rec.status.toUpperCase()}
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

      {/* ── Tab 3: Documents & Records ── */}
      {activeTab === 'documents_records' && (
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
              <Button
                variant="primary"
                size="sm"
                onClick={handleDocumentUploadClick}
                leftIcon={<Plus size={15} />}
              >
                Upload Document
              </Button>
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
                            onClick={() => handleViewFile(doc.latestVersionUrl || (doc as any).fileUrl, doc.title)}
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
          <div className="space-y-3 pt-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                Property Leases & Site Agreements
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tracked lease agreements, MOUs, lessor contacts, and critical renewal milestones.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Agreement # & Type</th>
                    <th className="px-4 py-3 text-left">Parties Involved</th>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-left">Renewal Date</th>
                    <th className="px-4 py-3 text-right">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(!location.agreements || location.agreements.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No property leases or site agreements recorded for this unit.
                      </td>
                    </tr>
                  ) : (
                    location.agreements.map((agr, idx) => (
                      <tr key={agr._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-200 block">
                            {agr.agreementNumber}
                          </span>
                          <span className="text-xs uppercase font-mono text-emerald-600 dark:text-emerald-400">
                            {agr.agreementType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                          {agr.parties && agr.parties.length > 0 ? agr.parties.join(', ') : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {agr.startDate ? new Date(agr.startDate).toLocaleDateString() : '—'}
                          {' to '}
                          {agr.endDate ? new Date(agr.endDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                          {agr.renewalDate ? new Date(agr.renewalDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400">
                          {agr.notes || '—'}
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

      {/* ── Tab 4: Tasks & Audit Trail ── */}
      {activeTab === 'tasks_audit' && (
        <div className="space-y-6">
          {/* Section A: Operational Tasks */}
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
                onClick={() => navigate(`${ROUTES.TASKS}?locationId=${location._id}`)}
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

          {/* Section B: Audit Trail History */}
          <div className="space-y-3 pt-2">
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
    </div>
  );
};

export default LocationDetailPage;
