'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Message, type Conversation } from '@/lib/api';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const loadConversations = async () => {
    setLoading(true);
    try { setConversations(await api.messages.conversations()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) loadConversations(); }, [user]); // eslint-disable-line

  const openThread = async (username: string) => {
    setActiveUsername(username);
    setThreadLoading(true);
    try {
      const msgs = await api.messages.thread(username);
      setThread(msgs);
      setConversations(prev => prev.map(c => c.username === username ? { ...c, unread_count: 0 } : c));
    } catch { /* ignore */ }
    finally { setThreadLoading(false); }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const sendReply = async () => {
    if (!activeUsername || !replyBody.trim()) return;
    setSending(true);
    try {
      const msg = await api.messages.send({ recipient_username: activeUsername, body: replyBody.trim() });
      setThread(prev => [...prev, msg]);
      setReplyBody('');
      setConversations(prev => {
        const existing = prev.find(c => c.username === activeUsername);
        const updated: Conversation = existing
          ? { ...existing, last_body: msg.body, last_created_at: msg.created_at, last_from_me: true }
          : { username: activeUsername, display_name: null, avatar_url: null, last_body: msg.body, last_created_at: msg.created_at, last_from_me: true, unread_count: 0 };
        return [updated, ...prev.filter(c => c.username !== activeUsername)];
      });
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const sendCompose = async () => {
    if (!composeTo.trim() || !composeBody.trim()) return;
    setComposeSending(true);
    setComposeError(null);
    try {
      await api.messages.send({ recipient_username: composeTo.trim(), body: composeBody.trim() });
      setShowCompose(false);
      const target = composeTo.trim();
      setComposeTo('');
      setComposeBody('');
      await loadConversations();
      await openThread(target);
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setComposeSending(false);
    }
  };

  if (authLoading || !user) return null;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const active = conversations.find(c => c.username === activeUsername);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono text-amber-400">Messages</h1>
          {totalUnread > 0 && (
            <p className="text-xs font-mono text-zinc-500 mt-0.5">{totalUnread} unread</p>
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

      <div className="grid md:grid-cols-5 gap-4">
        {/* Conversation list */}
        <div className="md:col-span-2 space-y-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
            ))
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 font-mono text-sm">No conversations yet.</div>
          ) : conversations.map(c => (
            <button key={c.username} onClick={() => openThread(c.username)}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                activeUsername === c.username
                  ? 'bg-zinc-800 border-amber-400/30'
                  : c.unread_count > 0
                    ? 'bg-zinc-900/80 border-amber-900/30 hover:border-zinc-700'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}>
              <Avatar username={c.username} display_name={c.display_name} avatar_url={c.avatar_url} size={8} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-mono truncate ${c.unread_count > 0 ? 'font-bold text-zinc-100' : 'text-zinc-300'}`}>
                    @{c.username}
                  </p>
                  <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0">{timeAgo(c.last_created_at)}</span>
                </div>
                <p className="text-[11px] text-zinc-600 truncate mt-0.5">{c.last_from_me ? 'You: ' : ''}{c.last_body}</p>
              </div>
              {c.unread_count > 0 && (
                <span className="min-w-[16px] h-4 px-1 bg-amber-400 text-zinc-950 text-[9px] font-bold font-mono rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  {c.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Thread */}
        <div className="md:col-span-3">
          {activeUsername ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-[32rem]">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <Link href={`/u/${activeUsername}`} className="flex items-center gap-3 hover:text-amber-400 transition-colors">
                  <Avatar username={activeUsername} display_name={active?.display_name ?? null} avatar_url={active?.avatar_url ?? null} size={9} />
                  <span className="text-sm font-mono font-bold text-zinc-100">@{activeUsername}</span>
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {threadLoading ? (
                  <div className="text-zinc-600 font-mono text-xs text-center py-8">Loading…</div>
                ) : thread.length === 0 ? (
                  <div className="text-zinc-600 font-mono text-xs text-center py-8">No messages yet — say hi!</div>
                ) : thread.map(m => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-200'}`}>
                        {m.calc_make && (
                          <p className={`text-[10px] font-mono mb-0.5 ${mine ? 'text-zinc-800/70' : 'text-amber-500'}`}>
                            re: {m.calc_make} {m.calc_model}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[9px] font-mono mt-1 ${mine ? 'text-zinc-800/60' : 'text-zinc-500'}`}>
                          {timeAgo(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-zinc-800 flex gap-2">
                <input
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type a message…"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button onClick={sendReply} disabled={sending || !replyBody.trim()}
                  className="px-4 py-2 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50">
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-zinc-700 font-mono text-sm">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
