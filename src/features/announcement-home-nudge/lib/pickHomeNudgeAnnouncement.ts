import type { Announcement } from '@entities/announcement';
import { compareAppVersions } from '@shared/lib/app-version/compareAppVersions';

const VERSION_IN_TEXT_RE = /(\d+\.\d+\.\d+(?:[.-]\w+)?)/;

/** 제목·본문에서 x.y.z 형태 버전을 뽑는다 (예: POKIT 1.9.4 업데이트). */
export function extractAnnouncementVersion(text: string): string | null {
  const match = text.match(VERSION_IN_TEXT_RE);
  return match?.[1] ?? null;
}

function isHomeNudgePriority(priority: Announcement['priority']): boolean {
  return priority === 'important' || priority === 'force';
}

type VersionedAnnouncement = {
  item: Announcement;
  version: string;
};

/**
 * 오늘 탭·앱스토어 연동 안내용.
 * - important/force 중 제목에 버전(x.y.z)이 있는 것만 후보
 * - **버전 숫자가 가장 큰 1건**만 (semver 비교)
 * - 그 한 건이 이미 읽음이면 안내하지 않음 (옛 미읽음 폴백 없음)
 * - 설정 → 새소식 목록은 전체 누적(이 함수와 무관)
 */
export function pickHomeNudgeAnnouncement(
  items: Announcement[],
  readIds: ReadonlySet<string>,
): Announcement | null {
  let best: VersionedAnnouncement | null = null;
  for (const item of items) {
    if (!isHomeNudgePriority(item.priority)) continue;
    const version = extractAnnouncementVersion(item.title);
    if (!version) continue;
    if (
      !best ||
      compareAppVersions(version, best.version) > 0 ||
      (compareAppVersions(version, best.version) === 0 &&
        item.publishedAt.localeCompare(best.item.publishedAt) > 0)
    ) {
      best = { item, version };
    }
  }
  if (!best) return null;
  if (readIds.has(best.item.id)) return null;
  return best.item;
}

/** 본문 첫 줄을 한 줄 미리보기로 (불릿·공백 정리) */
export function announcementBodyPreview(body: string, maxLen = 96): string {
  const firstLine = body
    .split(/\n/)
    .map((line) => line.replace(/^[•·\-\s]+/, '').trim())
    .find((line) => line.length > 0);
  if (!firstLine) return '';
  if (firstLine.length <= maxLen) return firstLine;
  return `${firstLine.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}
