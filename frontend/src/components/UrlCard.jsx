import React from 'react';
import { Link } from 'react-router-dom';
import { Copy, Trash2, BarChart3, Calendar, ExternalLink, Check } from 'lucide-react';
import Card from './ui/Card';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function UrlCard({ url, onDelete }) {
  const { user } = useAuthStore();
  const [copied, setCopied] = React.useState(false);
  const backendBase = (import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.hostname + ':5000')).replace(/\/$/, '');
  const shortUrl = `${backendBase}/${url.short_code}`;
  
  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success('Link copied!', { duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this link?')) {
      onDelete(url.id);
    }
  };

  const handleClick = (e) => {
    if (!user) {
      e.preventDefault();
      toast.error('Sign in to view real-time link intelligence analytics.', { id: 'guest-view-toast' });
    }
  };

  const isExpired = url.expires_at && new Date(url.expires_at) < new Date();

  return (
    <Card className="group transition-all">
      <Link to={'/urls/' + url.id} onClick={handleClick} className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              /{url.short_code}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-sm sm:max-w-md">
              {url.original_url}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={handleCopy}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800"
              title="Copy Short URL"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
            {user && (
              <button 
                onClick={handleDelete}
                className="p-2 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-950/30"
                title="Delete Link"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <BarChart3 size={14} className="text-slate-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{url.click_count}</span> clicks
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <span>{new Date(url.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isExpired ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-warning border border-amber-100 dark:border-amber-950/30 uppercase tracking-wide">Expired</span>
            ) : url.is_active ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-success border border-emerald-100 dark:border-emerald-950/30 uppercase tracking-wide">Active</span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-error border border-red-100 dark:border-red-950/30 uppercase tracking-wide">Inactive</span>
            )}
            <div className="flex items-center gap-1 text-primary font-semibold group-hover:underline">
              Details <ExternalLink size={12} />
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
