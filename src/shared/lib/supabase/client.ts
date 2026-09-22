import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@shared/config/supabase';

let client: SupabaseClient | null = null;

/**
 * 익명 읽기용 Supabase 클라이언트.
 * 로그인/세션이 필요 없으면 Auth 스토리지 없이 사용한다.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error('Supabase is not configured (EXPO_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY).');
  }

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export { isSupabaseConfigured };
