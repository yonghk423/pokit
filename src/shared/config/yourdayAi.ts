export const YOURDAY_AI_DAILY_LIMIT = 2;
export const YOURDAY_AI_MAX_REQUEST_IMAGES = 3;
export const YOURDAY_AI_UNLIMITED = 100000;

/** Normal user quota is the default, including simulator builds. */
export function getYourdayAiDevelopmentHeaders(): Record<string, string> {
  if (!__DEV__ || process.env.EXPO_PUBLIC_YOURDAY_AI_UNLIMITED !== 'true') return {};
  const token = process.env.EXPO_PUBLIC_YOURDAY_AI_DEV_TOKEN?.trim();
  return token ? { 'x-yourday-dev-token': token } : {};
}
