import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      const res = await authApi.login(values);
      setAuth(res.user, res.accessToken);
      navigate('/kols', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please check your credentials.';
      setServerError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F9F9F9]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-white border-r border-gray-100 px-16">
        <img
          src="https://cherymotor.com.au/sites/default/files/2024-08/560ffd6e-af3d-42f2-a10c-563f1355137e.png"
          alt="Chery Australia"
          className="w-52 mb-10 object-contain"
          crossOrigin="anonymous"
        />
        <h1 className="text-2xl font-semibold text-gray-900 text-center leading-snug">
          KOL Management Platform
        </h1>
        <p className="mt-3 text-sm text-gray-400 text-center max-w-xs leading-relaxed">
          Purpose-built for Chery Australia — manage influencer campaigns, track performance, and grow your brand.
        </p>
        <div className="mt-12 flex items-center gap-3 w-40">
          <div className="flex-1 h-px bg-gray-100" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        <p className="mt-6 text-xs text-gray-300">Powered by Hylink Australia</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden text-center">
          <img
            src="https://cherymotor.com.au/sites/default/files/2024-08/560ffd6e-af3d-42f2-a10c-563f1355137e.png"
            alt="Chery Australia"
            className="mx-auto w-40 object-contain"
            crossOrigin="anonymous"
          />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-400">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...register('email')}
                className="input mt-1"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="input mt-1"
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
