import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
      navigate(user.role === 'ORGANIZER' ? '/organizer' : from);
    } catch (err) {
      const anyErr = err as { response?: { data?: { error?: { message?: string } } } };
      setServerError(anyErr.response?.data?.error?.message ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <LogIn size={18} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500">Sign in to manage events and tickets</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              autoComplete="email"
              className="input"
              placeholder="you@example.com"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2">
              {serverError}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-6 text-center">
          New to EventHub?{' '}
          <Link to="/register" className="text-brand-700 font-medium">
            Create an account
          </Link>
        </p>

        <div className="mt-6 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="font-medium text-slate-700 mb-1">Demo credentials</div>
          B2C user: <code>user@example.com</code> / <code>Password123!</code>
          <br />
          B2B organizer: <code>organizer@example.com</code> / <code>Password123!</code>
        </div>
      </div>
    </div>
  );
}
