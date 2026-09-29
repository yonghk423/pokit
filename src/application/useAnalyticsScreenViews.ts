import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { logScreenView, resolveAnalyticsScreenName } from '@shared/lib/analytics';

/**
 * Expo Router 경로 변경 시 Firebase screen_view를 보냅니다.
 * Navigation 트리 안(ThemeProvider/Stack 하위)에서만 마운트하세요.
 */
export function useAnalyticsScreenViews(): void {
  const pathname = usePathname();
  const lastLoggedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const screenName = resolveAnalyticsScreenName(pathname);
    if (lastLoggedRef.current === screenName) return;
    lastLoggedRef.current = screenName;
    void logScreenView(screenName);
  }, [pathname]);
}
