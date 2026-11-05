/**
 * Location Service
 *
 * Client API integration for Location Master Management.
 */

import axiosInstance from '@/api/axiosInstance';
import type { EntityAddress } from './entityService';
import type { LicenceItem } from './licenceService';
import type { ManpowerStatus } from './manpowerService';

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

export type AreaType = 'GP' | 'NAC' | 'MUN';
export type OperatingModel = 'CoCo' | 'CoDo';

export const AREA_TYPE_LABELS: Record<AreaType, string> = {
  GP: 'Gram Panchayat (GP)',
  NAC: 'Notified Area Council (NAC)',
  MUN: 'Municipality (MUN)',
};

export const OPERATING_MODEL_LABELS: Record<OperatingModel, string> = {
  CoCo: 'Company owned, company operated (CoCo)',
  CoDo: 'Company owned, dealer operated (CoDo)',
};

/** Another group company operating at the same unit */
export interface LocationCoEntity {
  entity: { _id: string; name: string; code: string } | null;
  openingDate?: string;
}

export interface LocationHealth {
  total: number;
  compliant: number;
  expiringSoon: number;
  pending: number;
  expired: number;
  /** Share of records currently valid (compliant + expiring soon) */
  percentage: number;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
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
  geoCoordinates?: GeoCoordinates | null;
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
  /** Name of the Unit In-charge */
  unitIncharge?: string;
  /** Name of the COM (Clinic Operations Manager) */
  com?: string;
  /** Report cluster the clinic belongs to, e.g. Puri, CTTK */
  cluster?: string;
  /** Clinic photo keys; the first is the avatar */
  photos?: string[];
  noticePhoto?: string | null;
  openingDate?: string;
  /** Planned unit with no opening date fixed yet */
  isUpcoming?: boolean;
  closingDate?: string;
  areaType?: AreaType;
  operatingModel?: OperatingModel;
  coEntities?: LocationCoEntity[];
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
  /** Compliance health of this location's records (list responses) */
  health?: LocationHealth;
  /** Whether doctors, nurses and DMLT/phlebo are in place with their documents (list responses) */
  manpower?: { ready: boolean; issueCount: number };
  createdAt: string;
  updatedAt: string;
}

export interface LocationDetailData {
  location: LocationItem;
  health: LocationHealth;
  manpower?: ManpowerStatus;
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
  licences: LicenceItem[];
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
  areaType?: AreaType;
  status?: string;
  /** Only locations with at least one expired compliance record */
  attention?: 'true';
  /** Locations whose manpower is, or is not, ready for licence applications */
  manpower?: 'ready' | 'not_ready';
  /** Units already opened, or planned ones (marked TBO or opening in the future) */
  opening?: 'opened' | 'upcoming';
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
  geoCoordinates?: GeoCoordinates | null;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  manager?: string | null;
  /** Name of the Unit In-charge */
  unitIncharge?: string;
  /** Name of the COM (Clinic Operations Manager) */
  com?: string;
  /** Report cluster the clinic belongs to, e.g. Puri, CTTK */
  cluster?: string;
  /** Clinic photo keys; the first is the avatar */
  photos?: string[];
  noticePhoto?: string | null;
  openingDate?: string | null;
  isUpcoming?: boolean;
  closingDate?: string | null;
  areaType?: AreaType | null;
  operatingModel?: OperatingModel | null;
  coEntities?: Array<{ entity: string; openingDate?: string | null }>;
  description?: string;
  area?: number | null;
  areaUnit?: 'sqft' | 'sqm';
  operatingHours?: string;
  parentLocation?: string | null;
  status?: 'active' | 'inactive' | 'archived';
  agreements?: LocationAgreement[];
}

export type UpdateLocationPayload = Partial<CreateLocationPayload>;

// ── Service Methods ───────────────────────────────────────────────────────────

/** True when the entity owns the unit or is one of the other companies operating there */
export const operatesAt = (location: LocationItem, entityId: string): boolean => {
  const owner = location.entity as unknown as string | { _id: string } | null | undefined;
  return (
    (typeof owner === 'string' ? owner : owner?._id) === entityId ||
    (location.coEntities || []).some((co) => co.entity?._id === entityId)
  );
};

export const locationService = {
  getLocations: async (params?: LocationQueryParams) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: {
        locations: LocationItem[];
        pagination: {
          total: number;
          activeCount?: number;
          inactiveCount?: number;
          attentionCount?: number;
          totalCompliance?: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }>('/locations', { params });
    return res.data.data;
  },

  /** Every matching location, for dropdowns. The list endpoint returns at most 100 a page. */
  /** COMs and clusters already on units: each COM with its units' clusters, most common first */
  getPeopleOptions: async (): Promise<{ coms: Array<{ name: string; clusters: string[] }>; clusters: string[] }> => {
    const res = await axiosInstance.get('/locations/people-options');
    return res.data.data;
  },

  getAllLocations: async (params?: Omit<LocationQueryParams, 'page' | 'limit'>) => {
    const first = await locationService.getLocations({ ...params, page: 1, limit: 100 });
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, i) =>
        locationService.getLocations({ ...params, page: i + 2, limit: 100 })
      )
    );
    return { locations: [first, ...rest].flatMap((page) => page.locations) };
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

  /** Uploads one photo and returns its key, to be saved on the location */
  uploadPhoto: async (file: File) => {
    const body = new FormData();
    body.append('photo', file);
    // The shared instance defaults to JSON, which would hide the file from the server
    const res = await axiosInstance.post<{ success: boolean; data: { key: string } }>('/locations/photos', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
    });
    return res.data.data.key;
  },

  discardPhoto: async (key: string) => {
    await axiosInstance.delete(`/locations/photos/${key}`);
  },

  getPhotoUrl: async (key: string, size: 'full' | 'thumb') => {
    const res = await axiosInstance.get<{ success: boolean; data: { url: string } }>(`/locations/photos/${key}`, {
      params: { size },
    });
    return res.data.data.url;
  },
};
