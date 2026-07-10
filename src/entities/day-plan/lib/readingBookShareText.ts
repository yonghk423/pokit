import {
  deriveReadingBookProgress,
  ensureReadingBookPages,
  normalizeReadingBookStatus,
  type ReadingBookEntry,
  type ReadingBookStatus,
} from './readingLiveActivityConfig';
import {
  readingBookShareLinkLabel,
  resolveReadingBookAuthor,
  resolveReadingBookCatalogSource,
  resolveReadingBookExternalLink,
  resolveReadingBookTotalPages,
} from './readingBookCatalog';

const STATUS_LABEL_KO: Record<ReadingBookStatus, string> = {
  want: '읽고 싶은',
  reading: '읽는 중',
  done: '완료',
};

/** 도서 1권 — 시스템 공유용 평문 */
export function readingBookEntryToShareText(entry: ReadingBookEntry): string {
  const resolved = ensureReadingBookPages(entry);
  const status = normalizeReadingBookStatus(resolved.status);
  const totalPages = resolveReadingBookTotalPages(resolved);
  const { pagesRead, progressPct } = deriveReadingBookProgress({
    startPage: resolved.startPage,
    targetPage: resolved.targetPage,
    totalPages,
  });

  const lines: string[] = [resolved.title];

  const author = resolveReadingBookAuthor(resolved);
  if (author) lines.push(`저자: ${author}`);

  lines.push(`상태: ${STATUS_LABEL_KO[status]}`);
  lines.push(`오늘 목표: ${resolved.startPage}P → ${resolved.targetPage}P (${pagesRead}쪽)`);

  if (totalPages != null) {
    lines.push(`전체: ${totalPages}쪽 · 진행 ${progressPct}%`);
  }

  const memo = resolved.memo?.trim();
  if (memo) lines.push(`메모: ${memo}`);

  const link = resolveReadingBookExternalLink(resolved);
  const linkLabel = readingBookShareLinkLabel(resolveReadingBookCatalogSource(resolved));
  if (link && linkLabel) lines.push(`${linkLabel}: ${link}`);

  return lines.join('\n');
}
