import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginAsync, clearError } from '../features/auth/authSlice';
import { Button } from '../components/common/Button';

interface LoginForm { userId: string; password: string; }

export const LoginPage: React.FC = () => {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { isAuthenticated, loading, error } = useAppSelector((s) => s.auth);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in (e.g. refresh while authenticated)
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginForm) => {
    dispatch(clearError());
    const result = await dispatch(loginAsync(data));
    if (loginAsync.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#EEF2F8] flex items-center justify-center p-6">
      <div className="flex items-center justify-center gap-0 w-full max-w-5xl">

        {/* Left illustration */}
        <div className="hidden lg:flex flex-1 items-center justify-center relative">
          <span className="absolute top-8  left-10  text-gray-400 text-xl font-light select-none">+</span>
          <span className="absolute top-20 right-16 w-3 h-3 border border-gray-400 rounded-full select-none" />
          <span className="absolute bottom-16 left-20 text-gray-400 text-xl font-light select-none">+</span>
          <span className="absolute bottom-10 right-10 text-gray-400 text-xl font-light select-none">+</span>
          <img src="/images/login-image.png" alt="Login illustration"
            className="w-[75%] max-w-sm object-contain select-none drop-shadow-sm" />
        </div>

        {/* Right card */}
        <div className="w-full lg:w-[44%] bg-white rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-center px-10 py-12 min-h-[520px]">
          <div className="mb-7">
            <img src="/images/logo.png" alt="PrepRoute" className="h-9 w-auto" />
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Login</h1>
          <p className="text-sm text-gray-500 mb-7">Use your company provided Login credentials</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">User ID</label>
              <input
                placeholder="Enter User ID"
                {...register('userId', { required: 'User ID is required' })}
                className={`w-full border ${errors.userId ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]/30 transition`}
              />
              {errors.userId && <p className="mt-1 text-xs text-red-500">{errors.userId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  {...register('password', { required: 'Password is required' })}
                  className={`w-full border ${errors.password ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 py-3 pr-11 text-sm placeholder-gray-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]/30 transition`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button type="button" className="text-sm text-[#4361EE] hover:underline block">
              Forgot password?
            </button>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
