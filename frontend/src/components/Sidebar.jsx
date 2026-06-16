import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, ShieldAlert, Settings, X, BarChart3 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Sidebar({ isCollapsed, onMobileClose, mobile = false }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      navigate('/dashboard');
      await api.post('/api/auth/logout');
      queryClient.clear();
      logout();
      toast.success('Logged out successfully', { duration: 3000 });
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(user ? [
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'Settings', path: '/settings/profile', icon: Settings }
    ] : []),
    ...(user?.role === 'admin' ? [{ name: 'Admin panel', path: '/admin', icon: ShieldAlert }] : []),
  ];

  return (
    <aside className={
      mobile 
        ? "flex flex-col h-full w-full"
        : ("hidden md:flex flex-col glass-panel !border-y-0 !border-l-0 !rounded-none border-r border-slate-100 dark:border-slate-800/80 transition-all duration-300 " + (isCollapsed ? 'w-20' : 'w-64'))
    }>
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-1 rounded-lg w-7.5 h-7.5 flex items-center justify-center">
            <img src="/favicon.svg" alt="LinkSphere Logo" className="w-5.5 h-5.5 object-contain" />
          </div>
          {(!isCollapsed || mobile) && <span className="font-bold text-base bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">LinkSphere</span>}
        </div>
        {mobile && onMobileClose && (
          <button 
            type="button" 
            onClick={onMobileClose} 
            className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg outline-none"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-6 px-4 flex flex-col gap-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => onMobileClose && onMobileClose()}
            className={({ isActive }) =>
              "flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:translate-x-1 duration-200 " +
              (isActive 
                ? 'bg-primary/15 text-primary' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100')
            }
          >
            <item.icon size={18} />
            {(!isCollapsed || mobile) && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {(!isCollapsed || mobile) && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 font-bold text-center uppercase tracking-wider">
          v1.0.0 • LinkSphere
        </div>
      )}
    </aside>
  );
}
