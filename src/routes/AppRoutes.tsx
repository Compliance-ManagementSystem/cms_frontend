import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import { ROUTES } from '@/constants/routes';

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
const Dashboard    = React.lazy(() => import('@/pages/Dashboard'));
// Full-screen 3D map; three.js only loads when this page is opened
const ApprovalsMap3DPage = React.lazy(() => import('@/pages/map3d/ApprovalsMap3DPage'));
const Login        = React.lazy(() => import('@/pages/Login'));
const Unauthorized = React.lazy(() => import('@/pages/Unauthorized'));
const NotFound     = React.lazy(() => import('@/pages/NotFound'));

// Phase 4 – Administration
const AdminUsers       = React.lazy(() => import('@/pages/admin/UsersPage'));
// const AdminRoles       = React.lazy(() => import('@/pages/admin/RolesPage'));

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
// const ComplianceRuleListPage   = React.lazy(() => import('@/pages/compliance/ComplianceRuleListPage'));
// const ComplianceRuleCreatePage = React.lazy(() => import('@/pages/compliance/ComplianceRuleCreatePage'));
// const ComplianceRuleDetailPage = React.lazy(() => import('@/pages/compliance/ComplianceRuleDetailPage'));
// const ComplianceRuleEditPage   = React.lazy(() => import('@/pages/compliance/ComplianceRuleEditPage'));

// Phase 8 – Compliance Records & Document Management
const ComplianceRecordListPage   = React.lazy(() => import('@/pages/compliance/ComplianceRecordListPage'));
const ComplianceRecordDetailPage = React.lazy(() => import('@/pages/compliance/ComplianceRecordDetailPage'));

// Phase 10 – Tasks
const TaskListPage      = React.lazy(() => import('@/pages/tasks/TaskListPage'));

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

      {/* ── Full-screen pages (signed in, outside the app shell) ───────────── */}
      <Route
        path={ROUTES.DASHBOARD_MAP_3D}
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ApprovalsMap3DPage />
            </Suspense>
          </ProtectedRoute>
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

        {/* ── Phase 4: Administration (Super Admin & Admin only) ── */}
        {/* Roles and Compliance Rules are hidden for every role:
            their addresses send people back to the dashboard. To bring one back, restore
            its lazy import above, its route element here and its entry in constants/sidebar.ts. */}
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
          element={<Navigate to={ROUTES.DASHBOARD} replace />}
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
          element={<Navigate to={ROUTES.DASHBOARD} replace />}
        />
        <Route
          path={ROUTES.COMPLIANCE_RULE_CREATE}
          element={<Navigate to={ROUTES.DASHBOARD} replace />}
        />
        <Route
          path={ROUTES.COMPLIANCE_RULE_DETAILS}
          element={<Navigate to={ROUTES.DASHBOARD} replace />}
        />
        <Route
          path={ROUTES.COMPLIANCE_RULE_EDIT}
          element={<Navigate to={ROUTES.DASHBOARD} replace />}
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
