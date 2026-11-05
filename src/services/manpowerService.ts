/**
 * Manpower Service
 *
 * Doctors, nurses and DMLT/phlebo staff at each location, their documents,
 * and the admin-managed list of documents each role needs.
 */

import axiosInstance from '@/api/axiosInstance';

export type ManpowerRole = 'DOCTOR' | 'NURSE' | 'DMLT_PHLEBO';

export interface ManpowerRoleOption {
  code: ManpowerRole;
  label: string;
}

export interface ManpowerRequirement {
  _id: string;
  role: ManpowerRole;
  code: string;
  label: string;
  isMandatory: boolean;
}

/** missing: not uploaded; pending: uploaded, not yet verified */
export type StaffDocumentState = 'missing' | 'pending' | 'verified' | 'rejected' | 'expired';

export interface StaffDocumentLine {
  requirement: ManpowerRequirement;
  state: StaffDocumentState;
  expiringSoon: boolean;
  document: {
    _id: string;
    name: string;
    fileName: string;
    expiryDate?: string;
    verificationStatus: string;
    currentVersion: number;
    uploadedAt: string;
  } | null;
}

export interface StaffMember {
  _id: string;
  role: ManpowerRole;
  name: string;
  qualification?: string;
  registrationNumber?: string;
  phone?: string;
  joiningDate?: string;
  documents: StaffDocumentLine[];
}

export interface ManpowerStatus {
  ready: boolean;
  roles: Array<{ role: ManpowerRole; label: string; staffCount: number; completeCount: number }>;
  /** Plain-language reasons the location is not ready */
  issues: string[];
}

export interface LocationManpower {
  status: ManpowerStatus;
  requirements: ManpowerRequirement[];
  staff: StaffMember[];
  roles: ManpowerRoleOption[];
  minPerRole: number;
}

export interface StaffPayload {
  role?: ManpowerRole;
  name: string;
  qualification?: string;
  registrationNumber?: string;
  phone?: string;
  joiningDate?: string;
}

export const manpowerService = {
  getLocationManpower: async (locationId: string) => {
    const res = await axiosInstance.get<{ success: boolean; data: LocationManpower }>(
      `/manpower/locations/${locationId}`
    );
    return res.data.data;
  },

  createStaff: async (locationId: string, payload: StaffPayload) => {
    const res = await axiosInstance.post(`/manpower/locations/${locationId}/staff`, payload);
    return res.data;
  },

  updateStaff: async (staffId: string, payload: StaffPayload) => {
    const res = await axiosInstance.put(`/manpower/staff/${staffId}`, payload);
    return res.data;
  },

  removeStaff: async (staffId: string) => {
    const res = await axiosInstance.delete(`/manpower/staff/${staffId}`);
    return res.data;
  },

  /** Uploads one required document; replaces the earlier file as a new version if there is one */
  uploadStaffDocument: async (staffId: string, form: FormData) => {
    const res = await axiosInstance.post(`/manpower/staff/${staffId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getRequirements: async () => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: { requirements: ManpowerRequirement[]; roles: ManpowerRoleOption[]; minPerRole: number };
    }>('/manpower/requirements');
    return res.data.data;
  },

  createRequirement: async (payload: { role: ManpowerRole; label: string; isMandatory: boolean }) => {
    const res = await axiosInstance.post('/manpower/requirements', payload);
    return res.data;
  },

  updateRequirement: async (id: string, payload: { label?: string; isMandatory?: boolean }) => {
    const res = await axiosInstance.put(`/manpower/requirements/${id}`, payload);
    return res.data;
  },

  removeRequirement: async (id: string) => {
    const res = await axiosInstance.delete(`/manpower/requirements/${id}`);
    return res.data;
  },
};
