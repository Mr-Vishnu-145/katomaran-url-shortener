import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, BarChart3, ShieldAlert, ShieldCheck, Activity, Sparkles, ExternalLink, Zap, RefreshCw, Wifi, WifiOff, ChevronRight } from 'lucide-react';
import io from 'socket.io-client';
import useAuthStore from '../store/authStore';
import api from '../api/axios';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import Dialog from '../components/ui/Dialog';
import toast from 'react-hot-toast';

import useDocumentTitle from '../hooks/useDocumentTitle';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
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

export default function AdminDashboard() {
  useDocumentTitle('Admin Panel');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('users');
  const [liveActivity, setLiveActivity] = useState([]);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);

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
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  const [userRole, setUserRole] = useState('all');
  const [linkSearch, setLinkSearch] = useState('');
  const [debouncedLinkSearch, setDebouncedLinkSearch] = useState('');
  const [linkStatus, setLinkStatus] = useState('all');
  const [userToDelete, setUserToDelete] = useState(null);
  const linksSectionRef = React.useRef(null);

  const scrollToLinks = () => {
    setTimeout(() => {
      linksSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearch(userSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLinkSearch(linkSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [linkSearch]);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(import.meta.env.VITE_API_URL || window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));

    // Pass userId so the server can verify admin role before granting room access
    socket.emit('join-admin-room', user.id);

    socket.on('admin-click-update', (event) => {
      // 1. Optimistically update 'admin-urls' query cache for all search queries
      queryClient.setQueriesData({ queryKey: ['admin-urls'] }, (oldUrls) => {
        if (!oldUrls) return oldUrls;
        return oldUrls.map(url => {
          if (url.id === event.urlId) {
            return { ...url, click_count: event.clickCount };
          }
          return url;
        });
      });

      // 2. Optimistically update 'admin-analytics' query cache
      // Guard: if cache is null (first load before data arrives), skip optimistic update
      // and rely on the background invalidation below to fetch fresh data.
      queryClient.setQueryData(['admin-analytics'], (oldAnalytics) => {
        if (!oldAnalytics) return oldAnalytics; // safe skip — invalidation below will refetch
        
        const activeUrlsQueries = queryClient.getQueriesData({ queryKey: ['admin-urls'] });
        let matchedUrl = null;
        for (const [key, data] of activeUrlsQueries) {
          if (Array.isArray(data)) {
            const found = data.find(u => u.id === event.urlId);
            if (found) {
              matchedUrl = found;
              break;
            }
          }
        }
        
        const oldLinkClicks = matchedUrl ? matchedUrl.click_count : (event.clickCount - 1);
        const increment = event.clickCount - oldLinkClicks || 1;

        const uniqueInc = event.isUniqueForUser ? increment : 0;
        const returningInc = !event.isUniqueForUser ? increment : 0;

        let updatedTopUrls = oldAnalytics.topUrls ? [...oldAnalytics.topUrls] : [];
        const matchedTopIndex = updatedTopUrls.findIndex(u => u.id === event.urlId);
        if (matchedTopIndex !== -1) {
          updatedTopUrls[matchedTopIndex] = {
            ...updatedTopUrls[matchedTopIndex],
            click_count: event.clickCount
          };
        }
        updatedTopUrls.sort((a, b) => b.click_count - a.click_count);

        const todayStr = new Date().toISOString().split('T')[0];
        let updatedTrends = oldAnalytics.trends ? [...oldAnalytics.trends] : [];
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

        return {
          ...oldAnalytics,
          summary: {
            ...oldAnalytics.summary,
            totalClicks: parseInt(oldAnalytics.summary.totalClicks || 0) + increment,
            uniqueVisitors: parseInt(oldAnalytics.summary.uniqueVisitors || 0) + uniqueInc,
            returningVisitors: parseInt(oldAnalytics.summary.returningVisitors || 0) + returningInc
          },
          topUrls: updatedTopUrls,
          trends: updatedTrends
        };
      });

      // 3. Trigger background invalidation for ultimate sync
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-urls'] });
      
      setLiveActivity((prev) => {
        const updated = [
          {
            id: event.urlId + '-' + Date.now(),
            shortCode: event.shortCode,
            country: event.newVisit.country,
            browser: event.newVisit.browser,
            deviceType: event.newVisit.device_type,
            visitedAt: event.newVisit.visited_at,
            ipAddress: event.newVisit.ip_address,
          },
          ...prev,
        ];
        return updated.slice(0, 10);
      });
      
      toast.success(`Platform Click: /${event.shortCode}`, {
        id: `admin-toast-${event.shortCode}-${Date.now()}`,
        duration: 3000,
        position: 'bottom-right'
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [user?.id, queryClient]);

  // Manual refresh handler — fetches fresh counts for all live stat queries
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin-analytics'] }),
        queryClient.refetchQueries({ queryKey: ['admin-users'] }),
        queryClient.refetchQueries({ queryKey: ['admin-urls'] }),
      ]);
      setLastRefreshed(new Date());
      toast.success('Live counts refreshed!', { duration: 2000, position: 'bottom-right' });
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Fetch Users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', debouncedUserSearch, userRole],
    queryFn: () => api.get('/api/admin/users', {
      params: { search: debouncedUserSearch, role: userRole }
    }).then(res => res.data.data),
  });

  // Fetch URLs
  const { data: urls, isLoading: urlsLoading } = useQuery({
    queryKey: ['admin-urls', debouncedLinkSearch],
    queryFn: () => api.get('/api/admin/urls', {
      params: { search: debouncedLinkSearch }
    }).then(res => res.data.data),
  });

  // Fetch Deleted Users
  const { data: deletedUsers, isLoading: deletedUsersLoading } = useQuery({
    queryKey: ['admin-deleted-users'],
    queryFn: () => api.get('/api/admin/deleted-users').then(res => res.data.data),
    enabled: activeTab === 'deleted-users',
  });

  // Fetch Platform Analytics — with 30s polling fallback for periods with no click events
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/api/admin/analytics').then(res => res.data.data),
    refetchInterval: 30000, // Poll every 30 seconds as live-data fallback
    refetchIntervalInBackground: false, // Only poll when tab is visible
  });

  // Toggle user suspension
  const suspendMutation = useMutation({
    mutationFn: ({ id, isSuspended }) => api.put('/api/admin/users/' + id, { isSuspended }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(res.data.message || 'Operation successful', { duration: 3000 });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Action failed');
    }
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: (id) => api.delete('/api/admin/users/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      toast.success('User deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete user');
    }
  });

  // Delete any URL — uses admin-protected endpoint with requireAdmin middleware
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete('/api/admin/urls/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-urls'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      toast.success('Link deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete link');
    }
  });

  const filteredUrls = urls ? urls.filter(url => {
    const isExpired = url.expires_at && new Date(url.expires_at) < new Date();
    if (linkStatus === 'active') return url.is_active && !isExpired;
    if (linkStatus === 'expired') return isExpired;
    if (linkStatus === 'inactive') return !url.is_active && !isExpired;
    return true;
  }) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-50 flex items-center gap-2">
          <ShieldAlert size={24} className="text-primary" /> Platform Administration
        </h1>
        <p className="text-sm text-slate-500">
          Manage system users, moderate short code links, and view overall statistics.
        </p>
      </div>

      {/* Platform Summary stats */}
      <div className="flex flex-col gap-3">
        {/* Stats header row with live status + manual refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Platform Counts</span>
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

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {analyticsLoading ? (
            [...Array(7)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : (
            <motion.div 
              variants={containerVariants} 
              initial="hidden" 
              animate="visible" 
              className="col-span-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4"
            >
              <motion.div variants={itemVariants}>
                <Card 
                  onClick={() => { setActiveTab('users'); scrollToLinks(); }}
                  className="flex flex-col gap-1 w-full h-full group"
                >
                  <span className="text-xs text-slate-400 font-medium">Platform Users</span>
                  <span className="text-3xl font-extrabold text-slate-850 dark:text-slate-50">{analytics?.summary?.totalUsers || 0}</span>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card 
                  onClick={() => { setActiveTab('urls'); setLinkStatus('all'); scrollToLinks(); }}
                  className="flex flex-col gap-1 w-full h-full"
                >
                  <span className="text-xs text-slate-400 font-medium">Total Clicks</span>
                  <span className="text-3xl font-extrabold text-slate-850 dark:text-slate-50">{analytics?.summary?.totalClicks || 0}</span>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card 
                  onClick={() => { setActiveTab('urls'); setLinkStatus('all'); scrollToLinks(); }}
                  className="flex flex-col gap-1 w-full h-full"
                >
                  <span className="text-xs text-slate-400 font-medium">Unique Visitors</span>
                  <span className="text-3xl font-extrabold text-slate-850 dark:text-slate-50">{analytics?.summary?.uniqueVisitors || 0}</span>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card 
                  onClick={() => { setActiveTab('urls'); setLinkStatus('all'); scrollToLinks(); }}
                  className="flex flex-col gap-1 w-full h-full"
                >
                  <span className="text-xs text-slate-400 font-medium">Returning Views</span>
                  <span className="text-3xl font-extrabold text-slate-850 dark:text-slate-50">{analytics?.summary?.returningVisitors || 0}</span>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card 
                  onClick={() => { setActiveTab('urls'); setLinkStatus('all'); scrollToLinks(); }}
                  className="flex flex-col gap-1 w-full h-full"
                >
                  <span className="text-xs text-slate-400 font-medium">Total Links</span>
                  <span className="text-3xl font-extrabold text-slate-850 dark:text-slate-50">{analytics?.summary?.totalUrls || 0}</span>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card 
                  onClick={() => { setActiveTab('urls'); setLinkStatus('active'); scrollToLinks(); }}
                  className="flex flex-col gap-1 w-full h-full"
                >
                  <span className="text-xs text-slate-400 font-medium">Active Links</span>
                  <span className="text-3xl font-extrabold text-slate-850 dark:text-slate-50">{analytics?.summary?.activeUrls || 0}</span>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card 
                  onClick={() => { setActiveTab('urls'); setLinkStatus('expired'); scrollToLinks(); }}
                  className="flex flex-col gap-1 w-full h-full"
                >
                  <span className="text-xs text-slate-400 font-medium">Expired Links</span>
                  <span className="text-3xl font-extrabold text-slate-850 dark:text-slate-50">{analytics?.summary?.expiredUrls || 0}</span>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </div>
            {/* Platform Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Links Card */}
        <Card className="flex flex-col gap-4 h-full">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
            <Zap size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Top Performing Links</h2>
          </div>
          
          {analyticsLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !analytics?.topUrls || analytics.topUrls.length === 0 ? (
            <span className="text-xs text-slate-400">No active links or click statistics logged.</span>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[260px] pr-1">
              {analytics.topUrls.map((top, idx) => (
                <Link 
                  to={'/urls/' + top.id}
                  key={top.id} 
                  className="flex justify-between items-center text-xs p-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-xl hover:border-slate-250 dark:hover:border-slate-750 transition-all hover:scale-[1.015] hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-400">#{idx + 1}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-100">/{top.short_code}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px] sm:max-w-xs">{top.original_url}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold text-slate-700 dark:text-slate-350">{top.click_count}</span>
                    <span className="text-[10px] text-primary font-semibold truncate max-w-[70px]">{top.owner_email.split('@')[0]}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Live Platform Insights (Live Insights) Card */}
        <Card className="flex flex-col gap-4 text-slate-800 dark:text-white relative overflow-hidden h-full">
          <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 text-emerald-500">
            <Sparkles size={100} />
          </div>
          <div className="flex items-center gap-2 text-primary border-b border-slate-100 dark:border-slate-850 pb-3">
            <Sparkles size={16} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">Live AI Platform Insights</h2>
          </div>
          
          {analyticsLoading ? (
            <div className="flex flex-col gap-3 flex-1 justify-center">
              <Skeleton className="h-8 w-full bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-8 w-4/5 bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : !analytics?.aiInsights || analytics.aiInsights.length === 0 ? (
            <span className="text-xs text-slate-400">Awaiting visitor traffic to generate analytics insights...</span>
          ) : (
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[260px] pr-1">
              {analytics.aiInsights.map((insight, idx) => {
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
                    className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-xl p-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer active:scale-[0.98] hover:border-emerald-500/30"
                    title="Click to view details and recommendations"
                  >
                    <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border w-fit ${colorClass}`}>
                      {label}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 text-xs font-semibold leading-relaxed flex items-center justify-between gap-1">
                      <span className="truncate max-w-[180px] sm:max-w-xs">{insight}</span>
                      <ChevronRight size={12} className="text-slate-500 shrink-0" />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Live Activity Feed Card */}
        <Card className="flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Live Activity Feed</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/20 text-success border border-emerald-100 dark:border-emerald-950/30">Live Connection</span>
          </div>

          {liveActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 gap-2 flex-1">
              <div className="p-2 bg-slate-105/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-full">
                <Activity size={20} className="animate-pulse" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Awaiting redirect traffic...</p>
              <p className="text-[10px] text-slate-450 max-w-xs">Clicks on any shortened campaign link across the system will stream in here in real time.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[260px] pr-1">
              {liveActivity.map((activity) => (
                <div key={activity.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-xl">
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">/{activity.shortCode}</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/25 uppercase tracking-wide">{activity.deviceType}</span>
                    </div>
                    <span className="text-[10px] text-slate-450 font-mono">{activity.ipAddress} • {activity.browser}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-bold text-slate-700 dark:text-slate-350">{activity.country}</span>
                    <span className="text-[9px] text-slate-400">{new Date(activity.visitedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>    </div>

      {/* Navigation tabs */}
      <div ref={linksSectionRef} className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('users')}
          className={"px-4 py-2.5 font-bold text-sm border-b-2 transition-colors " + (activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200')}
        >
          Users List
        </button>
        <button
          onClick={() => setActiveTab('urls')}
          className={"px-4 py-2.5 font-bold text-sm border-b-2 transition-colors " + (activeTab === 'urls' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200')}
        >
          Shortened Links
        </button>
        <button
          onClick={() => setActiveTab('deleted-users')}
          className={"px-4 py-2.5 font-bold text-sm border-b-2 transition-colors " + (activeTab === 'deleted-users' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200')}
        >
          Deleted Users Log
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'users' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-50">Platform Users</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              <Select
                value={userRole}
                onChange={setUserRole}
                className="w-32"
                options={[
                  { value: 'all', label: 'All Roles' },
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' }
                ]}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {usersLoading ? (
              <div className="p-4"><Skeleton className="h-32 w-full" /></div>
            ) : !users || users.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm font-semibold">
                {userSearch || userRole !== 'all' ? 'No users found matching your criteria.' : 'No platform users registered.'}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase">
                    <th className="pb-3 px-3 pt-3">Email address</th>
                    <th className="pb-3 px-3 pt-3">System Role</th>
                    <th className="pb-3 px-3 pt-3">Status</th>
                    <th className="pb-3 px-3 pt-3">Registration Date</th>
                    <th className="pb-3 px-3 pt-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 px-3 font-semibold">
                        {u.status === 'deleted' ? (
                          <span className="text-slate-400 font-normal">{u.email}</span>
                        ) : (
                          <Link 
                            to={`/admin/users/${u.id}`} 
                            className="text-primary hover:underline font-bold"
                          >
                            {u.email}
                          </Link>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={"px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider " + (u.role === 'admin' ? 'bg-primary/10 text-primary border-primary/25' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800')}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.status === 'deleted' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-rose-500/10 text-rose-500 border-rose-500/20">
                            Deleted
                          </span>
                        ) : u.is_suspended || u.status === 'suspended' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-amber-500/10 text-amber-500 border-amber-500/20">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-right">
                        {u.role !== 'admin' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant={u.is_suspended ? 'secondary' : 'danger'}
                              className="p-1 px-3 text-xs leading-none"
                              onClick={() => suspendMutation.mutate({ id: u.id, isSuspended: !u.is_suspended })}
                              disabled={suspendMutation.isPending || u.status === 'deleted'}
                            >
                              {u.is_suspended ? 'Activate' : 'Suspend'}
                            </Button>
                            <Button
                              variant="danger"
                              className="p-1 px-3 text-xs leading-none bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700"
                              onClick={() => setUserToDelete(u)}
                              disabled={deleteUserMutation.isPending || u.status === 'deleted'}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'urls' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-50">Shortened Links</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search links..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              <Select
                value={linkStatus}
                onChange={setLinkStatus}
                className="w-32"
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {urlsLoading ? (
              <div className="p-4"><Skeleton className="h-32 w-full" /></div>
            ) : !filteredUrls || filteredUrls.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm font-semibold">
                {linkSearch || linkStatus !== 'all' ? 'No links found matching your criteria.' : 'No links shortened on platform.'}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase">
                    <th className="pb-3 px-3 pt-3">Owner</th>
                    <th className="pb-3 px-3 pt-3">Short code</th>
                    <th className="pb-3 px-3 pt-3">Original URL</th>
                    <th className="pb-3 px-3 pt-3">Clicks</th>
                    <th className="pb-3 px-3 pt-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {filteredUrls.map((url) => (
                    <tr key={url.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 px-3 font-semibold text-xs truncate max-w-xs">{url.user_email}</td>
                      <td className="py-3 px-3 font-mono">
                        <Link to={'/urls/' + url.id} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-450 dark:hover:text-emerald-350 hover:underline font-bold">
                          /{url.short_code}
                        </Link>
                      </td>
                      <td className="py-3 px-3 truncate max-w-xs text-xs">{url.original_url}</td>
                      <td className="py-3 px-3 font-semibold">{url.click_count}</td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="danger"
                          className="p-1 px-3 text-xs leading-none"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this link as an administrator?')) {
                              deleteMutation.mutate(url.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'deleted-users' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-50">Deleted Users Audit Log</h3>
          </div>
          <div className="overflow-x-auto">
            {deletedUsersLoading ? (
              <div className="p-4"><Skeleton className="h-32 w-full" /></div>
            ) : !deletedUsers || deletedUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm font-semibold">
                No deleted user audit logs found.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase">
                    <th className="pb-3 px-3 pt-3">Original Email</th>
                    <th className="pb-3 px-3 pt-3">Full Name</th>
                    <th className="pb-3 px-3 pt-3">Deleted Date</th>
                    <th className="pb-3 px-3 pt-3 font-mono">User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {deletedUsers.map((du) => (
                    <tr key={du.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 px-3 font-semibold text-rose-500">{du.email}</td>
                      <td className="py-3 px-3">{du.full_name || 'N/A'}</td>
                      <td className="py-3 px-3">{new Date(du.deleted_at).toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono text-xs">{du.user_id || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Delete User Confirmation Dialog */}
      <Dialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Delete User Account"
      >
        {userToDelete && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 p-3.5 rounded-xl mt-1">
              <ShieldAlert size={20} className="shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold uppercase tracking-wider">Warning: Irreversible Action</span>
                <p className="text-[10px] leading-normal font-medium opacity-90">
                  This will permanently delete the user account for <strong className="font-extrabold">{userToDelete.email}</strong>, all their shortened links, and click telemetry.
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Are you sure you want to proceed with deleting this user? An audit log will be created in the database.
            </p>

            <div className="flex justify-end gap-2.5 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <Button 
                variant="secondary" 
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={() => {
                  deleteUserMutation.mutate(userToDelete.id);
                  setUserToDelete(null);
                }}
                disabled={deleteUserMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

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
                <span className="text-[10px] font-bold text-slate-400">LinkSphere Platform recommendation</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Metric Context</span>
                <p className="text-slate-800 dark:text-slate-200 text-xs font-medium leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  {selectedInsight}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Explanation</span>
                <p className="text-slate-655 dark:text-slate-350 text-xs leading-relaxed font-semibold">
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
    </div>
  );
}
