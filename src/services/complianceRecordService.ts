/**
 * Compliance Record Service
 *
 * Client API integration for Compliance Records, status lifecycle transitions,
 * document management, versioning, and download/preview streaming.
 */

import axiosInstance from '@/api/axiosInstance';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ComplianceRecordStatus =
  | 'pending'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'correction'
  | 'resubmitted'
  | 'expiring_soon'
  | 'expired'
  | 'in_progress'
  | 'not_applicable';

export type WorkflowAction =
  | 'Submit'
  | 'Start Review'
  | 'Approve'
  | 'Reject'
  | 'Request Correction'
  | 'Resubmit';

export interface WorkflowActionInfo {
  action: WorkflowAction;
  label: string;
  targetStatus: ComplianceRecordStatus;
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  requiresComments: boolean;
  description: string;
  disabledReason?: string;
}

export interface DocumentRequirementItem {
  documentTypeId: string | null;
  documentTypeCode?: string;
  label: string;
  isMandatory: boolean;
  status: 'missing' | 'pending' | 'verified' | 'rejected';
  documents: Array<{
    _id: string;
    name: string;
    verificationStatus: string;
    currentVersion: number;
  }>;
}

export interface ApprovalRecordItem {
  _id: string;
  complianceRecord: string;
  action: WorkflowAction;
  performedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName?: string;
    role?: any;
    avatar?: string;
  };
  performedAt: string;
  comments?: string;
  previousStatus: string;
  newStatus: string;
  createdAt: string;
}

export interface WorkflowApprovalsResponse {
  currentStatus: ComplianceRecordStatus;
  approvals: ApprovalRecordItem[];
  availableActions: WorkflowActionInfo[];
  documentRequirements?: DocumentRequirementItem[];
}

export interface DocumentVersionItem {
  _id: string;
  version: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName?: string;
  };
  uploadedAt: string;
  notes?: string;
  status: 'active' | 'superseded' | 'archived';
}

export interface DocumentItem {
  _id: string;
  name: string;
  title?: string;
  type?: string;
  // Populated on the detail view, a bare id on list responses
  documentType?:
    | string
    | {
        _id: string;
        code: string;
        label: string;
      };
  description?: string;
  entity: string | { _id: string; name: string };
  location?: string | { _id: string; name: string };
  complianceRecord?: string;
  version: number;
  currentVersion: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName?: string;
  };
  uploadedAt: string;
  expiryDate?: string;
  issueDate?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName?: string;
  };
  verifiedAt?: string;
  verificationNotes?: string;
  versions: DocumentVersionItem[];
  status: 'active' | 'archived' | 'superseded';
}

export interface ApprovalTrailItem {
  _id: string;
  level: number;
  approver: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName?: string;
    role?: any;
  };
  decision: 'pending' | 'approved' | 'rejected' | 'escalated';
  comments?: string;
  decidedAt?: string;
  requestedAt: string;
}

