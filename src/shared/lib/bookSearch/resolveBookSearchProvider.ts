const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/;

export function containsHangul(text: string): boolean {
  return HANGUL_RE.test(text);
}

export type BookSearchProvider = 'aladin' | 'openlibrary';

/** 검색어 스크립트 기준 provider — 한글은 알라딘, 그 외 Open Library */
export function resolveBookSearchProvider(query: string): BookSearchProvider {
  if (containsHangul(query)) return 'aladin';
  return 'openlibrary';
}

export function bookSearchProviderLabel(provider: BookSearchProvider): string {
  return provider === 'aladin' ? '알라딘' : 'Open Library';
}

export function isBookSearchAvailable(provider: BookSearchProvider, aladinConfigured: boolean): boolean {
  if (provider === 'aladin') return aladinConfigured;
  return true;
}
