'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
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
    }
  }, [user, authLoading, router]);

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

        {/* Avatar URL */}
        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
            Avatar URL
          </label>
          <input
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://gravatar.com/…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
          />
          <p className="text-[10px] text-zinc-600 font-mono mt-1">
            Link to a profile photo — Gravatar, Imgur, etc.
          </p>
        </div>

        {/* Read-only info */}
        <div className="bg-zinc-800/40 rounded-lg px-4 py-3 space-y-1.5">
          <div className="flex gap-3 text-[11px] font-mono">
            <span className="text-zinc-600 w-20 flex-shrink-0">Username</span>
            <span className="text-zinc-400">@{user.username}</span>
            <span className="text-zinc-700 ml-auto">(cannot change)</span>
          </div>
          <div className="flex gap-3 text-[11px] font-mono">
            <span className="text-zinc-600 w-20 flex-shrink-0">Email</span>
            <span className="text-zinc-400">{user.email}</span>
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
