/** GoogleSignIn consumes its OAuth callback; it must not navigate the router away. */
export function redirectSystemPath({ path, initial }: { path: string | null; initial: boolean }): string | null {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (path && clientId) {
    const scheme = clientId.split('.').reverse().join('.');
    if (path.startsWith(`${scheme}:/`)) return initial ? '/settings' : null;
  }
  return path;
}
