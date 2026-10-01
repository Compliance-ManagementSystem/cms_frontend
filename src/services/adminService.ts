/**
 * Admin Service
 *
 * Client API integration for Users, Roles, Permissions, Master Data, and Settings.
 */

import axiosInstance from '@/api/axiosInstance';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserItem {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  role: {
    _id: string;
    name: string;
    code: string;
    isSystem: boolean;
  };
  entity?: {
    _id: string;
    name: string;
    code: string;
  } | null;
  status: 'active' | 'inactive' | 'archived';
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleItem {
  _id: string;
  name: string;
  code: string;
  description: string;
  isSystem: boolean;
  status: 'active' | 'inactive';
  permissions: Array<{
    resource: string;
    actions: string[];
  }>;
  userCount?: number;
  permissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionItem {
  _id: string;
  name: string;
  code: string;
  module: string;
  action: string;
  description?: string;
  isSystem: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface MasterDataItem {
  _id: string;
  category: string;
  code: string;
  label: string;
  description?: string;
  parent?: {
    _id: string;
    code: string;
    label: string;
    category: string;
  } | null;
  sortOrder: number;
  metadata?: Record<string, any>;
  status: 'active' | 'inactive' | 'archived';
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MasterDataCategory {
  id: string;
  name: string;
  description: string;
  count: number;
  activeCount: number;
}

export interface SystemSettings {
  _id: string;
  entity: string | null;
  notifications: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
    defaultReminderDays: number[];
  };
  workflows?: any[];
  config: {
    systemName?: string;
    sessionTimeoutMinutes?: number;
    maxFileUploadSizeMB?: number;
    allowedMimeTypes?: string[];
    taskSlaDays?: number;
    escalationGraceDays?: number;
    [key: string]: any;
  };
  updatedAt: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  entityId?: string;
}

export interface PaginatedResponse<T> {
  users: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Admin Service Methods ─────────────────────────────────────────────────────

export const adminService = {
  // ── Users ──
  getUsers: async (params?: PaginationParams) => {
    const res = await axiosInstance.get<{ success: boolean; data: PaginatedResponse<UserItem> }>(
      '/admin/users',
      { params }
    );
    return res.data.data;
  },

  getUserById: async (id: string) => {
    const res = await axiosInstance.get<{ success: boolean; data: { user: UserItem } }>(
      `/admin/users/${id}`
    );
    return res.data.data.user;
  },

  createUser: async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role: string;
    entity?: string | null;
    phone?: string;
    status?: string;
  }) => {
    const res = await axiosInstance.post<{ success: boolean; data: { user: UserItem }; message: string }>(
      '/admin/users',
      payload
    );
    return res.data;
  },

  updateUser: async (id: string, payload: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role: string;
    entity?: string | null;
    phone?: string;
    status?: string;
  }>) => {
    const res = await axiosInstance.put<{ success: boolean; data: { user: UserItem }; message: string }>(
      `/admin/users/${id}`,
      payload
    );
    return res.data;
  },

  toggleUserStatus: async (id: string, status: 'active' | 'inactive' | 'suspended') => {
    const res = await axiosInstance.patch<{ success: boolean; data: { user: UserItem }; message: string }>(
      `/admin/users/${id}/status`,
      { status }
    );
    return res.data;
  },

  deleteUser: async (id: string) => {
    const res = await axiosInstance.delete<{ success: boolean; message: string }>(
      `/admin/users/${id}`
    );
    return res.data;
  },

  // ── Roles ──
  getRoles: async () => {
    const res = await axiosInstance.get<{ success: boolean; data: { roles: RoleItem[] } }>(
      '/admin/roles'
    );
    return res.data.data.roles;
  },

  getRoleById: async (id: string) => {
    const res = await axiosInstance.get<{ success: boolean; data: { role: RoleItem; userCount: number } }>(
      `/admin/roles/${id}`
    );
    return res.data.data;
  },

  createRole: async (payload: {
    name: string;
    code: string;
    description?: string;
    permissions: Array<{ resource: string; actions: string[] }>;
  }) => {
    const res = await axiosInstance.post<{ success: boolean; data: { role: RoleItem }; message: string }>(
      '/admin/roles',
      payload
    );
    return res.data;
  },

  updateRole: async (id: string, payload: Partial<{
    name: string;
    description: string;
    permissions: Array<{ resource: string; actions: string[] }>;
    status: 'active' | 'inactive';
  }>) => {
    const res = await axiosInstance.put<{ success: boolean; data: { role: RoleItem }; message: string }>(
      `/admin/roles/${id}`,
      payload
    );
    return res.data;
  },

  deleteRole: async (id: string) => {
    const res = await axiosInstance.delete<{ success: boolean; message: string }>(
      `/admin/roles/${id}`
    );
    return res.data;
  },

  // ── Permissions ──
  getPermissions: async (params?: { module?: string; search?: string }) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: { permissions: PermissionItem[]; modules: string[]; total: number };
    }>('/admin/permissions', { params });
    return res.data.data;
  },

  createPermission: async (payload: {
    name: string;
    code: string;
    module: string;
    action: string;
    description?: string;
  }) => {
    const res = await axiosInstance.post<{ success: boolean; data: { permission: PermissionItem }; message: string }>(
      '/admin/permissions',
      payload
    );
    return res.data;
  },

  updatePermission: async (id: string, payload: Partial<{ name: string; description: string; status: 'active' | 'inactive' }>) => {
    const res = await axiosInstance.put<{ success: boolean; data: { permission: PermissionItem }; message: string }>(
      `/admin/permissions/${id}`,
      payload
    );
    return res.data;
  },

  deletePermission: async (id: string) => {
    const res = await axiosInstance.delete<{ success: boolean; message: string }>(
      `/admin/permissions/${id}`
    );
    return res.data;
  },

  // ── Master Data ──
  getCategories: async () => {
    const res = await axiosInstance.get<{ success: boolean; data: { categories: MasterDataCategory[] } }>(
      '/admin/master-data/categories'
    );
    return res.data.data.categories;
  },

  getMasterData: async (params?: { category?: string; status?: string; parent?: string; search?: string }) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: { items: MasterDataItem[]; total: number; category: string };
    }>('/admin/master-data', { params });
    return res.data.data;
  },

  createMasterData: async (payload: {
    category: string;
    code: string;
    label: string;
    description?: string;
    parent?: string | null;
    sortOrder?: number;
    metadata?: Record<string, any>;
    status?: 'active' | 'inactive';
  }) => {
    const res = await axiosInstance.post<{ success: boolean; data: { item: MasterDataItem }; message: string }>(
      '/admin/master-data',
      payload
    );
    return res.data;
  },

  updateMasterData: async (id: string, payload: Partial<{
    label: string;
    description: string;
    parent: string | null;
    sortOrder: number;
    metadata: Record<string, any>;
    status: 'active' | 'inactive';
  }>) => {
    const res = await axiosInstance.put<{ success: boolean; data: { item: MasterDataItem }; message: string }>(
      `/admin/master-data/${id}`,
      payload
    );
    return res.data;
  },

  toggleMasterDataStatus: async (id: string, status: 'active' | 'inactive') => {
    const res = await axiosInstance.patch<{ success: boolean; data: { item: MasterDataItem }; message: string }>(
      `/admin/master-data/${id}/status`,
      { status }
    );
    return res.data;
  },

  deleteMasterData: async (id: string) => {
    const res = await axiosInstance.delete<{ success: boolean; message: string }>(
      `/admin/master-data/${id}`
    );
    return res.data;
  },

  // ── Settings ──
  getSettings: async () => {
    const res = await axiosInstance.get<{ success: boolean; data: { settings: SystemSettings } }>(
      '/admin/settings'
    );
    return res.data.data.settings;
  },

  updateSettings: async (payload: Partial<{
    notifications: Partial<SystemSettings['notifications']>;
    config: Partial<SystemSettings['config']>;
    workflows?: any[];
  }>) => {
    const res = await axiosInstance.put<{ success: boolean; data: { settings: SystemSettings }; message: string }>(
      '/admin/settings',
      payload
    );
    return res.data;
  },
};
