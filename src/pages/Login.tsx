/**
 * Login Page
 *
 * Enterprise Compliance Management System dual-column portal.
 * Features:
 * - Left column: Enterprise branding, hero messaging, value proposition feature list,
 *   and architectural vector illustration.
 * - Right column: Elevated corporate login card, remember me, forgot password guidance modal,
 *   and a dedicated Development Role Tester with 6 canonical system roles.
 * Built strictly with Tailwind CSS utility classes.
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Crown,
  User,
  Building2,
  MapPin,
  CheckCircle2,
  Eye as EyeIcon,
  Loader2,
  ArrowRight,
  FlaskConical,
  FileText,
  Bell,
  BarChart3,
  X,
  Info,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ROUTES } from '../constants/routes';
import env from '@/config/env';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Verified Demo Accounts matching the design reference
const DEMO_ACCOUNTS = [
  {
    role: 'Super Admin',
    email: 'superadmin@cms.local',
    icon: Crown,
    bgClass: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200/90',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-900',
    desc: 'Full system control',
  },
  {
    role: 'Admin',
    email: 'admin@cms.local',
    icon: User,
    bgClass: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/90',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    desc: 'System administrator',
  },
  {
    role: 'Entity Admin',
    email: 'entityadmin@ccpl.local',
    icon: Building2,
    bgClass: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/90',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-900',
    desc: 'Entity level management',
  },
  {
    role: 'Location Manager',
    email: 'locationmanager@ccpl.local',
    icon: MapPin,
    bgClass: 'bg-purple-50 hover:bg-purple-100/80 border-purple-200/90',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-900',
    desc: 'Unit / clinic manager',
  },
  {
    role: 'Compliance Officer',
    email: 'officer@ccpl.local',
    icon: CheckCircle2,
    bgClass: 'bg-cyan-50 hover:bg-cyan-100/80 border-cyan-200/90',
    iconColor: 'text-cyan-600',
    titleColor: 'text-cyan-900',
    desc: 'Licences & approvals',
  },
  {
    role: 'Viewer',
    email: 'viewer@ccpl.local',
    icon: EyeIcon,
    bgClass: 'bg-slate-50 hover:bg-slate-100 border-slate-200',
    iconColor: 'text-slate-600',
    titleColor: 'text-slate-900',
    desc: 'Read-only access',
  },
];

// Architectural City Vector Illustration matching the reference design
const CorporateIllustration: React.FC = () => (
  <div className="w-full max-w-xl mt-6 lg:mt-auto relative select-none pointer-events-none" aria-hidden="true">
    <svg viewBox="0 0 540 210" className="w-full h-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyWash" x1="270" y1="0" x2="270" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0EFFE" stopOpacity="0.8" />
          <stop stopColor="#F0F6FC" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="glassBuilding1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="glassBuilding2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Far background silhouettes */}
      <rect x="60" y="95" width="45" height="85" rx="3" fill="#D5E6F7" />
      <rect x="115" y="115" width="35" height="65" rx="3" fill="#C9DEF3" />
      <rect x="375" y="100" width="40" height="80" rx="3" fill="#D5E6F7" />
      <rect x="425" y="120" width="35" height="60" rx="3" fill="#C9DEF3" />

      {/* Left Modern Angular Tower */}
      <path d="M85 75 L140 45 L140 180 L85 180 Z" fill="#2563EB" />
      <path d="M140 45 L160 55 L160 180 L140 180 Z" fill="#1D4ED8" />
      {/* Windows grid on Left Tower */}
      <g fill="#93C5FD" opacity="0.85">
        <rect x="95" y="78" width="16" height="8" rx="1" />
        <rect x="118" y="66" width="16" height="8" rx="1" />
        <rect x="95" y="93" width="16" height="8" rx="1" />
        <rect x="118" y="81" width="16" height="8" rx="1" />
        <rect x="95" y="108" width="16" height="8" rx="1" />
        <rect x="118" y="96" width="16" height="8" rx="1" />
        <rect x="95" y="123" width="16" height="8" rx="1" />
        <rect x="118" y="111" width="16" height="8" rx="1" />
        <rect x="95" y="138" width="16" height="8" rx="1" />
        <rect x="118" y="126" width="16" height="8" rx="1" />
      </g>

      {/* Center Main HQ Tower */}
      <rect x="165" y="25" width="115" height="155" rx="4" fill="url(#glassBuilding1)" />
      {/* Roof cap & architectural antenna */}
      <rect x="205" y="18" width="35" height="7" rx="2" fill="#172554" />
      <line x1="222" y1="8" x2="222" y2="18" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
      {/* Grid glass panels */}
      <g fill="#DBEAFE" opacity="0.8">
        <rect x="175" y="35" width="28" height="14" rx="1" />
        <rect x="208" y="35" width="28" height="14" rx="1" />
        <rect x="241" y="35" width="28" height="14" rx="1" />
        <rect x="175" y="55" width="28" height="14" rx="1" />
        <rect x="208" y="55" width="28" height="14" rx="1" />
        <rect x="241" y="55" width="28" height="14" rx="1" />
        <rect x="175" y="75" width="28" height="14" rx="1" />
        <rect x="208" y="75" width="28" height="14" rx="1" />
        <rect x="241" y="75" width="28" height="14" rx="1" />
        <rect x="175" y="95" width="28" height="14" rx="1" />
        <rect x="208" y="95" width="28" height="14" rx="1" />
        <rect x="241" y="95" width="28" height="14" rx="1" />
        <rect x="175" y="115" width="28" height="14" rx="1" />
        <rect x="208" y="115" width="28" height="14" rx="1" />
        <rect x="241" y="115" width="28" height="14" rx="1" />
        <rect x="175" y="135" width="28" height="14" rx="1" />
        <rect x="208" y="135" width="28" height="14" rx="1" />
        <rect x="241" y="135" width="28" height="14" rx="1" />
      </g>
      {/* Entrance canopy */}
      <rect x="195" y="156" width="55" height="24" rx="2" fill="#FFFFFF" />
      <rect x="205" y="164" width="35" height="16" rx="1" fill="#1E3A8A" />

      {/* Right Wing Building */}
      <rect x="290" y="65" width="90" height="115" rx="4" fill="url(#glassBuilding2)" />
      <rect x="290" y="60" width="90" height="5" fill="#1E3A8A" />
      <g fill="#EFF6FF" opacity="0.85">
        <rect x="300" y="75" width="20" height="12" rx="1" />
        <rect x="325" y="75" width="20" height="12" rx="1" />
        <rect x="350" y="75" width="20" height="12" rx="1" />
        <rect x="300" y="95" width="20" height="12" rx="1" />
        <rect x="325" y="95" width="20" height="12" rx="1" />
        <rect x="350" y="95" width="20" height="12" rx="1" />
        <rect x="300" y="115" width="20" height="12" rx="1" />
        <rect x="325" y="115" width="20" height="12" rx="1" />
        <rect x="350" y="115" width="20" height="12" rx="1" />
        <rect x="300" y="135" width="20" height="12" rx="1" />
        <rect x="325" y="135" width="20" height="12" rx="1" />
        <rect x="350" y="135" width="20" height="12" rx="1" />
      </g>

      {/* Ground road & plaza */}
      <path d="M10 180 Q270 176 530 180 L530 205 L10 205 Z" fill="#FFFFFF" />
      <line x1="15" y1="180" x2="525" y2="180" stroke="#94A3B8" strokeWidth="2" />

      {/* Foreground Trees with round stylized foliage */}
      {/* Tree Left 1 */}
      <rect x="42" y="162" width="4" height="18" rx="1" fill="#475569" />
      <circle cx="44" cy="152" r="14" fill="#10B981" />
      <circle cx="41" cy="147" r="10" fill="#34D399" opacity="0.7" />

      {/* Tree Left 2 */}
      <rect x="66" y="158" width="4" height="22" rx="1" fill="#475569" />
      <circle cx="68" cy="146" r="16" fill="#059669" />
      <circle cx="65" cy="141" r="12" fill="#10B981" opacity="0.8" />

      {/* Tree Mid 1 */}
      <rect x="150" y="164" width="3.5" height="16" rx="1" fill="#475569" />
      <circle cx="151.5" cy="156" r="11" fill="#10B981" />

      {/* Tree Mid 2 */}
      <rect x="280" y="164" width="3.5" height="16" rx="1" fill="#475569" />
      <circle cx="281.5" cy="156" r="11" fill="#059669" />

      {/* Tree Right 1 */}
      <rect x="390" y="160" width="4" height="20" rx="1" fill="#475569" />
      <circle cx="392" cy="148" r="15" fill="#10B981" />
      <circle cx="389" cy="143" r="11" fill="#34D399" opacity="0.7" />

      {/* Tree Right 2 */}
      <rect x="430" y="164" width="4" height="16" rx="1" fill="#475569" />
      <circle cx="432" cy="154" r="13" fill="#047857" />
    </svg>
  </div>
);

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const showDemoLogin = env.SHOW_DEMO_LOGIN;
  const from = (location.state as any)?.from?.pathname || ROUTES.DASHBOARD;

  // Ensure body background is light for the enterprise compliance login page
  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#F0F6FC';
    return () => {
      document.body.style.backgroundColor = prevBg;
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'superadmin@cms.local',
      password: 'Password123!',
    },
  });

  const currentEmail = watch('email');

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      success('Authentication successful! Welcome to CMS.');
      navigate(from, { replace: true });
    } catch (err: any) {
      error(err.message || 'Invalid credentials. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemo = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password123!', { shouldValidate: true });
  };

  return (
    <div className="min-h-screen w-full bg-[#F0F6FC] text-slate-800 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Decorative Dotted Grid pattern in top-right */}
      <div className="absolute top-8 right-8 pointer-events-none opacity-40 hidden sm:block" aria-hidden="true">
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          ))}
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center z-10">
        
        {/* ── Left Column: Branding, Value Prop & Graphic ──────────────── */}
        <div className="min-w-0 w-full flex flex-col justify-between h-full pt-2 lg:pt-4">
          <div>
            {/* Top Logo */}
            <div className="flex items-center gap-3.5 mb-6 sm:mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                <ShieldCheck className="w-7 h-7" strokeWidth={2.4} />
              </div>
              <div>
                <span className="block text-2xl font-bold text-slate-900 tracking-tight leading-none">
                  Compliance
                </span>
                <span className="block text-[11px] font-bold text-slate-500 tracking-[0.2em] uppercase mt-1">
                  MANAGEMENT SYSTEM
                </span>
              </div>
            </div>

            {/* Hero Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-[1.18] mb-4">
              Comprehensive Compliance Management{' '}
              <span className="text-blue-600 block mt-1">for a Safer Tomorrow</span>
            </h1>

            {/* Description */}
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
              Manage regulatory compliance, track renewals, receive alerts and maintain audit trails &mdash; all in one secure platform.
            </p>

            {/* Feature Highlights List */}
            <div className="space-y-4 max-w-lg mb-6">
              {/* Feature 1 */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Centralized Compliance</h3>
                  <p className="text-sm text-slate-500">Manage all statutory requirements</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Multi-Entity Support</h3>
                  <p className="text-sm text-slate-500">Entities, locations and units</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Smart Alerts</h3>
                  <p className="text-sm text-slate-500">Never miss a renewal or deadline</p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Real-time Insights</h3>
                  <p className="text-sm text-slate-500">Dashboards and detailed reports</p>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Audit Ready</h3>
                  <p className="text-sm text-slate-500">Complete audit trail and traceability</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Vector Architectural Illustration */}
          <div className="hidden lg:block mt-6">
            <CorporateIllustration />
          </div>
        </div>

        {/* ── Right Column: The Login Card ─────────────────────────────── */}
        <div className="min-w-0 w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-[490px] bg-white rounded-[28px] shadow-2xl shadow-blue-900/10 border border-slate-100 p-8 sm:p-10 transition-all">
            
            {/* Card Header Branding */}
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-4">
                <ShieldCheck className="w-9 h-9" strokeWidth={2.4} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Compliance Management System
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 font-normal">
                Secure access to your enterprise compliance dashboard
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5" noValidate>
              {/* Email Address */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-800 mb-2"
                >
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    disabled={isSubmitting}
                    aria-invalid={errors.email ? 'true' : 'false'}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    {...register('email')}
                    className={`w-full h-12 pl-12 pr-4 rounded-xl border ${
                      errors.email
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100'
                    } bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" role="alert" className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-800 mb-2"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    {...register('password')}
                    className={`w-full h-12 pl-12 pr-12 rounded-xl border ${
                      errors.password
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100'
                    } bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-sm pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-800">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                  />
                  <span className="text-sm font-medium">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-semibold text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <ArrowRight className="w-5 h-5" strokeWidth={2.2} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* OR Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">
                  OR
                </span>
              </div>
            </div>

            {/* Demo accounts quick login */}
            {showDemoLogin && (
              <div className="bg-[#F0F5FA] rounded-2xl p-4 sm:p-4.5 border border-blue-100/70">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Demo Accounts
                    </h3>
                    <p className="text-xs text-slate-500 leading-tight mt-0.5">
                      Quick login to try the system as each user role
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {DEMO_ACCOUNTS.map((account) => {
                    const Icon = account.icon;
                    const isSelected = currentEmail === account.email;
                    return (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => handleSelectDemo(account.email)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                          account.bgClass
                        } ${
                          isSelected ? 'ring-2 ring-blue-600 shadow-sm' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 w-full">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${account.iconColor}`} />
                          <span className={`text-xs font-bold truncate ${account.titleColor}`}>
                            {account.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 leading-tight truncate w-full">
                          {account.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Card Footer / Compliance reassurance */}
            <div className="mt-6 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-500">
                Compliance Management System &copy; 2026
              </p>
              <p className="text-[11px] text-slate-400">
                Role-Based Access Control &middot; Secure &middot; Compliant &middot; Audit Ready
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Guidance Modal */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
        >
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 id="forgot-modal-title" className="text-base font-semibold text-slate-900">
                  Password Reset Guidance
                </h3>
                <p className="text-xs text-slate-500">Enterprise Credential Management</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              For regulatory compliance and audit security, credentials are managed directly by your organization's CMS Security Administrator.
            </p>
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 text-xs text-slate-700 mb-5 space-y-1">
              <p className="font-semibold text-blue-900">Need immediate assistance?</p>
              <p>
                Contact your System Administrator at:{' '}
                <a href="mailto:admin@cms.local" className="text-blue-600 underline font-medium">
                  admin@cms.local
                </a>
              </p>
              <p className="text-slate-500">Or contact your local IT Compliance Helpdesk.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;


