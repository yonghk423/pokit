import type { AppLocale } from '@shared/lib/i18n';

/** POKIT 공식 웹사이트 (WebView 탭 기본 오리진) */
export const POKIT_STORY_URL = 'https://www.pokitstory.com';

/** WebView 내에서 그대로 열 허용 도메인 */
export const POKIT_STORY_ALLOWED_HOST_SUFFIXES = ['pokitstory.com'] as const;

/** Open only the dedicated Your Day diary and notes section in the app story tab. */
export function resolvePokitStoryUrl(locale: AppLocale): string {
  const webLocale = locale === 'ko' ? 'ko' : locale === 'ja' ? 'ja' : 'en';
  return `${POKIT_STORY_URL}/${webLocale}/app/yourday-story?pokit_app=1`;
}
