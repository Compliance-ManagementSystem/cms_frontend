/**
 * Unauthorized (403) Page
 *
 * Rendered when an authenticated user attempts to access a route or action
 * beyond their assigned role or permission boundary.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { ROUTES } from '../constants/routes';

export const Unauthorized: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as
    | { reason?: string; required?: string; from?: any }
    | undefined;

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center">
        {/* Shield icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-6 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          You do not have the authorization level required to access this resource or execute this action.
        </p>

        {/* Current user role info card */}
        {user && (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-6 text-left text-xs space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-500">Current User</span>
              <span className="font-semibold text-slate-200">{user.fullName}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-500">Active Role</span>
              <Badge variant="default" size="sm" className="font-mono">
                {user.role?.name || user.role?.code}
              </Badge>
            </div>
            {state?.required && (
              <div className="flex justify-between items-center text-rose-400">
                <span className="text-slate-500">Required {state.reason === 'role' ? 'Role' : 'Permission'}</span>
                <span className="font-mono font-medium">{state.required}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 justify-center border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => navigate(ROUTES.DASHBOARD)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>

          <Button
            variant="danger"
            className="flex-1 justify-center"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Switch User
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
