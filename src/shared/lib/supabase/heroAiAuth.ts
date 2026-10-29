import { createHeroAiAuthStorage } from './heroAiSecureStorage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { getSupabasePublishableKey, getSupabaseUrl } from '@shared/config/supabase';

let client: SupabaseClient | null = null;
let signingIn: Promise<string> | null = null;
export function getHeroAiAuthClient() {
  if (client) return client;
  const url = getSupabaseUrl(), key = getSupabasePublishableKey();
  if (!url || !key) throw new Error('unavailable');
  client = createClient(url, key, { auth: { storage: createHeroAiAuthStorage(url), storageKey: 'pokit:hero-ai-auth-v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  if (Platform.OS !== 'web') {
    const update = (state: string) => state === 'active' ? client!.auth.startAutoRefresh() : client!.auth.stopAutoRefresh();
    AppState.addEventListener('change', update); update(AppState.currentState);
  }
  return client;
}
export async function getHeroAiAccessToken(): Promise<string> {
  const auth = getHeroAiAuthClient().auth;
  const session = await auth.getSession();
  if (session.error) throw new Error('auth_unavailable');
  if (session.data.session) return session.data.session.access_token;
  // Preserve the same anonymous identity whenever the platform can recover its stored session.
  if (!signingIn) signingIn = (async () => {
    const result = await auth.signInAnonymously();
    if (result.error || !result.data.session) throw new Error('auth_unavailable');
    return result.data.session.access_token;
  })().finally(() => { signingIn = null; });
  return signingIn;
}
