import {
  deriveReadingBookProgress,
  ensureReadingBookPages,
  normalizeReadingBookStatus,
  type ReadingBookEntry,
  type ReadingBookStatus,
} from './readingLiveActivityConfig';

const STATUS_LABEL_KO: Record<ReadingBookStatus, string> = {
  want: '읽고 싶은',
  reading: '읽는 중',
  done: '완료',
};

/** 도서 1권 — 시스템 공유용 평문 */
export function readingBookEntryToShareText(entry: ReadingBookEntry): string {
  const resolved = ensureReadingBookPages(entry);
  const status = normalizeReadingBookStatus(resolved.status);
  const totalPages =
    typeof resolved.aladin?.totalPages === 'number' && resolved.aladin.totalPages > 0
      ? resolved.aladin.totalPages
      : null;
  const { pagesRead, progressPct } = deriveReadingBookProgress({
    startPage: resolved.startPage,
    targetPage: resolved.targetPage,
    totalPages,
  });

  const lines: string[] = [resolved.title];

  const author = resolved.aladin?.author?.trim();
  if (author) lines.push(`저자: ${author}`);

  lines.push(`상태: ${STATUS_LABEL_KO[status]}`);
  lines.push(`오늘 목표: ${resolved.startPage}P → ${resolved.targetPage}P (${pagesRead}쪽)`);

  if (totalPages != null) {
    lines.push(`전체: ${totalPages}쪽 · 진행 ${progressPct}%`);
  }

  const memo = resolved.memo?.trim();
  if (memo) lines.push(`메모: ${memo}`);

  const link = resolved.aladin?.link?.trim();
  if (link) lines.push(`알라딘: ${link}`);

  return lines.join('\n');
}
