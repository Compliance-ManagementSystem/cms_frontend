import {
  LayoutDashboard,
  Building2,
  MapPin,
  ClipboardCheck,
  CheckSquare,
  History,
  Users,
  ShieldCheck,
  KeyRound,
  Database,
  Scale,
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
}

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
    title: 'Master Data',
    items: [
      {
        label: 'Entities',
        path: ROUTES.ENTITIES,
        icon: Building2,
        phase: 5,
        disabled: false,
        roles: ['super_admin', 'admin', 'entity_admin'],
        permission: 'entity:read',
      },
      {
        label: 'Locations',
        path: ROUTES.LOCATIONS,
        icon: MapPin,
        phase: 6,
        disabled: false,
        roles: ['super_admin', 'admin', 'entity_admin', 'location_manager', 'compliance_officer', 'viewer'],
        permission: 'location:read',
      },
    ],
  },
  {
    title: 'Compliance',
    items: [
      {
        label: 'Compliance Rules',
        path: ROUTES.COMPLIANCE_RULES,
        icon: Scale,
        phase: 7,
        disabled: false,
        roles: ['super_admin', 'admin', 'compliance_officer', 'entity_admin'],
        permission: 'compliance_rule:read',
      },
      {
        label: 'Compliance Records',
        path: ROUTES.COMPLIANCE_RECORDS,
        icon: ClipboardCheck,
        phase: 8,
        disabled: false,
        roles: ['super_admin', 'admin', 'entity_admin', 'location_manager', 'compliance_officer', 'viewer'],
        permission: 'compliance_record:read',
      },
      {
        label: 'Tasks',
        path: ROUTES.TASKS,
        icon: CheckSquare,
        phase: 10,
        disabled: false,
        roles: ['super_admin', 'admin', 'entity_admin', 'location_manager', 'compliance_officer', 'viewer'],
      },
      // {
      //   label: 'Notifications',
      //   path: ROUTES.NOTIFICATIONS,
      //   icon: Bell,
      //   phase: 10,
      //   disabled: false,
      // },
    ],
  },
  {
    title: 'Analytics',
    items: [
      // {
      //   label: 'Reports',
      //   path: ROUTES.REPORTS,
      //   icon: BarChart3,
      //   phase: 12,
      //   disabled: false,
      // },
      {
        label: 'Audit Trail',
        path: ROUTES.AUDIT_LOGS,
        icon: History,
        phase: 13,
        disabled: false,
        roles: ['super_admin', 'admin', 'entity_admin', 'compliance_officer'],
        permission: 'audit_log:read',
      },
    ],
  },
   {
    title: 'Administration',
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
        label: 'Permissions',
        path: ROUTES.ADMIN_PERMISSIONS,
        icon: KeyRound,
        phase: 4,
        roles: ['super_admin', 'admin'],
      },
      {
        label: 'Master Data',
        path: ROUTES.ADMIN_MASTER_DATA,
        icon: Database,
        phase: 4,
        roles: ['super_admin', 'admin'],
      },
      // {
      //   label: 'System Settings',
      //   path: ROUTES.ADMIN_SETTINGS,
      //   icon: Sliders,
      //   phase: 4,
      //   roles: ['super_admin', 'admin'],
      // },
    ],
  },
];
