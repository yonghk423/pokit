import type { AppLocale } from '@shared/lib/i18n/model/locale';

import { getSeedCategoryLabel } from '../seedCatalogConstants';

/** 빠른 메모 마커 — clear 시 로케일 무관하게 인식 */
export const SCREENSHOT_QUICK_MEMO_MARKERS = ['·하루 메모', '·Daily memo', '·一日メモ'] as const;

export type ScreenshotDemoCopy = {
  quickMemoMarker: (typeof SCREENSHOT_QUICK_MEMO_MARKERS)[number];
  quickMemoLines: [string, string, string];
  spineFallbackLabel: string;
  todos: Array<{ what: string; who: string }>;
  reading: {
    displayName: string;
    bookTitle: string;
    summary: string;
    books: Array<{ title: string; memo: string }>;
  };
  healthIntake: {
    displayName: string;
    summary: string;
    doseLabel: string;
  };
  fasting: {
    displayName: string;
    summary: string;
  };
  notes: {
    displayName: string;
    subject: string;
    focusMemo: string;
    summary: string;
    tasks: Array<{ text: string; done: boolean }>;
    pages: Array<{
      title: string;
      blocks: Array<
        | { kind: 'paragraph'; text: string }
        | { kind: 'checklist'; text: string; checked: boolean }
        | { kind: 'bullet'; text: string }
        | { kind: 'numbered'; text: string }
      >;
    }>;
  };
};

const KO: ScreenshotDemoCopy = {
  quickMemoMarker: '·하루 메모',
  quickMemoLines: [
    '오전 — 독서 30쪽, 물 500ml',
    '오후 — 운동·스트레칭, 노트에 아이디어 정리',
    '저녁 — 체중 기록하고 내일 루틴 확인',
  ],
  spineFallbackLabel: '루틴',
  todos: [
    { what: '오전 미팅 자료 정리', who: '나' },
    { what: '장보기 · 저녁 재료', who: '나' },
    { what: '친구에게 회신 보내기', who: '나' },
    { what: '주간 리뷰 초안 쓰기', who: '나' },
    { what: '세탁물 개기', who: '나' },
  ],
  reading: {
    displayName: '독서',
    bookTitle: '데미안',
    summary: '오늘 30쪽 · 112/248',
    books: [
      { title: '데미안', memo: '오늘 112쪽까지' },
      { title: '아토믹 해빗', memo: '다음에 읽을 책' },
      { title: '사피엔스', memo: '완독' },
      { title: '미드나잇 라이브러리', memo: '출퇴근용' },
    ],
  },
  healthIntake: {
    displayName: '건강을 위한 섭취',
    summary: '물 1.2L · 약 아침 완료',
    doseLabel: '종합비타민',
  },
  fasting: {
    displayName: '체중조절',
    summary: '16:8 단식 · 목표까지 -3.2kg',
  },
  notes: {
    displayName: '노트',
    subject: '일상 노트',
    focusMemo: '짧게라도 매일 기록하기',
    summary: '오늘 메모',
    tasks: [
      { text: '아이디어 3개 적기', done: true },
      { text: '내일 루틴 점검', done: false },
    ],
    pages: [
      {
        title: '오늘',
        blocks: [
          {
            kind: 'paragraph',
            text: '아침에 산뜻하게 시작했고, 오후에 운동까지 끝냈다. 저녁엔 노트만 정리하면 충분하다.',
          },
          { kind: 'checklist', text: '물 2L 목표 채우기', checked: false },
          { kind: 'checklist', text: '독서 30쪽', checked: true },
          { kind: 'checklist', text: '스트레칭 10분', checked: false },
          { kind: 'bullet', text: '집중이 잘 되는 시간: 오전 9–11시' },
          { kind: 'bullet', text: '내일은 장보기 전에 루틴부터' },
        ],
      },
      {
        title: '아이디어',
        blocks: [
          { kind: 'paragraph', text: '완벽보다 꾸준함이 우선. 작은 완료를 쌓자.' },
          { kind: 'numbered', text: '주말 루틴을 가볍게 다시 짜기' },
          { kind: 'numbered', text: '독서 리스트에 에세이 추가' },
        ],
      },
    ],
  },
};

