/**
 * POKIT 사용 설명서 — 실제 구현과 맞춘 탭·버튼 안내 (읽기 전용).
 */

export type GuideBookCallout = {
  n: number;
  label: string;
  detail: string;
};

export type GuideBookFigureId =
  | 'tabs-map'
  | 'chrome-modes'
  | 'today-overview'
  | 'today-window'
  | 'today-layouts'
  | 'today-add-row'
  | 'today-autofocus'
  | 'routine-list'
  | 'routine-templates'
  | 'my-routine'
  | 'my-routine-apply'
  | 'history'
  | 'story'
  | 'settings';

export type GuideBookPage = {
  id: string;
  chapter: string;
  title: string;
  lead?: string;
  figureId: GuideBookFigureId;
  callouts: readonly GuideBookCallout[];
  notes?: readonly string[];
};

export const GUIDE_BOOK_PAGES: readonly GuideBookPage[] = [
  {
    id: 'cover',
    chapter: 'POKIT',
    title: '하단 탭 지도',
    lead: '화면 아래에 다섯 개의 아이콘 탭이 있어요. 글자 라벨 없이 아이콘만 보이며, 순서와 역할은 아래와 같아요.',
    figureId: 'tabs-map',
    callouts: [
      { n: 1, label: '오늘', detail: '오늘 할 루틴을 담고, 집중 구간 안에서 목록으로 보는 메인 화면이에요.' },
      { n: 2, label: '루틴', detail: '루틴과 묶음을 만들고 정리하는 관리 화면이에요. 오늘에 바로 적용하는 곳이 아니에요.' },
      { n: 3, label: '나만의 루틴', detail: '그룹을 모아 두고 「적용하기」로 오늘 담기에 반영하는 화면이에요.' },
      { n: 4, label: '히스토리', detail: '완료한 루틴을 주간·월간으로 모아 봐요.' },
      { n: 5, label: '스토리', detail: '공식 글을 읽고, 글의 루틴을 내 목록에 저장할 수 있어요.' },
    ],
  },
  {
    id: 'chrome',
    chapter: '공통',
    title: '상단 모드와 설정',
    lead: '스토리 탭을 제외한 메인 탭 위쪽에 모드 아이콘과 설정이 있어요. 다른 탭에 있어도 데일리 외 모드를 고르면 오늘 탭으로 이동해요.',
    figureId: 'chrome-modes',
    callouts: [
      { n: 1, label: '데일리', detail: '오늘 담기·집중의 기본 화면으로 돌아와요.' },
      { n: 2, label: '잠금화면 메모', detail: '잠금화면에 표시할 짧은 메모를 적어요.' },
      { n: 3, label: '노트', detail: '노트 문서를 작성해요. 입력한 내용은 자동으로 저장돼요.' },
      { n: 4, label: '독서', detail: '독서(서재) 설정을 바로 편집해요.' },
      { n: 5, label: '설정', detail: '시작·마무리, 사용 설명서, 알림, 오늘 탭 보기, 화면 테마, 문의, 데이터 초기화로 가요.' },
    ],
    notes: ['스토리 탭에는 이 상단 모드 줄이 없어요.'],
  },
  {
    id: 'today-overview',
    chapter: '오늘 탭',
    title: '오늘 탭 화면',
    lead: '오늘 집중할 루틴을 담아 두고, 집중 구간 안에서 목록으로 보는 화면이에요.',
    figureId: 'today-overview',
    callouts: [
      { n: 1, label: '날짜·집중 구간', detail: '오늘 날짜와 하루 시작~마무리(집중 구간)가 보여요. 구간 시각을 누르면 바꿀 수 있어요.' },
      {
        n: 2,
        label: '목록 · 투두',
        detail:
          '헤더 오른쪽에 목록 아이콘과 투두 아이콘이 있어요. 투두를 누르면 할 일 화면으로 바로 갈 수 있어요.',
      },
      { n: 3, label: '담기 영역', detail: '비어 있으면 「담기 목록이 비어 있어요」「오늘 할 루틴을 추가해 주세요」와 「루틴 추가」가 보여요.' },
      { n: 4, label: '하단 「오늘」탭', detail: '달력 아이콘이 선택된 상태예요.' },
    ],
    notes: [
      '처음 앱을 켜면 「내 하루 일과 정하기」가 나와 시작·마무리를 정한 뒤 「시작하기」를 눌러요. 이후에는 설정 → 시작·마무리에서 「저장」으로 바꿔요.',
    ],
  },
  {
    id: 'today-window',
    chapter: '오늘 탭',
    title: '집중 구간 · 날짜',
    lead: '헤더의 시각 표시와 날짜로 「오늘」의 범위를 정해요.',
    figureId: 'today-window',
    callouts: [
      { n: 1, label: '집중 구간 시각', detail: '누르면 시작·종료 시각을 고르는 화면이 열려요. 자정·오전/오후·다음날로 맞출 수 있어요.' },
      { n: 2, label: '설정 완료', detail: '오늘 탭에서 고른 시각을 반영하고 닫아요. (설정 화면에서는 같은 시각 UI의 버튼이 「저장」이에요.)' },
      { n: 3, label: '당일 / 다음 날', detail: '마무리가 시작보다 이르면 다음날로 이어지는 하루로 이해해요. 온보딩·설정에서 명시할 수도 있어요.' },
      { n: 4, label: '적용 기간', detail: '달력에서 시작일·끝일을 고르고 「오늘」「초기화」「설정 완료」로 맞출 수 있어요.' },
    ],
  },
  {
    id: 'today-layouts',
    chapter: '오늘 탭',
    title: '목록 보기',
    lead: '담은 루틴을 한 줄 목록으로 봐요.',
    figureId: 'today-layouts',
    callouts: [
      { n: 1, label: '목록', detail: '담은 루틴을 한 줄 목록으로 봐요. 「루틴 추가」「루틴 더 추가」로 담아요.' },
      {
        n: 2,
        label: '투두 바로가기',
        detail: '목록 아이콘 오른쪽 투두 아이콘을 누르면 할 일 화면으로 바로 이동해요.',
      },
    ],
  },
  {
    id: 'today-add-row',
    chapter: '오늘 탭',
    title: '루틴 추가와 행 버튼',
    lead: '「루틴 추가」를 누르면 고를 수 있는 루틴 목록(피커)이 열려요.',
    figureId: 'today-add-row',
    callouts: [
      { n: 1, label: '루틴 추가 / 연결', detail: '여러 개를 골라 한 번에 담아요. 「새로운 루틴 만들기」로 새 루틴을 만들 수도 있어요.' },
      { n: 2, label: '중요도', detail: '행에서 높음 → 보통 → 낮음 순으로 바뀌어요.' },
      { n: 3, label: '완료 표시', detail: '집중 전후에도 완료/취소를 눌러요.' },
      { n: 4, label: '설정', detail: '슬라이더 아이콘을 누르면 해당 루틴의 상세 설정(목표 상세)으로 가요.' },
      {
        n: 5,
        label: '길게 누르기 · 종료',
        detail:
          '담기가 2개 이상이면 길게 눌러 순서를 바꿔요. 집중이 시작된 뒤에는 「종료」로 오늘 담기에서 그 항목을 빼요.',
      },
    ],
  },
  {
    id: 'today-autofocus',
    chapter: '오늘 탭',
    title: '자동 집중 · 구간 종료',
    lead: '오늘 탭에는 따로 「시작하기」버튼이 없어요. 담기와 집중 구간이 핵심이에요.',
    figureId: 'today-autofocus',
    callouts: [
      {
        n: 1,
        label: '담으면 집중 시작',
        detail:
          '담기에 루틴이 생기면 오늘 탭의 집중이 자동으로 시작돼요. (별도 시작 버튼을 누르지 않아요.)',
      },
      {
        n: 2,
        label: '구간이 끝날 때',
        detail: '집중 구간이 끝나면 담기와 집중 상태가 정리되고, 미완료 흐름이 마무리되며 히스토리에 남을 수 있어요.',
      },
      {
        n: 3,
        label: '담기 유지',
        detail:
          '설정 → 시작·마무리에서 「하루가 지나면 담기 유지」를 켜면 담기를 더 오래 남겨 둘 수 있어요.',
      },
      {
        n: 4,
        label: '적용과의 연동',
        detail: '나만의 루틴에서 「적용하기」를 켜 두면 오늘 담기·구간에 맞춰 반영돼요.',
      },
    ],
  },
  {
    id: 'routine-list',
    chapter: '루틴 탭',
    title: '루틴 목록',
    lead: '루틴을 만들고 묶는 관리 화면이에요. 오늘 담기에 바로 적용하는 곳은 「나만의 루틴」탭이에요.',
    figureId: 'routine-list',
    callouts: [
      { n: 1, label: '루틴 목록 / 루틴 템플릿', detail: '목록은 제작·관리, 템플릿은 방식별 화면 구성을 미리 보는 곳이에요.' },
      { n: 2, label: '「+」버튼', detail: '「무엇을 만들까요?」에서 「새 루틴」또는 「새 묶음」을 골라요.' },
      { n: 3, label: '루틴 행', detail: '누르면 해당 루틴의 상세 설정으로 들어가요.' },
      {
        n: 4,
        label: '묶음·항목',
        detail:
          '묶음(예: 건강 루틴, 생산성을 높이는 도구)은 이름·설명 편집·삭제를 할 수 있어요. 항목은 다른 묶음으로 옮기거나, 종류에 따라 숨기기·삭제가 가능해요.',
      },
    ],
  },
  {
    id: 'routine-templates',
    chapter: '루틴 탭',
    title: '루틴 템플릿',
    lead: '항목을 눌러 방식별 화면 구성을 확인할 수 있어요. 새 루틴을 만들 때도 이 방식 중에서 고르요.',
    figureId: 'routine-templates',
    callouts: [
      { n: 1, label: '할 일 체크', detail: '할 일을 하나씩 체크해요.' },
      { n: 2, label: '간단한 메모', detail: '자유롭게 메모를 적어요.' },
      { n: 3, label: '값 기록', detail: '숫자·값을 꾸준히 기록해요.' },
      { n: 4, label: '횟수 채우기', detail: '목표 횟수를 채워요.' },
      { n: 5, label: '시간 알림', detail: '알림 시간에 맞춰 완료해요.' },
    ],
  },
  {
    id: 'my-routine',
    chapter: '나만의 루틴 탭',
    title: '나만의 루틴 화면',
    lead: '그룹에 루틴을 모아 두고, 그룹마다 「적용하기」로 오늘 담기에 반영하는 화면이에요.',
    figureId: 'my-routine',
    callouts: [
      {
        n: 1,
        label: '보기',
        detail:
          '오늘 탭과 같은 목록 보기를 써요. 여기서 바꾸면 오늘 탭 보기도 함께 바뀌고, 적용은 보기마다 따로 기억돼요.',
      },
      { n: 2, label: '나만의 루틴', detail: '직접 만든 그룹이에요. 「그룹 추가」로 늘려요.' },
      {
        n: 3,
        label: '고정 루틴',
        detail:
          '「데일리 루틴」(매일)·「주말 루틴」(토·일)이 기본으로 있어요. 이름은 바꿀 수 없어요.',
      },
      {
        n: 4,
        label: '적용하기',
        detail:
          '그룹 헤더의 「적용하기」로 켜 둔 항목만 오늘 담기에 반영해요. 켜져 있으면 「적용 중」이고, 다시 눌러 끌 수 있어요.',
      },
    ],
  },
  {
    id: 'my-routine-apply',
    chapter: '나만의 루틴 탭',
    title: '적용하기',
    lead: '그룹·항목을 정리한 뒤 「적용하기」를 누르면 오늘 담기에 반영돼요.',
    figureId: 'my-routine-apply',
    callouts: [
      {
        n: 1,
        label: '목록',
        detail: '그룹·항목을 정리한 뒤 적용해요.',
      },
      {
        n: 2,
        label: '항목 켜기·추가',
        detail: '스위치로 넣을 항목을 고르고, 「새 항목 추가」로 구성해요.',
      },
    ],
    notes: [
      '집중 구간이 끝나면 「적용하기」가 흐려지고, 누르면 「집중 시간이 끝났어요」안내가 나와요. 오늘 탭에서 집중 시간을 바꾼 뒤 다시 적용하세요.',
      '주말 루틴은 적용을 켜 두면 토·일에 오늘 탭에 자동으로 반영돼요.',
    ],
  },
  {
    id: 'history',
    chapter: '히스토리 탭',
    title: '히스토리',
    lead: '오늘 탭에서 완료한 루틴을 주간·월간으로 모아 봐요.',
    figureId: 'history',
    callouts: [
      { n: 1, label: '주간 / 월간', detail: '버튼을 눌러 보기를 바꿔요.' },
      { n: 2, label: '이전 · 다음', detail: '주 또는 달을 이동해요. 미래로는 넘어가지 않아요.' },
      {
        n: 3,
        label: '요약 카드',
        detail:
          '진행 %, 「N일 / M일 중 활동 · 총 X회 완료」, 가장 많이 한 루틴이 보여요. 주간은 「이번 주 요약」, 월간은 「이번 달 요약」이에요.',
      },
      { n: 4, label: '루틴별 기록', detail: '완료 기록을 카드로 확인해요. 없으면 오늘 탭에서 완료하면 쌓여요.' },
    ],
  },
  {
    id: 'story',
    chapter: '스토리 탭',
    title: '스토리',
    lead: '공식 스토리 글을 앱에서 읽고 루틴으로 저장해요. 이 탭에는 상단 모드 줄이 없어요.',
    figureId: 'story',
    callouts: [
      { n: 1, label: '웹 본문', detail: '글을 스크롤하며 읽어요.' },
      {
        n: 2,
        label: '저장 시트',
        detail: '글에서 저장을 요청하면 제목·요약·시간·단계와 「저장할 카테고리」를 고르는 시트가 열려요.',
      },
      { n: 3, label: '루틴에 저장', detail: '내 루틴 목록에 넣어요. 이미 저장한 글이면 내용이 업데이트될 수 있어요.' },
    ],
  },
  {
    id: 'settings',
    chapter: '설정',
    title: '설정 화면',
    lead: '상단 설정 아이콘으로 들어가요. 섹션은 데이플랜 · 알림 · 화면 · 고객센터 · 데이터로 나뉘어요.',
    figureId: 'settings',
    callouts: [
      {
        n: 1,
        label: '시작·마무리',
        detail: '하루 구간, 하루 시작 알림, 「하루가 지나면 담기 유지」를 설정하고 「저장」해요.',
      },
      {
        n: 2,
        label: 'POKIT 소개 · 사용 설명서',
        detail: '짧은 서비스 소개 슬라이드와, 탭·버튼을 자세히 설명하는 사용 설명서를 다시 열 수 있어요.',
      },
      { n: 3, label: '알림', detail: '알림 화면에서 「미완료 일정 알림」켜기·시각을 설정해요.' },
      {
        n: 4,
        label: '오늘 탭 보기 · 화면 테마',
        detail: '목록 보기와 라이트/다크를 바꿔요.',
      },
      {
        n: 5,
        label: '문의 · 버전 · 초기화',
        detail: '고객센터에서 문의하기·앱 버전을 보고, 데이터에서 앱 데이터를 초기화할 수 있어요. 초기화는 되돌릴 수 없어요.',
      },
    ],
  },
] as const;

