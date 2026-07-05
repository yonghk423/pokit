/** 알라딘 OpenAPI 베이스 URL */
export const ALADIN_OPEN_API_BASE = 'https://www.aladin.co.kr/ttb/api';

/** 알라딘 이용 조건 — UI 출처 표기 문구 */
export const ALADIN_ATTRIBUTION_LABEL =
  '도서 DB 제공 : 알라딘 인터넷서점(www.aladin.co.kr)';

export function getAladinTtbKey(): string | null {
  const key = process.env.EXPO_PUBLIC_ALADIN_TTB_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function isAladinApiConfigured(): boolean {
  return getAladinTtbKey() != null;
}
