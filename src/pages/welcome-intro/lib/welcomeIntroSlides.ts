/**
 * 첫 사용자용 서비스 소개 슬라이드 (짧게 핵심만).
 * 자세한 탭·버튼 안내는 사용 설명서(`guide-book`)로.
 */

export type WelcomeIntroSlide = {
  id: string;
  title: string;
  body: string;
  /** 마지막 장 등 — 본문과 구분되는 추가 안내 */
  note?: string;
};

export const WELCOME_INTRO_SLIDES: readonly WelcomeIntroSlide[] = [
  {
    id: 'welcome',
    title: 'POKIT에 오신 것을 환영해요',
    body: '하루의 루틴을 가볍게 담고, 집중할 시간을 스스로 정해 가는 앱이에요.',
  },
  {
    id: 'today',
    title: '오늘은 담아 두고 이어가요',
    body: '오늘 할 루틴을 모아 두고, 목록·시간대처럼 편한 방식으로 하루를 볼 수 있어요.',
  },
  {
    id: 'routines',
    title: '루틴을 만들고 묶어 둘 수 있어요',
    body: '자주 쓰는 루틴을 만들고, 그룹으로 묶어 두면 필요할 때 오늘에 맞춰 꺼내 쓸 수 있어요.',
  },
  {
    id: 'modes',
    title: '노트·투두·독서도 함께해요',
    body: '짧게 메모하고, 할 일을 정리하고, 독서 목표를 다루는 기능도 한곳에 있어요.',
  },
  {
    id: 'next',
    title: '기록하고, 필요할 때 더 읽어요',
    body: '완료한 루틴은 「히스토리」에 쌓여요.',
    note: '자세한 가이드는 상단 설정 → 「사용 설명서」에서 언제든 다시 볼 수 있어요.',
  },
] as const;
