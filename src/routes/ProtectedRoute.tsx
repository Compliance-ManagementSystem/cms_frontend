/**
 * ProtectedRoute Guard Component
 *
 * Guard wrapper that enforces authentication, role restrictions, and permissions.
 * Redirects unauthenticated users to /login and unauthorized users to /unauthorized.
 */

import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';
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

  // 1. Loading state with smooth animation
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Loader2 className="w-6 h-6 text-indigo-400 absolute animate-pulse" />
        </div>
        <p className="text-sm font-medium text-slate-400 tracking-wide animate-pulse">
          Verifying security credentials...
        </p>
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
