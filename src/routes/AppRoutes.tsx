import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import { ROUTES } from '@/constants/routes';

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
const Dashboard    = React.lazy(() => import('@/pages/Dashboard'));
const Login        = React.lazy(() => import('@/pages/Login'));
const Unauthorized = React.lazy(() => import('@/pages/Unauthorized'));
const NotFound     = React.lazy(() => import('@/pages/NotFound'));

// Phase 4 – Administration & Master Data
const AdminUsers       = React.lazy(() => import('@/pages/admin/UsersPage'));
const AdminRoles       = React.lazy(() => import('@/pages/admin/RolesPage'));
const AdminPermissions = React.lazy(() => import('@/pages/admin/PermissionsPage'));
const AdminMasterData  = React.lazy(() => import('@/pages/admin/MasterDataPage'));
const AdminSettings    = React.lazy(() => import('@/pages/admin/SettingsPage'));

// Phase 5 – Entity Management
const EntityListPage   = React.lazy(() => import('@/pages/entities/EntityListPage'));
const EntityCreatePage = React.lazy(() => import('@/pages/entities/EntityCreatePage'));
const EntityDetailPage = React.lazy(() => import('@/pages/entities/EntityDetailPage'));
const EntityEditPage   = React.lazy(() => import('@/pages/entities/EntityEditPage'));

// Phase 6 – Location Master
const LocationListPage   = React.lazy(() => import('@/pages/locations/LocationListPage'));
const LocationCreatePage = React.lazy(() => import('@/pages/locations/LocationCreatePage'));
const LocationDetailPage = React.lazy(() => import('@/pages/locations/LocationDetailPage'));
const LocationEditPage   = React.lazy(() => import('@/pages/locations/LocationEditPage'));

// Phase 7 – Compliance Rule Engine
const ComplianceRuleListPage   = React.lazy(() => import('@/pages/compliance/ComplianceRuleListPage'));
const ComplianceRuleCreatePage = React.lazy(() => import('@/pages/compliance/ComplianceRuleCreatePage'));
const ComplianceRuleDetailPage = React.lazy(() => import('@/pages/compliance/ComplianceRuleDetailPage'));
const ComplianceRuleEditPage   = React.lazy(() => import('@/pages/compliance/ComplianceRuleEditPage'));

// Phase 8 – Compliance Records & Document Management
const ComplianceRecordListPage   = React.lazy(() => import('@/pages/compliance/ComplianceRecordListPage'));
const ComplianceRecordDetailPage = React.lazy(() => import('@/pages/compliance/ComplianceRecordDetailPage'));

// Phase 10 – Tasks, Notifications & Automation
const TaskListPage      = React.lazy(() => import('@/pages/tasks/TaskListPage'));
const NotificationsPage = React.lazy(() => import('@/pages/notifications/NotificationsPage'));

// Phase 12 – Reports & Export
const ReportsHubPage = React.lazy(() =>
  import('@/pages/reports/ReportsHubPage').then((m) => ({ default: m.ReportsHubPage }))
);
const ReportViewPage = React.lazy(() =>
  import('@/pages/reports/ReportViewPage').then((m) => ({ default: m.ReportViewPage }))
);

// Phase 13 – Audit Trail
const AuditLogsPage = React.lazy(() =>
  import('@/pages/audit/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage }))
);

// ── Loading fallback ───────────────────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 size={36} className="animate-spin text-indigo-500 opacity-70" />
  </div>
);

