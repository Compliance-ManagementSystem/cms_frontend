export const ROUTES = {
  // Root & Auth
  ROOT: '/',
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',
  DASHBOARD: '/dashboard',
  DASHBOARD_MAP_3D: '/dashboard/map-3d',
  NOT_FOUND: '*',

  // Entity Management
  ENTITIES: '/entities',
  ENTITY_CREATE: '/entities/create',
  ENTITY_DETAILS: '/entities/:id',
  ENTITY_EDIT: '/entities/:id/edit',

  // Location Master
  LOCATIONS: '/locations',
  LOCATION_CREATE: '/locations/create',
  LOCATION_DETAILS: '/locations/:id',
  LOCATION_EDIT: '/locations/:id/edit',

  // Compliance Rules & Records
  COMPLIANCE: '/compliance',
  COMPLIANCE_RULES: '/compliance/rules',
  COMPLIANCE_RULE_CREATE: '/compliance/rules/create',
  COMPLIANCE_RULE_DETAILS: '/compliance/rules/:id',
  COMPLIANCE_RULE_EDIT: '/compliance/rules/:id/edit',
  COMPLIANCE_RECORDS: '/compliance/records',
  COMPLIANCE_RECORD_DETAILS: '/compliance/records/:id',

  // Tasks
  TASKS: '/tasks',
  TASKS_MY: '/tasks/my-tasks',
  TASKS_OVERDUE: '/tasks/overdue',

  // Audit Trail
  AUDIT: '/audit',
  AUDIT_LOGS: '/audit-logs',

  // Administration
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
} as const;

export type RouteKey = keyof typeof ROUTES;