export type GuideBookTocSection = {
  chapter: string;
  icon: string;
  subtitle: string;
  pageIndexes: number[];
};

const CHAPTER_META: Record<string, { icon: string; subtitle: string }> = {
  POKIT: { icon: 'calendar', subtitle: '하단 다섯 탭의 역할' },
  공통: { icon: 'gearshape', subtitle: '상단 모드와 설정' },
  '오늘 탭': { icon: 'calendar', subtitle: '목록 · 집중' },
  '루틴 탭': { icon: 'list.bullet.rectangle', subtitle: '만들기 · 관리 · 템플릿' },
  '나만의 루틴 탭': { icon: 'figure.walk', subtitle: '그룹 적용하기' },
  '히스토리 탭': { icon: 'clock.arrow.circlepath', subtitle: '주간 · 월간 기록' },
  '스토리 탭': { icon: 'book', subtitle: '글에서 루틴 저장' },
  설정: { icon: 'gearshape', subtitle: '앱 전반 설정' },
};

/** 목차용 — chapter 순서대로 묶음 */
export function buildGuideBookToc(): GuideBookTocSection[] {
  const order: string[] = [];
  const indexes = new Map<string, number[]>();
  GUIDE_BOOK_PAGES.forEach((page, i) => {
    if (!indexes.has(page.chapter)) {
      order.push(page.chapter);
      indexes.set(page.chapter, []);
    }
    indexes.get(page.chapter)!.push(i);
  });
  return order.map((chapter) => {
    const meta = CHAPTER_META[chapter] ?? { icon: 'book', subtitle: '' };
    return {
      chapter,
      icon: meta.icon,
      subtitle: meta.subtitle,
      pageIndexes: indexes.get(chapter) ?? [],
    };
  });
}
