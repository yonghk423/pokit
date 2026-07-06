/** 버전별 업데이트 안내 문구. 스토어 배포마다 추가합니다. */
const RELEASE_NOTE_HIGHLIGHTS: Record<string, string[]> = {
  '1.6.0': [
    '루틴 아이콘·색상이 목표 상세 설정에 올바르게 표시돼요.',
    '오늘 일정에서 루틴을 완전히 종료할 수 있어요.',
    '노트·투두 리스트 등 화면 사용성을 다듬었어요.',
  ],
  '1.5.0': [
    'City Pop 미니멀 스타일로 화면 디자인을 새롭게 정리했어요.',
    '플랫·직각 UI와 새 타이포그래피로 가독성을 높였어요.',
    '잠금화면 메모 입력 글자 크기를 조정했어요.',
  ],
  '1.4.2': ['앱 안정성과 사용 경험을 개선했어요.'],
};

const DEFAULT_HIGHLIGHTS = ['앱 안정성과 사용 경험을 개선했어요.'];

export function resolveReleaseNoteHighlights(version: string): string[] {
  const highlights = RELEASE_NOTE_HIGHLIGHTS[version];
  if (!highlights || highlights.length === 0) return DEFAULT_HIGHLIGHTS;
  return highlights;
}
