import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const schema = z.object({
  password: z.string().min(8, { message: "Password: 8+ chars, uppercase, number, special character required." })
    .regex(/[A-Z]/, { message: "Password: 8+ chars, uppercase, number, special character required." })
    .regex(/[0-9]/, { message: "Password: 8+ chars, uppercase, number, special character required." })
    .regex(/[^A-Za-z0-9]/, { message: "Password: 8+ chars, uppercase, number, special character required." }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"]
});

import useDocumentTitle from '../hooks/useDocumentTitle';

export default function ResetPassword() {
  useDocumentTitle('Reset Password');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Missing or invalid recovery token. Please request another reset link.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', {
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      toast.success(res.data.message || 'Password reset successfully', { duration: 3000 });
      navigate('/login');
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Failed to reset password';
      toast.error(errMsg, { id: 'reset-toast', duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0b0f19] bg-grid-pattern text-slate-900 dark:text-slate-100">
      {/* Top Left Branding */}
      <div className="absolute top-6 left-6 flex items-center gap-2.5 z-20 pointer-events-none select-none">
        <div className="bg-primary p-1 rounded-lg w-7 h-7 flex items-center justify-center">
          <img src="/favicon.svg" alt="LinkSphere Logo" className="w-4.5 h-4.5 object-contain" />
        </div>
        <span className="font-extrabold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent tracking-tight">LinkSphere</span>
      </div>

      {/* Top Right Back Button */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-20">
        <Link to="/dashboard" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-full shadow-sm">
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-lg flex flex-col gap-6 relative z-10">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set your new credentials to secure your LinkSphere account
          </p>
        </div>

        {!token ? (
          <div className="flex flex-col gap-4 text-center items-center py-4">
            <div className="bg-red-50 dark:bg-red-950/20 text-error p-3 rounded-full border border-red-100 dark:border-red-950/30">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-base font-bold text-red-500">Missing Reset Token</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              This reset URL appears to be broken or lacks a valid recovery token. Please request another link.
            </p>
            <Button onClick={() => navigate('/forgot-password')} className="mt-2 text-xs">
              Go to Forgot Password
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="New Password"
              id="password"
              type="password"
              placeholder="Enter your new password"
              error={errors.password?.message}
              {...register('password')}
            />
            
            <Input
              label="Confirm New Password"
              id="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Resetting password...' : 'Reset password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
