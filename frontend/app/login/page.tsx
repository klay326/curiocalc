'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/collection');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🧮</div>
          <h1 className="text-xl font-bold font-mono text-amber-400">Sign in to CurioCalc</h1>
        </div>

        <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-amber-400 text-zinc-950 rounded-lg py-2.5 font-mono font-bold text-sm hover:bg-amber-300 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs font-mono mt-5">
          No account?{' '}
          <Link href="/register" className="text-amber-400 hover:text-amber-300 transition-colors">
            Join CurioCalc
          </Link>
        </p>
      </div>
    </div>
  );
}
