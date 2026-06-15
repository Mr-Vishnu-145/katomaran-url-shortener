import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Globe, Smartphone, Compass, ArrowLeft, ArrowUpRight, ShieldCheck, Activity, Link2, Calendar, RefreshCw } from 'lucide-react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import useAuthStore from '../store/authStore';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

export default function Analytics() {
  useDocumentTitle('Campaign Analytics');
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlIdParam = searchParams.get('id');
  
  const [selectedId, setSelectedId] = useState(urlIdParam || (user?.role === 'admin' ? 'platform' : 'all'));

  useEffect(() => {
    if (urlIdParam) {
      setSelectedId(urlIdParam);
    }
  }, [urlIdParam]);

  // 1. Fetch user's list of links for the dropdown selector
  const { data: urlsData } = useQuery({
    queryKey: ['analytics-dropdown-urls'],
    queryFn: () => api.get('/api/urls').then(res => res.data.data),
    enabled: !!user,
  });

  // 2. Fetch the corresponding analytics data based on selectedId
  const { data: analyticsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['campaign-analytics', selectedId],
    queryFn: () => {
      if (selectedId === 'all') {
        return api.get('/api/urls/dashboard/analytics').then(res => res.data.data);
      } else if (selectedId === 'platform') {
        return api.get('/api/urls/dashboard/analytics?scope=platform').then(res => res.data.data);
      } else {
        return api.get(`/api/urls/${selectedId}/analytics`).then(res => res.data.data);
      }
    },
    enabled: !!user,
  });

  const summary = analyticsData?.summary || {};
  const devices = analyticsData?.devices || [];
  const browsers = analyticsData?.browsers || [];
  const countries = analyticsData?.countries || [];
  const referers = analyticsData?.referers || [];
  const trends = analyticsData?.trends || [];
  const recentVisits = analyticsData?.recentVisits || [];

  // Colors for the Pie Chart
  const COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899'];

  const dropdownOptions = [
    { value: 'all', label: '📊 All My Links (Aggregated)' },
    ...(user?.role === 'admin' ? [{ value: 'platform', label: '🛡️ Platform-Wide (Admin Only)' }] : []),
    ...(urlsData ? urlsData.map(url => ({ 
      value: url.id, 
      label: `/${url.short_code} → ${url.original_url.replace(/https?:\/\/(www\.)?/, '').substring(0, 30)}...` 
    })) : [])
  ];

  return (
    <div className="flex flex-col gap-6 text-left animate-fade-in">
      {/* Back to Dashboard Link */}
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm w-fit">
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-850 dark:text-slate-50 flex items-center gap-2">
            <BarChart3 className="text-primary" /> Link Analytics Dashboard
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Real-time visitor telemetry, devices breakdown, and referrer traffic channels.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={selectedId}
            onChange={setSelectedId}
            className="w-full sm:w-72"
            options={dropdownOptions}
          />
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-primary transition-all disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Stats Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="flex flex-col gap-1 text-left">
              <span className="text-xs text-slate-400 font-medium">Total Clicks</span>
              <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">
                {summary.totalClicks || 0}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Overall visits counted</span>
            </Card>
            <Card className="flex flex-col gap-1 text-left">
              <span className="text-xs text-slate-400 font-medium">Unique Visitors</span>
              <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">
                {summary.uniqueVisitors || 0}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">First-time visitor sessions</span>
            </Card>
            <Card className="flex flex-col gap-1 text-left">
              <span className="text-xs text-slate-400 font-medium">Returning Clicks</span>
              <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">
                {summary.returningVisitors || 0}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Repeat visitor engagement</span>
            </Card>
            <Card className="flex flex-col gap-1 text-left">
              <span className="text-xs text-slate-400 font-medium">URLs Tracked</span>
              <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">
                {selectedId === 'all' || selectedId === 'platform' ? (summary.totalUrls || 0) : 1}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Shortened link campaigns</span>
            </Card>
          </div>

          {/* Central Analytics Section: Trend & Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Click Trend Chart */}
            <div className="lg:col-span-8">
              <Card className="h-full flex flex-col gap-4 text-left">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                  <Calendar size={16} className="text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">Click Volume Timeline</h2>
                </div>
                <div className="h-72">
                  {trends.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                      <BarChart3 size={24} /> Awaiting visitor traffic to chart redirection trends.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends}>
                        <defs>
                          <linearGradient id="analyticsClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--theme-primary)" stopOpacity={0.06}/>
                            <stop offset="95%" stopColor="var(--theme-primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border)" opacity={0.8} />
                        <XAxis dataKey="date" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} />
                        <YAxis stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: 'var(--theme-bg-card)', borderColor: 'var(--theme-border)', borderRadius: '12px', color: 'var(--theme-text-primary)', fontSize: 12 }} labelFormatter={(str) => new Date(str).toLocaleDateString()} />
                        <Area type="monotone" dataKey="count" name="Clicks" stroke="var(--theme-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#analyticsClicks)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
            </div>

            {/* Devices Pie Chart */}
            <div className="lg:col-span-4">
              <Card className="h-full flex flex-col gap-4 text-left">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                  <Smartphone size={16} className="text-emerald-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">Device Breakdown</h2>
                </div>
                <div className="h-56">
                  {devices.length === 0 ? (
                    <span className="text-xs text-slate-400">No device telemetry tracked yet.</span>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={devices} layout="vertical" margin={{ left: -10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border)" opacity={0.6} />
                        <XAxis type="number" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-primary)', fontSize: 9 }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip formatter={(val) => [`${val} clicks`, 'Clicks']} />
                        <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Aggregated Breakdowns: Browser, Referrer, Country */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Browsers Bar Chart */}
            <Card className="flex flex-col gap-4 text-left">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                <Compass size={16} className="text-sky-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Top Browsers</h2>
              </div>
              <div className="h-56">
                {browsers.length === 0 ? (
                  <span className="text-xs text-slate-400">No browser logs found.</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={browsers} layout="vertical" margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border)" opacity={0.6} />
                      <XAxis type="number" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-primary)', fontSize: 9 }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip formatter={(val) => [`${val} clicks`, 'Clicks']} />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Referrers (Traffic Channels) */}
            <Card className="flex flex-col gap-4 text-left">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                <ArrowUpRight size={16} className="text-purple-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Traffic Channels</h2>
              </div>
              <div className="h-56">
                {referers.length === 0 ? (
                  <span className="text-xs text-slate-400">No referrer details found.</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={referers} layout="vertical" margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border)" opacity={0.6} />
                      <XAxis type="number" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-primary)', fontSize: 9 }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip formatter={(val) => [`${val} clicks`, 'Clicks']} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Countries Geo List */}
            <Card className="flex flex-col gap-4 text-left">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                <Globe size={16} className="text-amber-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Geographic Traffic</h2>
              </div>
              <div className="h-56">
                {countries.length === 0 ? (
                  <span className="text-xs text-slate-400">No geographic visits logged yet.</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countries} layout="vertical" margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border)" opacity={0.6} />
                      <XAxis type="number" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-primary)', fontSize: 9 }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip formatter={(val) => [`${val} clicks`, 'Clicks']} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* Recent Clicks Activity Feed Table */}
          <Card className="overflow-hidden text-left">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-50 flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" /> Recent Visits Click-Stream
              </h3>
              <span className="text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/20 text-success border border-emerald-100 dark:border-emerald-950/30 px-2 py-0.5 rounded-full">
                Telemetry Log
              </span>
            </div>
            
            <div className="overflow-x-auto">
              {recentVisits.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No redirect telemetry recorded for this campaign scope yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-extrabold uppercase">
                      <th className="pb-3 px-4 pt-3">Time Visited</th>
                      <th className="pb-3 px-4 pt-3">Short path</th>
                      <th className="pb-3 px-4 pt-3">Geographic Region</th>
                      <th className="pb-3 px-4 pt-3">Browser / Platform</th>
                      <th className="pb-3 px-4 pt-3">IP Address</th>
                      <th className="pb-3 px-4 pt-3">Traffic Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-350">
                    {recentVisits.map((visit, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3 px-4 font-semibold">{new Date(visit.visited_at).toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono font-bold text-primary">/{visit.short_code}</td>
                        <td className="py-3 px-4 font-bold">{visit.country}</td>
                        <td className="py-3 px-4 flex items-center gap-1.5 pt-3.5">
                          <span className="px-1.5 py-0.5 rounded-[4px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[9px] text-slate-500">
                            {visit.device_type}
                          </span>
                          <span>{visit.browser}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{visit.ip_address}</td>
                        <td className="py-3 px-4 text-slate-450 font-medium truncate max-w-[120px]" title={visit.referer}>
                          {visit.referer}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
