'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (user) {
      setDisplayName(user.display_name ?? '');
      setBio(user.bio ?? '');
      setLocation(user.location ?? '');
      setWebsite(user.website ?? '');
      setAvatarUrl(user.avatar_url ?? '');
      setApiKey(user.api_key ?? null);
      setShowcaseIds(user.showcase_ids ?? []);
      setLoadingShowcase(true);
      api.collection.mine().then(async (entries) => {
        const ownedIds = [...new Set(
          entries.filter(e => e.status === 'owned' || e.status === 'for_sale').map(e => e.calculator_id)
        )];
        if (ownedIds.length === 0) return;
        const calcs = await api.calculators.batch(ownedIds).catch(() => []);
        const map: Record<string, Calculator> = {};
        calcs.forEach(c => { map[c.id] = c; });
        setShowcaseCalcs(map);
      }).finally(() => setLoadingShowcase(false));
    }
  }, [user, authLoading, router]);

  const toggleShowcase = (id: string) => {
    setShowcaseIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  };

  const handleSaveShowcase = async () => {
    setSavingShowcase(true);
    try {
      await api.users.updateMe({ showcase_ids: showcaseIds });
      await refreshUser();
      setShowcaseSaved(true);
      setTimeout(() => setShowcaseSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingShowcase(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.users.updateMe({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Showcase
  const [showcaseIds, setShowcaseIds] = useState<string[]>([]);
  const [showcaseCalcs, setShowcaseCalcs] = useState<Record<string, Calculator>>({});
  const [loadingShowcase, setLoadingShowcase] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [showcaseSaved, setShowcaseSaved] = useState(false);

  const handleSendVerification = async () => {
    setSendingVerification(true);
    try {
      await api.auth.sendVerification();
      setVerificationSent(true);
    } catch { /* ignore */ }
    finally { setSendingVerification(false); }
  };

  const handleGenerateApiKey = async () => {
    setGeneratingKey(true);
    try {
      const updated = await api.users.generateApiKey();
      setApiKey(updated.api_key ?? null);
      await refreshUser();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Key generation failed');
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  if (authLoading || !user) return null;

  const previewAvatar = avatarUrl.trim() || user.avatar_url;
  const initial = (displayName.trim() || user.display_name || user.username).charAt(0).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/u/${user.username}`}
        className="text-xs text-zinc-500 font-mono hover:text-zinc-300 transition-colors mb-6 inline-block"
      >
        ← back to profile
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {previewAvatar ? (
          <img
            src={previewAvatar}
            alt={user.username}
            className="w-16 h-16 rounded-full border-2 border-zinc-700 object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-amber-900/40 border-2 border-amber-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-amber-400 font-mono">{initial}</span>
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-zinc-100 font-mono">Account settings</h1>
          <p className="text-zinc-500 font-mono text-sm">@{user.username}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        {error && (
          <div className="bg-red-950/40 border border-red-800/50 text-red-400 font-mono text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-green-950/40 border border-green-800/50 text-green-400 font-mono text-xs px-3 py-2 rounded-lg">
            ✓ Profile updated!
          </div>
        )}

        {/* Display name */}
        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
            Display name
          </label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={user.username}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
          />
          <p className="text-[10px] text-zinc-600 font-mono mt-1">Shown on your profile instead of your @username</p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell us about your calculator collection…"
            rows={3}
            maxLength={500}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors resize-y"
          />
          <p className="text-[10px] text-zinc-600 font-mono mt-1">{bio.length}/500</p>
        </div>

        {/* Location + Website */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
              Location
            </label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Tokyo, Japan"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
              Website
            </label>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Avatar */}
        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
            Avatar
          </label>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-amber-400 font-mono">
                  {(user?.display_name ?? user?.username ?? '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <label className={`cursor-pointer px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:border-amber-400/50 text-zinc-300 font-mono text-xs rounded-lg transition-colors ${uploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingAvatar(true);
                  try {
                    const updated = await api.users.uploadAvatar(file);
                    setAvatarUrl(updated.avatar_url ?? '');
                    await refreshUser();
                  } catch {}
                  finally { setUploadingAvatar(false); e.target.value = ''; }
                }}
              />
            </label>
          </div>
          <input
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="or paste a URL — Gravatar, Imgur, etc."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        {/* Read-only info */}
        <div className="bg-zinc-800/40 rounded-lg px-4 py-3 space-y-1.5">
          <div className="flex gap-3 text-[11px] font-mono">
            <span className="text-zinc-600 w-20 flex-shrink-0">Username</span>
            <span className="text-zinc-400">@{user.username}</span>
            <span className="text-zinc-700 ml-auto">(cannot change)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-zinc-600 w-20 flex-shrink-0">Email</span>
            <span className="text-zinc-400">{user.email}</span>
            {user.is_verified ? (
              <span className="ml-auto text-[10px] bg-green-950/40 text-green-400 border border-green-900/50 px-1.5 py-0.5 rounded font-mono">✓ verified</span>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-amber-400/70 font-mono">unverified</span>
                {verificationSent ? (
                  <span className="text-[10px] text-zinc-500 font-mono">email sent ✓</span>
                ) : (
                  <button onClick={handleSendVerification} disabled={sendingVerification}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-mono transition-colors disabled:opacity-50">
                    {sendingVerification ? 'sending…' : 'verify →'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : '✓ Save changes'}
          </button>
        </div>
      </div>

      {/* Showcase */}
      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold font-mono text-zinc-300">Profile showcase</h2>
          <span className={`text-[10px] font-mono ${showcaseIds.length === 6 ? 'text-amber-400' : 'text-zinc-600'}`}>
            {showcaseIds.length}/6 pinned
          </span>
        </div>
        <p className="text-[11px] text-zinc-600 font-mono mb-4">
          Pick up to 6 calculators to feature at the top of your profile.
        </p>
        {showcaseSaved && (
          <div className="bg-green-950/40 border border-green-800/50 text-green-400 font-mono text-xs px-3 py-2 rounded-lg mb-4">
            ✓ Showcase updated!
          </div>
        )}
        {loadingShowcase ? (
          <p className="text-[11px] text-zinc-600 font-mono">Loading collection…</p>
        ) : Object.keys(showcaseCalcs).length === 0 ? (
          <p className="text-[11px] text-zinc-600 font-mono">
            Add calcs to your collection first, then come back to pin your favorites.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4 max-h-80 overflow-y-auto scrollbar-thin pr-1">
              {Object.values(showcaseCalcs).map(c => {
                const pinned = showcaseIds.includes(c.id);
                const disabled = !pinned && showcaseIds.length >= 6;
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleShowcase(c.id)}
                    disabled={disabled}
                    className={`relative group rounded-xl overflow-hidden border transition-all text-left ${
                      pinned
                        ? 'border-amber-400/60 ring-1 ring-amber-400/30'
                        : disabled
                        ? 'border-zinc-800 opacity-40 cursor-not-allowed'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {c.images[0]
                        ? <img src={c.images[0]} alt={c.model} className="w-full h-full object-contain" />
                        : <span className="text-xl opacity-20">🧮</span>}
                    </div>
                    <div className="p-1.5">
                      <p className="text-[8px] font-mono text-zinc-600 truncate">{c.make}</p>
                      <p className="text-[9px] font-bold font-mono text-zinc-300 truncate">{c.model}</p>
                    </div>
                    {pinned && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                        <span className="text-[8px] font-bold text-zinc-950">
                          {showcaseIds.indexOf(c.id) + 1}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {showcaseIds.length > 0 && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-[10px] font-mono text-zinc-600">Order:</span>
                {showcaseIds.map((id, i) => (
                  <span key={id} className="text-[10px] font-mono text-amber-400/80 bg-amber-950/30 border border-amber-900/40 rounded px-1.5 py-0.5">
                    {i + 1}. {showcaseCalcs[id]?.model ?? '…'}
                  </span>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleSaveShowcase}
                disabled={savingShowcase}
                className="px-5 py-2 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50"
              >
                {savingShowcase ? 'Saving…' : '✓ Save showcase'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* API Key */}
      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold font-mono text-zinc-300 mb-1">API Key</h2>
        <p className="text-[11px] text-zinc-600 font-mono mb-4">
          Use this key to authenticate API requests. Keep it secret.
        </p>
        {apiKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-green-400 truncate">
                {apiKey}
              </code>
              <button
                onClick={copyApiKey}
                className="px-3 py-2 text-xs font-mono bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-500 text-zinc-400 hover:text-zinc-100 transition-colors flex-shrink-0"
              >
                {keyCopied ? '✓ copied' : 'copy'}
              </button>
            </div>
            <button
              onClick={handleGenerateApiKey}
              disabled={generatingKey}
              className="text-xs font-mono text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-30"
            >
              {generatingKey ? 'Regenerating…' : '↻ Regenerate (invalidates current key)'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateApiKey}
            disabled={generatingKey}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 hover:border-amber-400/50 text-zinc-300 hover:text-amber-400 font-mono text-sm rounded-lg transition-colors disabled:opacity-30"
          >
            {generatingKey ? 'Generating…' : '⚡ Generate API key'}
          </button>
        )}
      </div>

      {/* My collection link */}
      <div className="mt-4 text-center">
        <Link href="/collection" className="text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors">
          View my collection →
        </Link>
      </div>
    </div>
  );
}
