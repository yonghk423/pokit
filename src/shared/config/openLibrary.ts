/** Open Library Search API — https://openlibrary.org/developers/api */
export const OPEN_LIBRARY_SEARCH_API = 'https://openlibrary.org/search.json';
export const OPEN_LIBRARY_BOOKS_API = 'https://openlibrary.org';
export const OPEN_LIBRARY_COVERS_BASE = 'https://covers.openlibrary.org/b/id';

/** Open Library 이용 조건 — UI 출처 표기 문구 */
export const OPEN_LIBRARY_ATTRIBUTION_LABEL =
  '도서 DB 제공 : Open Library (openlibrary.org)';

export function getOpenLibraryContactEmail(): string | null {
  const email = process.env.EXPO_PUBLIC_OPEN_LIBRARY_CONTACT_EMAIL?.trim();
  return email && email.includes('@') ? email : null;
}

/** Rate limit 완화용 User-Agent — https://openlibrary.org/developers/api */
export function buildOpenLibraryUserAgent(): string {
  const email = getOpenLibraryContactEmail();
  if (email) return `POKIT (${email})`;
  return 'POKIT';
}

export function openLibraryCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
  return `${OPEN_LIBRARY_COVERS_BASE}/${coverId}-${size}.jpg`;
}

export function openLibraryWebUrl(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return 'https://openlibrary.org';
  if (trimmed.startsWith('http')) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${OPEN_LIBRARY_BOOKS_API}${path}`;
}
