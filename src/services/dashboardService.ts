import axiosInstance from '@/api/axiosInstance';

export type DashboardLevel = 'national' | 'state' | 'entity' | 'location';

export interface DashboardFilters {
  state?: string;
  entity?: string;
  location?: string;
  category?: string;
}

export type DashboardRating = 'green' | 'yellow' | 'orange' | 'red';

// Every record is in exactly one bucket; "expiring soon" means valid but expiring within 30 days
export type HealthBucket = 'compliant' | 'expiringSoon' | 'pending' | 'expired';

export interface HealthCounts {
  total: number;
  compliant: number;
  expiringSoon: number;
  pending: number;
  expired: number;
  /** Share of records currently valid (compliant + expiring soon) */
  percentage: number;
}

export interface DashboardKPIs extends Omit<HealthCounts, 'percentage'> {
  /** null when there are no records to score */
  compliancePercentage: number | null;
  openTasks: number;
  overdueTasks: number;
}

export interface StatusDistributionItem {
  bucket: HealthBucket;
  name: string;
  value: number;
  color: string;
}

export interface StateComplianceItem extends HealthCounts {
  state: string;
}

export interface EntityComplianceItem extends HealthCounts {
  entityId: string;
  name: string;
  code: string;
}

export interface LocationComplianceItem extends HealthCounts {
  locationId: string;
  name: string;
  code: string;
  entityName: string;
  state: string;
}

export interface CategoryComplianceItem extends HealthCounts {
  categoryId: string;
  name: string;
}

export interface TaskWorkloadItem {
  userId: string;
  name: string;
  /** Active tasks still within their due date */
  onTime: number;
  overdue: number;
}

export interface OverdueAgeingItem {
  bucket: string;
  tasks: number;
}

export interface UpcomingExpiryItem {
  month: string;
  expiring: number;
}

export interface DashboardAlert {
  id: string;
  type: 'expired_compliance' | 'overdue_task' | 'critical_task';
  title: string;
  entityName: string;
  locationName: string;
  severity: 'critical' | 'high';
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
  /** null when the current selection has no records */
  overallRating: DashboardRating | null;
  charts: {
    statusDistribution: StatusDistributionItem[];
    stateWiseCompliance: StateComplianceItem[];
    entityWiseCompliance: EntityComplianceItem[];
    locationWiseCompliance: LocationComplianceItem[];
    categoryWiseCompliance: CategoryComplianceItem[];
    upcomingExpiries: UpcomingExpiryItem[];
    taskWorkload: TaskWorkloadItem[];
    overdueAgeing: OverdueAgeingItem[];
  };
  alerts: DashboardAlert[];
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
