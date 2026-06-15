import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link2, ArrowLeft } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../store/authStore';
import api from '../api/axios';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dialog from '../components/ui/Dialog';
import Select from '../components/ui/Select';
import toast from 'react-hot-toast';

import useDocumentTitle from '../hooks/useDocumentTitle';

const loginSchema = z.object({
  email: z.string().min(1, { message: "Email is required." }).email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function Login() {
  useDocumentTitle('Sign In');
  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showMockGoogle, setShowMockGoogle] = useState(false);
  const [mockGoogleForm, setMockGoogleForm] = useState({
    email: 'tester@gmail.com',
    name: 'Google Tester',
    phoneNumber: '9187654321',
    countryCode: '+91',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
  });

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', data);
      const { accessToken, user } = res.data.data;
      login(accessToken, user);
      toast.success('Logged in successfully', { duration: 3000 });
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Invalid credentials';
      toast.error(errMsg, { id: 'login-toast', duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      const res = await api.post('/api/auth/google', { credential: response.credential });
      const { accessToken, user } = res.data.data;
      login(accessToken, user);
      toast.success('Logged in with Google successfully', { duration: 3000 });
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Google login failed';
      toast.error(errMsg);
    }
  };

  const generateMockGoogleCredential = (email, name, countryCode, phoneNumber, profileImage) => {
    const fullPhone = phoneNumber ? `${countryCode}${phoneNumber}` : '';
    const payload = {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      picture: profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name.trim())}`,
      sub: 'mock-google-id-' + email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, ''),
      phone: fullPhone
    };
    const encodeBase64 = (str) => btoa(unescape(encodeURIComponent(str)));
    const header = { alg: "HS256", typ: "JWT" };
    return `${encodeBase64(JSON.stringify(header))}.${encodeBase64(JSON.stringify(payload))}.mock-signature`;
  };

  const handleMockGoogleSubmit = (e) => {
    e.preventDefault();
    const mockCred = generateMockGoogleCredential(
      mockGoogleForm.email,
      mockGoogleForm.name,
      mockGoogleForm.countryCode,
      mockGoogleForm.phoneNumber,
      mockGoogleForm.profileImage
    );
    handleGoogleSuccess({ credential: mockCred });
    setShowMockGoogle(false);
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGoogleMock = !googleClientId || googleClientId.includes('mockclientid');

  return (
    <GoogleOAuthProvider clientId={googleClientId || "1083011382404-mockclientid.apps.googleusercontent.com"}>
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0b0f19] bg-grid-pattern text-slate-900 dark:text-slate-100">
        {/* Top Left Back Button */}
        <div className="absolute top-6 left-6 flex items-center gap-4 z-20">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-full shadow-sm">
            <ArrowLeft size={14} />
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
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sign in to manage your short links with analytics
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
            <Input
              label="Email address"
              id="email"
              type="email"
              placeholder="Enter your email address"
              autoComplete="off"
              error={errors.email?.message}
              {...register('email')}
            />
            <div>
              <Input
                label="Password"
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-semibold">
                  Forgot password?
                </Link>
              </div>
            </div>
            
            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-400 uppercase font-semibold">Or continue with</span>
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          </div>

          <div className="flex justify-center w-full">
            {isGoogleMock ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                onClick={() => setShowMockGoogle(true)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.99 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.82 2.96C6.26 7.42 8.9 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.51h6.46c-.28 1.47-1.11 2.72-2.36 3.56l3.66 2.84c2.14-1.97 3.37-4.88 3.37-8.57z" />
                  <path fill="#FBBC05" d="M5.32 14.86a6.97 6.97 0 0 1-.36-2.22c0-.77.13-1.52.36-2.22L1.5 7.46A10.966 10.966 0 0 0 .5 12c0 1.62.35 3.16.99 4.54l3.83-2.68z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.51 1.18-4.3 1.18-3.1 0-5.74-2.38-6.68-5.42L1.5 15.97C3.39 19.82 7.35 22.5 12 22.5z" />
                </svg>
                Sign in with Google
              </Button>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google verification failed')}
                theme="filled_blue"
                size="large"
                width="100%"
              />
            )}
          </div>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-semibold">
              Create account
            </Link>
          </div>
        </div>
      </div>

      {/* Mock Google Sign-In Dialog */}
      <Dialog isOpen={showMockGoogle} onClose={() => setShowMockGoogle(false)} title="Sign in with Google (Dev Mode)">
        <form onSubmit={handleMockGoogleSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
            No real Google OAuth client ID is configured. You can simulate a successful sign-in by entering email and name details below.
          </p>
          <Input
            label="Google Account Name"
            id="mockName"
            type="text"
            required
            value={mockGoogleForm.name}
            onChange={(e) => setMockGoogleForm({ ...mockGoogleForm, name: e.target.value })}
          />
          <Input
            label="Google Email Address"
            id="mockEmail"
            type="email"
            required
            value={mockGoogleForm.email}
            onChange={(e) => setMockGoogleForm({ ...mockGoogleForm, email: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Country</span>
              <Select
                value={mockGoogleForm.countryCode}
                onChange={(val) => setMockGoogleForm({ ...mockGoogleForm, countryCode: val })}
                options={[
                  { value: '+91', label: '🇮🇳 +91' },
                  { value: '+1', label: '🇺🇸 +1' },
                  { value: '+44', label: '🇬🇧 +44' },
                  { value: '+61', label: '🇦🇺 +61' },
                  { value: '+65', label: '🇸🇬 +65' },
                  { value: '+49', label: '🇩🇪 +49' },
                  { value: '+33', label: '🇫🇷 +33' },
                  { value: '+81', label: '🇯🇵 +81' },
                  { value: '+971', label: '🇦🇪 +971' }
                ]}
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Google Mobile Number"
                id="mockPhone"
                type="tel"
                required
                placeholder="10 digits for India"
                value={mockGoogleForm.phoneNumber}
                onChange={(e) => setMockGoogleForm({ ...mockGoogleForm, phoneNumber: e.target.value })}
              />
            </div>
          </div>
          <Input
            label="Google Profile Picture URL"
            id="mockProfileImage"
            type="text"
            required
            value={mockGoogleForm.profileImage}
            onChange={(e) => setMockGoogleForm({ ...mockGoogleForm, profileImage: e.target.value })}
          />
          <div className="flex justify-end gap-2.5 mt-2">
            <Button variant="secondary" onClick={() => setShowMockGoogle(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Continue
            </Button>
          </div>
        </form>
      </Dialog>
    </GoogleOAuthProvider>
  );
}
