import {
  LayoutDashboard,
  Building2,
  MapPin,
  ClipboardCheck,
  CheckSquare,
  History,
  Users,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from './routes';

export interface SidebarItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
  phase: number;
  disabled?: boolean;
  roles?: string[];
  permission?: string;
  /** A live count shown at the right of the item */
  count?: SidebarCount;
}

/** What a sidebar count measures: records waiting to be filed, tasks past their due date */
export type SidebarCount = 'readyToApply' | 'overdueTasks';

export interface SidebarGroup {
  title: string;
  items: SidebarItem[];
  roles?: string[];
}

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        path: ROUTES.DASHBOARD,
        icon: LayoutDashboard,
        phase: 1,
      },
    ],
  },

  {
    title: 'Records',
    items: [
      {
        label: 'Entities',
        path: ROUTES.ENTITIES,
        icon: Building2,
        phase: 5,
        disabled: false,
        roles: ['super_admin', 'admin'],
        permission: 'entity:read',
      },
      {
        label: 'Locations',
        path: ROUTES.LOCATIONS,
        icon: MapPin,
        phase: 6,
        disabled: false,
        roles: ['super_admin', 'admin'],
        permission: 'location:read',
      },
      {
        label: 'Compliance Records',
        path: ROUTES.COMPLIANCE_RECORDS,
        icon: ClipboardCheck,
        phase: 8,
        disabled: false,
        roles: ['super_admin', 'admin'],
        permission: 'compliance_record:read',
        count: 'readyToApply',
      },
      {
        label: 'Tasks',
        path: ROUTES.TASKS,
        icon: CheckSquare,
        phase: 10,
        disabled: false,
        roles: ['super_admin', 'admin'],
        count: 'overdueTasks',
      },
    ],
  },
  {
    title: 'Admin',
    roles: ['super_admin', 'admin'],
    items: [
      {
        label: 'Users',
        path: ROUTES.ADMIN_USERS,
        icon: Users,
        phase: 4,
        roles: ['super_admin', 'admin'],
      },
      {
        label: 'Roles',
        path: ROUTES.ADMIN_ROLES,
        icon: ShieldCheck,
        phase: 4,
        roles: ['super_admin', 'admin'],
      },
      {
        label: 'Audit Trail',
        path: ROUTES.AUDIT_LOGS,
        icon: History,
        phase: 13,
        disabled: false,
        roles: ['super_admin', 'admin'],
        permission: 'audit_log:read',
      },
    ],
  },
];
