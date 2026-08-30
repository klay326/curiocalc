'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const DISMISS_KEY = 'cc-verify-dismissed';
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function VerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user || user.is_verified) return;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const { until } = JSON.parse(raw);
        if (Date.now() < until) return; // still within dismiss window
      }
    } catch { /* ignore */ }
    setDismissed(false);
  }, [user]);

  if (!user || user.is_verified || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ until: Date.now() + DISMISS_TTL }));
    } catch { /* ignore */ }
    setDismissed(true);
  };

  const sendVerification = async () => {
    setSending(true);
    try {
      await api.auth.sendVerification();
      setSent(true);
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  return (
    <div className="bg-amber-400/10 border-b border-amber-400/20 px-4 py-2 flex items-center gap-3">
      <span className="text-amber-400 text-sm flex-shrink-0">✉</span>
      <p className="text-xs font-mono text-amber-300/80 flex-1 min-w-0">
        Please verify your email address to unlock all features.
      </p>
      {sent ? (
        <span className="text-xs font-mono text-amber-400 flex-shrink-0">Email sent ✓</span>
      ) : (
        <button
          onClick={sendVerification}
          disabled={sending}
          className="text-xs font-mono text-amber-400 hover:text-amber-300 border border-amber-400/40 hover:border-amber-400/70 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Resend email'}
        </button>
      )}
      <button
        onClick={dismiss}
        className="text-amber-400/40 hover:text-amber-400/70 transition-colors flex-shrink-0 text-base leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
