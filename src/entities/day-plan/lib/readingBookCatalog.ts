import type { ReadingAladinBook } from './readingAladinBook';
import type { ReadingBookEntry } from './readingLiveActivityConfig';
import type { ReadingOpenLibraryBook } from './readingOpenLibraryBook';

export type ReadingBookCatalogSource = 'aladin' | 'openlibrary' | null;

export function resolveReadingBookCatalogSource(entry: Pick<ReadingBookEntry, 'aladin' | 'openLibrary'>): ReadingBookCatalogSource {
  if (entry.aladin) return 'aladin';
  if (entry.openLibrary) return 'openlibrary';
  return null;
}

export function resolveReadingBookAuthor(entry: Pick<ReadingBookEntry, 'aladin' | 'openLibrary'>): string {
  return entry.aladin?.author?.trim() || entry.openLibrary?.author?.trim() || '';
}

export function resolveReadingBookCoverUrl(entry: Pick<ReadingBookEntry, 'aladin' | 'openLibrary'>): string {
  return entry.aladin?.coverUrl?.trim() || entry.openLibrary?.coverUrl?.trim() || '';
}

export function resolveReadingBookExternalLink(entry: Pick<ReadingBookEntry, 'aladin' | 'openLibrary'>): string {
  return entry.aladin?.link?.trim() || entry.openLibrary?.link?.trim() || '';
}

export function resolveReadingBookTotalPages(
  entry: Pick<ReadingBookEntry, 'aladin' | 'openLibrary'>,
): number | null {
  const aladinPages = entry.aladin?.totalPages;
  if (typeof aladinPages === 'number' && aladinPages > 0) return aladinPages;
  const openLibraryPages = entry.openLibrary?.totalPages;
  if (typeof openLibraryPages === 'number' && openLibraryPages > 0) return openLibraryPages;
  return null;
}

export function readingBookExternalLinkLabel(source: ReadingBookCatalogSource): string | null {
  if (source === 'aladin') return '알라딘에서 보기';
  if (source === 'openlibrary') return 'Open Library에서 보기';
  return null;
}

export function readingBookShareLinkLabel(source: ReadingBookCatalogSource): string | null {
  if (source === 'aladin') return '알라딘';
  if (source === 'openlibrary') return 'Open Library';
  return null;
}

export function defaultTargetPageForCatalogBook(
  aladin: ReadingAladinBook | null,
  openLibrary: ReadingOpenLibraryBook | null,
  fallback: number,
): number {
  const aladinPages = aladin?.totalPages;
  if (typeof aladinPages === 'number' && aladinPages > 0) return aladinPages;
  const openLibraryPages = openLibrary?.totalPages;
  if (typeof openLibraryPages === 'number' && openLibraryPages > 0) return openLibraryPages;
  return fallback;
}
