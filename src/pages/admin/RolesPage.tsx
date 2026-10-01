import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Users,
  KeyRound,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { adminService, RoleItem } from '@/services/adminService';

const AVAILABLE_RESOURCES = [
  { id: 'entity', name: 'Entity Management', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'location', name: 'Location Management', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'compliance_rule', name: 'Compliance Rules', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'compliance_record', name: 'Compliance Records', actions: ['read', 'create', 'update', 'approve', 'submit'] },
  { id: 'licence', name: 'Licences & Permits', actions: ['read', 'create', 'update', 'renew', 'delete'] },
  { id: 'document', name: 'Documents & Vault', actions: ['read', 'upload', 'download', 'update', 'delete'] },
  { id: 'task', name: 'Tasks & Workflow', actions: ['read', 'create', 'update', 'assign', 'delete'] },
  { id: 'approval', name: 'Approval Chains', actions: ['read', 'approve', 'reject'] },
  { id: 'user', name: 'User Management', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'role', name: 'Role Management', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'master_data', name: 'Master Data', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'audit_log', name: 'Audit Trail', actions: ['read', 'export'] },
  { id: 'settings', name: 'System Settings', actions: ['read', 'update'] },
];

const RolesPage: React.FC = () => {
  const toast = useToast();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    permissions: [] as Array<{ resource: string; actions: string[] }>,
  });

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getRoles();
      setRoles(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Toggle action in permissions array
  const handleToggleAction = (resource: string, action: string) => {
    setFormData((prev) => {
      const existing = prev.permissions.find((p) => p.resource === resource);
      let updated: Array<{ resource: string; actions: string[] }>;

      if (!existing) {
        updated = [...prev.permissions, { resource, actions: [action] }];
      } else {
        const hasAction = existing.actions.includes(action);
        const newActions = hasAction
          ? existing.actions.filter((a) => a !== action)
          : [...existing.actions, action];

        if (newActions.length === 0) {
          updated = prev.permissions.filter((p) => p.resource !== resource);
        } else {
          updated = prev.permissions.map((p) =>
            p.resource === resource ? { ...p, actions: newActions } : p
          );
        }
      }

      return { ...prev, permissions: updated };
    });
  };

  const isActionChecked = (resource: string, action: string) => {
    const perm = formData.permissions.find((p) => p.resource === resource);
    return perm ? perm.actions.includes(action) : false;
  };

  // Open Create
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      permissions: [],
    });
    setIsCreateOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (role: RoleItem) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setIsEditOpen(true);
  };

  // Open Delete
  const handleOpenDelete = (role: RoleItem) => {
    setSelectedRole(role);
    setIsDeleteOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error('Role name and code are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminService.createRole(formData);
      toast.success('Custom role created successfully');
      setIsCreateOpen(false);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      await adminService.updateRole(selectedRole._id, {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        status: 'active',
      });
      toast.success('Role updated successfully');
      setIsEditOpen(false);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    try {
      await adminService.deleteRole(selectedRole._id);
      toast.success('Role deleted successfully');
      setIsDeleteOpen(false);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/40">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Role Management</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure canonical system roles and create fine-grained custom roles with tailored permission policies.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="flex items-center gap-2"
          id="btn-create-role"
        >
          <Plus size={16} /> Create Custom Role
        </Button>
      </div>

      {/* Search Bar */}
      <Card padding="sm" className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Input
            placeholder="Search roles by title, code or scope..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftAddon={<Search size={16} />}
            className="w-full"
            id="search-roles-input"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRoles} title="Refresh roles" className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          <RefreshCw size={15} />
        </Button>
      </Card>

      {/* Role Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role) => (
            <Card key={role._id} className="flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-600 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {role.name}
                    </h3>
                    <code className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">{role.code}</code>
                  </div>
                  <Badge variant={role.isSystem ? 'info' : 'default'} size="sm">
                    {role.isSystem ? 'System Role' : 'Custom Role'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2">
                  {role.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users size={13} className="text-slate-500" />
                    <strong className="text-slate-800 dark:text-slate-200">{role.userCount || 0}</strong> users
                  </span>
                  <span className="flex items-center gap-1">
                    <KeyRound size={13} className="text-slate-500" />
                    <strong className="text-slate-800 dark:text-slate-200">{role.permissionCount || (role.code === 'super_admin' ? 'All (*)' : 0)}</strong> perms
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(role)}
                    title="Edit role permissions"
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <Edit3 size={14} />
                  </Button>
                  {!role.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDelete(role)}
                      title="Delete role"
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── CREATE CUSTOM ROLE MODAL ────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Custom Role"
        description="Define a new role and grant granular permissions across system modules."
        size="xl"
        id="create-role-modal"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Role Name"
              required
              placeholder="e.g. Regional Health Inspector"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Role Code"
              required
              placeholder="e.g. regional_inspector"
              value={formData.code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                })
              }
              hint="Must be unique, lowercase alphanumeric with underscores."
            />
          </div>

          <Input
            label="Description"
            placeholder="Brief explanation of the responsibilities and scope of this role..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Permission Capabilities Matrix</h4>
            <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 shadow-sm dark:shadow-none">
              {AVAILABLE_RESOURCES.map((res) => (
                <div key={res.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 w-48">{res.name}</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    {res.actions.map((act) => {
                      const checked = isActionChecked(res.id, act);
                      return (
                        <label key={act} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={checked}
                            onChange={() => handleToggleAction(res.id, act)}
                          />
                          <span className="capitalize">{act}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT ROLE MODAL ────────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Role: ${selectedRole?.name}`}
        description="Adjust role details and update capability grants."
        size="xl"
        id="edit-role-modal"
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input
            label="Role Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Permission Capabilities Matrix</h4>
            <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 shadow-sm dark:shadow-none">
              {AVAILABLE_RESOURCES.map((res) => (
                <div key={res.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 w-48">{res.name}</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    {res.actions.map((act) => {
                      const checked = isActionChecked(res.id, act);
                      return (
                        <label key={act} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={checked}
                            onChange={() => handleToggleAction(res.id, act)}
                          />
                          <span className="capitalize">{act}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <Button variant="ghost" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save Permissions
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE ROLE MODAL ──────────────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Role Deletion"
        size="sm"
        id="delete-role-modal"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete the custom role <strong className="text-slate-900 dark:text-slate-100">{selectedRole?.name}</strong>?
          </p>
          {(selectedRole?.userCount || 0) > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>Warning: This role is currently assigned to {selectedRole?.userCount} user(s). Reassign them first.</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 mt-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} isLoading={isSubmitting}>
              Delete Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RolesPage;
