import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import toast from 'react-hot-toast';

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

const registerSchema = z.object({
  fullName: z.string().min(1, { message: "Full Name is required." }),
  countryCode: z.string().min(1, { message: "Country code is required." }),
  phoneNumber: z.string().min(1, { message: "Phone number is required." }),
  email: z.string().min(1, { message: "Email is required." }).email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password: 8+ chars, uppercase, number, special character required." })
    .regex(/[A-Z]/, { message: "Password: 8+ chars, uppercase, number, special character required." })
    .regex(/[0-9]/, { message: "Password: 8+ chars, uppercase, number, special character required." })
    .regex(/[^A-Za-z0-9]/, { message: "Password: 8+ chars, uppercase, number, special character required." }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"]
}).superRefine((data, ctx) => {
  const cleaned = data.phoneNumber.replace(/[\s\-]/g, '');
  if (!cleaned) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Phone number is required.",
      path: ["phoneNumber"]
    });
    return;
  }
  if (!/^\d+$/.test(cleaned)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter a valid phone number (digits only).",
      path: ["phoneNumber"]
    });
    return;
  }
  const rules = countryPhoneLengths[data.countryCode];
  if (rules) {
    if (!rules.lengths.includes(cleaned.length)) {
      const lenStr = rules.lengths.join(' or ');
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Please enter a valid phone number for ${rules.name} (exactly ${lenStr} digits required).`,
        path: ["phoneNumber"]
      });
    }
  } else {
    if (cleaned.length < 6 || cleaned.length > 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number must be between 6 and 15 digits.",
        path: ["phoneNumber"]
      });
    }
  }
});

import useDocumentTitle from '../hooks/useDocumentTitle';

export default function Register() {
  useDocumentTitle('Sign Up');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryCodes.find(c => c.code === '+91') || countryCodes[0]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      countryCode: '+91',
      phoneNumber: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setValue('countryCode', country.code, { shouldValidate: true });
    setIsCountryOpen(false);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        mobileNumber: `${data.countryCode}${data.phoneNumber.replace(/\s+/g, '')}`
      };
      await api.post('/api/auth/register', payload);
      toast.success('Account created! Please login.', { duration: 3000 });
      navigate('/login');
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Registration failed';
      toast.error(errMsg, { id: 'reg-toast', duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0b0f19] bg-grid-pattern text-slate-900 dark:text-slate-100">
      {/* Top Left Branding & Back Button */}
      <div className="absolute top-6 left-6 flex flex-col gap-2.5 z-20">
        <div className="flex items-center gap-2.5 select-none">
          <div className="bg-primary p-1 rounded-lg w-7 h-7 flex items-center justify-center">
            <img src="/favicon.svg" alt="LinkSphere Logo" className="w-4.5 h-4.5 object-contain" />
          </div>
          <span className="font-extrabold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent tracking-tight">LinkSphere</span>
        </div>
        <Link to="/dashboard" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full shadow-sm w-fit">
          <ArrowLeft size={12} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Background Decorative Glowing Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] sm:left-[10%] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-emerald-500/15 dark:bg-emerald-500/5 rounded-full blur-[100px] sm:blur-[130px] animate-blob-1"></div>
        <div className="absolute bottom-[10%] right-[5%] sm:right-[10%] w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] bg-teal-500/15 dark:bg-teal-500/5 rounded-full blur-[110px] sm:blur-[140px] animate-blob-2"></div>
      </div>

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-lg flex flex-col gap-6 relative z-10">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign up to start shortening and tracking links
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
          <Input
            label="Full Name"
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            required
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="countryCode" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Country/Region <span className="text-error">*</span>
            </label>
            <Select
              id="countryCode"
              value={selectedCountry.code}
              onChange={(val) => {
                const c = countryCodes.find(item => item.code === val);
                if (c) handleSelectCountry(c);
              }}
              options={countryCodes.map(c => ({ value: c.code, label: c.label }))}
            />
            {errors.countryCode && (
              <span className="text-xs text-error font-medium leading-none mt-1">
                {errors.countryCode.message}
              </span>
            )}
          </div>

          <Input
            label="Phone number"
            id="phoneNumber"
            type="tel"
            placeholder="Enter your phone number"
            required
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />

          <Input
            label="Email address"
            id="email"
            type="email"
            placeholder="Enter your email address"
            required
            error={errors.email?.message}
            {...register('email')}
          />
          
          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="new-password"
            required
            error={errors.password?.message}
            {...register('password')}
          />
          
          <Input
            label="Confirm password"
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
