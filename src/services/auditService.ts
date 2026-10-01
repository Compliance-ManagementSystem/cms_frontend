/**
 * Audit Log Service
 *
 * Client API for querying, filtering, and inspecting immutable audit logs.
 */

import axiosInstance from '@/api/axiosInstance';

export interface AuditLogItem {
  id: string;
  user: {
    id?: string;
    name: string;
    email: string;
    role?: string;
  };
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  recordId: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  diff?: Record<string, { before: any; after: any }>;
  metadata?: Record<string, any>;
  description: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface AuditFilters {
  search?: string;
  userId?: string;
  module?: string;
  action?: string;
  entityType?: string;
  recordId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditFilterOptions {
  modules: string[];
  actions: string[];
  entityTypes: string[];
  users: Array<{ id: string; name: string; email: string }>;
}

export interface PaginatedAuditLogs {
  logs: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const auditService = {
  /**
   * Fetch paginated and filtered audit logs
   */
  async getAuditLogs(filters: AuditFilters = {}): Promise<PaginatedAuditLogs> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') {
        params.append(k, String(v));
      }
    });

    const response = await axiosInstance.get(`/audit-logs?${params.toString()}`);
    return {
      logs: response.data.data,
      pagination: response.data.meta || {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total: response.data.data?.length || 0,
        totalPages: 1,
      },
    };
  },

  /**
   * Fetch single audit log by ID
   */
  async getAuditLogById(id: string): Promise<AuditLogItem> {
    const response = await axiosInstance.get(`/audit-logs/${id}`);
    return response.data.data;
  },

  /**
   * Fetch filter options
   */
  async getFilterOptions(): Promise<AuditFilterOptions> {
    const response = await axiosInstance.get('/audit-logs/filters');
    return response.data.data;
  },
};
