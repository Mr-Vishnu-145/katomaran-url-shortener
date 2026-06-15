import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, BarChart3, Copy, Trash2, Smartphone, Monitor, ShieldAlert, CheckSquare, Settings, QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import useDocumentTitle from '../hooks/useDocumentTitle';

export default function UrlDetail() {
  useDocumentTitle('Link Analytics');
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ originalUrl: '', isActive: true, expiresAt: '' });
  const [formError, setFormError] = useState({});
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryHour, setExpiryHour] = useState('12');
  const [expiryMinute, setExpiryMinute] = useState('00');
  const [expiryPeriod, setExpiryPeriod] = useState('PM');

  // Real-time validation for expiry date and time
  useEffect(() => {
    if (expiryDate) {
      let hour = parseInt(expiryHour);
      if (expiryPeriod === 'PM' && hour < 12) hour += 12;
      if (expiryPeriod === 'AM' && hour === 12) hour = 0;
      const hourStr = String(hour).padStart(2, '0');
      const minuteStr = String(expiryMinute).padStart(2, '0');
      const expiresAt = `${expiryDate}T${hourStr}:${minuteStr}:00`;

      const selectedDateTime = new Date(expiresAt);
      const currentDateTime = new Date();
      if (selectedDateTime <= currentDateTime) {
        setFormError(prev => ({ ...prev, expiry: 'Expiry date and time cannot be in the past.' }));
      } else {
        setFormError(prev => ({ ...prev, expiry: '' }));
      }
    } else {
      setFormError(prev => ({ ...prev, expiry: '' }));
    }
  }, [expiryDate, expiryHour, expiryMinute, expiryPeriod]);

  const handleDateChange = (val) => {
    setExpiryDate(val);
    if (val === getTodayLocalDateStr()) {
      // Set to current time + 1 hour
      const now = new Date();
      now.setHours(now.getHours() + 1);
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setExpiryHour(String(hours));
      setExpiryMinute(String(minutes).padStart(2, '0'));
      setExpiryPeriod(period);
    }
  };

  const renderProgressBarChart = (items, emptyMessage) => {
    if (!items || items.length === 0) {
      return <span className="text-sm text-slate-400 font-semibold text-center py-6">{emptyMessage}</span>;
    }
    
    const maxVal = Math.max(...items.map(i => i.value), 1);
    const totalVal = items.reduce((sum, i) => sum + i.value, 0) || 1;

    return (
      <div className="flex flex-col gap-3.5 w-full">
        {items.map((item, i) => {
          const pct = ((item.value / totalVal) * 100).toFixed(0);
          const widthRatio = (item.value / maxVal) * 100;
          return (
            <div key={i} className="flex flex-col gap-1.5 w-full group">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-350 group-hover:text-primary transition-colors">{item.name}</span>
                <span className="text-slate-400 dark:text-slate-500">
                  <span className="text-slate-800 dark:text-slate-200 mr-1">{item.value} clicks</span> ({pct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900/60 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-800/40">
                <div 
                  style={{ width: `${widthRatio}%` }} 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-600 dark:to-teal-500 rounded-full transition-all duration-500 animate-pulse-once" 
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 1. Fetch Analytics data
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['url-analytics', id],
    queryFn: () => api.get('/api/urls/' + id + '/analytics').then(res => res.data.data),
  });

  // Derive the base URL for the short link.
  // In dev: VITE_API_URL is empty so we fall back to the backend server (e.g. http://localhost:5000).
  // In production: VITE_API_URL should be set to the backend domain (e.g. https://api.linksphere.io)
  //                OR leave empty and use the same origin if frontend+backend share a domain.
  const backendBase = (import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.hostname + ':5000')).replace(/\/$/, '');
  const shortUrl = analytics?.url ? `${backendBase}/${analytics.url.short_code}` : '';

  useEffect(() => {
    if (analytics?.url) {
      setEditForm({
        originalUrl: analytics.url.original_url,
        isActive: analytics.url.is_active,
        expiresAt: analytics.url.expires_at ? new Date(analytics.url.expires_at).toISOString().substring(0, 16) : ''
      });

      if (analytics.url.expires_at) {
        const dt = new Date(analytics.url.expires_at);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        setExpiryDate(`${yyyy}-${mm}-${dd}`);

        let hours = dt.getHours();
        const minutes = String(dt.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        setExpiryHour(String(hours));
        setExpiryMinute(minutes);
        setExpiryPeriod(period);
      } else {
        setExpiryDate('');
        setExpiryHour('12');
        setExpiryMinute('00');
        setExpiryPeriod('PM');
      }
    }
  }, [analytics]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/api/urls/' + id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['url-analytics', id] });
      toast.success('Link updated successfully', { duration: 3000 });
      setIsEditing(false);
      setFormError({});
    },
    onError: (err) => {
      const errorData = err.response?.data?.error;
      if (errorData?.field) {
        setFormError({ [errorData.field]: errorData.message });
      } else {
        toast.error(errorData?.message || 'Update failed');
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/api/urls/' + id),
    onSuccess: () => {
      toast.success('Link deleted');
      navigate('/dashboard');
    },
    onError: () => {
      toast.error('Failed to delete link');
    }
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    toast.success('Short link copied!', { duration: 3000 });
  };

  const handleDownloadQr = () => {
    const svgElement = document.getElementById('qr-code-svg');
    if (!svgElement) return;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'qrcode-' + analytics.url.short_code + '.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  };

  const handleExportCSV = () => {
    if (!recentVisits || recentVisits.length === 0) return;
    const headers = ['Visited Date', 'IP Address', 'Country', 'Browser', 'Device', 'Referrer'];
    const rows = recentVisits.map(v => [
      new Date(v.visited_at).toISOString(),
      v.ip_address,
      v.country || 'Unknown',
      v.browser || 'Unknown',
      v.device_type || 'Desktop',
      v.referer || 'Direct'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics-logs-${analytics.url.short_code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV export started!', { duration: 2500 });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setFormError({});

    // Client-side URL validation
    const originalUrl = editForm.originalUrl.trim();
    const isValidUrl = (string) => {
      try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch (_) {
        return false;
      }
    };

    if (!originalUrl || !isValidUrl(originalUrl)) {
      setFormError({ originalUrl: 'Please enter a valid original URL.' });
      return;
    }

    // Assemble expiresAt if expiryDate is selected
    let expiresAt = null;
    if (expiryDate) {
      let hour = parseInt(expiryHour);
      if (expiryPeriod === 'PM' && hour < 12) hour += 12;
      if (expiryPeriod === 'AM' && hour === 12) hour = 0;
      const hourStr = String(hour).padStart(2, '0');
      const minuteStr = String(expiryMinute).padStart(2, '0');
      
      const selectedDateTime = new Date(`${expiryDate}T${hourStr}:${minuteStr}:00`);
      const currentDateTime = new Date();
      if (selectedDateTime <= currentDateTime) {
        setFormError({ expiry: 'Expiry date and time cannot be in the past.' });
        toast.error('Expiry date and time cannot be in the past.');
        return;
      }
      expiresAt = selectedDateTime.toISOString();
    }

    updateMutation.mutate({
      ...editForm,
      originalUrl,
      expiresAt
    });
  };

  const getTodayLocalDateStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-slate-500">
        <ShieldAlert className="text-error mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold">Failed to load link details</h2>
        <p className="text-xs text-slate-400 mt-2">Make sure you have permissions to view this link.</p>
        <Link to="/dashboard" className="inline-block mt-4 text-primary font-semibold hover:underline">Go back to Dashboard</Link>
      </div>
    );
  }

  const { url, devices, browsers, countries, referers, trends, recentVisits } = analytics;

  return (
    <div className="flex flex-col gap-6">
      {/* Back Header */}
      <Link to="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-semibold w-fit">
        <ArrowLeft size={16} /> Back to Links
      </Link>

      {/* URL Meta Detail Card */}
      <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xl font-bold text-slate-800 dark:text-slate-50">/{url.short_code}</span>
            {url.is_active ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-success border border-emerald-100 dark:border-emerald-950/30">Active</span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-error border border-red-100 dark:border-red-950/30">Inactive</span>
            )}
          </div>
          <p className="text-sm text-slate-500 truncate max-w-lg mb-2">{url.original_url}</p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              Created {new Date(url.created_at).toLocaleDateString()}
            </div>
            {url.expires_at && (
              <div className="flex items-center gap-1">
                <span>Expires: {new Date(url.expires_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          <Link to={'/analytics?id=' + url.id}>
            <Button className="flex items-center gap-1.5 bg-primary text-white">
              <BarChart3 size={14} /> Centralized Analytics
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-1.5">
            <Settings size={14} /> Edit Destination
          </Button>
          <Button variant="danger" onClick={() => deleteMutation.mutate()} className="flex items-center gap-1.5">
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </Card>

      {/* Edit Form */}
      {isEditing && (
        <Card className="border-primary dark:border-primary/50">
          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <h3 className="font-bold text-sm">Update Destination settings</h3>
            <Input
              label="Original Destination URL"
              id="editUrl"
              type="url"
              required
              value={editForm.originalUrl}
              onChange={(e) => setEditForm({ ...editForm, originalUrl: e.target.value })}
              error={formError.originalUrl}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expiry Date (Optional)</span>
                  <input
                    type="date"
                    id="editExpiryDate"
                    min={getTodayLocalDateStr()}
                    value={expiryDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    onClick={(e) => {
                      try { e.target.showPicker(); } catch (_) {}
                    }}
                    onFocus={(e) => {
                      try { e.target.showPicker(); } catch (_) {}
                    }}
                    className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 focus:border-primary focus:ring-primary/20 focus:ring-4 rounded-xl py-2.5 px-4 text-xs font-medium text-slate-950 dark:text-slate-550 outline-none transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-550 cursor-pointer"
                  />
                  {formError.expiry && (
                    <p className="text-xs text-red-500 mt-1 ml-1">{formError.expiry}</p>
                  )}
                </div>

                {expiryDate && (
                  <div className="flex flex-col gap-1.5 animate-pulse-once">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expiry Time (12-Hour Format)</span>
                    <div className="flex gap-2 items-center">
                      <Select
                        value={expiryHour}
                        onChange={setExpiryHour}
                        className="flex-1"
                        options={Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => ({ value: h, label: h }))}
                      />
                      <span className="text-slate-400 font-bold">:</span>
                      <Select
                        value={expiryMinute}
                        onChange={setExpiryMinute}
                        className="flex-1"
                        options={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => ({ value: m, label: m }))}
                      />
                      <Select
                        value={expiryPeriod}
                        onChange={setExpiryPeriod}
                        className="flex-1"
                        options={[
                          { value: 'AM', label: 'AM' },
                          { value: 'PM', label: 'PM' }
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</span>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-800"
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Link is active and redirecting</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Short Link Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col gap-4 justify-between">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Short Link Access</h3>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-3 rounded-lg">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 select-all truncate mr-2">{shortUrl}</span>
            <Button onClick={handleCopy} className="p-2 py-1.5 px-3 flex gap-1.5 items-center shrink-0">
              <Copy size={12} /> Copy
            </Button>
          </div>
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-50">{analytics.summary?.totalClicks || url.click_count}</span>
              <span className="text-xs text-slate-400 font-semibold uppercase">Total Clicks</span>
            </div>
            <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-6">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-50">{analytics.summary?.uniqueVisitors || 0}</span>
              <span className="text-xs text-slate-400 font-semibold uppercase">Unique Visitors</span>
            </div>
            <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-6">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-50">{analytics.summary?.returningVisitors || 0}</span>
              <span className="text-xs text-slate-400 font-semibold uppercase">Repeat Views</span>
            </div>
          </div>
        </Card>
 
        {/* QR Code generator */}
        <Card className="flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300 justify-center sm:justify-start">
              <QrCode size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider">QR Code campaigns</h3>
            </div>
            <p className="text-xs text-slate-400 max-w-xs leading-normal">
              Download this QR code to place on print designs, flyers, presentation slides, or emails.
            </p>
            <Button onClick={handleDownloadQr} className="mt-2 flex gap-1.5 items-center justify-center">
              <Download size={14} /> Download PNG
            </Button>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm shrink-0">
            {shortUrl && (
              <QRCodeSVG
                id="qr-code-svg"
                value={shortUrl}
                size={110}
                level="H"
                includeMargin={false}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Visitor Loyalty / Engagement Breakdown Progress Bar (LinkSphere Style) */}
      <Card className="flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase">
          <span>Visitor Engagement Breakdown</span>
          <span className="text-emerald-500 font-extrabold">
            {analytics.summary?.totalClicks > 0 
              ? ((analytics.summary?.returningVisitors / analytics.summary?.totalClicks) * 100).toFixed(0) 
              : 0}% Repeat Views
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${analytics.summary?.totalClicks > 0 ? (analytics.summary?.uniqueVisitors / analytics.summary?.totalClicks) * 100 : 100}%` }} 
            className="h-full bg-emerald-500 transition-all duration-500" 
            title={`New Unique Visitors: ${analytics.summary?.uniqueVisitors || 0}`}
          />
          <div 
            style={{ width: `${analytics.summary?.totalClicks > 0 ? (analytics.summary?.returningVisitors / analytics.summary?.totalClicks) * 100 : 0}%` }} 
            className="h-full bg-teal-400 transition-all duration-500" 
            title={`Returning Repeat Views: ${analytics.summary?.returningVisitors || 0}`}
          />
        </div>
        <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
            <span className="font-semibold">New Unique Visitors ({analytics.summary?.uniqueVisitors || 0})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-teal-400 rounded-full"></div>
            <span className="font-semibold">Returning Repeat Clicks ({analytics.summary?.returningVisitors || 0})</span>
          </div>
        </div>
      </Card>
 
      {/* Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Click Trends (Last 14 Days)</h3>
            <div className="h-64">
              {trends.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                  <BarChart3 size={24} /> No clicks logged yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorDetails" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--theme-primary)" stopOpacity={0.06}/>
                        <stop offset="95%" stopColor="var(--theme-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border)" opacity={0.8} />
                    <XAxis dataKey="date" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} />
                    <YAxis stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--theme-bg-card)', borderColor: 'var(--theme-border)', borderRadius: '12px', color: 'var(--theme-text-primary)', fontSize: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }} labelFormatter={(str) => new Date(str).toLocaleDateString()} />
                    <Area type="monotone" dataKey="count" name="Clicks" stroke="var(--theme-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorDetails)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
 
        {/* Device breakdown Bar Chart (LinkSphere Style) */}
        <Card className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Device type Breakdown</h3>
          <div className="flex-1 flex flex-col justify-center min-h-[200px]">
            {renderProgressBarChart(devices, "No traffic breakdown available.")}
          </div>
        </Card>
      </div>

      {/* Countries, Browsers, and Traffic Sources grids (LinkSphere Style Bar Charts) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Top countries</h3>
          <div className="flex-1 flex flex-col justify-center">
            {renderProgressBarChart(countries, "No visitor countries recorded.")}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Top Browsers</h3>
          <div className="flex-1 flex flex-col justify-center">
            {renderProgressBarChart(browsers, "No visitor browsers recorded.")}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Top Traffic Sources</h3>
          <div className="flex-1 flex flex-col justify-center">
            {renderProgressBarChart(referers, "No referrers recorded.")}
          </div>
        </Card>
      </div>

      {/* Visitor Logs Table */}
      <Card className="flex flex-col gap-4 overflow-hidden">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Visitor click logs</h3>
          {recentVisits.length > 0 && (
            <Button onClick={handleExportCSV} variant="secondary" className="flex items-center gap-1.5 text-xs !py-1.5 !px-3 font-bold">
              <Download size={12} /> Export CSV
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          {recentVisits.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">No visitor logs recorded.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase">
                  <th className="pb-3 px-3">Visited Date</th>
                  <th className="pb-3 px-3">IP Address</th>
                  <th className="pb-3 px-3">Country</th>
                  <th className="pb-3 px-3">Browser</th>
                  <th className="pb-3 px-3">Device</th>
                  <th className="pb-3 px-3">Referrer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {recentVisits.map((v, i) => (
                  <tr key={i} className="text-slate-700 dark:text-slate-300">
                    <td className="py-3 px-3 whitespace-nowrap">{new Date(v.visited_at).toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-xs">{v.ip_address}</td>
                    <td className="py-3 px-3">{v.country}</td>
                    <td className="py-3 px-3">{v.browser}</td>
                    <td className="py-3 px-3 capitalize">{v.device_type}</td>
                    <td className="py-3 px-3 truncate max-w-xs">{v.referer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