// ── Router ─────────────────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* ── Public Auth Routes ─────────────────────────────────────────────── */}
      <Route
        path={ROUTES.LOGIN}
        element={
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.UNAUTHORIZED}
        element={
          <Suspense fallback={<PageLoader />}>
            <Unauthorized />
          </Suspense>
        }
      />

      {/* ── Authenticated & Protected Layout Shell ─────────────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Root redirect */}
        <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        {/* Dashboard — accessible to all authenticated roles */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          }
        />

        {/* ── Phase 4: Administration & Master Data (Super Admin & Admin only) ── */}
        <Route
          path={ROUTES.ADMIN_USERS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminUsers />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN_ROLES}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminRoles />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN_PERMISSIONS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminPermissions />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN_MASTER_DATA}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminMasterData />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN_SETTINGS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminSettings />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Phase 5: Entities — Restricted to Super Admin, Admin, Entity Admin */}
        <Route
          path={ROUTES.ENTITIES}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin']}>
              <Suspense fallback={<PageLoader />}>
                <EntityListPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ENTITY_CREATE}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Suspense fallback={<PageLoader />}>
                <EntityCreatePage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ENTITY_DETAILS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin']}>
              <Suspense fallback={<PageLoader />}>
                <EntityDetailPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ENTITY_EDIT}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin']}>
              <Suspense fallback={<PageLoader />}>
                <EntityEditPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Phase 6: Location Master */}
        <Route
          path={ROUTES.LOCATIONS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin', 'location_manager', 'compliance_officer', 'viewer']}>
              <Suspense fallback={<PageLoader />}>
                <LocationListPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.LOCATION_CREATE}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin']}>
              <Suspense fallback={<PageLoader />}>
                <LocationCreatePage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.LOCATION_DETAILS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin', 'location_manager', 'compliance_officer', 'viewer']}>
              <Suspense fallback={<PageLoader />}>
                <LocationDetailPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.LOCATION_EDIT}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin']}>
              <Suspense fallback={<PageLoader />}>
                <LocationEditPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Phase 7 – Compliance Rule Engine */}
        <Route
          path={ROUTES.COMPLIANCE_RULES}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'compliance_officer', 'entity_admin']}>
              <Suspense fallback={<PageLoader />}>
                <ComplianceRuleListPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.COMPLIANCE_RULE_CREATE}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Suspense fallback={<PageLoader />}>
                <ComplianceRuleCreatePage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.COMPLIANCE_RULE_DETAILS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'compliance_officer', 'entity_admin']}>
              <Suspense fallback={<PageLoader />}>
                <ComplianceRuleDetailPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.COMPLIANCE_RULE_EDIT}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Suspense fallback={<PageLoader />}>
                <ComplianceRuleEditPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Phase 8 – Compliance Records Lifecycle */}
        <Route
          path={ROUTES.COMPLIANCE}
          element={<Navigate to={ROUTES.COMPLIANCE_RECORDS} replace />}
        />
        <Route
          path={ROUTES.COMPLIANCE_RECORDS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin', 'location_manager', 'compliance_officer', 'viewer']}>
              <Suspense fallback={<PageLoader />}>
                <ComplianceRecordListPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.COMPLIANCE_RECORD_DETAILS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin', 'location_manager', 'compliance_officer', 'viewer']}>
              <Suspense fallback={<PageLoader />}>
                <ComplianceRecordDetailPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Phase 10 – Tasks */}
        <Route
          path={ROUTES.TASKS}
          element={
            <Suspense fallback={<PageLoader />}>
              <TaskListPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.TASKS_MY}
          element={
            <Suspense fallback={<PageLoader />}>
              <TaskListPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.TASKS_OVERDUE}
          element={
            <Suspense fallback={<PageLoader />}>
              <TaskListPage />
            </Suspense>
          }
        />

        {/* Phase 10 – Notifications */}
        <Route
          path={ROUTES.NOTIFICATIONS}
          element={
            <Suspense fallback={<PageLoader />}>
              <NotificationsPage />
            </Suspense>
          }
        />

        {/* Phase 12 – Reports & Export Hub */}
        <Route
          path={ROUTES.REPORTS}
          element={
            <Suspense fallback={<PageLoader />}>
              <ReportsHubPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.REPORTS_COMPLIANCE}
          element={
            <Suspense fallback={<PageLoader />}>
              <ReportViewPage reportType="compliance" />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.REPORTS_EXPIRY}
          element={
            <Suspense fallback={<PageLoader />}>
              <ReportViewPage reportType="expiry" />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.REPORTS_PENDING}
          element={
            <Suspense fallback={<PageLoader />}>
              <ReportViewPage reportType="pending" />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.REPORTS_OVERDUE}
          element={
            <Suspense fallback={<PageLoader />}>
              <ReportViewPage reportType="overdue" />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.REPORTS_ENTITIES}
          element={
            <Suspense fallback={<PageLoader />}>
              <ReportViewPage reportType="entities" />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.REPORTS_LOCATIONS}
          element={
            <Suspense fallback={<PageLoader />}>
              <ReportViewPage reportType="locations" />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.REPORTS_TASKS}
          element={
            <Suspense fallback={<PageLoader />}>
              <ReportViewPage reportType="tasks" />
            </Suspense>
          }
        />

        {/* Phase 13 – Audit Trail — Restricted to Super Admin, Admin, Entity Admin, Compliance Officer */}
        <Route
          path={ROUTES.AUDIT_LOGS}
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'entity_admin', 'compliance_officer']}>
              <Suspense fallback={<PageLoader />}>
                <AuditLogsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.AUDIT}
          element={<Navigate to={ROUTES.AUDIT_LOGS} replace />}
        />
      </Route>

      {/* 404 Not Found */}
      <Route
        path={ROUTES.NOT_FOUND}
        element={
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
