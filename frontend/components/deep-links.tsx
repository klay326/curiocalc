'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const SITE_HOSTS = new Set(['curiocalc.org', 'www.curiocalc.org']);

/** Turn https://curiocalc.org/u/klay?x=1 into /u/klay?x=1 — only for our own domain. */
function toInAppPath(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!SITE_HOSTS.has(url.hostname)) return null;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path || '/';
  } catch {
    return null;
  }
}

/** Native-only: when a curiocalc.org link opens the iOS app (universal link), route to that page. */
export function DeepLinks() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => void } | undefined;

    const go = (raw?: string) => {
      const path = raw ? toInAppPath(raw) : null;
      if (path && path !== window.location.pathname + window.location.search) router.push(path);
    };

    // Cold start: the link that launched the app. getLaunchUrl() keeps returning it for the whole
    // session, so remember it — otherwise a later page reload would jump back to that link.
    App.getLaunchUrl().then(r => {
      if (!r?.url) return;
      try {
        if (sessionStorage.getItem('cc-launch-url') === r.url) return;
        sessionStorage.setItem('cc-launch-url', r.url);
      } catch { /* storage unavailable — navigate anyway */ }
      go(r.url);
    }).catch(() => {});
    // Warm: links tapped while the app is running
    // (App 1.1 doesn't ship the native App plugin yet — these calls reject there; ignore it)
    App.addListener('appUrlOpen', e => go(e.url)).then(h => { handle = h; }).catch(() => {});

    return () => handle?.remove();
  }, [router]);

  return null;
}
