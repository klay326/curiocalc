'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme, THEMES, THEME_META, type Theme } from '@/lib/theme';

const RULES = [
  { id: 'len',   label: 'At least 8 characters',          test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)',      test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a–z)',      test: (p: string) => /[a-z]/.test(p) },
  { id: 'num',   label: 'One number (0–9)',                test: (p: string) => /[0-9]/.test(p) },
  { id: 'sym',   label: 'One special character (!@#$…)',   test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const DARK_THEMES  = THEMES.filter(t => t !== 'paper');
const LIGHT_THEMES = THEMES.filter(t => t === 'paper');

function PasswordStrength({ password }: { password: string }) {
  const results = useMemo(() => RULES.map(r => ({ ...r, ok: r.test(password) })), [password]);
  const score = results.filter(r => r.ok).length;

  const bar = [
    { min: 0, color: 'bg-zinc-700', label: '' },
    { min: 1, color: 'bg-red-500',    label: 'Weak' },
    { min: 2, color: 'bg-orange-500', label: 'Fair' },
    { min: 3, color: 'bg-yellow-500', label: 'Good' },
    { min: 4, color: 'bg-lime-500',   label: 'Strong' },
    { min: 5, color: 'bg-green-500',  label: 'Excellent' },
  ];
  const level = password.length === 0 ? bar[0] : bar[Math.max(1, score)];

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= score ? level.color : 'bg-zinc-800'
            }`} />
          ))}
        </div>
        {level.label && (
          <span className={`text-[10px] font-mono font-bold w-16 text-right ${level.color.replace('bg-','text-')}`}>
            {level.label}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {results.map(rule => (
          <div key={rule.id} className="flex items-center gap-2">
            <span className={`text-[11px] transition-colors duration-200 ${rule.ok ? 'text-green-400' : 'text-zinc-600'}`}>
              {rule.ok ? '✓' : '○'}
            </span>
            <span className={`text-[11px] font-mono transition-colors duration-200 ${rule.ok ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeSwatch({ t, selected, onSelect }: { t: Theme; selected: boolean; onSelect: () => void }) {
  const meta = THEME_META[t];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
        selected
          ? 'border-amber-400/60 bg-zinc-800 text-zinc-100'
          : 'border-zinc-700/60 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200'
      }`}
    >
      <span
        className="w-4 h-4 rounded-full flex-shrink-0 border border-white/10"
        style={{ backgroundColor: meta.dot }}
      />
      <div className="min-w-0">
        <p className="text-xs font-mono font-semibold leading-none">{meta.label}</p>
        <p className="text-[10px] font-mono text-zinc-500 mt-0.5 leading-none truncate">{meta.description}</p>
      </div>
      {selected && (
        <span className="ml-auto text-amber-400 text-[11px] font-mono flex-shrink-0">✓</span>
      )}
    </button>
  );
}

export default function RegisterPage() {
  const { login } = useAuth();
  const { setTheme } = useTheme();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', password: '', display_name: '' });
  const [confirmEmail, setConfirmEmail] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('obsidian');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pickTheme = (t: Theme) => {
    setSelectedTheme(t);
    setTheme(t); // live preview
  };

  const passwordScore = RULES.filter(r => r.test(form.password)).length;
  const passwordOk = passwordScore >= 4;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const emailsMatch = form.email === confirmEmail;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordOk) {
      setError('Please choose a stronger password.');
      return;
    }
    if (!emailsMatch) {
      setError('Email addresses do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.auth.register({ ...form, theme: selectedTheme });
      await login(form.email, form.password);
      router.push('/collection');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const textFields = [
    { key: 'username',     label: 'Username',                type: 'text',     required: true },
    { key: 'display_name', label: 'Display name (optional)', type: 'text',     required: false },
  ] as const;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
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

          {/* Email */}
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Email</label>
            <input
              type="email" value={form.email} onChange={set('email')} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Confirm Email */}
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Confirm Email</label>
            <input
              type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} required
              className={`w-full bg-zinc-800 border rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none transition-colors ${
                confirmEmail.length > 0
                  ? emailsMatch
                    ? 'border-green-500/60 focus:border-green-400'
                    : 'border-red-500/60 focus:border-red-400'
                  : 'border-zinc-700 focus:border-amber-400'
              }`}
            />
            {confirmEmail.length > 0 && !emailsMatch && (
              <p className="text-[11px] font-mono text-red-400 mt-1">Emails do not match</p>
            )}
          </div>

          {textFields.map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">{label}</label>
              <input
                type={type} value={form[key]} onChange={set(key)} required={required}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}

          {/* Password with strength meter */}
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Password</label>
            <input
              type="password" value={form.password} onChange={set('password')} required
              className={`w-full bg-zinc-800 border rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none transition-colors ${
                form.password
                  ? passwordOk
                    ? 'border-green-500/60 focus:border-green-400'
                    : 'border-zinc-700 focus:border-amber-400'
                  : 'border-zinc-700 focus:border-amber-400'
              }`}
            />
            <PasswordStrength password={form.password} />
          </div>

          {/* Theme picker */}
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-2">
              Choose your theme
            </label>

            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1.5">Dark</p>
            <div className="space-y-1 mb-3">
              {DARK_THEMES.map(t => (
                <ThemeSwatch key={t} t={t} selected={selectedTheme === t} onSelect={() => pickTheme(t)} />
              ))}
            </div>

            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1.5">Light</p>
            <div className="space-y-1">
              {LIGHT_THEMES.map(t => (
                <ThemeSwatch key={t} t={t} selected={selectedTheme === t} onSelect={() => pickTheme(t)} />
              ))}
            </div>
          </div>

          <button
            type="submit" disabled={loading || (form.password.length > 0 && !passwordOk) || (confirmEmail.length > 0 && !emailsMatch)}
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
