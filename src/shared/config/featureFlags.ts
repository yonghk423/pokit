/** 임시 보류 기능. 퍼즐을 다시 공개할 때 puzzle을 true로 바꾼다.
 * 저장된 사진·진행 기록은 유지하며 메뉴, 가이드, 직접 접근과 자동 동기화만 중단한다.
 */
export const FEATURE_FLAGS = {
  puzzle: false,
  /** 루틴 템플릿은 기능과 데이터를 보존한 채 탭을 숨긴다. */
  routineTemplates: false,
  /** 오늘의 한 줄은 데이터·설정을 보존한 채 임시로 숨긴다. */
  dailyQuote: false,
};
