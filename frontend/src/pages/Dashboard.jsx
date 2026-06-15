import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Link2, BarChart3, Sparkles, ChevronRight, RefreshCw, WifiOff, Zap, Lock } from 'lucide-react';
import io from 'socket.io-client';
import useAuthStore from '../store/authStore';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Dialog from '../components/ui/Dialog';
import Select from '../components/ui/Select';
import UrlCard from '../components/UrlCard';
import SkeletonList from '../components/SkeletonList';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import useDocumentTitle from '../hooks/useDocumentTitle';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 220, damping: 20 }
  }
};

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user, isInitialized } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [urlForm, setUrlForm] = useState({ originalUrl: '', customAlias: '', expiresAt: '' });
  const [formError, setFormError] = useState({});
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryHour, setExpiryHour] = useState('12');
  const [expiryMinute, setExpiryMinute] = useState('00');
  const [expiryPeriod, setExpiryPeriod] = useState('PM');
  const [selectedInsight, setSelectedInsight] = useState(null);
  const linksSectionRef = React.useRef(null);

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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Live data refresh state
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Guest Mock Data
  const guestStatsData = {
    summary: {
      totalClicks: 245380,
      uniqueVisitors: 158430,
      returningVisitors: 86950,
      totalUrls: 1250,
      activeUrls: 1220,
      expiredUrls: 30
    },
    trends: [
      { date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(), count: 1200 },
      { date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), count: 1850 },
      { date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(), count: 1400 },
      { date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), count: 2200 },
      { date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), count: 3100 },
      { date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), count: 2800 },
      { date: new Date().toISOString(), count: 3950 }
    ],
    aiInsights: [
      "Mock Traffic spikes observed from organic developer blogs.",
      "Best performing custom alias campaign redirects resolved in under 20ms.",
      "Sign up to unlock real AI-driven analysis on your shortened link audiences."
    ]
  };

  const guestUrlsData = [
    {
      id: "guest-url-1",
      original_url: "https://linksphere.example.com/project",
      short_code: "linksphere-repo",
      click_count: 8520,
      is_active: true,
      created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "guest-url-2",
      original_url: "https://katomaran.com/hackathon-guidelines",
      short_code: "hackathon-rules",
      click_count: 3410,
      is_active: true,
      created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "guest-url-3",
      original_url: "https://linksphere.example.com/search?q=url+shortener",
      short_code: "search-query",
      click_count: 1420,
      is_active: false,
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    }
  ];

  // 1. Fetch URLs (only if logged in and initialized)
  const { data: urlsData, isLoading: urlsLoading } = useQuery({
    queryKey: ['urls'],
    queryFn: () => api.get('/api/urls').then(res => res.data.data),
    enabled: isInitialized && !!user,
  });

  // 2. Fetch Dashboard stats (only if logged in and initialized)
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/api/urls/dashboard/stats').then(res => res.data.data),
    enabled: isInitialized && !!user,
    refetchInterval: 30000,          // Poll every 30s as live-data fallback
    refetchIntervalInBackground: false, // Only when tab is visible
  });

  const activeStats = (isInitialized && user) ? statsData : (isInitialized ? guestStatsData : null);
  const activeUrls = (isInitialized && user) ? urlsData : (isInitialized ? guestUrlsData : null);
  const activeLoading = !isInitialized || (user ? (urlsLoading || statsLoading) : false);

  // Real-time socket listener
  // Depends on user.id (stable string) instead of user object reference
  // to avoid creating duplicate connections when the user object identity changes.
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin);
    
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));

    socket.emit('join-user-room', user.id);

    socket.on('click-update', (event) => {
      // 1. Optimistically update 'urls' query data
      queryClient.setQueryData(['urls'], (oldUrls) => {
        if (!oldUrls) return oldUrls;
        return oldUrls.map(url => {
          if (url.id === event.urlId) {
            return { ...url, click_count: event.clickCount };
          }
          return url;
        });
      });

      // 2. Optimistically update 'stats' query data
      queryClient.setQueryData(['stats'], (oldStats) => {
        if (!oldStats) return oldStats;
        
        // Find click increment amount if match is found in the current URLs cache
        const oldUrls = queryClient.getQueryData(['urls']);
        const matchedUrl = oldUrls?.find(u => u.id === event.urlId);
        const oldLinkClicks = matchedUrl ? matchedUrl.click_count : (event.clickCount - 1);
        const increment = event.clickCount - oldLinkClicks || 1;

        const uniqueInc = event.isUniqueForUser ? increment : 0;
        const returningInc = !event.isUniqueForUser ? increment : 0;

        // Update daily trends count for today
        const todayStr = new Date().toISOString().split('T')[0];
        const updatedTrends = oldStats.trends ? [...oldStats.trends] : [];
        const todayTrendIndex = updatedTrends.findIndex(t => {
          const tDateStr = new Date(t.date).toISOString().split('T')[0];
          return tDateStr === todayStr;
        });
        if (todayTrendIndex !== -1) {
          updatedTrends[todayTrendIndex] = {
            ...updatedTrends[todayTrendIndex],
            count: parseInt(updatedTrends[todayTrendIndex].count) + increment
          };
        } else {
          updatedTrends.push({
            date: new Date().toISOString(),
            count: increment
          });
        }

        // Update top links list if url exists in top links
        let updatedTopLinks = oldStats.topLinks ? [...oldStats.topLinks] : [];
        const matchedTopLinkIndex = updatedTopLinks.findIndex(l => l.id === event.urlId);
        if (matchedTopLinkIndex !== -1) {
          updatedTopLinks[matchedTopLinkIndex] = {
            ...updatedTopLinks[matchedTopLinkIndex],
            click_count: event.clickCount
          };
        }
        updatedTopLinks.sort((a, b) => b.click_count - a.click_count);

        return {
          ...oldStats,
          summary: {
            ...oldStats.summary,
            totalClicks: parseInt(oldStats.summary.totalClicks) + increment,
            uniqueVisitors: parseInt(oldStats.summary.uniqueVisitors || 0) + uniqueInc,
            returningVisitors: parseInt(oldStats.summary.returningVisitors || 0) + returningInc
          },
          trends: updatedTrends,
          topLinks: updatedTopLinks,
          aiInsights: event.aiInsights || oldStats.aiInsights
        };
      });

      // 3. Invalidate queries in background to guarantee final consistency
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      
      // Flash toast notification of real-time click
      toast.success('Live Click recorded on /' + event.shortCode, { 
        id: 'click-toast-' + event.shortCode,
        duration: 3000,
        position: 'top-center'
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, queryClient]);

  // Manual refresh handler — fetches fresh counts for all live stat queries
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['stats'] }),
        queryClient.refetchQueries({ queryKey: ['urls'] }),
      ]);
      setLastRefreshed(new Date());
      toast.success('Live counts refreshed!', { duration: 2000, position: 'bottom-right' });
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/api/urls', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('URL shortened successfully!', { duration: 3000 });
      setIsDialogOpen(false);
      setUrlForm({ originalUrl: '', customAlias: '', expiresAt: '' });
      setExpiryDate('');
      setExpiryHour('12');
      setExpiryMinute('00');
      setExpiryPeriod('PM');
      setFormError({});
    },
    onError: (err) => {
      const errorData = err.response?.data?.error;
      if (errorData?.field) {
        setFormError({ [errorData.field]: errorData.message });
      } else {
        toast.error(errorData?.message || 'Failed to create link', { duration: 4000 });
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete('/api/urls/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Link deleted', { duration: 3000 });
    },
    onError: () => {
      toast.error('Failed to delete link');
    }
  });

  const handleCreateLinkClick = () => {
    if (!user) {
      toast.error("Please sign in or sign up to create short links.", { id: 'guest-create-toast' });
      navigate('/login');
      return;
    }
    setExpiryDate('');
    setExpiryHour('12');
    setExpiryMinute('00');
    setExpiryPeriod('PM');
    setUrlForm({ originalUrl: '', customAlias: '', expiresAt: '' });
    setFormError({});
    setIsDialogOpen(true);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError({});

    // Client-side URL validation
    const originalUrl = urlForm.originalUrl.trim();
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

    createMutation.mutate({
      ...urlForm,
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

  const handleClicksCardClick = () => {
    setSortBy('clicks');
    setStatusFilter('all');
    setTimeout(() => {
      linksSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const filteredAndSortedUrls = activeUrls ? activeUrls.filter(url => {
    const matchesSearch = url.short_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          url.original_url.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isExpired = url.expires_at && new Date(url.expires_at) < new Date();
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && url.is_active && !isExpired) ||
                         (statusFilter === 'expired' && isExpired) ||
                         (statusFilter === 'inactive' && !url.is_active && !isExpired);
                          
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'clicks') return b.click_count - a.click_count;
    return 0;
  }) : [];

  const getInsightDetails = (insight) => {
    if (!insight) return null;
    if (insight.includes("No click data") || insight.includes("Share your short links")) {
      return {
        title: "Audience Engagement Setup",
        category: "GETTING STARTED",
        colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        desc: "Your campaign short URL is fully operational and optimized for high-speed redirects, but it has not recorded any visitor clicks yet.",
        recommendations: [
          "Share your link on messaging networks or email newsletters.",
          "Post your campaign alias on professional and social networks.",
          "Verify redirects by running a quick test visit to the shortened link yourself."
        ]
      };
    }
    if (insight.includes("traffic originates from") || insight.includes("originates from") || insight.includes("spikes observed")) {
      return {
        title: "Geographical Traffic Spike",
        category: "GEOTARGETING",
        colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        desc: "A significant percentage of your redirects are coming from specific target geographic locations and developer platforms.",
        recommendations: [
          "Tailor landing page content to speak directly to the localized region's user needs.",
          "Monitor platform engagement trends to see if traffic spikes align with community shares.",
          "Create localized campaign aliases to track individual outreach pipelines."
        ]
      };
    }
    if (insight.includes("predominantly using") || insight.includes("devices")) {
      return {
        title: "Mobile Device Engagement",
        category: "DEVICE METRICS",
        colorClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        desc: "Visitor activity logs show that the majority of your redirects are resolved on mobile platforms and smartphones.",
        recommendations: [
          "Verify that your final destination URL is fully responsive and fast to load on mobile browsers.",
          "Minimize page redirects to ensure visitors on cell networks load the page immediately.",
          "Keep call-to-action buttons clean and easy to tap on smaller touch screens."
        ]
      };
    }
    if (insight.includes("Engagement peaks around") || insight.includes("peaks around")) {
      return {
        title: "Campaign Posting Timing",
        category: "CAMPAIGN TIMING",
        colorClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        desc: "Historical redirect data logs reveal specific time windows of high active engagement throughout the day.",
        recommendations: [
          "Publish new marketing campaigns and links about an hour before peak traffic starts.",
          "Integrate email announcements to hit reader inboxes during these high-volume slots.",
          "Align team review windows around peak traffic intervals to log live behavior."
        ]
      };
    }
    if (insight.includes("audience retention") || insight.includes("repeat visitors")) {
      return {
        title: "Audience Loyalty & Returning Views",
        category: "AUDIENCE LOYALTY",
        colorClass: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        desc: "A healthy portion of your clicks represent repeat visitors returning to your shortened campaigns.",
        recommendations: [
          "Update the destination resources regularly to keep returning audiences engaged.",
          "Introduce sign-up newsletters or community portals on the target landing page.",
          "Monitor returning visitor trends to measure long-term campaign retention."
        ]
      };
    }
    if (insight.includes("audience reach") || insight.includes("unique visitors")) {
      return {
        title: "Audience Reach & Growth Trends",
        category: "AUDIENCE GROWTH",
        colorClass: "bg-green-500/10 text-green-400 border-green-500/20",
        desc: "Your links are capturing a high percentage of unique, first-time visitors to your digital campaigns.",
        recommendations: [
          "Streamline user onboarding flows on your destination page to maximize conversion.",
          "Test different custom aliases to see which keyword variation drives the highest click rate.",
          "Leverage social media influencers to amplify link shares to new audiences."
        ]
      };
    }
    return {
      title: "AI Campaign Optimization",
      category: "CAMPAIGN INSIGHT",
      colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      desc: "LinkSphere's machine learning model has analyzed your link logs and recommends the following optimizations.",
      recommendations: [
        "Use custom aliases rather than default random codes to increase user trust.",
        "Regularly review click trends to identify changes in user engagement.",
        "Maintain active statuses on links to prevent campaign disruptions."
      ]
    };
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome Greeting */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-50">
            Good to see you! 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeStats?.summary?.totalClicks > 0 
              ? 'Your links have collected ' + activeStats.summary.totalClicks + ' clicks overall.' 
              : 'Shorten a link below to start collecting traffic metrics.'}
          </p>
        </div>
        <Button onClick={handleCreateLinkClick} className="flex items-center gap-2">
          <Plus size={16} /> Create Link
        </Button>
      </div>

      {/* Quick Shorten Input Bar */}
      {user && (
        <Card className="p-4 bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <input 
                type="url" 
                placeholder="Paste a long URL to shorten..."
                required
                value={urlForm.originalUrl}
                onChange={(e) => setUrlForm({ ...urlForm, originalUrl: e.target.value })}
                className="flex-1 px-5 py-3 rounded-full text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
              />
              <input
                type="text"
                placeholder="Custom alias (optional)"
                value={urlForm.customAlias}
                onChange={(e) => setUrlForm({ ...urlForm, customAlias: e.target.value })}
                className="w-full sm:w-48 px-5 py-3 rounded-full text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="flex items-center justify-center gap-2 px-6 shrink-0 py-3 text-xs sm:text-sm font-bold">
              {createMutation.isPending ? 'Shortening...' : 'Shorten URL'}
            </Button>
          </form>
          {formError.originalUrl && (
            <p className="text-xs text-red-500 mt-2 ml-1">{formError.originalUrl}</p>
          )}
          {formError.customAlias && (
            <p className="text-xs text-red-500 mt-1 ml-1">{formError.customAlias}</p>
          )}
        </Card>
      )}

      {/* Guest Promotional Banner */}
      {!user && (
        <div className="bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-green-600/10 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-green-950/20 border border-emerald-150/40 dark:border-emerald-900/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-center md:justify-start gap-2 text-sm">
              <Sparkles size={16} className="text-primary" />
              Experience Real-Time Link Intelligence
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-normal">
              You are viewing the public preview dashboard. Create an account to shorten your own links, customize campaign aliases, track live click streams, and view geotargeted analytics.
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <Link to="/login">
              <Button variant="secondary" className="font-bold text-xs !py-1.5 !px-3.5">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button className="font-bold text-xs bg-primary text-white dark:text-slate-950 !py-1.5 !px-3.5">Create Account</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Summary Grid (Expanded 6 Cards LinkSphere Style) */}
      <div className="flex flex-col gap-3">
        {/* Stats header with WebSocket status + manual refresh */}
        {user && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Counts</span>
              <div className="flex items-center gap-1.5">
                {socketConnected ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">WebSocket Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={11} className="text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Polling Fallback</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 hidden sm:block">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
              <button
                onClick={handleManualRefresh}
                disabled={isManualRefreshing}
                title="Manually refresh all live counts"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  size={11}
                  className={isManualRefreshing ? 'animate-spin text-primary' : ''}
                />
                {isManualRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {activeLoading ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="visible" 
            className="col-span-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            <motion.div variants={itemVariants}>
              <Card 
                onClick={handleClicksCardClick}
                className="flex flex-col gap-1 w-full h-full"
              >
                <span className="text-xs text-slate-400 font-medium">Total Clicks</span>
                <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">{activeStats?.summary?.totalClicks || 0}</span>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card 
                onClick={handleClicksCardClick}
                className="flex flex-col gap-1 w-full h-full"
              >
                <span className="text-xs text-slate-400 font-medium">Unique Visitors</span>
                <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">{activeStats?.summary?.uniqueVisitors || 0}</span>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card 
                onClick={handleClicksCardClick}
                className="flex flex-col gap-1 w-full h-full"
              >
                <span className="text-xs text-slate-400 font-medium">Returning Views</span>
                <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">{activeStats?.summary?.returningVisitors || 0}</span>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card 
                onClick={() => { setStatusFilter('all'); setTimeout(() => linksSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                className="flex flex-col gap-1 w-full h-full"
              >
                <span className="text-xs text-slate-400 font-medium">Total Links</span>
                <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">{activeStats?.summary?.totalUrls || 0}</span>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card 
                onClick={() => { setStatusFilter('active'); setTimeout(() => linksSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                className="flex flex-col gap-1 w-full h-full"
              >
                <span className="text-xs text-slate-400 font-medium">Active Links</span>
                <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">{activeStats?.summary?.activeUrls || 0}</span>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card 
                onClick={() => { setStatusFilter('expired'); setTimeout(() => linksSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                className="flex flex-col gap-1 w-full h-full"
              >
                <span className="text-xs text-slate-400 font-medium">Expired Links</span>
                <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-50">{activeStats?.summary?.expiredUrls || 0}</span>
              </Card>
            </motion.div>
          </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Click Trend Area Chart */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col gap-4 text-left">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Overall Click Trends</h2>
            <div className="h-64">
              {activeLoading ? (
                <Skeleton className="h-full w-full" />
              ) : activeStats?.trends?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                  <BarChart3 size={24} /> No traffic records in the past week.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeStats?.trends}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--theme-primary)" stopOpacity={0.06}/>
                        <stop offset="95%" stopColor="var(--theme-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border)" opacity={0.8} />
                    <XAxis dataKey="date" stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} />
                    <YAxis stroke="var(--theme-border)" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--theme-bg-card)', borderColor: 'var(--theme-border)', borderRadius: '12px', color: 'var(--theme-text-primary)', fontSize: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }} labelFormatter={(str) => new Date(str).toLocaleDateString()} />
                    <Area type="monotone" dataKey="count" name="Clicks" stroke="var(--theme-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Right Stack: Top Links & AI Insights */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Top Performing Links Card */}
          {user && (
            <Card className="flex flex-col gap-3 text-left">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
                <Zap size={14} className="text-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">Top Performing Links</h2>
              </div>
              
              {activeLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !activeStats?.topLinks || activeStats.topLinks.length === 0 ? (
                <span className="text-[11px] text-slate-400">No link activity tracked yet.</span>
              ) : (
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                  {activeStats.topLinks.map((top, idx) => (
                    <Link 
                      to={'/urls/' + top.id}
                      key={top.id} 
                      className="flex justify-between items-center text-xs p-2 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-xl hover:border-slate-250 dark:hover:border-slate-750 transition-all hover:scale-[1.015] hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 text-left">
                        <span className="font-bold text-slate-400">#{idx + 1}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-855 dark:text-slate-100">/{top.short_code}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[120px] sm:max-w-xs">{top.original_url}</span>
                        </div>
                      </div>
                      <span className="font-extrabold text-slate-700 dark:text-slate-350 shrink-0">{top.click_count} clicks</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* AI Insights Card */}
          <Card className="flex flex-col gap-3 text-slate-850 dark:text-white relative overflow-hidden flex-1 text-left">
            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 text-emerald-500">
              <Sparkles size={80} />
            </div>
            <div className="flex items-center gap-2 text-primary border-b border-slate-100 dark:border-slate-850 pb-2">
              <Sparkles size={14} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-850 dark:text-slate-100">AI Traffic Insights</h2>
            </div>
            
            {activeLoading ? (
              <div className="flex flex-col gap-2 flex-1 justify-center">
                <Skeleton className="h-6 w-full bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="h-6 w-4/5 bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : (
              <div className="flex flex-col gap-2 flex-1 justify-center max-h-[140px] overflow-y-auto pr-1">
                {activeStats?.aiInsights?.map((insight, idx) => {
                  let label = "INSIGHT";
                  let colorClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                  
                  if (insight.includes("No click data") || insight.includes("Share your short links")) {
                    label = "GETTING STARTED";
                    colorClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20";
                  } else if (insight.includes("traffic originates from") || insight.includes("originates from") || insight.includes("spikes observed")) {
                    label = "GEOTARGETING";
                    colorClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                  } else if (insight.includes("predominantly using") || insight.includes("devices")) {
                    label = "DEVICE METRICS";
                    colorClass = "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20";
                  } else if (insight.includes("Engagement peaks around") || insight.includes("peaks around")) {
                    label = "CAMPAIGN TIMING";
                    colorClass = "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20";
                  } else if (insight.includes("audience retention") || insight.includes("repeat visitors")) {
                    label = "AUDIENCE LOYALTY";
                    colorClass = "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20";
                  } else if (insight.includes("audience reach") || insight.includes("unique visitors")) {
                    label = "AUDIENCE GROWTH";
                    colorClass = "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20";
                  }

                  return (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedInsight(insight)}
                      className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-xl p-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer active:scale-[0.98] hover:border-emerald-500/30 text-left"
                      title="Click to view details and recommendations"
                    >
                      <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border w-fit ${colorClass}`}>
                        {label}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 text-[11px] font-semibold leading-relaxed flex items-center justify-between gap-1">
                        <span className="truncate max-w-[180px] sm:max-w-xs">{insight}</span>
                        <ChevronRight size={12} className="text-slate-500 shrink-0" />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>



      <div ref={linksSectionRef} className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-50">
            {user ? (user.role === 'admin' ? 'All Shortened Links' : 'Your Shortened Links') : 'Featured Shortened Links'}
          </h2>
          
          {/* Search and Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search code or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 text-xs font-medium bg-slate-100/50 dark:bg-slate-900/50 border border-slate-250/70 dark:border-slate-800/80 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 w-full sm:w-44"
            />
            
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full sm:w-auto min-w-[130px]"
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'expired', label: 'Expired' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
 
            <Select
              value={sortBy}
              onChange={setSortBy}
              className="w-full sm:w-auto min-w-[130px]"
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'clicks', label: 'Most Clicked' }
              ]}
            />
          </div>
        </div>
 
        {activeLoading ? (
          <SkeletonList />
        ) : filteredAndSortedUrls.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 flex flex-col items-center text-center gap-4">
            <Link2 size={40} className="text-slate-350 dark:text-slate-650" />
            <h3 className="font-bold text-lg">No links found</h3>
            <p className="text-slate-400 max-w-sm text-sm">
              {activeUrls?.length > 0 
                ? 'Try adjusting your search query or status filters to find links.' 
                : (user?.role === 'admin' ? 'No shortened links found in the system.' : 'Create your first shortened link to track analytics, generate QR codes, and measure visitor performance.')}
            </p>
            {activeUrls?.length === 0 && user?.role !== 'admin' && (
              <Button onClick={handleCreateLinkClick} className="flex items-center gap-2">
                <Plus size={16} /> Shorten your first link
              </Button>
            )}
          </div>
        ) : (
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="visible" 
            className="flex flex-col gap-4"
          >
            {filteredAndSortedUrls.map((url) => (
              <motion.div key={url.id} variants={itemVariants}>
                <UrlCard 
                  url={url} 
                  onDelete={(id) => deleteMutation.mutate(id)} 
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* About LinkSphere Card */}
      {!user && (
        <Card className="flex flex-col gap-4 text-slate-800 dark:text-white p-6 mt-4 border border-slate-150 dark:border-slate-850 bg-white dark:bg-[#111726]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">About LinkSphere</h3>
          <p className="text-xs leading-relaxed max-w-4xl text-slate-500 dark:text-slate-400">
            LinkSphere is a premium, real-time Link Intelligence Platform designed to shorten URLs, create custom campaign aliases, and deliver deep insights into audience behaviors. Securely scale campaigns with live Socket.IO logging and responsive dashboard metrics.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">High-Performance Gateway</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">Redirects are processed instantly in the backend with low latency database lookup caching, ensuring minimal overhead and maximum throughput.</p>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">Socket.IO Live Streaming</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">Visitor clicks stream directly to the admin and user feeds in real-time, providing immediate visibility into campaign performance.</p>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">Hardened Security Guard</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">Equipped with strict rate limiters, session tracking, token rotation, and robust authentication flow to prevent platform abuse.</p>
            </div>
          </div>
        </Card>
      )}

      {/* AI Insight Detail Dialog */}
      <Dialog 
        isOpen={!!selectedInsight} 
        onClose={() => setSelectedInsight(null)} 
        title={selectedInsight ? getInsightDetails(selectedInsight).title : "Insight Details"}
      >
        {selectedInsight && (() => {
          const details = getInsightDetails(selectedInsight);
          return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mt-1">
                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border ${details.colorClass}`}>
                  {details.category}
                </span>
                <span className="text-[10px] font-bold text-slate-400">LinkSphere Recommendation</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Metric Context</span>
                <p className="text-slate-800 dark:text-slate-200 text-xs font-medium leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  {selectedInsight}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Explanation</span>
                <p className="text-slate-650 dark:text-slate-350 text-xs leading-relaxed font-semibold">
                  {details.desc}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Actionable Steps</span>
                <ul className="flex flex-col gap-2">
                  {details.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2.5 items-start bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold leading-relaxed">
                        {rec}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={() => setSelectedInsight(null)} className="text-xs font-bold px-5">
                  Done
                </Button>
              </div>
            </div>
          );
        })()}
      </Dialog>

      {/* Create URL Dialog */}
      <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} title="Shorten a URL">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Destination URL"
            id="originalUrl"
            type="url"
            placeholder="https://example.com/very-long-link-path"
            required
            value={urlForm.originalUrl}
            onChange={(e) => setUrlForm({ ...urlForm, originalUrl: e.target.value })}
            error={formError.originalUrl}
          />
          <Input
            label="Custom Alias (Optional)"
            id="customAlias"
            placeholder="my-campaign-alias"
            value={urlForm.customAlias}
            onChange={(e) => setUrlForm({ ...urlForm, customAlias: e.target.value })}
            error={formError.customAlias}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-500" /> Lock Link Access (Expiry Date)
            </span>
            <input
              type="date"
              id="expiryDate"
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
          <div className="flex justify-end gap-2.5 mt-2">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Shortening...' : 'Shorten'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
