/** 버전별 업데이트 안내 문구. 스토어 배포마다 추가합니다. */
const RELEASE_NOTE_HIGHLIGHTS: Record<string, string[]> = {
  '1.6.3': [
    '루틴·나만의 루틴 탭 구성을 정리하고 기본 루틴은 삭제할 수 없게 했어요.',
    '오늘 일정 타임라인에서 현재 진행 중인 블록을 더 잘 볼 수 있어요.',
    '내 서재에서 목록 검색과 최신순·오래된순 정렬을 쓸 수 있어요.',
  ],
  '1.6.2': [
    '홈 화면 위젯에 담기 목록 아이콘이 앱과 같게 표시돼요.',
    '위젯 완료 색상을 앱 브랜드 컬러에 맞췄어요.',
    '새 루틴 만들기에서 키보드가 올라와도 다음 버튼이 가려지지 않아요.',
  ],
  '1.6.1': [
    '투두 리스트를 상단 모드에서 바로 열 수 있어요.',
    '노트·루틴 중요도·타임라인 UI를 다듬었어요.',
  ],
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