export interface ComplianceRecordItem {
  _id: string;
  recordNumber: string;
  entity: {
    _id: string;
    name: string;
    entityCode: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: {
      city?: string;
      state?: string;
    };
  };
  location: {
    _id: string;
    name: string;
    locationCode: string;
    address?: {
      city?: string;
      state?: string;
    };
    manager?: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  rule: {
    _id: string;
    name: string;
    code: string;
    description?: string;
    legalReference?: string;
    priority?: string;
    renewalCycle?: number;
    category?: {
      _id: string;
      code: string;
      label: string;
    };
    frequency?: {
      _id: string;
      code: string;
      label: string;
    };
    requiredDocuments?: Array<{
      documentType: {
        _id: string;
        code: string;
        label: string;
      };
      label: string;
      isMandatory: boolean;
    }>;
  };
  status: ComplianceRecordStatus;
  assignedUser?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName?: string;
  };
  dueDate?: string;
  submissionDate?: string;
  approvalDate?: string;
  expiryDate?: string;
  comments?: string;
  notes?: string;
  internalNotes?: string;
  currentVersion: number;
  documents: DocumentItem[];
  approvals: ApprovalTrailItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RecordQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  entity?: string;
  location?: string;
  rule?: string;
  status?: string; // single status or comma-separated list
  overdue?: 'true';
  assignedUser?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  expiryDateFrom?: string;
  expiryDateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateRecordPayload {
  entity: string;
  location: string;
  rule: string;
  assignedUser?: string;
  dueDate?: string;
  expiryDate?: string;
  comments?: string;
  notes?: string;
  status?: ComplianceRecordStatus;
}

export interface UpdateRecordPayload {
  assignedUser?: string;
  dueDate?: string;
  expiryDate?: string;
  submissionDate?: string;
  approvalDate?: string;
  comments?: string;
  notes?: string;
  status?: ComplianceRecordStatus;
}

export interface UpdateRecordStatusPayload {
  status: ComplianceRecordStatus;
  comments?: string;
  decision?: 'pending' | 'approved' | 'rejected' | 'escalated';
}

// ── Service Methods ───────────────────────────────────────────────────────────

export const complianceRecordService = {
  // ── Records ──
  getRecords: async (params?: RecordQueryParams) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: {
        records: ComplianceRecordItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
        metrics: Record<string, number>;
      };
    }>('/compliance/records', { params });
    return res.data.data;
  },

  getRecordById: async (id: string) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: { record: ComplianceRecordItem };
    }>(`/compliance/records/${id}`);
    return res.data.data.record;
  },

  createRecord: async (payload: CreateRecordPayload) => {
    const res = await axiosInstance.post<{
      success: boolean;
      data: { record: ComplianceRecordItem };
      message: string;
    }>('/compliance/records', payload);
    return res.data;
  },

  updateRecord: async (id: string, payload: UpdateRecordPayload) => {
    const res = await axiosInstance.put<{
      success: boolean;
      data: { record: ComplianceRecordItem };
      message: string;
    }>(`/compliance/records/${id}`, payload);
    return res.data;
  },

  updateRecordStatus: async (id: string, payload: UpdateRecordStatusPayload) => {
    const res = await axiosInstance.patch<{
      success: boolean;
      data: { record: ComplianceRecordItem };
      message: string;
    }>(`/compliance/records/${id}/status`, payload);
    return res.data;
  },

  generateRecordsForLocation: async (locationId: string) => {
    const res = await axiosInstance.post<{
      success: boolean;
      data: { createdCount: number; records: any[]; location: string };
      message: string;
    }>('/compliance/records/generate-for-location', { locationId });
    return res.data;
  },

  deleteRecord: async (id: string) => {
    const res = await axiosInstance.delete<{
      success: boolean;
      message: string;
    }>(`/compliance/records/${id}`);
    return res.data;
  },

  // ── Documents ──
  uploadDocument: async (formData: FormData) => {
    const res = await axiosInstance.post<{
      success: boolean;
      data: { document: DocumentItem };
      message: string;
    }>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  replaceDocument: async (id: string, formData: FormData) => {
    const res = await axiosInstance.post<{
      success: boolean;
      data: { document: DocumentItem };
      message: string;
    }>(`/documents/${id}/replace`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getDocumentById: async (id: string) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: { document: DocumentItem };
    }>(`/documents/${id}`);
    return res.data.data.document;
  },

  verifyDocument: async (
    id: string,
    payload: { verificationStatus: 'verified' | 'rejected' | 'pending'; notes?: string }
  ) => {
    const res = await axiosInstance.patch<{
      success: boolean;
      data: { document: DocumentItem };
      message: string;
    }>(`/documents/${id}/verify`, payload);
    return res.data;
  },

  deleteDocument: async (id: string) => {
    const res = await axiosInstance.delete<{
      success: boolean;
      message: string;
    }>(`/documents/${id}`);
    return res.data;
  },

  // Files are fetched through axios so the request carries the Bearer token;
  // a plain link or iframe src cannot authenticate against the API.
  fetchDocumentFile: async (id: string, options?: { version?: number; inline?: boolean }) => {
    const res = await axiosInstance.get<Blob>(
      `/documents/${id}/${options?.inline ? 'preview' : 'download'}`,
      {
        params: options?.version ? { version: options.version } : undefined,
        responseType: 'blob',
        timeout: 0,
      }
    );
    return res.data;
  },

  // ── Workflow Endpoints ──────────────────────────────────────────────────────
  executeWorkflowAction: async (
    id: string,
    payload: { action: WorkflowAction; comments?: string }
  ) => {
    const res = await axiosInstance.post<{
      success: boolean;
      data: { record: ComplianceRecordItem; approval: ApprovalRecordItem };
      message: string;
    }>(`/compliance/records/${id}/workflow`, payload);
    return res.data;
  },

  getRecordApprovals: async (id: string) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: WorkflowApprovalsResponse;
    }>(`/compliance/records/${id}/approvals`);
    return res.data.data;
  },
};

export default complianceRecordService;
