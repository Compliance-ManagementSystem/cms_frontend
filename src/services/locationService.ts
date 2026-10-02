/**
 * Location Service
 *
 * Client API integration for Location Master Management.
 */

import axiosInstance from '@/api/axiosInstance';
import type { EntityAddress } from './entityService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocationAgreement {
  _id?: string;
  agreementType: string;
  agreementNumber: string;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  parties?: string[];
  notes?: string;
}

export interface LocationItem {
  _id: string;
  name: string;
  code: string;
  locationCode: string;
  entity?: {
    _id: string;
    name: string;
    code: string;
    entityCode?: string;
    status?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: EntityAddress;
  } | null;
  locationType: {
    _id: string;
    code: string;
    label: string;
    description?: string;
  };
  address: EntityAddress;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  manager?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role?: {
      name: string;
      code: string;
    };
  } | null;
  openingDate?: string;
  description?: string;
  area?: number;
  areaUnit?: 'sqft' | 'sqm';
  operatingHours?: string;
  parentLocation?: {
    _id: string;
    name: string;
    code: string;
  } | null;
  agreements?: LocationAgreement[];
  status: 'active' | 'inactive' | 'archived';
  complianceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationDetailData {
  location: LocationItem;
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
    validFrom: string;
    validTo: string;
    complianceRule?: {
      name: string;
      code: string;
      category?: string;
      frequency?: string;
      riskLevel?: string;
    };
    createdAt: string;
  }>;
  documents: Array<{
    _id: string;
    title: string;
    documentType?: { code: string; label: string };
    fileUrl?: string;
    latestVersionUrl?: string;
    issueDate?: string;
    expiryDate?: string;
    status: string;
    createdAt: string;
  }>;
  licences: Array<{
    _id: string;
    licenceNumber: string;
    licenceType?: { code: string; label: string };
    issuingAuthority?: string;
    issueDate?: string;
    expiryDate?: string;
    fileUrl?: string;
    latestVersionUrl?: string;
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

export interface LocationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  entity?: string;
  locationType?: string;
  state?: string;
  district?: string;
  city?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateLocationPayload {
  name: string;
  code?: string;
  locationCode?: string;
  entity: string;
  locationType: string;
  address: EntityAddress;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  manager?: string | null;
  openingDate?: string | null;
  description?: string;
  area?: number | null;
  areaUnit?: 'sqft' | 'sqm';
  operatingHours?: string;
  parentLocation?: string | null;
  status?: 'active' | 'inactive' | 'archived';
}

export interface UpdateLocationPayload extends Partial<CreateLocationPayload> {
  agreements?: LocationAgreement[];
}

// ── Service Methods ───────────────────────────────────────────────────────────

export const locationService = {
  getLocations: async (params?: LocationQueryParams) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: {
        locations: LocationItem[];
        pagination: {
          total: number;
          activeCount?: number;
          totalCompliance?: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }>('/locations', { params });
    return res.data.data;
  },

  getLocationById: async (id: string) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: LocationDetailData;
    }>(`/locations/${id}`);
    return res.data.data;
  },

  createLocation: async (payload: CreateLocationPayload) => {
    const res = await axiosInstance.post<{
      success: boolean;
      data: { location: LocationItem };
      message: string;
    }>('/locations', payload);
    return res.data;
  },

  updateLocation: async (id: string, payload: UpdateLocationPayload) => {
    const res = await axiosInstance.put<{
      success: boolean;
      data: { location: LocationItem };
      message: string;
    }>(`/locations/${id}`, payload);
    return res.data;
  },

  deleteLocation: async (id: string) => {
    const res = await axiosInstance.delete<{
      success: boolean;
      message: string;
    }>(`/locations/${id}`);
    return res.data;
  },
};
