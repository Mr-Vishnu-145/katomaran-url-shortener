import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Link2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from './store/authStore';
import api from './api/axios';
import toast from 'react-hot-toast';

// Layouts & Pages
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UrlDetail from './pages/UrlDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserDetail from './pages/AdminUserDetail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { UserProfile, UserSecurity, UserSessions } from './pages/Profile';
import Error404 from './pages/Error404';
import Error403 from './pages/Error403';
import Analytics from './pages/Analytics';
import { AboutLinkSphere, SystemStatus, SecurityAuditing, PrivacyPolicy, TermsOfService, CookiePolicy } from './pages/StaticPages';

// Full-screen loading splash shown while session is being validated
function AppLoadingSplash() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0f19] gap-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-center gap-5"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/30">
            <Link2 size={22} className="text-white" />
          </div>
          <span className="font-extrabold text-xl bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent tracking-tight">
            LinkSphere
          </span>
        </div>

        {/* Spinner */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 animate-spin" />
        </div>

        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wide animate-pulse">
          Initializing session…
        </p>
      </motion.div>
    </div>
  );
}

// App Layout wrapper
function Layout() {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      queryClient.clear();
      logout();
      toast.success('Logged out successfully', { duration: 3000 });
      navigate('/dashboard');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  const handleDashboardClick = (e) => {
    if (location.pathname === '/dashboard') {
      e.preventDefault();
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }
  };

  React.useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0b0f19] bg-grid-pattern">
      {/* Desktop Sidebar */}
      <Sidebar isCollapsed={isCollapsed} />
      
      {/* Mobile Sidebar Overlay Drawer */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 bottom-0 left-0 w-64 bg-white dark:bg-[#111726] border-r border-slate-100 dark:border-slate-800 z-50 md:hidden flex flex-col"
            >
              <Sidebar isCollapsed={false} onMobileClose={() => setMobileSidebarOpen(false)} mobile={true} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar toggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between">
          <div className="max-w-6xl mx-auto w-full flex-1 mb-12 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="w-full flex-1 flex flex-col"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
          


          <footer className="border-t border-slate-200 dark:border-slate-800/80 pt-8 pb-4 text-slate-500 dark:text-slate-400 w-full max-w-6xl mx-auto shrink-0 mt-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-left">
              {/* Brand Column */}
              <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="bg-primary p-1.5 rounded-lg text-white">
                    <Link2 size={16} />
                  </div>
                  <span className="font-extrabold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">LinkSphere</span>
                </div>
                <p className="text-xs text-slate-450 dark:text-slate-500 leading-relaxed">
                  Real-time link intelligence platform built for high-performance redirects and detailed audience analytics.
                </p>
              </div>

              {/* Navigation Column */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Platform</span>
                <Link to="/dashboard" onClick={handleDashboardClick} className="text-xs text-slate-550 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Dashboard</Link>
                <Link to="/about" className="text-xs text-slate-550 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">About Platform</Link>
                {user?.role === 'admin' && <Link to="/admin" className="text-xs text-slate-550 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Admin Panel</Link>}
              </div>

              {/* Developer Column */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Resources</span>
                <Link to="/status" className="text-xs text-slate-550 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">System Status</Link>
                <Link to="/security" className="text-xs text-slate-550 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Security Auditing</Link>
              </div>

              {/* Legal Column */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Legal</span>
                <Link to="/privacy" className="text-xs text-slate-550 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="text-xs text-slate-550 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Terms of Service</Link>
                <Link to="/cookies" className="text-xs text-slate-550 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Cookie Policy</Link>
              </div>
            </div>

            <div className="border-t border-slate-150 dark:border-slate-850 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              <span>© {new Date().getFullYear()} LinkSphere. All rights reserved.</span>
              <div className="flex gap-4">
                <a href="#github" className="hover:text-primary transition-colors">Github</a>
                <a href="#twitter" className="hover:text-primary transition-colors">Twitter</a>
                <a href="#discord" className="hover:text-primary transition-colors">Discord</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

// Protected Route wrappers
function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// Admin Route wrapper
function AdminRoute() {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/403" replace />;
}

export default function App() {
  const { login, logout, setInitialized, initTheme, isInitialized } = useAuthStore();

  // Initial Auth Session validation on mount
  useEffect(() => {
    initTheme();
    const validateSession = async () => {
      try {
        const res = await api.get('/api/auth/me');
        login(null, res.data.data);
      } catch (err) {
        logout();
      } finally {
        setInitialized(true);
      }
    };
    validateSession();
  }, [login, logout, setInitialized, initTheme]);

  // Block ALL rendering with a branded splash until session is verified.
  // This prevents any flash of wrong content (admin panel, protected pages, etc.)
  if (!isInitialized) {
    return <AppLoadingSplash />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route element={<Layout />}>
          {/* Public routes under main Layout */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/about" element={<AboutLinkSphere />} />
          <Route path="/status" element={<SystemStatus />} />
          <Route path="/security" element={<SecurityAuditing />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          
          {/* Protected routes under main Layout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/urls/:id" element={<UrlDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings/profile" element={<UserProfile />} />
            <Route path="/settings/security" element={<UserSecurity />} />
            <Route path="/settings/sessions" element={<UserSessions />} />
            <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
            
            {/* Admin specific */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users/:id" element={<AdminUserDetail />} />
            </Route>
          </Route>
        </Route>

        {/* Fallbacks */}
        <Route path="/403" element={<Error403 />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Error404 />} />
      </Routes>
    </BrowserRouter>
  );
}
