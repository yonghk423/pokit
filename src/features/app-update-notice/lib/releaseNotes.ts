/** 버전별 업데이트 안내 문구. 스토어 배포마다 추가합니다. */
const RELEASE_NOTE_HIGHLIGHTS: Record<string, string[]> = {
  '1.4.2': ['앱 안정성과 사용 경험을 개선했어요.'],
};

const DEFAULT_HIGHLIGHTS = ['앱 안정성과 사용 경험을 개선했어요.'];

export function resolveReleaseNoteHighlights(version: string): string[] {
  const highlights = RELEASE_NOTE_HIGHLIGHTS[version];
  if (!highlights || highlights.length === 0) return DEFAULT_HIGHLIGHTS;
  return highlights;
}
