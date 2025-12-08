'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { signup, setGuestUser } from '@/store/slices/authSlice';
import { useToastHelpers } from '@/lib/toast';

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading, error } = useAppSelector((state) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const toast = useToastHelpers();

  useEffect(() => {
    if (user && !user.is_guest) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting || loading) return;
    
    setIsSubmitting(true);
    setValidationErrors({}); // Clear previous validation errors

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validation - show errors below inputs
    const newErrors: Record<string, string> = {};
    if (!username.trim()) {
      newErrors.username = 'Username is required.';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await dispatch(signup({ username: username.trim(), password, confirmPassword })).unwrap();
      toast.success('Account created successfully!', { title: 'Welcome!' });
      router.push('/');
    } catch (error) {
      console.error('Signup error:', error);
      
      // Extract meaningful error message from backend response
      let errorMessage = 'Signup failed';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Check for different possible error structures
        const errorObj = error as any;
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.response && errorObj.response.data) {
          const responseData = errorObj.response.data;
          if (responseData.message) {
            errorMessage = responseData.message;
          } else if (responseData.error) {
            errorMessage = responseData.error;
          }
        }
      }
      
      toast.error(errorMessage, { title: 'Signup Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch(setGuestUser());
    router.push('/');
  };

  // Clear specific validation error when user starts typing
  const handleInputChange = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center p-4 bg-gradient-to-br from-[#f0f4f8] via-[#e8f0f7] to-[#d6e9f7]">
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(13,71,161,0.12)] w-full max-w-[400px] overflow-hidden border border-[rgba(13,71,161,0.08)]">
        
        {/* Header Section */}
        <div className="px-8 pt-8 pb-6 text-center">
          <h1 className="text-2xl font-bold text-[#0d47a1] mb-2">Create Your Account</h1>
          <p className="text-[#546e7a] text-sm">Sign up to save conversations and access full features.</p>
        </div>

        {/* Form Section */}
        <div className="px-8 pb-6">
          <form method="POST" action="/api/auth/signup" className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="signup-username" className="text-sm font-semibold text-[#1e293b]">
                Username
              </label>
              <input 
                id="signup-username" 
                name="username" 
                type="text" 
                autoComplete="username" 
                autoFocus
                className={`px-4 py-3 rounded-lg border-2 ${
                  validationErrors.username 
                    ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' 
                    : 'border-[#e2e8f0] bg-white focus:border-[#1976d2] focus:ring-blue-100'
                } text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 hover:border-[#b8d4f1]`}
                placeholder="Choose a username"
                onChange={() => handleInputChange('username')}
              />
              {validationErrors.username && (
                <p className="text-xs text-red-600 ml-1 mt-1" data-error-for="username">
                  {validationErrors.username}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="signup-password" className="text-sm font-semibold text-[#1e293b]">
                Password
              </label>
              <input 
                id="signup-password" 
                name="password" 
                type="password" 
                autoComplete="new-password" 
                className={`px-4 py-3 rounded-lg border-2 ${
                  validationErrors.password 
                    ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' 
                    : 'border-[#e2e8f0] bg-white focus:border-[#1976d2] focus:ring-blue-100'
                } text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 hover:border-[#b8d4f1]`}
                placeholder="Create a strong password"
                onChange={() => handleInputChange('password')}
              />
              {validationErrors.password && (
                <p className="text-xs text-red-600 ml-1 mt-1" data-error-for="password">
                  {validationErrors.password}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="signup-confirm" className="text-sm font-semibold text-[#1e293b]">
                Confirm Password
              </label>
              <input 
                id="signup-confirm" 
                name="confirmPassword" 
                type="password" 
                autoComplete="new-password" 
                className={`px-4 py-3 rounded-lg border-2 ${
                  validationErrors.confirmPassword 
                    ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' 
                    : 'border-[#e2e8f0] bg-white focus:border-[#1976d2] focus:ring-blue-100'
                } text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 hover:border-[#b8d4f1]`}
                placeholder="Confirm your password"
                onChange={() => handleInputChange('confirmPassword')}
              />
              {validationErrors.confirmPassword && (
                <p className="text-xs text-red-600 ml-1 mt-1" data-error-for="confirmPassword">
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="w-full py-3 mt-2 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-[#1976d2] to-[#1565c0] shadow-[0_4px_12px_rgba(25,118,210,0.3)] transition-all duration-200 hover:shadow-[0_6px_16px_rgba(25,118,210,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="px-8 py-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-500 font-medium">Or</span>
            </div>
          </div>
        </div>

        {/* Guest Section */}
        <div className="px-8 pb-6">
          <form onSubmit={handleGuest} className="w-full">
            <button 
              type="submit" 
              className="w-full py-3 rounded-lg font-semibold text-sm text-[#1976d2] bg-[#e3f2fd] border border-[#bbdefb] transition-all duration-200 hover:bg-[#bbdefb] hover:border-[#90caf9] hover:-translate-y-0.5 active:translate-y-0"
            >
              Continue as Guest
            </button>
          </form>
          <p className="text-xs text-[#607d8b] text-center mt-3">
            Guest mode lets you explore without saving chat history.
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-4 border-t border-gray-100 bg-[#fafbfc]">
          <div className="flex justify-center items-center gap-2 text-sm text-[#607d8b]">
            <span>Already have an account?</span>
            <a href="/auth/login" className="text-[#1976d2] font-semibold hover:text-[#1565c0] hover:underline transition-colors">
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

