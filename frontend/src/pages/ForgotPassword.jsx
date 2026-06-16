import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().min(1, { message: "Email is required." }).email({ message: "Please enter a valid email address." }),
});

import useDocumentTitle from '../hooks/useDocumentTitle';

export default function ForgotPassword() {
  useDocumentTitle('Account Recovery');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', data);
      toast.success(res.data.message || 'Reset link sent!', { duration: 3000 });
      setSuccess(true);
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Request failed';
      toast.error(errMsg, { id: 'forgot-toast', duration: 4000 });
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
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your email address to receive a link to reset your account credentials
          </p>
        </div>

        {success ? (
          <div className="flex flex-col gap-4 text-center items-center py-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-success p-3 rounded-full border border-emerald-100 dark:border-emerald-950/30">
              <Mail size={32} />
            </div>
            <h2 className="text-base font-bold">Check your inbox</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              If an account is registered with this email, we have logged the reset credentials. Please check your inbox or server logs to retrieve the recovery link.
            </p>
            <Link to="/login" className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline mt-2">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email address"
              id="email"
              type="email"
              placeholder="Enter your email address"
              error={errors.email?.message}
              {...register('email')}
            />
            
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Sending link...' : 'Send reset link'}
            </Button>
            
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-400 font-semibold hover:text-slate-600 dark:hover:text-slate-200 mt-2">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
