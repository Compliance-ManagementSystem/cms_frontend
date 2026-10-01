/**
 * Report Service
 *
 * API client for querying statutory reports, filters, and streaming CSV/Excel exports.
 */

import axiosInstance from '@/api/axiosInstance';

export type ReportType =
  | 'compliance'
  | 'expiry'
  | 'pending'
  | 'overdue'
  | 'entities'
  | 'locations'
  | 'tasks';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  state?: string;
  entity?: string;
  location?: string;
  status?: string;
  category?: string;
  assignedUser?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReportResult<T = any> {
  reportType: ReportType;
  title: string;
  generatedAt: string;
  filtersApplied: Record<string, any>;
  summary: Record<string, number | string>;
  totalRecords: number;
  data: T[];
}

export interface FilterOptions {
  states: string[];
  entities: Array<{ _id: string; name: string; code: string; state?: string }>;
  locations: Array<{ _id: string; name: string; code: string; entityId: string; state?: string }>;
  categories: Array<{ _id: string; name: string; code: string }>;
  users: Array<{ _id: string; name: string; email: string }>;
}

export const reportService = {
  /**
   * Fetch report data preview and metrics
   */
  async getReport<T = any>(type: ReportType, filters: ReportFilters = {}): Promise<ReportResult<T>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') {
        params.append(k, String(v));
      }
    });

    const response = await axiosInstance.get(`/reports/${type}?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Fetch dynamic filter dropdown options
   */
  async getFilters(): Promise<FilterOptions> {
    const response = await axiosInstance.get('/reports/filters');
    return response.data.data;
  },

  /**
   * Download CSV export
   */
  async downloadCsv(type: ReportType, filters: ReportFilters = {}) {
    const params = new URLSearchParams();
    params.append('type', type);
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') {
        params.append(k, String(v));
      }
    });

    const response = await axiosInstance.get(`/reports/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Download Excel XML export
   */
  async downloadExcel(type: ReportType, filters: ReportFilters = {}) {
    const params = new URLSearchParams();
    params.append('type', type);
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') {
        params.append(k, String(v));
      }
    });

    const response = await axiosInstance.get(`/reports/export/excel?${params.toString()}`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}_report_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
