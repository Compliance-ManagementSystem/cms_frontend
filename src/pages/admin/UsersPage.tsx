import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  Building,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Mail,
  Phone,
  Lock,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { adminService, UserItem, RoleItem } from '@/services/adminService';

const UsersPage: React.FC = () => {
  const toast = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });

  // Fetch Roles for dropdown
  useEffect(() => {
    adminService.getRoles().then((data) => setRoles(data)).catch(() => {});
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        role: selectedRole || undefined,
        status: selectedStatus || undefined,
      });
      setUsers(data.users);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
      }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, selectedRole, selectedStatus, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: roles[0]?._id || '',
      phone: '',
      status: 'active',
    });
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '', // optional on edit
      role: user.role?._id || '',
      phone: user.phone || '',
      status: user.status === 'archived' ? 'inactive' : user.status,
    });
    setIsEditOpen(true);
  };

  // Open Delete Confirmation
  const handleOpenDelete = (user: UserItem) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminService.createUser(formData);
      toast.success('User created successfully');
      setIsCreateOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await adminService.updateUser(selectedUser._id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        phone: formData.phone,
        status: formData.status,
        ...(formData.password ? { password: formData.password } : {}),
      });
      toast.success('User updated successfully');
      setIsEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (user: UserItem) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await adminService.toggleUserStatus(user._id, nextStatus);
      toast.success(`User marked as ${nextStatus}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await adminService.deleteUser(selectedUser._id);
      toast.success('User deleted successfully');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Table Columns
  const columns: Column<UserItem>[] = [
    {
      key: 'name',
      header: 'User',
      cell: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-700/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-xs shadow-sm">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{user.fullName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Mail size={12} /> {user.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (user) => (
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{user.role?.name || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Entity Scope',
      cell: (user) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
          <Building size={14} className="text-slate-400" />
          <span>{user.entity?.code ? `${user.entity.code} — ${user.entity.name}` : 'Global (National)'}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      cell: (user) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {user.phone ? (
            <span className="flex items-center gap-1">
              <Phone size={12} /> {user.phone}
            </span>
          ) : (
            '—'
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (user) => {
        const variant =
          user.status === 'active' ? 'success' : user.status === 'inactive' ? 'warning' : 'danger';
        return (
          <Badge variant={variant} size="sm" dot>
            {user.status}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (user) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(user)}
            title={user.status === 'active' ? 'Deactivate user' : 'Reactivate user'}
            className={user.status === 'active' ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300' : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300'}
          >
            {user.status === 'active' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(user)}
            title="Edit user details"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <Edit2 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDelete(user)}
            title="Delete user"
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/40">
              <Users size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Management</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage system identities, authentication credentials, assigned roles, and access status.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="flex items-center gap-2"
          id="btn-create-user"
        >
          <UserPlus size={16} /> Add User
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card.Stat
          label="Total Users"
          value={pagination.total}
          icon={<Users size={20} />}
          iconBg="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        />
        <Card.Stat
          label="Active Users"
          value={users.filter((u) => u.status === 'active').length}
          icon={<CheckCircle2 size={20} />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
        />
        <Card.Stat
          label="Assigned Roles"
          value={roles.length}
          icon={<Shield size={20} />}
          iconBg="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
        />
        <Card.Stat
          label="Inactive / Suspended"
          value={users.filter((u) => u.status !== 'active').length}
          icon={<XCircle size={20} />}
          iconBg="bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <Input
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            leftAddon={<Search size={16} />}
            className="w-full"
            id="search-users-input"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Filter size={14} /> Filters:
          </div>

          <select
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-sm dark:shadow-none"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            aria-label="Filter by Role"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-sm dark:shadow-none"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            aria-label="Filter by Status"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUsers}
            title="Refresh users"
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <RefreshCw size={15} />
          </Button>
        </div>
      </Card>

      {/* Users Data Table */}
      <Table
        id="users-table"
        columns={columns}
        data={users}
        keyExtractor={(u) => u._id}
        isLoading={isLoading}
        emptyMessage="No users found matching your search or filters."
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          onPageChange: (p) => setPagination((prev) => ({ ...prev, page: p })),
        }}
      />

      {/* ── CREATE USER MODAL ──────────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New User"
        description="Provision a new user account with role-based access and permissions."
        size="lg"
        id="create-user-modal"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              placeholder="e.g. Rahul"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              placeholder="e.g. Varma"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="e.g. rahul.varma@ccpl.local"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +91 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                Assigned Role <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select Role
                </option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Account Status</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <Input
            label="Temporary Password"
            type="password"
            required
            leftAddon={<Lock size={15} />}
            placeholder="Min 8 chars with uppercase, lowercase & number"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            hint="User will be prompted to change their temporary password upon initial login."
          />

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT USER MODAL ────────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit User: ${selectedUser?.fullName}`}
        description="Update profile details, role permissions, or reset credentials."
        size="lg"
        id="edit-user-modal"
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                Assigned Role <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Account Status</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <Input
            label="Reset Password (Optional)"
            type="password"
            leftAddon={<Lock size={15} />}
            placeholder="Leave blank to keep existing password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

      {/* ── DELETE CONFIRMATION MODAL ──────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm User Deletion"
        size="sm"
        id="delete-user-modal"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to permanently delete the user account for{' '}
            <strong className="text-slate-900 dark:text-slate-100">{selectedUser?.email}</strong>?
          </p>
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300">
            ⚠️ This will invalidate active sessions and remove the user profile. Audit logs will remain intact.
          </div>
          <div className="flex items-center justify-end gap-3 mt-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} isLoading={isSubmitting}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
