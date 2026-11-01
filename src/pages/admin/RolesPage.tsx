import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Users, KeyRound, Edit3, Eye, RefreshCw, Search } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { adminService, RoleItem } from '@/services/adminService';
import { getErrorMessage } from '@/utils/errors';

// Only the permissions the system actually checks. Users, Roles, Master Data, Settings and
// approving records are open to both roles, so they have no checkbox here.
const AVAILABLE_RESOURCES = [
  { id: 'entity', name: 'Entity Management', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'location', name: 'Location Management', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'compliance_rule', name: 'Compliance Rules', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'compliance_record', name: 'Compliance Records', actions: ['read', 'create', 'update', 'submit', 'delete'] },
  { id: 'licence', name: 'Licences & Permits', actions: ['create', 'update', 'renew', 'delete'] },
  { id: 'document', name: 'Documents & Vault', actions: ['read', 'upload', 'download', 'update', 'delete'] },
  { id: 'task', name: 'Tasks & Workflow', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'audit_log', name: 'Audit Trail', actions: ['read'] },
];

/** How many of the permissions shown on this page the role holds */
const countPermissions = (role: RoleItem) =>
  AVAILABLE_RESOURCES.reduce((total, resource) => {
    const held = role.permissions?.find((p) => p.resource === resource.id)?.actions ?? [];
    return total + resource.actions.filter((action) => held.includes(action)).length;
  }, 0);

const RolesPage: React.FC = () => {
  const toast = useToast();
  const { hasRole } = useAuth();
  const canEdit = hasRole('super_admin');

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
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
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch roles'));
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
        const newActions = hasAction ? existing.actions.filter((a) => a !== action) : [...existing.actions, action];

        if (newActions.length === 0) {
          updated = prev.permissions.filter((p) => p.resource !== resource);
        } else {
          updated = prev.permissions.map((p) => (p.resource === resource ? { ...p, actions: newActions } : p));
        }
      }

      return { ...prev, permissions: updated };
    });
  };

  const isActionChecked = (resource: string, action: string) => {
    const perm = formData.permissions.find((p) => p.resource === resource);
    return perm ? perm.actions.includes(action) : false;
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
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update role'));
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
            {canEdit
              ? 'Super Admin always has every permission. Choose what Admin can do.'
              : 'Super Admin always has every permission. Only a Super Admin can change what Admin can do.'}
          </p>
        </div>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRoles}
          title="Refresh roles"
          className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <RefreshCw size={15} />
        </Button>
      </Card>

      {/* Role Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role) => (
            <Card
              key={role._id}
              className="flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-600 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {role.name}
                    </h3>
                    <code className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                      {role.code}
                    </code>
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
                    {role.code === 'super_admin' ? (
                      <strong className="text-slate-800 dark:text-slate-200">All permissions</strong>
                    ) : (
                      <>
                        <strong className="text-slate-800 dark:text-slate-200">{countPermissions(role)}</strong> perms
                      </>
                    )}
                  </span>
                </div>

                {role.code !== 'super_admin' && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(role)}
                      title={canEdit ? 'Edit role permissions' : 'View role permissions'}
                      className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    >
                      {canEdit ? <Edit3 size={14} /> : <Eye size={14} />}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── EDIT ROLE MODAL ────────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`${canEdit ? 'Edit Role' : 'Role'}: ${selectedRole?.name}`}
        description={
          canEdit ? 'Adjust role details and update capability grants.' : 'Only a Super Admin can change this role.'
        }
        size="xl"
        id="edit-role-modal"
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input
            label="Role Name"
            required
            disabled={!canEdit}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Description"
            disabled={!canEdit}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Permission Capabilities Matrix
            </h4>
            <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 shadow-sm dark:shadow-none">
              {AVAILABLE_RESOURCES.map((res) => (
                <div
                  key={res.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 w-48">{res.name}</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    {res.actions.map((act) => {
                      const checked = isActionChecked(res.id, act);
                      return (
                        <label
                          key={act}
                          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={checked}
                            disabled={!canEdit}
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
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit && (
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Save Permissions
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RolesPage;
