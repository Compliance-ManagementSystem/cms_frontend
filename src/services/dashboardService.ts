import axiosInstance from '@/api/axiosInstance';

export type DashboardLevel = 'national' | 'state' | 'entity' | 'location';

export interface DashboardFilters {
  state?: string;
  entity?: string;
  location?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  period?: '30d' | '90d' | '1y' | 'all';
}

export interface DashboardKPIs {
  totalEntities: number;
  totalLocations: number;
  totalComplianceRecords: number;
  compliant: number;
  pending: number;
  expiringSoon: number;
  expired: number;
  compliancePercentage: number;
  overdueTasks: number;
  openTasks: number;
  completedTasks: number;
}

export interface TrafficLightSummary {
  overallRating: 'green' | 'yellow' | 'orange' | 'red';
  green: number;
  yellow: number;
  orange: number;
  red: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  color: string;
  statusKey: string;
}

export interface StateComplianceItem {
  state: string;
  total: number;
  compliant: number;
  pending: number;
  expiringSoon: number;
  expired: number;
  percentage: number;
}

export interface EntityComplianceItem {
  entityId: string;
  name: string;
  code: string;
  total: number;
  compliant: number;
  pending: number;
  expiringSoon: number;
  expired: number;
  percentage: number;
}

export interface LocationComplianceItem {
  locationId: string;
  name: string;
  code: string;
  entityName: string;
  state: string;
  total: number;
  compliant: number;
  pending: number;
  expiringSoon: number;
  expired: number;
  percentage: number;
}

export interface ExpiryTrendItem {
  month: string;
  expiring: number;
  expired: number;
  renewed: number;
}

export interface TaskTrendItem {
  month: string;
  open: number;
  completed: number;
  overdue: number;
}

export interface CriticalAlertItem {
  id: string;
  type: 'expired_compliance' | 'overdue_task' | 'missing_docs' | 'expiring_soon';
  title: string;
  entityName: string;
  locationName: string;
  severity: 'critical' | 'high' | 'medium';
  date: string;
  recordId?: string;
  taskId?: string;
}

export interface DashboardData {
  level: DashboardLevel;
  selectedState?: string;
  selectedEntity?: { _id: string; name: string; code: string };
  selectedLocation?: { _id: string; name: string; code: string };
  kpis: DashboardKPIs;
  trafficLights: TrafficLightSummary;
  charts: {
    statusDistribution: StatusDistributionItem[];
    stateWiseCompliance: StateComplianceItem[];
    entityWiseCompliance: EntityComplianceItem[];
    locationWiseCompliance: LocationComplianceItem[];
    expiryTrends: ExpiryTrendItem[];
    taskTrends: TaskTrendItem[];
  };
  criticalAlerts: CriticalAlertItem[];
}

export interface FilterOptions {
  states: string[];
  entities: Array<{ _id: string; name: string; code: string; state?: string }>;
  locations: Array<{ _id: string; name: string; code: string; entityId: string; state?: string }>;
  categories: Array<{ _id: string; name: string; code: string }>;
}

export const dashboardService = {
  async getDashboardStats(filters?: DashboardFilters): Promise<DashboardData> {
    const res = await axiosInstance.get('/dashboard/stats', { params: filters });
    return res.data.data;
  },

  async getFilterOptions(): Promise<FilterOptions> {
    const res = await axiosInstance.get('/dashboard/filters');
    return res.data.data;
  },
};
