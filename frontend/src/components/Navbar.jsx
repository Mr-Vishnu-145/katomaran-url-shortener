import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Link2, LogOut, LayoutDashboard, Settings, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import ThemeToggle from './ThemeToggle';
import Button from './ui/Button';
import useAuthStore from '../store/authStore';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Navbar({ toggleMobileSidebar }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
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

  return (
    <header className="h-16 flex items-center justify-between px-6 glass-panel-sticky !border-x-0 !border-t-0 !rounded-none border-b border-slate-100 dark:border-slate-800/80 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleMobileSidebar}
          className="p-1.5 md:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 md:hidden">
          <div className="bg-primary p-1.5 rounded-lg text-white">
            <Link2 size={16} />
          </div>
          <span className="font-bold text-sm dark:text-white">LinkSphere</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)} 
              className="flex items-center gap-2.5 hover:opacity-85 transition-opacity focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center uppercase overflow-hidden border border-slate-100 dark:border-slate-800/80">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  user.fullName ? user.fullName.substring(0, 2) : user.email.substring(0, 2)
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold leading-tight text-slate-700 dark:text-slate-200">{user.fullName || user.email.split('@')[0]}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{user.role}</span>
              </div>
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-56 rounded-xl bg-white dark:bg-[#111726] border border-slate-100 dark:border-slate-800 shadow-lg py-1.5 z-50 overflow-hidden"
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{user.fullName || 'LinkSphere User'}</p>
                    <p className="text-[10px] truncate text-slate-400 mt-0.5">{user.email}</p>
                  </div>
                  
                  <div className="py-1">
                    <Link 
                      to="/dashboard" 
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    >
                      <LayoutDashboard size={14} /> Dashboard
                    </Link>
                    <Link 
                      to="/settings/profile" 
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    >
                      <Settings size={14} /> Settings
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

                  <div className="py-0.5">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full gap-2.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold transition-colors"
                    >
                      <LogOut size={14} /> Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="secondary" className="!py-1.5 !px-3.5 text-xs font-bold">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="!py-1.5 !px-3.5 text-xs font-bold">
                Sign Up
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
