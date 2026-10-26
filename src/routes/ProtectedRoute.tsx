/**
 * ProtectedRoute Guard Component
 *
 * Guard wrapper that enforces authentication, role restrictions, and permissions.
 * Redirects unauthenticated users to /login and unauthorized users to /unauthorized.
 */

import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, ShieldCheck } from 'lucide-react';
import { ROUTES } from '../constants/routes';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
}) => {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // 1. Loading state: a branded splash while the session is checked
  if (isLoading) {
    return (
      <div
        className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center gradient-surface text-white"
        role="status"
        aria-live="polite"
      >
        {/* Soft glows in the background */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-600/20 blur-3xl animate-pulse" />

        <div className="relative flex flex-col items-center page-enter">
          {/* The brand mark with a ring orbiting it */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <span className="absolute inset-4 rounded-3xl bg-blue-500/40 blur-2xl animate-pulse" />
            <span className="absolute inset-0 rounded-full border-[3px] border-white/5" />
            <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-400 border-r-indigo-400 animate-spin" />
            <span className="absolute inset-3 rounded-full border-2 border-transparent border-b-sky-300/70 animate-spin [animation-direction:reverse] [animation-duration:1.6s]" />
            <span className="relative p-4 rounded-2xl gradient-brand shadow-xl shadow-blue-900/40">
              <ShieldCheck size={34} className="text-white" />
            </span>
          </div>

          <p className="mt-6 text-xl font-bold tracking-tight">Compliance</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Management System</p>

          {/* A slim bar that keeps moving until the check finishes */}
          <div className="mt-8 w-56 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-300 loader-slide" />
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Lock size={12} className="text-blue-400" />
            Verifying your session
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Redirect to login (preserving return target)
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // 3. Role check
  if (allowedRoles && allowedRoles.length > 0) {
    const isRoleAuthorized = hasRole(allowedRoles);
    if (!isRoleAuthorized) {
      return (
        <Navigate
          to={ROUTES.UNAUTHORIZED}
          state={{
            reason: 'role',
            required: allowedRoles.join(', '),
            from: location,
          }}
          replace
        />
      );
    }
  }

  // 4. Permission check
  if (requiredPermission) {
    const isPermissionAuthorized = hasPermission(requiredPermission);
    if (!isPermissionAuthorized) {
      return (
        <Navigate
          to={ROUTES.UNAUTHORIZED}
          state={{
            reason: 'permission',
            required: requiredPermission,
            from: location,
          }}
          replace
        />
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
