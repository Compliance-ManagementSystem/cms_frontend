import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  Edit2,
  Building2,
  User,
  FileText,
  Award,
  ClipboardCheck,
  CheckSquare,
  History,
  Mail,
  Phone,
  AlertCircle,
  ExternalLink,
  Info,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { locationService, LocationDetailData } from '@/services/locationService';
import { ROUTES } from '@/constants/routes';

type TabType =
  | 'overview'
  | 'entity'
  | 'manager'
  | 'documents'
  | 'licences'
  | 'compliance'
  | 'tasks'
  | 'audit';

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
    { key: 'overview', label: 'Overview', icon: <MapPin size={16} /> },
    { key: 'entity', label: 'Parent Entity', icon: <Building2 size={16} /> },
    { key: 'manager', label: 'Unit Manager', icon: <User size={16} /> },
    { key: 'documents', label: 'Documents', icon: <FileText size={16} />, count: documents.length },
    { key: 'licences', label: 'Licences & Approvals', icon: <Award size={16} />, count: licences.length },
    {
      key: 'compliance',
      label: 'Compliance',
      icon: <ClipboardCheck size={16} />,
      count: complianceStats?.total || 0,
    },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} />, count: tasks.length },
    { key: 'audit', label: 'Audit Trail', icon: <History size={16} />, count: auditLogs.length },
  ];

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
            <span
              className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              onClick={() => navigate(`/entities/${location.entity?._id}`)}
            >
              {location.entity?.name || 'Entity'}
            </span>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-100 font-medium">{location.name}</span>
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
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-2xl shadow-sm dark:shadow-inner">
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
                  {location.status.toUpperCase()}
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
                <div className="flex items-center gap-1">
                  <Building2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span
                    className="text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer"
                    onClick={() => navigate(`/entities/${location.entity?._id}`)}
                  >
                    {location.entity?.name}
                  </span>
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

          {/* Quick Metrics */}
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-150 border-b-2 whitespace-nowrap',
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
                  activeTab === tab.key ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unit Details */}
            <Card padding="lg">
              <Card.Header
                title="Operational Unit Specifications"
                icon={<MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />}
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                      {location.locationType?.label || location.locationType?.code}
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

            {/* Address */}
            <Card padding="lg">
              <Card.Header
                title="Physical Site Address"
                icon={<MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />}
              />
              <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{location.address?.line1}</p>
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

            {/* Local Contacts */}
            <Card padding="lg">
              <Card.Header
                title="Unit Communication"
                icon={<Mail size={18} className="text-emerald-600 dark:text-emerald-400" />}
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact Person</dt>
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
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone</dt>
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

            {/* Quick Relationship Summary */}
            <Card padding="lg">
              <Card.Header
                title="Organizational Hierarchy"
                icon={<Building2 size={18} className="text-emerald-600 dark:text-emerald-400" />}
              />
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Parent Entity</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{location.entity?.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/entities/${location.entity?._id}`)}
                    rightIcon={<ExternalLink size={14} />}
                  >
                    View
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Designated Unit Manager</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      {location.manager
                        ? `${location.manager.firstName} ${location.manager.lastName}`
                        : 'Unassigned'}
                    </span>
                  </div>
                  {location.manager && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('manager')}>
                      Details
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Entity */}
      {activeTab === 'entity' && (
        <Card padding="lg">
          <Card.Header
            title="Parent Business Entity"
            description="The legal corporate entity governing this operating unit"
            icon={<Building2 size={20} className="text-indigo-600 dark:text-indigo-400" />}
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/entities/${location.entity?._id}`)}
                rightIcon={<ExternalLink size={14} />}
              >
                Go to Entity Details
              </Button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                  Entity Legal Name
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{location.entity?.name}</span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                  Entity Code
                </span>
                <span className="text-sm font-mono text-indigo-600 dark:text-indigo-300 font-semibold">
                  {location.entity?.entityCode || location.entity?.code}
                </span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">
                  Status
                </span>
                <Badge variant={location.entity?.status === 'active' ? 'success' : 'default'} size="sm" dot>
                  {(location.entity?.status || 'active').toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                  Corporate Correspondence Email
                </span>
                <span className="text-sm text-slate-800 dark:text-slate-300">
                  {location.entity?.contactEmail || 'Not specified'}
                </span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                  Official Phone
                </span>
                <span className="text-sm text-slate-800 dark:text-slate-300">
                  {location.entity?.contactPhone || 'Not specified'}
                </span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                  HQ City & State
                </span>
                <span className="text-sm text-slate-800 dark:text-slate-300">
                  {location.entity?.address?.city || '—'}, {location.entity?.address?.state || ''}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Manager */}
      {activeTab === 'manager' && (
        <Card padding="lg">
          <Card.Header
            title="Designated Unit / Location Manager"
            description="Operational supervisor responsible for site compliance execution"
            icon={<User size={20} className="text-emerald-600 dark:text-emerald-400" />}
          />

          {location.manager ? (
            <div className="flex flex-col sm:flex-row items-start gap-5 pt-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xl shadow-sm dark:shadow-none">
                {location.manager.firstName.charAt(0)}
                {location.manager.lastName.charAt(0)}
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {location.manager.firstName} {location.manager.lastName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {location.manager.role?.name || 'Unit Manager'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-slate-400 dark:text-slate-500" />
                    <a
                      href={`mailto:${location.manager.email}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {location.manager.email}
                    </a>
                  </div>
                  {location.manager.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={15} className="text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-700 dark:text-slate-300">{location.manager.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500">
                <User size={24} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">No unit manager has been assigned to this location yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/locations/${location._id}/edit`)}
              >
                Assign Manager
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Documents Placeholder */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3 shadow-sm dark:shadow-none">
            <Info size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-200 block mb-0.5">Site Documents Repository</span>
              Property lease agreements, municipal sanctions, NOCs, and KYC verification records for this unit.
              Full document lifecycle management and versioning will be integrated in Phase 7.
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Document Title</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Validity</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      No documents currently archived for this location.
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
                        {doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={doc.status === 'active' ? 'success' : 'default'} size="sm">
                          {doc.status.toUpperCase()}
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

      {/* Tab 5: Licences Placeholder */}
      {activeTab === 'licences' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-slate-800/40 border border-amber-200 dark:border-slate-700/60 flex items-start gap-3 shadow-sm dark:shadow-none">
            <Info size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-200 block mb-0.5">Statutory Licences & Approvals</span>
              Mandatory government operating licences (e.g. Clinical Establishment Act, Trade Licence, Fire NOC, Pharmacy licence).
            </div>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {licences.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      No statutory licences registered for this location.
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
                        {lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={lic.status === 'active' ? 'success' : 'default'} size="sm">
                          {lic.status.toUpperCase()}
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

      {/* Tab 6: Compliance Placeholder */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
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

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Record # & Rule</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Validity Period</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {complianceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
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
                        <div className="font-semibold text-slate-900 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 7: Tasks Placeholder */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
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
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
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
      )}

      {/* Tab 8: Audit Trail */}
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
      )}
    </div>
  );
};

export default LocationDetailPage;
