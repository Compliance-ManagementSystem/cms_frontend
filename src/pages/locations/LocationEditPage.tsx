import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { locationService, UpdateLocationPayload } from '@/services/locationService';
import { entityService, EntityItem } from '@/services/entityService';
import { adminService, MasterDataItem, UserItem } from '@/services/adminService';
import { ROUTES } from '@/constants/routes';

export const LocationEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<MasterDataItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [districts, setDistricts] = useState<MasterDataItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  // Form State
  const [formData, setFormData] = useState<UpdateLocationPayload>({
    name: '',
    code: '',
    locationCode: '',
    entity: '',
    locationType: '',
    manager: null,
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

  // Load Existing Location & Prerequisites
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [locationRes, entitiesRes, typesRes, statesRes, districtsRes, usersRes] =
          await Promise.all([
            locationService.getLocationById(id),
            entityService.getEntities({ limit: 100 }).catch(() => ({ entities: [] })),
            adminService.getMasterData({ category: 'location_type' }).catch(() => ({ items: [] })),
            adminService.getMasterData({ category: 'state' }).catch(() => ({ items: [] })),
            adminService.getMasterData({ category: 'district' }).catch(() => ({ items: [] })),
            adminService.getUsers({ limit: 100 }).catch(() => ({ users: [] })),
          ]);

        const loc = locationRes.location;
        setEntities((entitiesRes.entities || []).filter((e: EntityItem) => e.status === 'active'));
        setLocationTypes(
          (typesRes.items || []).filter((t: MasterDataItem) => t.status === 'active')
        );
        setStates((statesRes.items || []).filter((s: MasterDataItem) => s.status === 'active'));
        setDistricts((districtsRes.items || []).filter((d: MasterDataItem) => d.status === 'active'));
        setUsers(usersRes.users || []);

        setFormData({
          name: loc.name,
          code: loc.locationCode || loc.code,
          locationCode: loc.locationCode || loc.code,
          entity: loc.entity?._id || '',
          locationType: loc.locationType?.code || (loc.locationType as any)?._id || '',
          manager: loc.manager?._id || null,
          openingDate: loc.openingDate ? loc.openingDate.split('T')[0] : '',
          description: loc.description || '',
          area: loc.area || null,
          areaUnit: loc.areaUnit || 'sqft',
          operatingHours: loc.operatingHours || '',
          contactPerson: loc.contactPerson || '',
          contactEmail: loc.contactEmail || '',
          contactPhone: loc.contactPhone || '',
          status: loc.status,
          address: {
            line1: loc.address?.line1 || '',
            line2: loc.address?.line2 || '',
            city: loc.address?.city || '',
            district: loc.address?.district || '',
            state: loc.address?.state || '',
            pincode: loc.address?.pincode || '',
            country: loc.address?.country || 'India',
          },
        });
      } catch (err: any) {
        toast.error(err.message || 'Failed to load location details for editing');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address!,
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
    if (!id) return;

    if (!formData.name?.trim()) {
      toast.error('Location name is required');
      return;
    }
    if (!formData.entity) {
      toast.error('Please assign this location to an Entity');
      return;
    }
    if (!formData.locationType) {
      toast.error('Please select a Location Type');
      return;
    }
    if (!formData.address?.line1?.trim()) {
      toast.error('Street address line 1 is required');
      return;
    }
    if (!formData.address?.city?.trim()) {
      toast.error('City is required');
      return;
    }
    if (!formData.address?.state?.trim()) {
      toast.error('State is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateLocationPayload = {
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

      const res = await locationService.updateLocation(id, payload);
      toast.success(res.message || 'Location updated successfully');
      navigate(`/locations/${id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update location');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading location profile for editing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/locations/${id}`)}
            leftIcon={<ArrowLeft size={16} />}
          >
            Back to Location
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" onClick={() => navigate(ROUTES.LOCATIONS)}>
              Locations
            </span>
            <span>/</span>
            <span
              className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              onClick={() => navigate(`/locations/${id}`)}
            >
              {formData.name || 'Details'}
            </span>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-100 font-medium">Edit</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate(`/locations/${id}`)}
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
            Save Changes
          </Button>
        </div>
      </div>

      {/* Page Title */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-600/20 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-sm dark:shadow-none">
          <MapPin size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Edit Operational Unit</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Update location profile, parent entity affiliation, manager assignment, and physical site address.
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
                {entities.map((ent) => (
                  <option key={ent._id} value={ent._id}>
                    {ent.name} ({ent.entityCode || ent.code})
                  </option>
                ))}
              </select>
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
                placeholder="e.g. LOC-KOR-01"
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
                {locationTypes.map((type) => (
                  <option key={type._id} value={type.code}>
                    {type.label} ({type.code})
                  </option>
                ))}
              </select>
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
                Opening Date
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
                value={formData.address?.line1}
                onChange={handleChange}
                placeholder="Building Name, Floor, Suite, Street Number"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Street Address Line 2"
                name="address.line2"
                value={formData.address?.line2}
                onChange={handleChange}
                placeholder="Locality, Landmark, Industrial Sector"
              />
            </div>

            <div>
              <Input
                label="City *"
                name="address.city"
                value={formData.address?.city}
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
                  value={formData.address?.district}
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
                  value={formData.address?.district}
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
                  value={formData.address?.state}
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
                  value={formData.address?.state}
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
                value={formData.address?.pincode}
                onChange={handleChange}
                placeholder="e.g. 560034"
              />
              <Input
                label="Country"
                name="address.country"
                value={formData.address?.country}
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
            onClick={() => navigate(`/locations/${id}`)}
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
            Update Location
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LocationEditPage;
