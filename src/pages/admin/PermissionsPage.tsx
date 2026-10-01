import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { adminService, PermissionItem } from '@/services/adminService';

const PermissionsPage: React.FC = () => {
  const toast = useToast();

  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPerm, setSelectedPerm] = useState<PermissionItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    module: '',
    action: '',
    description: '',
  });

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getPermissions({
        module: selectedModule !== 'all' ? selectedModule : undefined,
        search: search || undefined,
      });
      setPermissions(data.permissions);
      setModules(data.modules);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch permissions');
    } finally {
      setIsLoading(false);
    }
  }, [selectedModule, search, toast]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      code: '',
      module: modules[0] || 'custom',
      action: 'read',
      description: '',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (perm: PermissionItem) => {
    setSelectedPerm(perm);
    setFormData({
      name: perm.name,
      code: perm.code,
      module: perm.module,
      action: perm.action,
      description: perm.description || '',
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (perm: PermissionItem) => {
    setSelectedPerm(perm);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.module || !formData.action) {
      toast.error('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminService.createPermission(formData);
      toast.success('Permission created successfully');
      setIsCreateOpen(false);
      fetchPermissions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create permission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerm) return;

    setIsSubmitting(true);
    try {
      await adminService.updatePermission(selectedPerm._id, {
        name: formData.name,
        description: formData.description,
        status: 'active',
      });
      toast.success('Permission updated successfully');
      setIsEditOpen(false);
      fetchPermissions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update permission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPerm) return;
    setIsSubmitting(true);
    try {
      await adminService.deletePermission(selectedPerm._id);
      toast.success('Permission deleted successfully');
      setIsDeleteOpen(false);
      fetchPermissions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete permission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<PermissionItem>[] = [
    {
      key: 'name',
      header: 'Permission',
      cell: (p) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
          <code className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">{p.code}</code>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module Scope',
      cell: (p) => (
        <Badge variant="info" size="sm" className="capitalize">
          {p.module}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (p) => (
        <Badge variant="default" size="sm" className="capitalize">
          {p.action}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (p) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
          {p.description || 'No description available'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (p) => (
        <Badge variant={p.isSystem ? 'success' : 'default'} size="sm">
          {p.isSystem ? 'System Core' : 'Custom'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(p)}
            title="Edit description"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <Edit2 size={14} />
          </Button>
          {!p.isSystem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDelete(p)}
              title="Delete custom permission"
              className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/40">
              <KeyRound size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Permissions Catalog</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            System-wide capabilities repository defining granular action boundaries across all modules.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="flex items-center gap-2"
          id="btn-create-permission"
        >
          <Plus size={16} /> Add Custom Permission
        </Button>
      </div>

      {/* Module Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedModule('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedModule === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm dark:shadow-none'
          }`}
        >
          All Modules ({permissions.length})
        </button>
        {modules.map((mod) => (
          <button
            key={mod}
            onClick={() => setSelectedModule(mod)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
              selectedModule === mod
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm dark:shadow-none'
            }`}
          >
            {mod}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <Card padding="sm" className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Input
            placeholder="Search permissions by name, code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftAddon={<Search size={16} />}
            className="w-full"
            id="search-permissions-input"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchPermissions} title="Refresh permissions" className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          <RefreshCw size={15} />
        </Button>
      </Card>

      {/* Table */}
      <Table
        id="permissions-table"
        columns={columns}
        data={permissions}
        keyExtractor={(p) => p._id}
        isLoading={isLoading}
        emptyMessage="No permissions match your filter criteria."
      />

      {/* ── CREATE PERMISSION MODAL ────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Custom Permission"
        description="Register a new granular capability string in the format module:action."
        size="md"
        id="create-permission-modal"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <Input
            label="Permission Name"
            required
            placeholder="e.g. Export Compliance Reports"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Permission Code"
            required
            placeholder="e.g. compliance_report:export"
            value={formData.code}
            onChange={(e) =>
              setFormData({
                ...formData,
                code: e.target.value.toLowerCase().replace(/[^a-z0-9_:]/g, '_'),
              })
            }
            hint="Format: module:action (lowercase alphanumeric with underscores)."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Module"
              required
              placeholder="e.g. report"
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value.toLowerCase() })}
            />
            <Input
              label="Action Verb"
              required
              placeholder="e.g. export"
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value.toLowerCase() })}
            />
          </div>

          <Input
            label="Description"
            placeholder="Explain what this action authorizes..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Permission
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT PERMISSION MODAL ──────────────────────────────────────────── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Permission: ${selectedPerm?.code}`}
        size="md"
        id="edit-permission-modal"
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input
            label="Permission Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <Button variant="ghost" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE PERMISSION MODAL ────────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
        size="sm"
        id="delete-permission-modal"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete permission <code className="text-rose-600 dark:text-rose-400 font-mono">{selectedPerm?.code}</code>?
          </p>
          <div className="flex items-center justify-end gap-3 mt-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} isLoading={isSubmitting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PermissionsPage;
