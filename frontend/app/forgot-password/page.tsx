'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-xl font-bold font-mono text-amber-400">Reset your password</h1>
        </div>

        {sent ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-4">
            <div className="text-3xl">📬</div>
            <p className="text-zinc-300 font-mono text-sm">
              If an account exists for <span className="text-amber-400">{email}</span>, we sent a reset link. Check your inbox.
            </p>
            <Link href="/login" className="block text-xs font-mono text-zinc-500 hover:text-amber-400 transition-colors mt-4">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            {error && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3 text-red-400 text-xs font-mono">{error}</div>
            )}
            <div>
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-amber-400 text-zinc-950 rounded-lg py-2.5 font-mono font-bold text-sm hover:bg-amber-300 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-zinc-600 text-xs font-mono pt-1">
              <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
