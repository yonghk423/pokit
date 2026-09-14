import type { AppLocale } from '@shared/lib/i18n';

/** POKIT 공식 웹사이트 (WebView 탭 기본 오리진) */
export const POKIT_STORY_URL = 'https://www.pokitstory.com';

/** WebView 내에서 그대로 열 허용 도메인 */
export const POKIT_STORY_ALLOWED_HOST_SUFFIXES = ['pokitstory.com'] as const;

/** 앱 언어와 같은 경로로 연다. `/`만 열면 사이트가 영어 HTML을 먼저 준다. */
export function resolvePokitStoryUrl(locale: AppLocale): string {
  if (locale === 'ko') return `${POKIT_STORY_URL}/ko`;
  if (locale === 'ja') return `${POKIT_STORY_URL}/ja`;
  return `${POKIT_STORY_URL}/en`;
}
