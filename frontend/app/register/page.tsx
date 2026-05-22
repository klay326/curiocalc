'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', password: '', display_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.auth.register(form);
      await login(form.email, form.password);
      router.push('/collection');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'email',        label: 'Email',                    type: 'email',    required: true },
    { key: 'username',     label: 'Username',                 type: 'text',     required: true },
    { key: 'display_name', label: 'Display name (optional)',  type: 'text',     required: false },
    { key: 'password',     label: 'Password',                 type: 'password', required: true },
  ] as const;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🧮</div>
          <h1 className="text-xl font-bold font-mono text-amber-400">Join CurioCalc</h1>
          <p className="text-zinc-600 text-xs font-mono mt-1">Start tracking your collection</p>
        </div>

        <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}
          {fields.map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">{label}</label>
              <input
                type={type} value={form[key]} onChange={set(key)} required={required}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="w-full bg-amber-400 text-zinc-950 rounded-lg py-2.5 font-mono font-bold text-sm hover:bg-amber-300 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs font-mono mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
