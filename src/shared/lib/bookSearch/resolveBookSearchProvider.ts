const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/;

export function containsHangul(text: string): boolean {
  return HANGUL_RE.test(text);
}

export type BookSearchProvider = 'yes24' | 'openlibrary';

/** 검색어 스크립트 기준 provider — 한글은 YES24, 그 외 Open Library */
export function resolveBookSearchProvider(query: string): BookSearchProvider {
  if (containsHangul(query)) return 'yes24';
  return 'openlibrary';
}

export function bookSearchProviderLabel(provider: BookSearchProvider): string {
  return provider === 'yes24' ? 'YES24' : 'Open Library';
}
