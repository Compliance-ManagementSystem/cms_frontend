import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Save,
  MapPin,
  Mail,
  Phone,
  FileText,
  User,
  Briefcase,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { entityService, CreateEntityPayload, EntityItem } from '@/services/entityService';
import { adminService, MasterDataItem, UserItem } from '@/services/adminService';
import { ROUTES } from '@/constants/routes';

export const EntityCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entityTypes, setEntityTypes] = useState<MasterDataItem[]>([]);
  const [industries, setIndustries] = useState<MasterDataItem[]>([]);
  const [parentEntities, setParentEntities] = useState<EntityItem[]>([]);
  const [states, setStates] = useState<MasterDataItem[]>([]);
  const [districts, setDistricts] = useState<MasterDataItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  // Form State
  const [formData, setFormData] = useState<CreateEntityPayload>({
    name: '',
    code: '',
    entityCode: '',
    entityType: '',
    owner: null,
    industry: '',
    parentEntity: '',
    registrationNumber: '',
    gstin: '',
    pan: '',
    cin: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    description: '',
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

  // Load Master Data & Potential Owners (Users)
  useEffect(() => {
    const loadPrerequisites = async () => {
      setIsLoadingMaster(true);
      try {
        const [typesRes, statesRes, districtsRes, usersRes, industriesRes, entitiesRes] = await Promise.all([
          adminService.getMasterData({ category: 'entity_type' }).catch(() => ({ items: [] })),
          adminService.getMasterData({ category: 'state' }).catch(() => ({ items: [] })),
          adminService.getMasterData({ category: 'district' }).catch(() => ({ items: [] })),
          adminService.getUsers({ limit: 100 }).catch(() => ({ users: [] })),
          adminService.getMasterData({ category: 'industry' }).catch(() => ({ items: [] })),
          entityService.getEntities({ limit: 100 }).catch(() => ({ entities: [] })),
        ]);

        const activeTypes = (typesRes.items || []).filter((t: MasterDataItem) => t.status === 'active');
        setEntityTypes(activeTypes);
        setIndustries((industriesRes.items || []).filter((i: MasterDataItem) => i.status === 'active'));
        setParentEntities(entitiesRes.entities || []);
        setStates((statesRes.items || []).filter((s: MasterDataItem) => s.status === 'active'));
        setDistricts((districtsRes.items || []).filter((d: MasterDataItem) => d.status === 'active'));
        setUsers(usersRes.users || []);

        if (activeTypes.length > 0) {
          setFormData((prev) => ({
            ...prev,
            entityType: activeTypes[0]._id,
          }));
        }
      } catch (err) {
        console.error('Failed to load form prerequisites', err);
      } finally {
        setIsLoadingMaster(false);
      }
    };

    loadPrerequisites();
  }, []);

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

    // Validation
    if (!formData.name.trim()) {
      toast.error('Entity name is required');
      return;
    }
    if (!formData.entityType) {
      toast.error('Please select an Entity Type');
      return;
    }
    if (!formData.contactEmail.trim()) {
      toast.error('Contact email is required');
      return;
    }
    if (!formData.contactPhone.trim()) {
      toast.error('Contact phone is required');
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
      const payload: CreateEntityPayload = {
        ...formData,
        code: formData.code?.trim() || undefined,
        entityCode: formData.code?.trim() || undefined,
        owner: formData.owner || null,
        industry: formData.industry || null,
        parentEntity: formData.parentEntity || null,
        registrationNumber: formData.registrationNumber?.trim() || undefined,
        gstin: formData.gstin?.trim() || undefined,
        pan: formData.pan?.trim() || undefined,
        cin: formData.cin?.trim() || undefined,
        contactPerson: formData.contactPerson?.trim() || undefined,
        description: formData.description?.trim() || undefined,
      };

      const res = await entityService.createEntity(payload);
      toast.success(res.message || 'Entity created successfully');
      navigate(`/entities/${res.data.entity._id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create entity');
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
            onClick={() => navigate(ROUTES.ENTITIES)}
            leftIcon={<ArrowLeft size={16} />}
          >
            Back to Entities
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" onClick={() => navigate(ROUTES.ENTITIES)}>
              Entities
            </span>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-100 font-medium">New Entity</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate(ROUTES.ENTITIES)}
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
            Save Entity
          </Button>
        </div>
      </div>

      {/* Page Title */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm dark:shadow-none">
          <Building2 size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Register New Business Entity</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Define corporate legal entity, headquarters address, assigned owners, and statutory identifiers.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Core Entity Details */}
        <Card padding="lg">
          <Card.Header
            title="Entity Information"
            description="Official corporate registration details and organizational classification"
            icon={<Briefcase size={18} className="text-indigo-600 dark:text-indigo-400" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Input
                label="Entity Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Apex Global Solutions Private Limited"
                required
              />
            </div>

            <div>
              <Input
                label="Entity Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g. APEX-CORP (leave blank to auto-generate)"
                hint="Unique uppercase identifier for this legal entity."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Entity Type *
              </label>
              <select
                name="entityType"
                value={formData.entityType}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              >
                {isLoadingMaster ? (
                  <option>Loading entity types...</option>
                ) : entityTypes.length === 0 ? (
                  <option value="">No active entity types configured</option>
                ) : (
                  entityTypes.map((type) => (
                    <option key={type._id} value={type._id}>
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
                Designated Entity Owner
              </label>
              <select
                name="owner"
                value={formData.owner || ''}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              >
                <option value="">Select an Owner (Optional)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Industry Classification
              </label>
              <select
                name="industry"
                value={formData.industry || ''}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              >
                <option value="">Select an Industry (Optional)</option>
                {industries.map((ind) => (
                  <option key={ind._id} value={ind._id}>
                    {ind.label} ({ind.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Parent Entity (Corporate Hierarchy)
              </label>
              <select
                name="parentEntity"
                value={formData.parentEntity || ''}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              >
                <option value="">None (Top-Level Independent Entity)</option>
                {parentEntities.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.entityCode || p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Operational Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Description / Business Scope
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief summary of business operations, principal activities, or corporate scope..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Statutory & Regulatory Identification */}
        <Card padding="lg">
          <Card.Header
            title="Statutory & Corporate Identification"
            description="National tax, company registration numbers, and corporate credentials"
            icon={<FileText size={18} className="text-indigo-600 dark:text-indigo-400" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="GSTIN"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="e.g. 27AAAAA0000A1Z5"
            />
            <Input
              label="PAN"
              name="pan"
              value={formData.pan}
              onChange={handleChange}
              placeholder="e.g. AAAAA0000A"
            />
            <Input
              label="CIN"
              name="cin"
              value={formData.cin}
              onChange={handleChange}
              placeholder="e.g. U72200MH2020PTC123456"
            />
            <Input
              label="Registration Number"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              placeholder="e.g. REG-IND-9874"
            />
          </div>
        </Card>

        {/* Section 3: Contact Details */}
        <Card padding="lg">
          <Card.Header
            title="Communication & Contact Information"
            description="Primary corporate point of contact, official correspondence email, and phone"
            icon={<Mail size={18} className="text-indigo-600 dark:text-indigo-400" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Input
              label="Contact Person"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="e.g. Rajesh Kumar"
              leftAddon={<User size={15} className="text-slate-400" />}
            />
            <Input
              label="Contact Email *"
              name="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={handleChange}
              placeholder="e.g. compliance@apexsolutions.com"
              leftAddon={<Mail size={15} className="text-slate-400" />}
              required
            />
            <Input
              label="Contact Phone *"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              placeholder="e.g. +91 98765 43210"
              leftAddon={<Phone size={15} className="text-slate-400" />}
              required
            />
          </div>
        </Card>

        {/* Section 4: Registered Address */}
        <Card padding="lg">
          <Card.Header
            title="Registered Office Address"
            description="Official corporate postal address for legal notices and jurisdictional compliance"
            icon={<MapPin size={18} className="text-indigo-600 dark:text-indigo-400" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Input
                label="Address Line 1 *"
                name="address.line1"
                value={formData.address.line1}
                onChange={handleChange}
                placeholder="Building Name, Floor, Suite, Street Number"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Address Line 2"
                name="address.line2"
                value={formData.address.line2}
                onChange={handleChange}
                placeholder="Locality, Landmark, Industrial Area"
              />
            </div>

            <div>
              <Input
                label="City *"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                placeholder="e.g. Mumbai"
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
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
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
                  placeholder="e.g. Mumbai Suburban"
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
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
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
                  placeholder="e.g. Maharashtra"
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
                placeholder="e.g. 400001"
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
            onClick={() => navigate(ROUTES.ENTITIES)}
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
            Create Entity
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EntityCreatePage;
