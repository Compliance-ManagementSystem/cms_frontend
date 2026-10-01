export const ROUTES = {
  // Root & Auth
  ROOT: '/',
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',
  DASHBOARD: '/dashboard',
  NOT_FOUND: '*',

  // Phase 5 – Entity Management
  ENTITIES: '/entities',
  ENTITY_CREATE: '/entities/create',
  ENTITY_DETAILS: '/entities/:id',
  ENTITY_EDIT: '/entities/:id/edit',

  // Phase 6 – Location Master
  LOCATIONS: '/locations',
  LOCATION_CREATE: '/locations/create',
  LOCATION_DETAILS: '/locations/:id',
  LOCATION_EDIT: '/locations/:id/edit',

  // Phase 7 & 8 – Compliance Rules & Records
  COMPLIANCE: '/compliance',
  COMPLIANCE_RULES: '/compliance/rules',
  COMPLIANCE_RULE_CREATE: '/compliance/rules/create',
  COMPLIANCE_RULE_DETAILS: '/compliance/rules/:id',
  COMPLIANCE_RULE_EDIT: '/compliance/rules/:id/edit',
  COMPLIANCE_RECORDS: '/compliance/records',
  COMPLIANCE_RECORD_DETAILS: '/compliance/records/:id',

  // Phase 10 – Tasks, Notifications & Automation
  TASKS: '/tasks',
  TASKS_MY: '/tasks/my-tasks',
  TASKS_OVERDUE: '/tasks/overdue',
  NOTIFICATIONS: '/notifications',

  // Phase 12 – Reports & Exports
  REPORTS: '/reports',
  REPORTS_COMPLIANCE: '/reports/compliance',
  REPORTS_EXPIRY: '/reports/expiry',
  REPORTS_PENDING: '/reports/pending',
  REPORTS_OVERDUE: '/reports/overdue',
  REPORTS_ENTITIES: '/reports/entities',
  REPORTS_LOCATIONS: '/reports/locations',
  REPORTS_TASKS: '/reports/tasks',

  // Phase 13 – Audit Trail
  AUDIT: '/audit',
  AUDIT_LOGS: '/audit-logs',

  // Phase 4 – Administration & Master Data
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_PERMISSIONS: '/admin/permissions',
  ADMIN_MASTER_DATA: '/admin/master-data',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

export type RouteKey = keyof typeof ROUTES;
