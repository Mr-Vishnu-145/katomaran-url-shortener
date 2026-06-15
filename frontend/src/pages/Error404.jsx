import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import Button from '../components/ui/Button';

import useDocumentTitle from '../hooks/useDocumentTitle';

export default function Error404() {
  useDocumentTitle('Page Not Found');
  const location = useLocation();

  const path = location.pathname.substring(1); // remove leading slash
  const pathSegments = path.split('/');
  
  // List of known frontend static routes to exclude from redirection
  const frontendRoutes = new Set([
    'login', 'register', 'forgot-password', 'reset-password',
    'dashboard', 'about', 'status', 'security', 'privacy',
    'terms', 'cookies', 'urls', 'analytics', 'settings', 'admin', '403'
  ]);

  const isCandidateShortCode = pathSegments.length === 1 && path && !frontendRoutes.has(pathSegments[0]);

  useEffect(() => {
    if (isCandidateShortCode) {
      const backendBase = (import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.hostname + ':5000')).replace(/\/$/, '');
      window.location.replace(`${backendBase}/${path}${window.location.search}`);
    }
  }, [isCandidateShortCode, path, location.search]);

  if (isCandidateShortCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100 text-center">
        {/* Premium Spinner */}
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 animate-spin" />
        </div>
        <h2 className="text-xl font-bold mb-2">Redirecting to destination...</h2>
        <p className="text-xs text-slate-400">Resolving shortened URL with zero latency</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100 text-center">
      <HelpCircle size={64} className="text-primary animate-pulse mb-6" />
      <h1 className="text-4xl font-extrabold mb-3">404 - Page Not Found</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
