import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Shield, Laptop, Trash2, ShieldAlert, Phone, Mail, Upload, Key, Check, Menu, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api/axios';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Dialog from '../components/ui/Dialog';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';

import useDocumentTitle from '../hooks/useDocumentTitle';

export default function Profile({ activeTab = 'profile' }) {
  useDocumentTitle('Settings');
  const { user, setUser, logout } = useAuthStore();
  const queryClient = useQueryClient();

  // Cropper states
  const [srcImage, setSrcImage] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [selection, setSelection] = useState({ x: 25, y: 25, w: 50, h: 50 });
  const [cropMode, setCropMode] = useState('circle'); // 'circle' (default rounded avatar style) or 'free'
  const [dragAction, setDragAction] = useState('idle'); // 'idle', 'moving', 'tl', 'tr', 'bl', 'br', 'drawing'
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [dragStartSelection, setDragStartSelection] = useState({ x: 25, y: 25, w: 50, h: 50 });
  const cropContainerRef = React.useRef(null);

  const countryCodes = [
    { code: '+91', country: 'IN', label: '🇮🇳 India (+91)' },
    { code: '+1', country: 'US', label: '🇺🇸 United States (+1)' },
    { code: '+44', country: 'GB', label: '🇬🇧 United Kingdom (+44)' },
    { code: '+61', country: 'AU', label: '🇦🇺 Australia (+61)' },
    { code: '+1', country: 'CA', label: '🇨🇦 Canada (+1)' },
    { code: '+65', country: 'SG', label: '🇸🇬 Singapore (+65)' },
    { code: '+49', country: 'DE', label: '🇩🇪 Germany (+49)' },
    { code: '+33', country: 'FR', label: '🇫🇷 France (+33)' },
    { code: '+81', country: 'JP', label: '🇯🇵 Japan (+81)' },
    { code: '+971', country: 'AE', label: '🇦🇪 United Arab Emirates (+971)' }
  ];

  const parseMobileNumber = (fullNumber) => {
    if (!fullNumber) return { countryCode: '+91', phone: '' };
    const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
    for (const c of sortedCodes) {
      if (fullNumber.startsWith(c.code)) {
        return { countryCode: c.code, phone: fullNumber.substring(c.code.length).trim() };
      }
    }
    return { countryCode: '+91', phone: fullNumber };
  };

  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    countryCode: '+91',
    phoneNumber: '',
    profileImage: '',
  });

  // Account deletion states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  React.useEffect(() => {
    if (user) {
      const parsedMobile = parseMobileNumber(user.mobileNumber);
      setProfileForm({
        fullName: user.fullName || '',
        countryCode: parsedMobile.countryCode,
        phoneNumber: parsedMobile.phone,
        profileImage: user.profileImage || '',
      });
    }
  }, [user]);

  React.useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    otpCode: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch Sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/api/auth/sessions').then(res => res.data.data),
  });

  // Fetch Dashboard Stats to display live metrics on the profile page
  const { data: stats } = useQuery({
    queryKey: ['profile-stats'],
    queryFn: () => api.get('/api/urls/dashboard/stats').then(res => res.data.data),
  });

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.put('/api/auth/profile', data),
    onSuccess: (res) => {
      setUser(res.data.data);
      toast.success('Profile updated successfully', { duration: 3050 });
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error?.message || 'Profile update failed';
      toast.error(errMsg);
    }
  });

  // OTP Request Mutation
  const requestOtpMutation = useMutation({
    mutationFn: () => api.post('/api/auth/password-otp'),
    onSuccess: (res) => {
      setOtpRequested(true);
      toast.success('Verification code printed to server console / email sent!', { duration: 4000 });
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error?.message || 'Failed to request OTP';
      toast.error(errMsg);
    }
  });

  // Password Update Mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data) => api.put('/api/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password updated successfully', { duration: 3000 });
      setPasswordForm({ otpCode: '', newPassword: '', confirmPassword: '' });
      setOtpRequested(false);
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error?.message || 'Password update failed';
      toast.error(errMsg);
    }
  });

  // Delete specific session
  const deleteSessionMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/auth/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session terminated', { duration: 3000 });
    },
    onError: () => {
      toast.error('Failed to terminate session');
    }
  });

  // Delete all other sessions
  const deleteAllOtherSessionsMutation = useMutation({
    mutationFn: () => api.delete('/api/auth/sessions'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('All other sessions terminated', { duration: 3000 });
    },
    onError: () => {
      toast.error('Failed to terminate sessions');
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: (data) => api.delete('/api/auth/profile', { data }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Account deleted successfully.');
      setIsDeleteModalOpen(false);
      logout();
      window.location.href = '/login';
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error?.message || 'Failed to delete account';
      toast.error(errMsg);
    }
  });

  // Handle click-drag drawing coordinates
  const handleMouseDown = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clickPos = {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };

    // Threshold for clicking corners (in percentage)
    const threshold = 6; 
    
    const isClose = (a, b) => Math.abs(a - b) < threshold;

    const left = selection.x;
    const right = selection.x + selection.w;
    const top = selection.y;
    const bottom = selection.y + selection.h;

    let action = 'idle';

    if (isClose(clickPos.x, left) && isClose(clickPos.y, top)) {
      action = 'tl';
    } else if (isClose(clickPos.x, right) && isClose(clickPos.y, top)) {
      action = 'tr';
    } else if (isClose(clickPos.x, left) && isClose(clickPos.y, bottom)) {
      action = 'bl';
    } else if (isClose(clickPos.x, right) && isClose(clickPos.y, bottom)) {
      action = 'br';
    } else if (
      clickPos.x >= left && 
      clickPos.x <= right && 
      clickPos.y >= top && 
      clickPos.y <= bottom
    ) {
      action = 'moving';
    } else {
      action = 'drawing';
    }

    setDragAction(action);
    setDragStartMouse(clickPos);
    setDragStartSelection({ ...selection });
    if (action === 'drawing') {
      setSelection({ x: clickPos.x, y: clickPos.y, w: 0, h: 0 });
    }
  };

  React.useEffect(() => {
    if (dragAction === 'idle') return;

    const handleWindowMouseMove = (e) => {
      if (!cropContainerRef.current) return;
      const rect = cropContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const mousePos = {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      };

      const dx = mousePos.x - dragStartMouse.x;
      const dy = mousePos.y - dragStartMouse.y;

      if (dragAction === 'moving') {
        let nx = dragStartSelection.x + dx;
        let ny = dragStartSelection.y + dy;
        nx = Math.max(0, Math.min(100 - dragStartSelection.w, nx));
        ny = Math.max(0, Math.min(100 - dragStartSelection.h, ny));
        setSelection(prev => ({ ...prev, x: nx, y: ny }));
      } else if (dragAction === 'drawing') {
        if (cropMode === 'circle') {
          const size = Math.min(Math.abs(mousePos.x - dragStartMouse.x), Math.abs(mousePos.y - dragStartMouse.y));
          const nx = mousePos.x >= dragStartMouse.x ? dragStartMouse.x : dragStartMouse.x - size;
          const ny = mousePos.y >= dragStartMouse.y ? dragStartMouse.y : dragStartMouse.y - size;
          setSelection({ x: nx, y: ny, w: size, h: size });
        } else {
          const nx = Math.min(dragStartMouse.x, mousePos.x);
          const ny = Math.min(dragStartMouse.y, mousePos.y);
          const nw = Math.abs(dragStartMouse.x - mousePos.x);
          const nh = Math.abs(dragStartMouse.y - mousePos.y);
          setSelection({ x: nx, y: ny, w: nw, h: nh });
        }
      } else {
        // Resizing corners
        let nx = dragStartSelection.x;
        let ny = dragStartSelection.y;
        let nw = dragStartSelection.w;
        let nh = dragStartSelection.h;

        if (dragAction === 'br') {
          if (cropMode === 'circle') {
            const size = Math.max(5, Math.min(100 - nx, 100 - ny, dragStartSelection.w + dx));
            nw = size;
            nh = size;
          } else {
            nw = Math.max(5, Math.min(100 - nx, dragStartSelection.w + dx));
            nh = Math.max(5, Math.min(100 - ny, dragStartSelection.h + dy));
          }
        } else if (dragAction === 'bl') {
          let targetX = dragStartSelection.x + dx;
          targetX = Math.max(0, Math.min(dragStartSelection.x + dragStartSelection.w - 5, targetX));
          let width = dragStartSelection.x + dragStartSelection.w - targetX;
          
          if (cropMode === 'circle') {
            const size = Math.max(5, Math.min(width, 100 - ny, dragStartSelection.x + dragStartSelection.w));
            nx = dragStartSelection.x + dragStartSelection.w - size;
            nw = size;
            nh = size;
          } else {
            nx = targetX;
            nw = width;
            nh = Math.max(5, Math.min(100 - ny, dragStartSelection.h + dy));
          }
        } else if (dragAction === 'tr') {
          let targetY = dragStartSelection.y + dy;
          targetY = Math.max(0, Math.min(dragStartSelection.y + dragStartSelection.h - 5, targetY));
          let height = dragStartSelection.y + dragStartSelection.h - targetY;

          if (cropMode === 'circle') {
            const size = Math.max(5, Math.min(height, 100 - nx, dragStartSelection.y + dragStartSelection.h));
            ny = dragStartSelection.y + dragStartSelection.h - size;
            nw = size;
            nh = size;
          } else {
            ny = targetY;
            nh = height;
            nw = Math.max(5, Math.min(100 - nx, dragStartSelection.w + dx));
          }
        } else if (dragAction === 'tl') {
          if (cropMode === 'circle') {
            let targetX = dragStartSelection.x + dx;
            targetX = Math.max(0, Math.min(dragStartSelection.x + dragStartSelection.w - 5, targetX));
            let size = dragStartSelection.x + dragStartSelection.w - targetX;
            size = Math.max(5, Math.min(size, dragStartSelection.y + dragStartSelection.h));
            nx = dragStartSelection.x + dragStartSelection.w - size;
            ny = dragStartSelection.y + dragStartSelection.h - size;
            nw = size;
            nh = size;
          } else {
            let targetX = Math.max(0, Math.min(dragStartSelection.x + dragStartSelection.w - 5, dragStartSelection.x + dx));
            let targetY = Math.max(0, Math.min(dragStartSelection.y + dragStartSelection.h - 5, dragStartSelection.y + dy));
            nx = targetX;
            ny = targetY;
            nw = dragStartSelection.x + dragStartSelection.w - targetX;
            nh = dragStartSelection.y + dragStartSelection.h - targetY;
          }
        }

        setSelection({ x: nx, y: ny, w: nw, h: nh });
      }
    };

    const handleWindowMouseUp = () => {
      setDragAction('idle');
      // Fallback if user just clicks without dragging
      setSelection(prev => {
        if (prev.w < 2 || prev.h < 2) {
          return { x: 25, y: 25, w: 50, h: 50 };
        }
        return prev;
      });
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragAction, dragStartMouse, dragStartSelection, cropMode]);

  const applyCrop = () => {
    if (!srcImage) return;
    const img = new Image();
    img.src = srcImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      // Calculate pixel dimensions
      const cropX = (selection.x / 100) * naturalWidth;
      const cropY = (selection.y / 100) * naturalHeight;
      const cropW = (selection.w / 100) * naturalWidth;
      const cropH = (selection.h / 100) * naturalHeight;
      
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
      setProfileForm(prev => ({ ...prev, profileImage: croppedBase64 }));
      setIsCropOpen(false);
      
      // Auto-save the avatar directly for premium response
      updateProfileMutation.mutate({
        fullName: profileForm.fullName,
        mobileNumber: `${profileForm.countryCode}${profileForm.phoneNumber}`,
        profileImage: croppedBase64
      });
    };
  };

  // Handle local file image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSrcImage(reader.result);
      setSelection({ x: 25, y: 25, w: 50, h: 50 });
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectCountry = (country) => {
    setProfileForm(prev => ({ ...prev, countryCode: country.code }));
    setIsCountryOpen(false);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setPhoneError('');

    const cleaned = profileForm.phoneNumber.replace(/[\s\-]/g, '');
    if (!profileForm.fullName.trim()) {
      toast.error('Full Name is required.');
      return;
    }

    if (!cleaned) {
      setPhoneError('Phone number is required.');
      return;
    }

    if (!/^\d+$/.test(cleaned)) {
      setPhoneError('Please enter a valid phone number (digits only).');
      return;
    }

    const countryPhoneLengths = {
      '+91': { name: 'India', lengths: [10] },
      '+1': { name: 'United States/Canada', lengths: [10] },
      '+44': { name: 'United Kingdom', lengths: [10] },
      '+61': { name: 'Australia', lengths: [9] },
      '+65': { name: 'Singapore', lengths: [8] },
      '+49': { name: 'Germany', lengths: [10, 11] },
      '+33': { name: 'France', lengths: [9] },
      '+81': { name: 'Japan', lengths: [10] },
      '+971': { name: 'United Arab Emirates', lengths: [9] }
    };

    const rules = countryPhoneLengths[profileForm.countryCode];
    if (rules) {
      if (!rules.lengths.includes(cleaned.length)) {
        const lenStr = rules.lengths.join(' or ');
        setPhoneError(`Please enter a valid phone number for ${rules.name} (exactly ${lenStr} digits required).`);
        return;
      }
    } else {
      if (cleaned.length < 6 || cleaned.length > 15) {
        setPhoneError('Phone number must be between 6 and 15 digits.');
        return;
      }
    }
updateProfileMutation.mutate({
      fullName: profileForm.fullName,
      mobileNumber: `${profileForm.countryCode}${cleaned}`,
      profileImage: profileForm.profileImage
    });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    changePasswordMutation.mutate(passwordForm);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Profile Card Summary Panel with Banner */}
      <div className="relative mb-8">
        {/* Banner */}
        <div className="h-48 sm:h-56 bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 w-full rounded-2xl absolute top-0 left-0 shadow-inner"></div>

        {/* Profile details overlapping banner */}
        <div className="pt-32 sm:pt-40 px-4 sm:px-8 relative z-10">
          <div className="bg-white dark:bg-[#111726] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left relative">
            
            {/* Overlapping Round Profile Picture Stack */}
            <div className="absolute left-1/2 sm:left-8 top-0 -translate-x-1/2 sm:translate-x-0 -translate-y-1/2 flex flex-col items-center gap-2 z-10">
              <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-[#111726] bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                {profileForm.profileImage ? (
                  <img src={profileForm.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-500 dark:text-emerald-400 uppercase">
                    {user?.fullName ? user.fullName.substring(0, 2) : user?.email.substring(0, 2)}
                  </span>
                )}
                
                {/* Always visible overlay for mobile and desktop */}
                <label className="absolute inset-0 bg-black/40 hover:bg-black/60 transition-colors flex flex-col items-center justify-center text-white text-[9px] font-bold cursor-pointer gap-1">
                  <Upload size={14} />
                  <span>Change</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              
              {user?.authProvider === 'google' && (
                <button
                  type="button"
                  onClick={() => {
                    const externalPic = user?.googleProfileImage || '';
                    setProfileForm(prev => ({ ...prev, profileImage: externalPic }));
                    updateProfileMutation.mutate({
                      fullName: profileForm.fullName,
                      mobileNumber: `${profileForm.countryCode}${profileForm.phoneNumber}`,
                      profileImage: externalPic
                    });
                  }}
                  className="text-[9px] font-extrabold text-primary transition-colors uppercase tracking-wide bg-primary/10 px-2 py-0.5 rounded-md border border-primary/25 whitespace-nowrap mt-1"
                >
                  Sync Photo
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-center gap-4 w-full pt-12 sm:pt-0 sm:pl-32">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-slate-850 dark:text-slate-50 flex items-center justify-center sm:justify-start gap-2">
                  {user?.fullName || 'LinkSphere User'}
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/30">
                    {user?.role}
                  </span>
                </h2>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 justify-center sm:justify-start">
                  <Mail size={12} /> {user?.email}
                </span>
              </div>

              {/* Dynamic Stats Section */}
              <div className="flex gap-6 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800/80 pt-4 sm:pt-0 sm:pl-6 shrink-0">
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xl font-extrabold text-slate-850 dark:text-slate-150">{stats?.summary?.totalUrls || 0}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TOTAL LINKS</span>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xl font-extrabold text-slate-855 dark:text-slate-150">{stats?.summary?.totalClicks || 0}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CLICKS GENERATED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Tab Navigation */}
        <div className="col-span-1 md:col-span-3 flex flex-col gap-1 bg-white dark:bg-[#111726] border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
          <Link
            to="/settings/profile"
            className={"flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-left " + 
              (activeTab === 'profile' 
                ? 'bg-primary/10 text-primary border border-primary/10' 
                : 'text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-850 dark:hover:text-slate-100')}
          >
            <User size={14} /> Profile settings
          </Link>
          <Link
            to="/settings/security"
            className={"flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-left mt-1 " + 
              (activeTab === 'security' 
                ? 'bg-primary/10 text-primary border border-primary/10' 
                : 'text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-850 dark:hover:text-slate-100')}
          >
            <Shield size={14} /> Password and Security
          </Link>
          <Link
            to="/settings/sessions"
            className={"flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-left mt-1 " + 
              (activeTab === 'sessions' 
                ? 'bg-primary/10 text-primary border border-primary/10' 
                : 'text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-850 dark:hover:text-slate-100')}
          >
            <Laptop size={14} /> Active Sessions
          </Link>
        </div>

        {/* Right Active Content Display Pane */}
        <div className="col-span-1 md:col-span-9 flex flex-col gap-6 w-full">
          {activeTab === 'profile' && (() => {
            const selectedCountry = countryCodes.find(c => c.code === profileForm.countryCode) || countryCodes[0];
            return (
              <div className="flex flex-col gap-6">
                <Card className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Profile Info</h3>
                  <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Full Name"
                        id="fullName"
                        placeholder="Enter your full name"
                        required
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="profileCountryCode" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Country/Region <span className="text-error">*</span>
                        </label>
                        <Select
                          id="profileCountryCode"
                          value={profileForm.countryCode}
                          onChange={(val) => {
                            const c = countryCodes.find(item => item.code === val);
                            if (c) handleSelectCountry(c);
                          }}
                          options={countryCodes.map(c => ({ value: c.code, label: c.label }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="profilePhoneNumber" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Phone number <span className="text-error">*</span>
                        </label>
                        <input
                          id="profilePhoneNumber"
                          type="tel"
                          placeholder="Enter your phone number"
                          required
                          value={profileForm.phoneNumber}
                          onChange={(e) => {
                            setPhoneError('');
                            setProfileForm({ ...profileForm, phoneNumber: e.target.value });
                          }}
                          className={"w-full px-4 py-2.5 text-xs bg-slate-105/50 dark:bg-slate-900/50 border " + (phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 dark:border-slate-800 focus:border-primary focus:ring-primary/20') + " focus:ring-4 rounded-xl outline-none transition-all text-slate-950 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-550"}
                        />
                        {phoneError && (
                          <span className="text-xs text-error font-medium leading-none mt-1">
                            {phoneError}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Input
                        label="Email address (Read-only)"
                        id="profileEmail"
                        type="email"
                        value={user?.email || ''}
                        disabled
                      />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-normal">
                        For security and authentication, email addresses cannot be modified.
                      </p>
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                      <Button type="submit" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save profile changes'}
                      </Button>
                    </div>
                  </form>
                </Card>

                {user?.role !== 'admin' && (
                  <Card className="flex flex-col gap-4 border-rose-500/25 dark:border-rose-955/25 bg-rose-500/[0.02] dark:bg-rose-550/[0.01]">
                    <div className="flex items-center gap-2 border-b border-rose-500/10 dark:border-rose-900/10 pb-3">
                      <ShieldAlert className="text-rose-500" size={16} />
                      <h3 className="text-sm font-bold text-rose-550 dark:text-rose-450 uppercase tracking-wider">Danger Zone</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Delete Account</h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal max-w-xl">
                          Permanently delete your account, shortened URLs, click telemetry, and all personal details. This action is irreversible. An audit log will be created, and your credentials will be purged.
                        </p>
                      </div>
                      <Button
                        variant="danger"
                        className="text-xs font-bold py-2 px-4 whitespace-nowrap bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700 shadow-sm"
                        onClick={() => setIsDeleteModalOpen(true)}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            );
          })()}

          {activeTab === 'security' && (
            <Card className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-850 pb-3">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Change Password</h3>
                <p className="text-xs text-slate-400">Request a verification code to your email to perform password updates.</p>
              </div>

              {!otpRequested ? (
                <div className="flex flex-col items-center justify-center text-center p-6 gap-4">
                  <div className="bg-primary/10 text-primary p-3.5 rounded-full border border-primary/25">
                    <Key size={32} />
                  </div>
                  <div className="max-w-xs flex flex-col gap-1">
                    <h4 className="font-bold text-sm">Two-step Verification Required</h4>
                    <p className="text-xs text-slate-400">For security reasons, we will dispatch a 6-digit OTP code to your registered email to approve the change.</p>
                  </div>
                  <Button 
                    onClick={() => requestOtpMutation.mutate()} 
                    disabled={requestOtpMutation.isPending}
                    className="flex gap-1.5 items-center font-bold text-xs"
                  >
                    {requestOtpMutation.isPending ? 'Requesting OTP...' : 'Request verification code'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                  <Input
                    label="OTP Verification Code"
                    id="otpCode"
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    required
                    value={passwordForm.otpCode}
                    onChange={(e) => setPasswordForm({ ...passwordForm, otpCode: e.target.value })}
                  />

                  <Input
                    label="New Secure Password"
                    id="newPassword"
                    type="password"
                    placeholder="Enter your new password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />

                  <Input
                    label="Confirm New Password"
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />

                  <div className="flex justify-between items-center mt-2 gap-4">
                    <button 
                      type="button" 
                      onClick={() => setOtpRequested(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
                    >
                      Cancel code validation
                    </button>
                    <Button type="submit" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? 'Updating...' : 'Verify and change password'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}

          {activeTab === 'sessions' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-50 text-sm">Session Control</h3>
                  <p className="text-xs text-slate-400">View and revoke active connection sessions.</p>
                </div>
                <Button
                  variant="danger"
                  className="text-xs font-semibold py-1.5 px-3 flex gap-1.5 items-center"
                  onClick={() => {
                    if (confirm('Are you sure you want to log out from all other devices?')) {
                      deleteAllOtherSessionsMutation.mutate();
                    }
                  }}
                  disabled={deleteAllOtherSessionsMutation.isPending}
                >
                  <ShieldAlert size={14} /> Terminate other sessions
                </Button>
              </div>

              <Card className="overflow-hidden">
                {sessionsLoading ? (
                  <div className="flex flex-col gap-2 p-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : sessions?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No active sessions found.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-850">
                    {sessions?.map((session) => (
                      <div key={session.id} className="flex justify-between items-center p-4 text-sm gap-4">
                        <div className="flex gap-3 items-start">
                          <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-slate-550 shrink-0">
                            <Laptop size={18} />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{session.deviceName}</span>
                              {session.isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-success border border-emerald-100 dark:border-emerald-950/30 uppercase">Current Session</span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">{session.ipAddress} • Logged: {new Date(session.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <button
                            onClick={() => deleteSessionMutation.mutate(session.id)}
                            disabled={deleteSessionMutation.isPending}
                            className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="Terminate Session"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
      {/* Cropper Dialog */}
      <Dialog isOpen={isCropOpen} onClose={() => setIsCropOpen(false)} title="Crop Profile Picture">
        <div className="flex flex-col gap-6">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
            Click and drag inside the selection box to move it, or drag the corner handles to resize. Click and drag outside the box to draw a new crop area.
          </p>

          {/* Crop Mode Selection Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80 gap-1 w-full max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => {
                setCropMode('circle');
                setSelection({ x: 25, y: 25, w: 50, h: 50 });
              }}
              className={`flex-1 text-[10px] font-extrabold uppercase tracking-wider py-2 rounded-lg transition-all ${
                cropMode === 'circle'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200'
              }`}
            >
              🔵 Circle Crop
            </button>
            <button
              type="button"
              onClick={() => {
                setCropMode('free');
                setSelection({ x: 25, y: 25, w: 50, h: 50 });
              }}
              className={`flex-1 text-[10px] font-extrabold uppercase tracking-wider py-2 rounded-lg transition-all ${
                cropMode === 'free'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200'
              }`}
            >
              📐 Free Aspect
            </button>
          </div>

          {/* Draggable Crop Area */}
          <div 
            ref={cropContainerRef}
            className="relative select-none overflow-hidden max-w-full max-h-[360px] border border-slate-250/70 dark:border-slate-800/85 rounded-xl bg-slate-950 flex items-center justify-center cursor-crosshair mx-auto"
            onMouseDown={handleMouseDown}
          >
            {srcImage && (
              <img 
                src={srcImage} 
                alt="Upload Preview" 
                className="max-w-full max-h-[360px] object-contain pointer-events-none" 
              />
            )}
            
            {/* The cropping rectangle overlay */}
            <div 
              className="absolute border-2 border-dashed border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
              style={{
                left: `${selection.x}%`,
                top: `${selection.y}%`,
                width: `${selection.w}%`,
                height: `${selection.h}%`,
                borderRadius: cropMode === 'circle' ? '50%' : '0px'
              }}
            >
              {/* Grid guide overlays */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white/20" style={{ borderRadius: cropMode === 'circle' ? '50%' : '0px' }}>
                <div className="border-r border-b border-white/10"></div>
                <div className="border-r border-b border-white/10"></div>
                <div className="border-b border-white/10"></div>
                <div className="border-r border-b border-white/10"></div>
                <div className="border-r border-b border-white/10"></div>
                <div className="border-b border-white/10"></div>
              </div>

              {/* Drag handles styled like premium cropper */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-500 border border-white rounded-full shadow-md z-10"></div>
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 border border-white rounded-full shadow-md z-10"></div>
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-500 border border-white rounded-full shadow-md z-10"></div>
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-500 border border-white rounded-full shadow-md z-10"></div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <Button variant="secondary" onClick={() => setIsCropOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyCrop} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Saving...' : 'Apply & Save Crop'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Account Deletion Dialog */}
      <Dialog 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteConfirmPassword('');
          setDeleteConfirmEmail('');
        }} 
        title="Delete Your Account"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 p-3.5 rounded-xl mt-1">
            <ShieldAlert size={20} className="shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-wider">Warning: Irreversible Action</span>
              <p className="text-[10px] leading-normal font-medium opacity-90">
                This will delete your LinkSphere account and all of your shortened links and visit logs forever.
              </p>
            </div>
          </div>

          {user?.authProvider === 'google' ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                Since you registered using Google, please type your email <strong className="text-slate-800 dark:text-white font-extrabold">{user?.email}</strong> below to confirm account deletion:
              </p>
              <Input
                label="Confirm Email"
                id="deleteConfirmEmail"
                type="email"
                placeholder="Enter your email"
                required
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-750 dark:text-slate-300">
                Please enter your password to confirm identity and authorize account deletion:
              </p>
              <Input
                label="Current Password"
                id="deleteConfirmPassword"
                type="password"
                placeholder="Enter password"
                required
                value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmPassword('');
                setDeleteConfirmEmail('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={() => {
                if (user?.authProvider === 'google') {
                  if (deleteConfirmEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
                    toast.error("Emails do not match.");
                    return;
                  }
                  deleteAccountMutation.mutate({});
                } else {
                  if (!deleteConfirmPassword) {
                    toast.error("Password is required.");
                    return;
                  }
                  deleteAccountMutation.mutate({ password: deleteConfirmPassword });
                }
              }}
              disabled={deleteAccountMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700"
            >
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// Wrapper Components for routes
export function UserProfile() {
  return <Profile activeTab="profile" />;
}

export function UserSecurity() {
  return <Profile activeTab="security" />;
}

export function UserSessions() {
  return <Profile activeTab="sessions" />;
}
