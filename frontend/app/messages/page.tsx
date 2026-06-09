'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Message } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ username, display_name, avatar_url, size = 8 }: {
  username: string; display_name: string | null; avatar_url: string | null; size?: number;
}) {
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0`;
  if (avatar_url) return <img src={avatar_url} alt="" className={`${cls} object-cover`} />;
  return (
    <div className={`${cls} bg-amber-900/40 flex items-center justify-center`}>
      <span className="text-xs font-bold text-amber-400 font-mono">
        {(display_name ?? username).charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [composeTo, setComposeTo] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const load = async () => {
    setLoading(true);
    try {
      const [inboxData, sentData] = await Promise.all([
        api.messages.inbox(),
        api.messages.sent(),
      ]);
      setInbox(inboxData.messages);
      setUnread(inboxData.unread);
      setSent(sentData);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const open = async (msg: Message) => {
    setSelected(msg);
    if (!msg.read && msg.recipient_id === user?.id) {
      await api.messages.markRead(msg.id).catch(() => {});
      setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
      setUnread(n => Math.max(0, n - 1));
    }
  };

  const del = async (msg: Message) => {
    await api.messages.delete(msg.id).catch(() => {});
    if (tab === 'inbox') setInbox(prev => prev.filter(m => m.id !== msg.id));
    else setSent(prev => prev.filter(m => m.id !== msg.id));
    if (selected?.id === msg.id) setSelected(null);
  };

  const sendCompose = async () => {
    if (!composeTo.trim() || !composeBody.trim()) return;
    setComposeSending(true);
    setComposeError(null);
    try {
      const msg = await api.messages.send({ recipient_username: composeTo.trim(), body: composeBody.trim() });
      setSent(prev => [msg, ...prev]);
      setShowCompose(false);
      setComposeTo('');
      setComposeBody('');
      setTab('sent');
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setComposeSending(false);
    }
  };

  if (authLoading || !user) return null;
  const list = tab === 'inbox' ? inbox : sent;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono text-amber-400">Messages</h1>
          {unread > 0 && (
            <p className="text-xs font-mono text-zinc-500 mt-0.5">{unread} unread</p>
          )}
        </div>
        <button onClick={() => setShowCompose(true)}
          className="bg-amber-400 text-zinc-950 px-4 py-2 rounded-lg font-mono font-bold text-sm hover:bg-amber-300 transition-colors">
          ✉ New message
        </button>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCompose(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono font-bold text-zinc-100">New Message</h3>
              <button onClick={() => setShowCompose(false)} className="text-zinc-600 hover:text-zinc-300 text-xl">✕</button>
            </div>
            {composeError && <p className="text-red-400 font-mono text-xs mb-3">{composeError}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">To (username)</label>
                <input value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="username"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Message</label>
                <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={4}
                  placeholder="Hi, I'm interested in…"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCompose(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg font-mono text-sm border border-zinc-700 hover:bg-zinc-700 transition-colors">
                Cancel
              </button>
              <button onClick={sendCompose} disabled={composeSending || !composeTo.trim() || !composeBody.trim()}
                className="flex-1 px-4 py-2 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50">
                {composeSending ? 'Sending…' : '✉ Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {([['inbox', `Inbox${unread > 0 ? ` (${unread})` : ''}`], ['sent', 'Sent']] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setSelected(null); }}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
              tab === key ? 'bg-zinc-700 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}>{label}</button>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {/* List */}
        <div className="md:col-span-2 space-y-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
            ))
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 font-mono text-sm">
              {tab === 'inbox' ? 'No messages yet.' : 'Nothing sent yet.'}
            </div>
          ) : list.map(msg => {
            const other = tab === 'inbox'
              ? { username: msg.sender_username, display_name: msg.sender_display_name, avatar_url: msg.sender_avatar_url }
              : { username: msg.recipient_username, display_name: msg.recipient_display_name, avatar_url: null };
            const isUnread = !msg.read && tab === 'inbox';
            return (
              <button key={msg.id} onClick={() => open(msg)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  selected?.id === msg.id
                    ? 'bg-zinc-800 border-amber-400/30'
                    : isUnread
                      ? 'bg-zinc-900/80 border-amber-900/30 hover:border-zinc-700'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}>
                <Avatar {...other} size={8} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-mono truncate ${isUnread ? 'font-bold text-zinc-100' : 'text-zinc-300'}`}>
                      @{other.username}
                    </p>
                    <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0">{timeAgo(msg.created_at)}</span>
                  </div>
                  {msg.calc_make && (
                    <p className="text-[10px] font-mono text-amber-600 truncate">{msg.calc_make} {msg.calc_model}</p>
                  )}
                  <p className="text-[11px] text-zinc-600 truncate mt-0.5">{msg.body}</p>
                </div>
                {isUnread && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />}
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div className="md:col-span-3">
          {selected ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {tab === 'inbox'
                    ? <Avatar username={selected.sender_username} display_name={selected.sender_display_name} avatar_url={selected.sender_avatar_url} size={10} />
                    : <Avatar username={selected.recipient_username} display_name={selected.recipient_display_name} avatar_url={null} size={10} />}
                  <div>
                    <Link href={`/u/${tab === 'inbox' ? selected.sender_username : selected.recipient_username}`}
                      className="text-sm font-mono font-bold text-zinc-100 hover:text-amber-400 transition-colors">
                      @{tab === 'inbox' ? selected.sender_username : selected.recipient_username}
                    </Link>
                    {selected.calc_make && (
                      <p className="text-[10px] font-mono text-amber-600">re: {selected.calc_make} {selected.calc_model}</p>
                    )}
                    <p className="text-[10px] font-mono text-zinc-600">{new Date(selected.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {tab === 'inbox' && (
                    <button
                      onClick={() => {
                        setComposeTo(selected.sender_username);
                        setComposeBody('');
                        setShowCompose(true);
                      }}
                      className="text-xs font-mono text-zinc-500 hover:text-amber-400 border border-zinc-700 hover:border-amber-500/50 px-2.5 py-1 rounded-lg transition-colors">
                      ↩ Reply
                    </button>
                  )}
                  <button onClick={() => del(selected)}
                    className="text-xs font-mono text-zinc-600 hover:text-red-400 border border-zinc-800 hover:border-red-900/50 px-2.5 py-1 rounded-lg transition-colors">
                    🗑
                  </button>
                </div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{selected.body}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-zinc-700 font-mono text-sm">
              Select a message to read it
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
