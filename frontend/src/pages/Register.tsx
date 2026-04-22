import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const schema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email(),
    password: z.string().min(8, 'At least 8 characters'),
    role: z.enum(['USER', 'ORGANIZER']),
    companyName: z.string().optional(),
  })
  .refine((v) => v.role !== 'ORGANIZER' || (v.companyName && v.companyName.length > 1), {
    path: ['companyName'],
    message: 'Company name is required for organizers',
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: doRegister } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'USER' },
  });

  const role = watch('role');

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const user = await doRegister(values);
      navigate(user.role === 'ORGANIZER' ? '/organizer' : '/');
    } catch (err) {
      const anyErr = err as { response?: { data?: { error?: { message?: string } } } };
      setServerError(anyErr.response?.data?.error?.message ?? 'Registration failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <UserPlus size={18} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
            <p className="text-sm text-slate-500">Discover events or list your own</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <label
            className={`cursor-pointer border rounded-lg px-3 py-2 text-center ${
              role === 'USER' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
            }`}
          >
            <input type="radio" value="USER" {...register('role')} className="hidden" />
            I'm attending events
          </label>
          <label
            className={`cursor-pointer border rounded-lg px-3 py-2 text-center ${
              role === 'ORGANIZER'
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            <input type="radio" value="ORGANIZER" {...register('role')} className="hidden" />
            I organize events (B2B)
          </label>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="label">Full name</label>
            <input className="input" placeholder="Jane Doe" {...register('name')} />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" placeholder="min 8 characters" {...register('password')} />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>
          {role === 'ORGANIZER' && (
            <div>
              <label className="label">Company name</label>
              <input className="input" placeholder="Acme Events Pvt Ltd" {...register('companyName')} />
              {errors.companyName && (
                <p className="text-xs text-red-600 mt-1">{errors.companyName.message}</p>
              )}
            </div>
          )}

          {serverError && (
            <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2">
              {serverError}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
