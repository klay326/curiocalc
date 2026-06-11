'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.auth.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') {
    return <div className="text-zinc-500 font-mono text-sm animate-pulse">Verifying…</div>;
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h1 className="font-bold font-mono text-amber-400 text-xl">Email verified!</h1>
        <p className="text-zinc-400 font-mono text-sm">Your CurioCalc account is now fully verified.</p>
        <Link href="/collection"
          className="inline-block mt-4 px-5 py-2.5 bg-amber-400 text-zinc-950 rounded-lg font-mono font-bold text-sm hover:bg-amber-300 transition-colors">
          Go to my collection
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-4">
      <div className="text-4xl">❌</div>
      <h1 className="font-bold font-mono text-red-400 text-xl">Verification failed</h1>
      <p className="text-zinc-500 font-mono text-sm">This link is invalid or has expired.</p>
      <Link href="/settings"
        className="inline-block mt-4 text-amber-400 hover:text-amber-300 font-mono text-sm transition-colors">
        Request a new link →
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-zinc-500 font-mono text-sm animate-pulse">Loading…</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
