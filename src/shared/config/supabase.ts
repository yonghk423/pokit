/** Supabase 공개 설정 (URL + publishable key). service_role 은 앱에 두지 않는다. */

export function getSupabaseUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

export function getSupabasePublishableKey(): string | null {
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseUrl() != null && getSupabasePublishableKey() != null;
}
