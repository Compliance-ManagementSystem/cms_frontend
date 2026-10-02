/**
 * Lookup Service
 *
 * Read-only reference data for dropdowns (master data, assignable users).
 * Unlike the administration endpoints, these are available to every signed-in user.
 */

import axiosInstance from '@/api/axiosInstance';
import type { MasterDataItem } from './adminService';

export interface LookupUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: { _id: string; name: string; code: string };
  entity?: string | null;
}

export const lookupService = {
  /** Active master data items of one category, in display order */
  getMasterData: async (params: { category: string; parent?: string }) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: { items: MasterDataItem[]; total: number; category: string };
    }>('/lookups/master-data', { params });
    return res.data.data;
  },

  /** Active users within the caller's scope, optionally narrowed to one entity */
  getUsers: async (entity?: string) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: { users: LookupUser[] };
    }>('/lookups/users', { params: entity ? { entity } : {} });
    return res.data.data;
  },
};
