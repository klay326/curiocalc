'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** Registers this device for push notifications once a user is signed in. Native-only — no-op on web. */
export function PushRegistration() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    let registrationListener: { remove: () => void } | undefined;
    let errorListener: { remove: () => void } | undefined;
    let tapListener: { remove: () => void } | undefined;

    (async () => {
      const perm = await PushNotifications.checkPermissions();
      let status = perm.receive;
      if (status === 'prompt' || status === 'prompt-with-rationale') {
        status = (await PushNotifications.requestPermissions()).receive;
      }
      if (status !== 'granted') return;

      registrationListener = await PushNotifications.addListener('registration', (token) => {
        api.devices.register({ token: token.value, platform: 'ios' }).catch(() => {});
      });
      errorListener = await PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration failed', err);
      });
      tapListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification.data as { url?: string } | undefined;
        if (data?.url) router.push(data.url);
      });

      await PushNotifications.register();
    })();

    return () => {
      registrationListener?.remove();
      errorListener?.remove();
      tapListener?.remove();
    };
  }, [user, router]);

  return null;
}
