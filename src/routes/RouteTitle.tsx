import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { formatPageTitle } from '@/hooks/usePageTitle';

// Checked in order: specific paths ("/entities/create") before patterns ("/entities/:id")
const ROUTE_TITLES: Array<[path: string, title: string]> = [
  [ROUTES.LOGIN, 'Sign in'],
  [ROUTES.UNAUTHORIZED, 'Access denied'],
  [ROUTES.DASHBOARD_MAP_3D, 'Approvals map'],
  [ROUTES.DASHBOARD, 'Dashboard'],
  [ROUTES.ADMIN_USERS, 'Users'],
  [ROUTES.ADMIN_ROLES, 'Roles'],
  [ROUTES.ADMIN_MANPOWER_DOCUMENTS, 'Manpower Documents'],
  [ROUTES.ENTITIES, 'Entities'],
  [ROUTES.ENTITY_CREATE, 'New entity'],
  [ROUTES.ENTITY_EDIT, 'Edit entity'],
  [ROUTES.ENTITY_DETAILS, 'Entity'],
  [ROUTES.LOCATIONS, 'Locations'],
  [ROUTES.LOCATION_CREATE, 'New location'],
  [ROUTES.LOCATION_EDIT, 'Edit location'],
  [ROUTES.LOCATION_DETAILS, 'Location'],
  [ROUTES.COMPLIANCE_RULES, 'Compliance rules'],
  [ROUTES.COMPLIANCE_RULE_CREATE, 'New compliance rule'],
  [ROUTES.COMPLIANCE_RULE_EDIT, 'Edit compliance rule'],
  [ROUTES.COMPLIANCE_RULE_DETAILS, 'Compliance rule'],
  [ROUTES.COMPLIANCE_RECORDS, 'Compliance records'],
  [ROUTES.COMPLIANCE_RECORD_DETAILS, 'Compliance record'],
  [ROUTES.TASKS_MY, 'My tasks'],
  [ROUTES.TASKS_OVERDUE, 'Overdue tasks'],
  [ROUTES.TASKS, 'Tasks'],
  [ROUTES.AUDIT_LOGS, 'Audit logs'],
];

/** Gives every page a tab title from its route; unknown paths are "Page not found". */
const RouteTitle: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Redirecting paths ("/", "/audit") are titled again once the redirect lands
    const match = ROUTE_TITLES.find(([path]) => matchPath(path, pathname));
    document.title = formatPageTitle(match ? match[1] : 'Page not found');
  }, [pathname]);

  return null;
};

export default RouteTitle;
