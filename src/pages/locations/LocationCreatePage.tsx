import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  Save,
  Mail,
  Phone,
  User,
  Briefcase,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { locationService, CreateLocationPayload, LocationItem } from '@/services/locationService';
import { entityService, EntityItem } from '@/services/entityService';
import { adminService, MasterDataItem, UserItem } from '@/services/adminService';
import { ROUTES } from '@/constants/routes';

export const LocationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedEntityId = searchParams.get('entityId');
  const toast = useToast();

  const [isLoadingPrereqs, setIsLoadingPrereqs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [districts, setDistricts] = useState<MasterDataItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [availableLocations, setAvailableLocations] = useState<LocationItem[]>([]);

  // Form State
  const [formData, setFormData] = useState<CreateLocationPayload>({
    name: '',
    code: '',
    locationCode: '',
    entity: preselectedEntityId || '',
    locationType: '',
    manager: null,
    parentLocation: null,
    openingDate: '',
    description: '',
    area: null,
    areaUnit: 'sqft',
    operatingHours: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    status: 'active',
    address: {
      line1: '',
      line2: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      country: 'India',
    },
  });

  // Load Prerequisites
  useEffect(() => {
    const loadPrerequisites = async () => {
      setIsLoadingPrereqs(true);
      try {
        const [entitiesRes, typesRes, statesRes, districtsRes, usersRes] = await Promise.all([
          entityService.getEntities({ limit: 100 }).catch(() => ({ entities: [] })),
          adminService.getMasterData({ category: 'location_type' }).catch(() => ({ items: [] })),
          adminService.getMasterData({ category: 'state' }).catch(() => ({ items: [] })),
          adminService.getMasterData({ category: 'district' }).catch(() => ({ items: [] })),
          adminService.getUsers({ limit: 100 }).catch(() => ({ users: [] })),
        ]);

        const activeEntities = (entitiesRes.entities || []).filter((e: EntityItem) => e.status === 'active');
        const activeTypes = (typesRes.items || []).filter((t: MasterDataItem) => t.status === 'active');

        setEntities(activeEntities);
        setLocationTypes(activeTypes);
        setStates((statesRes.items || []).filter((s: MasterDataItem) => s.status === 'active'));
        setDistricts((districtsRes.items || []).filter((d: MasterDataItem) => d.status === 'active'));
        setUsers(usersRes.users || []);

        setFormData((prev) => ({
          ...prev,
          entity: prev.entity || (activeEntities[0]?._id ?? ''),
          locationType: prev.locationType || (activeTypes[0]?.code ?? ''),
        }));
      } catch (err) {
        console.error('Failed to load location creation prerequisites', err);
      } finally {
        setIsLoadingPrereqs(false);
      }
    };

    loadPrerequisites();
  }, []);

  // Fetch available parent locations whenever selected entity changes
  useEffect(() => {
    if (!formData.entity) {
      setAvailableLocations([]);
      return;
    }
    locationService
      .getLocations({ entity: formData.entity, limit: 100 })
      .then((res) => setAvailableLocations(res.locations || []))
      .catch(() => setAvailableLocations([]));
  }, [formData.entity]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Location name is required');
      return;
    }
    if (!formData.entity) {
      toast.error('Please assign this location to a Parent Entity');
      return;
    }
    if (!formData.locationType) {
      toast.error('Please select a Location Type');
      return;
    }
    if (!formData.address.line1.trim()) {
      toast.error('Street address line 1 is required');
      return;
    }
    if (!formData.address.city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!formData.address.state.trim()) {
      toast.error('State is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateLocationPayload = {
        ...formData,
        code: formData.code?.trim() || undefined,
        locationCode: formData.code?.trim() || undefined,
        manager: formData.manager || null,
        openingDate: formData.openingDate || null,
        description: formData.description?.trim() || undefined,
        contactPerson: formData.contactPerson?.trim() || undefined,
        contactEmail: formData.contactEmail?.trim() || undefined,
        contactPhone: formData.contactPhone?.trim() || undefined,
        operatingHours: formData.operatingHours?.trim() || undefined,
        area: formData.area ? Number(formData.area) : null,
      };

      const res = await locationService.createLocation(payload);
      toast.success(res.message || 'Location created successfully');
      navigate(`/locations/${res.data.location._id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.LOCATIONS)}
            leftIcon={<ArrowLeft size={16} />}
          >
            Back to Locations
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" onClick={() => navigate(ROUTES.LOCATIONS)}>
              Locations
            </span>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-100 font-medium">New Location</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate(ROUTES.LOCATIONS)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Save size={16} />}
          >
            Save Location
          </Button>
        </div>
      </div>

      {/* Page Title */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm dark:shadow-none">
          <MapPin size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Register Operational Unit / Location</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Configure physical clinic, hospital branch, warehouse, or corporate office linked to a parent legal entity.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Core Unit & Entity Linkage */}
        <Card padding="lg">
          <Card.Header
            title="Location & Entity Association"
            description="Parent legal entity linkage, operational classification, and unit identification"
            icon={<Briefcase size={18} className="text-emerald-600 dark:text-emerald-400" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Parent Business Entity *
              </label>
              <select
                name="entity"
                value={formData.entity}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
              >
                {isLoadingPrereqs ? (
                  <option>Loading entities...</option>
                ) : entities.length === 0 ? (
                  <option value="">No active entities found. Please create an Entity first.</option>
                ) : (
                  entities.map((ent) => (
                    <option key={ent._id} value={ent._id}>
                      {ent.name} ({ent.entityCode || ent.code})
                    </option>
                  ))
                )}
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                Every Location MUST strictly belong to an authenticated parent Entity.
              </span>
            </div>

            <div>
              <Input
                label="Location Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Koramangala Day Care Clinic"
                required
              />
            </div>

            <div>
              <Input
                label="Location Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g. LOC-KOR-01 (leave blank to auto-generate)"
                hint="Unique alphanumeric identifier within the parent entity."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Location Type *
              </label>
              <select
                name="locationType"
                value={formData.locationType}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
              >
                {isLoadingPrereqs ? (
                  <option>Loading types...</option>
                ) : locationTypes.length === 0 ? (
                  <option value="">No location types configured in Master Data</option>
                ) : (
                  locationTypes.map((type) => (
                    <option key={type._id} value={type.code}>
                      {type.label} ({type.code})
                    </option>
                  ))
                )}
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                Derived directly from Master Data settings.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Parent Location / Campus (Optional)
              </label>
              <select
                name="parentLocation"
                value={formData.parentLocation || ''}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
              >
                <option value="">None (Top-Level Site)</option>
                {availableLocations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name} ({loc.locationCode || loc.code})
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                Designate as a sub-unit, wing, or clinic under an existing parent site.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Designated Unit Manager
              </label>
              <select
                name="manager"
                value={formData.manager || ''}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
              >
                <option value="">Select a Manager (Optional)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Opening / Commissioning Date
              </label>
              <input
                type="date"
                name="openingDate"
                value={formData.openingDate || ''}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Operational Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Floor Area (Size)"
                name="area"
                type="number"
                value={formData.area || ''}
                onChange={handleChange}
                placeholder="e.g. 5000"
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Unit
                </label>
                <select
                  name="areaUnit"
                  value={formData.areaUnit || 'sqft'}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
                >
                  <option value="sqft">Sq. Feet</option>
                  <option value="sqm">Sq. Meters</option>
                </select>
              </div>
            </div>

            <div>
              <Input
                label="Operating Hours"
                name="operatingHours"
                value={formData.operatingHours}
                onChange={handleChange}
                placeholder="e.g. Mon-Sat: 08:00 - 20:00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Unit Description / Purpose
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief summary of clinical or commercial operations conducted at this location..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Contact Information */}
        <Card padding="lg">
          <Card.Header
            title="Local Contact Details"
            description="Site supervisor, local correspondence phone and unit email"
            icon={<Mail size={18} className="text-emerald-600 dark:text-emerald-400" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Input
              label="Contact Person"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="e.g. Dr. Rajesh Sharma"
              leftAddon={<User size={15} className="text-slate-400" />}
            />
            <Input
              label="Contact Email"
              name="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={handleChange}
              placeholder="e.g. unit.koramangala@company.com"
              leftAddon={<Mail size={15} className="text-slate-400" />}
            />
            <Input
              label="Contact Phone"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              placeholder="e.g. +91 80 4455 6677"
              leftAddon={<Phone size={15} className="text-slate-400" />}
            />
          </div>
        </Card>

        {/* Section 3: Physical Address */}
        <Card padding="lg">
          <Card.Header
            title="Physical Postal Address"
            description="Geographical site address for jurisdictional compliance, audits and statutory inspections"
            icon={<MapPin size={18} className="text-emerald-400" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Input
                label="Street Address Line 1 *"
                name="address.line1"
                value={formData.address.line1}
                onChange={handleChange}
                placeholder="Building Name, Floor, Suite, Street Number"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Street Address Line 2"
                name="address.line2"
                value={formData.address.line2}
                onChange={handleChange}
                placeholder="Locality, Landmark, Industrial Sector"
              />
            </div>

            <div>
              <Input
                label="City *"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                placeholder="e.g. Bengaluru"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                District
              </label>
              {districts.length > 0 ? (
                <select
                  name="address.district"
                  value={formData.address.district}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
                >
                  <option value="">Select District</option>
                  {districts.map((d) => (
                    <option key={d._id} value={d.label}>
                      {d.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  name="address.district"
                  value={formData.address.district}
                  onChange={handleChange}
                  placeholder="e.g. Bengaluru Urban"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                State *
              </label>
              {states.length > 0 ? (
                <select
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:shadow-none"
                >
                  <option value="">Select State</option>
                  {states.map((s) => (
                    <option key={s._id} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  placeholder="e.g. Karnataka"
                  required
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Pincode"
                name="address.pincode"
                value={formData.address.pincode}
                onChange={handleChange}
                placeholder="e.g. 560034"
              />
              <Input
                label="Country"
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
                placeholder="India"
              />
            </div>
          </div>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => navigate(ROUTES.LOCATIONS)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Save size={16} />}
          >
            Create Location
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LocationCreatePage;
