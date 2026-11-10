/** GoogleSignIn consumes its OAuth callback; it must not navigate the router away. */
export function redirectSystemPath({ path, initial }: { path: string | null; initial: boolean }): string | null {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (path && clientId) {
    const scheme = clientId.split('.').reverse().join('.');
    if (path.startsWith(`${scheme}:/`)) return initial ? '/settings' : null;
  }
  // Resolve legacy widget URLs before navigation: mounting the redirect screen
  // first briefly exposes the stack background and remounts the calendar.
  if (path) {
    try {
      const url = new URL(path, 'pokit://app');
      const route = url.hostname === 'comic-day' ? '/comic-day' : url.pathname;
      if (route === '/comic-day' && url.searchParams.get('calendarWidget') === '1') {
        return '/(tabs)?calendarWidget=1';
      }
    } catch { /* Leave other external URLs to the router. */ }
  }
  return path;
}
