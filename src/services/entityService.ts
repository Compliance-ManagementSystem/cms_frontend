/**
 * Entity Service
 *
 * Client API integration for Entity Management.
 */

import axiosInstance from '@/api/axiosInstance';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EntityAddress {
  line1: string;
  line2?: string;
  city: string;
  district?: string;
  state: string;
  pincode?: string;
  country: string;
}

/** Compliance health across an entity's records, same definition as the dashboard */
export interface EntityHealth {
  total: number;
  compliant: number;
  expiringSoon: number;
  pending: number;
  expired: number;
  percentage: number;
}

export interface EntityItem {
  _id: string;
  name: string;
  code: string;
  entityCode: string;
  entityType: {
    _id: string;
    code: string;
    label: string;
    description?: string;
  };
  owner?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone?: string;
  } | null;
  registrationNumber?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  address: EntityAddress;
  contactEmail: string;
  contactPhone: string;
  contactPerson?: string;
  industry?: {
    _id: string;
    code: string;
    label: string;
  } | null;
  parentEntity?: {
    _id: string;
    name: string;
    code: string;
  } | null;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  locationCount?: number;
  complianceCount?: number;
  /** Present on list rows */
  health?: EntityHealth;
  createdAt: string;
  updatedAt: string;
}

export interface EntityDetailData {
  entity: EntityItem;
  health: EntityHealth;
  locations: Array<{
    _id: string;
    name: string;
    code: string;
    locationType?: { code: string; label: string };
    address: EntityAddress;
    status: string;
    createdAt: string;
  }>;
  complianceStats: {
    total: number;
    approved: number;
    pending: number;
    expired: number;
    rejected: number;
  };
  complianceRecords: Array<{
    _id: string;
    recordNumber: string;
    status: string;
    dueDate?: string;
    expiryDate?: string;
    complianceRule?: {
      name: string;
      code: string;
      category?: { code: string; label: string } | null;
      priority?: string;
    };
    location?: { name: string; code: string };
    createdAt: string;
  }>;
  documents: Array<{
    _id: string;
    title: string;
    documentType?: { code: string; label: string };
    latestVersionUrl?: string;
    issueDate?: string;
    expiryDate?: string;
    status: string;
    createdAt: string;
  }>;
  tasks: Array<{
    _id: string;
    title: string;
    priority: string;
    status: string;
    dueDate: string;
    assignedTo?: { firstName: string; lastName: string; email: string };
    location?: { name: string; code: string };
  }>;
  auditLogs: Array<{
    _id: string;
    action: string;
    resource: string;
    actorEmail?: string;
    actorRole?: string;
    description: string;
    createdAt: string;
  }>;
}

export interface EntityQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  status?: string;
  state?: string;
  district?: string;
  city?: string;
  /** 'true' keeps only entities with expired compliance records */
  attention?: 'true' | 'false';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateEntityPayload {
  name: string;
  code?: string;
  entityCode?: string;
  entityType: string;
  owner?: string | null;
  registrationNumber?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  address: EntityAddress;
  contactEmail: string;
  contactPhone: string;
  contactPerson?: string;
  industry?: string | null;
  parentEntity?: string | null;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
}

export interface UpdateEntityPayload extends Partial<CreateEntityPayload> {}

// ── Service Methods ───────────────────────────────────────────────────────────

export const entityService = {
  getEntities: async (params?: EntityQueryParams) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: {
        entities: EntityItem[];
        pagination: {
          total: number;
          activeCount?: number;
          inactiveCount?: number;
          attentionCount?: number;
          totalLocations?: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }>('/entities', { params });
    return res.data.data;
  },

  getEntityById: async (id: string) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: EntityDetailData;
    }>(`/entities/${id}`);
    return res.data.data;
  },

  createEntity: async (payload: CreateEntityPayload) => {
    const res = await axiosInstance.post<{
      success: boolean;
      data: { entity: EntityItem };
      message: string;
    }>('/entities', payload);
    return res.data;
  },

  updateEntity: async (id: string, payload: UpdateEntityPayload) => {
    const res = await axiosInstance.put<{
      success: boolean;
      data: { entity: EntityItem };
      message: string;
    }>(`/entities/${id}`, payload);
    return res.data;
  },

  deleteEntity: async (id: string) => {
    const res = await axiosInstance.delete<{
      success: boolean;
      message: string;
    }>(`/entities/${id}`);
    return res.data;
  },
};
