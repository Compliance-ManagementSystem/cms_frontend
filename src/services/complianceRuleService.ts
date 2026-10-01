/**
 * Compliance Rule Service
 *
 * Client API integration for Compliance Rule Engine configuration and evaluation.
 */

import axiosInstance from '@/api/axiosInstance';
import type { MasterDataItem } from './adminService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RequiredDocumentItem {
  documentType: {
    _id: string;
    code: string;
    label: string;
    description?: string;
  };
  label: string;
  isMandatory: boolean;
}

export interface NotificationRuleConfig {
  reminderDays: number[];
  notifyRoles: string[];
  channels: string[];
}

export interface EscalationRuleConfig {
  escalateAfterDays: number;
  escalateToRole: string;
  autoTaskCreation: boolean;
  escalationMessage?: string;
}

export interface ComplianceRuleItem {
  _id: string;
  name: string;
  code: string;
  description?: string;
  legalReference?: string;
  category: {
    _id: string;
    code: string;
    label: string;
    description?: string;
  };
  frequency: {
    _id: string;
    code: string;
    label: string;
    description?: string;
  };
  renewalFrequency?: string;
  renewalCycle: number;
  reminderDaysBefore: number[];
  applicableEntityTypes: MasterDataItem[];
  applicableLocationTypes: MasterDataItem[];
  applicableStates: string[];
  requiredDocuments: RequiredDocumentItem[];
  mandatory: boolean;
  active: boolean;
  status: 'active' | 'inactive' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  notificationRules?: NotificationRuleConfig;
  escalationRules?: EscalationRuleConfig;
  createdAt: string;
  updatedAt: string;
}

export interface RuleEvaluationResult {
  isApplicable: boolean;
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  category?: string;
  mandatory: boolean;
  reasons: string[];
  matches: {
    statusMatch: boolean;
    entityTypeMatch: boolean;
    locationTypeMatch: boolean;
    stateMatch: boolean;
  };
}

export interface RuleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  frequency?: string;
  status?: string;
  mandatory?: string;
  entityType?: string;
  locationType?: string;
  state?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateRulePayload {
  name: string;
  code?: string;
  description?: string;
  legalReference?: string;
  category: string;
  frequency: string;
  renewalFrequency?: string;
  renewalCycle?: number;
  applicableEntityTypes?: string[];
  applicableLocationTypes?: string[];
  applicableStates?: string[];
  requiredDocuments?: Array<{
    documentType: string;
    label: string;
    isMandatory?: boolean;
  }>;
  mandatory?: boolean;
  active?: boolean;
  status?: 'active' | 'inactive' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  notificationRules?: NotificationRuleConfig;
  escalationRules?: EscalationRuleConfig;
}

export interface UpdateRulePayload extends Partial<CreateRulePayload> {}

// ── Service Methods ───────────────────────────────────────────────────────────

export const complianceRuleService = {
  getRules: async (params?: RuleQueryParams) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: {
        rules: ComplianceRuleItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      };
    }>('/compliance/rules', { params });
    return res.data.data;
  },

  getRuleById: async (id: string) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: { rule: ComplianceRuleItem };
    }>(`/compliance/rules/${id}`);
    return res.data.data.rule;
  },

  createRule: async (payload: CreateRulePayload) => {
    const res = await axiosInstance.post<{
      success: boolean;
      data: { rule: ComplianceRuleItem };
      message: string;
    }>('/compliance/rules', payload);
    return res.data;
  },

  updateRule: async (id: string, payload: UpdateRulePayload) => {
    const res = await axiosInstance.put<{
      success: boolean;
      data: { rule: ComplianceRuleItem };
      message: string;
    }>(`/compliance/rules/${id}`, payload);
    return res.data;
  },

  toggleRuleStatus: async (id: string) => {
    const res = await axiosInstance.patch<{
      success: boolean;
      data: { rule: ComplianceRuleItem };
      message: string;
    }>(`/compliance/rules/${id}/status`);
    return res.data;
  },

  deleteRule: async (id: string) => {
    const res = await axiosInstance.delete<{
      success: boolean;
      message: string;
    }>(`/compliance/rules/${id}`);
    return res.data;
  },

  evaluateApplicability: async (payload: {
    ruleId?: string;
    entityId?: string;
    locationId?: string;
  }) => {
    const res = await axiosInstance.post<{
      success: boolean;
      data: any;
    }>('/compliance/rules/evaluate', payload);
    return res.data.data;
  },
};
