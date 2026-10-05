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
  const raw = entry.aladin?.author?.trim() || entry.openLibrary?.author?.trim() || '';
  return formatReadingBookAuthorLine(raw);
}

/** 알라딘 「(지은이)·(옮긴이)」표기를 목록용으로 정리 */
export function formatReadingBookAuthorLine(author: string): string {
  return author
    .replace(/\s*[\(（](?:지은이|옮긴이|엮은이|그림|원작)[\)）]/g, '')
    .replace(/\s*,\s*,/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();
}

export function resolveReadingBookCoverUrl(entry: Pick<ReadingBookEntry, 'aladin' | 'openLibrary'>): string {
  return entry.aladin?.coverUrl?.trim() || entry.openLibrary?.coverUrl?.trim() || '';
}

export function resolveReadingBookExternalLink(entry: Pick<ReadingBookEntry, 'aladin' | 'openLibrary'>): string {
  return entry.aladin?.link?.trim() || entry.openLibrary?.link?.trim() || '';
}

function toPositivePageCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/[^\d.]/g, '').trim());
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return null;
}

export function resolveReadingBookTotalPages(
  entry: Pick<ReadingBookEntry, 'aladin' | 'openLibrary'>,
): number | null {
  return (
    toPositivePageCount(entry.aladin?.totalPages) ??
    toPositivePageCount(entry.openLibrary?.totalPages)
  );
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
  const aladinPages = toPositivePageCount(aladin?.totalPages);
  if (aladinPages != null) return aladinPages;
  const openLibraryPages = toPositivePageCount(openLibrary?.totalPages);
  if (openLibraryPages != null) return openLibraryPages;
  return fallback;
}