const EN: ScreenshotDemoCopy = {
  quickMemoMarker: '·Daily memo',
  quickMemoLines: [
    'Morning — 30 pages read, 500ml water',
    'Afternoon — exercise & stretch, jot ideas in notes',
    'Evening — log weight and check tomorrow’s routines',
  ],
  spineFallbackLabel: 'Routine',
  todos: [
    { what: 'Prep morning meeting notes', who: 'Me' },
    { what: 'Grocery run · dinner ingredients', who: 'Me' },
    { what: 'Reply to a friend', who: 'Me' },
    { what: 'Draft the weekly review', who: 'Me' },
    { what: 'Fold the laundry', who: 'Me' },
  ],
  reading: {
    displayName: 'Reading',
    bookTitle: 'Demian',
    summary: 'Today 30 pages · 112/248',
    books: [
      { title: 'Demian', memo: 'Up to page 112 today' },
      { title: 'Atomic Habits', memo: 'Next up' },
      { title: 'Sapiens', memo: 'Finished' },
      { title: 'The Midnight Library', memo: 'Commute read' },
    ],
  },
  healthIntake: {
    displayName: 'Health intake',
    summary: 'Water 1.2L · morning dose done',
    doseLabel: 'Multivitamin',
  },
  fasting: {
    displayName: 'Weight control',
    summary: '16:8 fasting · −3.2kg to goal',
  },
  notes: {
    displayName: 'Notes',
    subject: 'Daily notes',
    focusMemo: 'Write a little every day',
    summary: "Today's memo",
    tasks: [
      { text: 'Jot 3 ideas', done: true },
      { text: 'Check tomorrow’s routines', done: false },
    ],
    pages: [
      {
        title: 'Today',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Started fresh this morning and finished a workout later. Tidying notes tonight is enough.',
          },
          { kind: 'checklist', text: 'Hit the 2L water goal', checked: false },
          { kind: 'checklist', text: 'Read 30 pages', checked: true },
          { kind: 'checklist', text: 'Stretch 10 minutes', checked: false },
          { kind: 'bullet', text: 'Best focus window: 9–11 AM' },
          { kind: 'bullet', text: 'Tomorrow: routines before grocery shopping' },
        ],
      },
      {
        title: 'Ideas',
        blocks: [
          { kind: 'paragraph', text: 'Consistency over perfection. Stack small wins.' },
          { kind: 'numbered', text: 'Lightly rework the weekend routine' },
          { kind: 'numbered', text: 'Add an essay to the reading list' },
        ],
      },
    ],
  },
};

const JA: ScreenshotDemoCopy = {
  quickMemoMarker: '·一日メモ',
  quickMemoLines: [
    '午前 — 読書30ページ、水500ml',
    '午後 — 運動・ストレッチ、ノートにアイデア整理',
    '夜 — 体重を記録し、明日のルーチンを確認',
  ],
  spineFallbackLabel: 'ルーチン',
  todos: [
    { what: '午前ミーティング資料を整理', who: '自分' },
    { what: '買い物 · 夕食の材料', who: '自分' },
    { what: '友人に返信する', who: '自分' },
    { what: '週間レビューの下書き', who: '自分' },
    { what: '洗濯物をたたむ', who: '自分' },
  ],
  reading: {
    displayName: '読書',
    bookTitle: 'デミアン',
    summary: '今日30ページ · 112/248',
    books: [
      { title: 'デミアン', memo: '今日112ページまで' },
      { title: 'アトミック・ハビッツ', memo: '次に読む本' },
      { title: 'サピエンス', memo: '読了' },
      { title: 'ミッドナイト・ライブラリ', memo: '通勤用' },
    ],
  },
  healthIntake: {
    displayName: '健康のための摂取',
    summary: '水1.2L · 朝の服薬完了',
    doseLabel: 'マルチビタミン',
  },
  fasting: {
    displayName: '体重管理',
    summary: '16:8断食 · 目標まで −3.2kg',
  },
  notes: {
    displayName: 'ノート',
    subject: '日常ノート',
    focusMemo: '短くても毎日記録する',
    summary: '今日のメモ',
    tasks: [
      { text: 'アイデアを3つ書く', done: true },
      { text: '明日のルーチンを点検', done: false },
    ],
    pages: [
      {
        title: '今日',
        blocks: [
          {
            kind: 'paragraph',
            text: '朝はすっきり始め、午後は運動まで終えた。夜はノート整理だけで十分。',
          },
          { kind: 'checklist', text: '水2L目標を達成する', checked: false },
          { kind: 'checklist', text: '読書30ページ', checked: true },
          { kind: 'checklist', text: 'ストレッチ10分', checked: false },
          { kind: 'bullet', text: '集中しやすい時間: 午前9–11時' },
          { kind: 'bullet', text: '明日は買い物の前にルーチンから' },
        ],
      },
      {
        title: 'アイデア',
        blocks: [
          { kind: 'paragraph', text: '完璧より継続。小さな完了を積み上げる。' },
          { kind: 'numbered', text: '週末ルーチンを軽く組み直す' },
          { kind: 'numbered', text: '読書リストにエッセイを追加' },
        ],
      },
    ],
  },
};

const BY_LOCALE: Record<AppLocale, ScreenshotDemoCopy> = {
  ko: KO,
  en: EN,
  ja: JA,
};

export function getScreenshotDemoCopy(locale: AppLocale): ScreenshotDemoCopy {
  return BY_LOCALE[locale] ?? EN;
}

/** 스크린샷 타임라인 블록용 표시명 */
export function getScreenshotSpineLabel(categoryKey: string, locale: AppLocale): string {
  const labeled = getSeedCategoryLabel(categoryKey, locale);
  if (labeled !== categoryKey) return labeled;
  return getScreenshotDemoCopy(locale).spineFallbackLabel;
}

export function isScreenshotQuickMemoMarker(text: string): boolean {
  return SCREENSHOT_QUICK_MEMO_MARKERS.some((marker) => text.includes(marker));
}

export function isScreenshotHealthIntakeSummary(summary: string): boolean {
  return (
    summary.includes('물 1.2L') ||
    summary.includes('Water 1.2L') ||
    summary.includes('水1.2L')
  );
}
