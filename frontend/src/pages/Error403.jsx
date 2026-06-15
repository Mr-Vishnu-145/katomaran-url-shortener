import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../components/ui/Button';

import useDocumentTitle from '../hooks/useDocumentTitle';

export default function Error403() {
  useDocumentTitle('Access Denied');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100 text-center">
      <ShieldAlert size={64} className="text-error mb-6" />
      <h1 className="text-4xl font-extrabold mb-3">403 - Access Denied</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
        You do not have permission to view this resource.
      </p>
      <Link to="/dashboard">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
