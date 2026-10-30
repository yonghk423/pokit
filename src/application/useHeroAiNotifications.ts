import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

export function useHeroAiNotifications(enabled: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let live = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const notifications = require('expo-notifications') as typeof import('expo-notifications');
      notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
      let handled: string | undefined;
      const open = (response: import('expo-notifications').NotificationResponse) => {
        const data = response.notification.request.content.data;
        if (!live || data?.type !== 'hero-ai-complete' || typeof data.jobId !== 'string' || !/^hero-[a-zA-Z0-9-]+$/.test(data.jobId) || handled === response.notification.request.identifier) return;
        handled = response.notification.request.identifier;
        router.push({ pathname: '/(tabs)/comic-day', params: { generationJob: data.jobId } });
        void notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      };
      const sub = notifications.addNotificationResponseReceivedListener(open);
      void notifications.getLastNotificationResponseAsync().then(last => { if (last) open(last); }).catch(() => undefined);
      return () => { live = false; sub.remove(); };
    } catch { return; }
  }, [enabled, router]);
}
