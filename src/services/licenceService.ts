/**
 * Licence Service
 *
 * Statutory licences held by a location. Requests are multipart because a
 * certificate file can travel with the details.
 */

import axiosInstance from '@/api/axiosInstance';

export type LicenceStatus = 'active' | 'expired' | 'pending_renewal' | 'cancelled' | 'suspended';

export interface LicenceItem {
  _id: string;
  licenceNumber: string;
  licenceType?: { _id: string; code: string; label: string };
  issuingAuthority?: string;
  issuingState?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  /** Certificate file, when one has been uploaded */
  document?: { _id: string; name: string; fileName: string; currentVersion: number } | null;
  status: LicenceStatus;
  createdAt: string;
}

export interface LicencePayload {
  licenceType: string;
  licenceNumber: string;
  issuingAuthority: string;
  issuingState?: string;
  issueDate: string;
  expiryDate: string;
  status?: Exclude<LicenceStatus, 'expired'>;
  notes?: string;
}

const toFormData = (fields: Record<string, string | undefined>, file?: File | null): FormData => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) form.append(key, value);
  });
  if (file) form.append('file', file);
  return form;
};

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 };

export const licenceService = {
  createLicence: async (locationId: string, payload: LicencePayload, file?: File | null) => {
    const res = await axiosInstance.post<{ success: boolean; data: { licence: LicenceItem }; message: string }>(
      '/licences',
      toFormData({ location: locationId, ...payload }, file),
      MULTIPART
    );
    return res.data;
  },

  updateLicence: async (id: string, payload: Partial<LicencePayload>, file?: File | null) => {
    const res = await axiosInstance.put<{ success: boolean; data: { licence: LicenceItem }; message: string }>(
      `/licences/${id}`,
      toFormData(payload, file),
      MULTIPART
    );
    return res.data;
  },

  deleteLicence: async (id: string) => {
    const res = await axiosInstance.delete<{ success: boolean; message: string }>(`/licences/${id}`);
    return res.data;
  },
};
