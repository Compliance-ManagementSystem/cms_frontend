import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** The fallback is cleared when this changes (e.g. the route), so navigating away recovers */
  resetKey?: string;
  /** Full-screen fallback for the app root; otherwise it fills the page area */
  fullScreen?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// After a deploy, an open tab may request page bundles that no longer exist
const isStaleBundleError = (error: Error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    error.message
  );

/**
 * Catches errors thrown while rendering, so one broken component shows a
 * message with a way out instead of a blank page.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Render error caught by ErrorBoundary:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = isStaleBundleError(error);

    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center text-center px-4 ${
          this.props.fullScreen ? 'min-h-screen bg-slate-50 dark:bg-slate-950' : 'min-h-[60vh]'
        }`}
      >
        <div className="p-5 rounded-2xl bg-red-100 border border-red-200 dark:bg-red-900/20 dark:border-red-800/30 mb-6">
          <AlertTriangle size={40} className="text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
          {stale ? 'A new version is available' : 'Something went wrong'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-8">
          {stale
            ? 'The app was updated while this page was open. Reload to get the latest version.'
            : 'This page ran into a problem. Reloading usually fixes it. If it keeps happening, contact support.'}
        </p>
        <div className="flex items-center gap-3">
          <Button variant="primary" leftIcon={<RefreshCw size={16} />} onClick={() => window.location.reload()}>
            Reload page
          </Button>
          {!stale && (
            <Button
              variant="secondary"
              leftIcon={<Home size={16} />}
              onClick={() => window.location.assign(ROUTES.DASHBOARD)}
            >
              Go to Dashboard
            </Button>
          )}
        </div>
        {import.meta.env.DEV && (
          <pre className="mt-8 max-w-2xl w-full text-left text-xs text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-slate-900 dark:border-slate-800 rounded-xl p-4 overflow-auto">
            {error.stack || error.message}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
