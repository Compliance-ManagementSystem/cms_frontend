import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-5 rounded-2xl bg-red-900/20 border border-red-800/30 mb-6">
        <AlertTriangle size={48} className="text-red-400" />
      </div>
      <h1 className="text-6xl font-black text-slate-700 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-slate-300 mb-2">
        Page Not Found
      </h2>
      <p className="text-slate-500 text-sm max-w-sm mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to={ROUTES.DASHBOARD}>
        <Button variant="primary" leftIcon={<Home size={16} />}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
