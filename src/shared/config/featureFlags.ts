/** 임시 보류 기능. 퍼즐을 다시 공개할 때 puzzle을 true로 바꾼다.
 * 저장된 사진·진행 기록은 유지하며 메뉴, 가이드, 직접 접근과 자동 동기화만 중단한다.
 */
export const FEATURE_FLAGS = {
  /** 오늘 화면의 원형·기본 리스트 보기를 임시로 숨긴다. */
  circularRoutineLayout: false,
  basicRoutineListLayout: false,
  /** 오늘 화면의 날짜 헤더 줄을 임시로 숨긴다. */
  dailyPlanDateHeader: false,
  /**
   * 하루 시작·마무리 시간 설정과 종료 시각 기반 추가 제한.
   * 화면·저장·계산 코드는 유지하고, false면 시간 제한 게이트와 프리패치가 꺼진다.
   */
  dailyRhythmWindow: false,
  /** 잠금화면 메모는 기능·저장 내용을 유지하고 상단 진입 아이콘만 임시로 숨긴다. */
  quickMemoShortcut: false,
  /** 오늘 노트는 기능·저장 내용을 유지하고 상단 진입 아이콘만 임시로 숨긴다. */
  dayNoteShortcut: false,
  puzzle: false,
  /** 루틴 템플릿은 기능과 데이터를 보존한 채 탭을 숨긴다. */
  routineTemplates: false,
  /** 오늘의 한 줄은 데이터·설정을 보존한 채 임시로 숨긴다. */
  dailyQuote: false,
  /**
   * 카드 루틴 시간 표시·편집을 임시로 끈다.
   * 스케줄 데이터·모달·콜백 코드는 유지하고, 카드 UI만 가린다.
   */
  cardRoutineTimeEdit: false,
  /**
   * 하단 「오늘의 주인공」(루틴 관리) 탭을 임시로 숨긴다.
   * FixedRoutinePage·카탈로그·저장 데이터는 유지한다.
   */
  routinesManageTab: false,
};
