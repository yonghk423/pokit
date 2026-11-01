export const YOURDAY_AI_DAILY_LIMIT = 1;
export const YOURDAY_AI_MAX_REQUEST_IMAGES = 3;
export const YOURDAY_AI_UNLIMITED = 100000;

/** Only the local development bundle may send this narrowly scoped credential. */
export function getYourdayAiDevelopmentHeaders(): Record<string, string> {
  if (!__DEV__) return {};
  const token = process.env.EXPO_PUBLIC_YOURDAY_AI_DEV_TOKEN?.trim();
  return token ? { 'x-yourday-dev-token': token } : {};
}
