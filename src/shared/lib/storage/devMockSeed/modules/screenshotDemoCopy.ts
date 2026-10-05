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
    { what: '약 저녁분 챙기기', who: '나' },
    { what: '내일 가방 미리 싸기', who: '나' },
    { what: '책상 위 정리', who: '나' },
  ],
  reading: {
    displayName: '독서',
    bookTitle: '데미안',
    summary: '오늘 30쪽 · 112/248',
    books: [
      { title: '데미안', memo: '오늘 112쪽까지' },
      { title: '아주 작은 습관의 힘', memo: '다음에 읽을 책' },
      { title: '사피엔스', memo: '완독' },
      { title: '미드나잇 라이브러리', memo: '출퇴근용' },
      { title: '어린 왕자', memo: '주말 재독' },
      { title: '해리 포터와 마법사의 돌', memo: '120쪽 근처' },
    ],
  },
  healthIntake: {
    displayName: '물·비타민·약 챙기기',
    summary: '물 1.2L · 약 아침 완료',
    doseLabel: '종합비타민',
  },
  fasting: {
    displayName: '체중 관리 · 16:8 간헐적 단식',
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
    { what: 'Take evening meds', who: 'Me' },
    { what: 'Pack tomorrow’s bag', who: 'Me' },
    { what: 'Clear the desk', who: 'Me' },
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
      { title: 'The Little Prince', memo: 'Weekend reread' },
      { title: "Harry Potter and the Sorcerer's Stone", memo: 'Around page 120' },
    ],
  },
  healthIntake: {
    displayName: 'Water, vitamins & meds',
    summary: 'Water 1.2L · morning dose done',
    doseLabel: 'Multivitamin',
  },
  fasting: {
    displayName: 'Weight · 16:8 intermittent fasting',
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
    { what: '夜の薬を用意', who: '自分' },
    { what: '明日のバッグを準備', who: '自分' },
    { what: 'デスク周りを片づける', who: '自分' },
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
      { title: '星の王子さま', memo: '週末の再読' },
      { title: 'ハリー・ポッターと賢者の石', memo: '120ページ付近' },
    ],
  },
  healthIntake: {
    displayName: '水・ビタミン・薬を整える',
    summary: '水1.2L · 朝の服薬完了',
    doseLabel: 'マルチビタミン',
  },
  fasting: {
    displayName: '体重管理 · 16:8 断続的ファスティング',
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
  const extra = getScreenshotExtraRoutineLabel(categoryKey, locale);
  if (extra) return extra;
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

/** 스크린샷 데모 전용 추가 루틴 — clear 시 id prefix로 제거 */
export const SCREENSHOT_EXTRA_FLOW_ID_PREFIX = 'customFlow:screenshot_demo_' as const;

export type ScreenshotExtraRoutineDef = {
  id: `${typeof SCREENSHOT_EXTRA_FLOW_ID_PREFIX}${string}`;
  groupKey: 'health' | 'productivity';
  icon: string;
  color: string;
  label: Record<AppLocale, string>;
  summary: Record<AppLocale, string>;
};

export const SCREENSHOT_EXTRA_ROUTINES: readonly ScreenshotExtraRoutineDef[] = [
  {
    id: 'customFlow:screenshot_demo_01',
    groupKey: 'productivity',
    icon: 'pencil.and.list.clipboard',
    color: '#0ea5e9',
    /** 짧음 */
    label: { ko: '일기', en: 'Journal', ja: '日記' },
    summary: {
      ko: '일어나서 짧게 오늘을 적어 둬요.',
      en: 'Jot a short morning note.',
      ja: '起きてすぐ今日を短く書く。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_02',
    groupKey: 'productivity',
    icon: 'brain.head.profile',
    color: '#2563eb',
    /** 김 */
    label: {
      ko: '딥 워크 90분 — 방해금지·슬랙 끄기',
      en: 'Deep work 90m — mute Slack & focus',
      ja: 'ディープワーク90分 — 通知オフで集中',
    },
    summary: {
      ko: '방해 없이 한 가지에 깊게 몰입해요.',
      en: 'Focus deeply without interruptions.',
      ja: '邪魔なく深く集中する。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_03',
    groupKey: 'productivity',
    icon: 'text.book.closed.fill',
    color: '#7c3aed',
    /** 중간 */
    label: { ko: '영어 단어 복습', en: 'English vocab drill', ja: '英単語の復習' },
    summary: {
      ko: '단어·회화를 조금씩 쌓아요.',
      en: 'Build vocab and conversation daily.',
      ja: '単語・会話を少しずつ積み上げる。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_04',
    groupKey: 'health',
    icon: 'figure.walk',
    color: '#10b981',
    /** 김 */
    label: {
      ko: '점심 먹고 근처 공원 20분 걷기',
      en: 'Post-lunch 20-minute park walk',
      ja: '昼食後に近くの公園を20分歩く',
    },
    summary: {
      ko: '식후에 가볍게 걸으며 환기해요.',
      en: 'A light walk after lunch.',
      ja: '食後に軽く歩いてリフレッシュ。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_05',
    groupKey: 'productivity',
    icon: 'frying.pan.fill',
    color: '#ea580c',
    /** 짧음 */
    label: { ko: '요리', en: 'Cook', ja: '料理' },
    summary: {
      ko: '집밥을 간단히 해 먹어요.',
      en: 'Cook a simple home dinner.',
      ja: 'シンプルな家ご飯をつくる。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_06',
    groupKey: 'productivity',
    icon: 'sparkles',
    color: '#0891b2',
    /** 김 */
    label: {
      ko: '주말 전 방·책상·싱크대 싹 정리하기',
      en: 'Pre-weekend desk, room & sink reset',
      ja: '週末前に部屋・デスク・シンクを片づける',
    },
    summary: {
      ko: '방·책상을 짧게 정리해요.',
      en: 'Quick tidy of desk and room.',
      ja: '部屋・デスクを短く片づける。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_07',
    groupKey: 'productivity',
    icon: 'cart.fill',
    color: '#f59e0b',
    /** 짧음 */
    label: { ko: '장보기', en: 'Groceries', ja: '買い物' },
    summary: {
      ko: '필요한 재료를 사러 나가요.',
      en: 'Pick up what you need.',
      ja: '必要な食材を買いに行く。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_08',
    groupKey: 'health',
    icon: 'headphones',
    color: '#d946ef',
    /** 중간~김 */
    label: {
      ko: '좋아하는 앨범으로 저녁 음악 듣기',
      en: 'Evening album listening wind-down',
      ja: '好きなアルバムで夜の音楽タイム',
    },
    summary: {
      ko: '좋아하는 곡으로 마음을 풀어요.',
      en: 'Unwind with favorite tracks.',
      ja: '好きな曲でリラックス。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_09',
    groupKey: 'productivity',
    icon: 'heart.text.square.fill',
    color: '#14b8a6',
    /** 짧음 */
    label: { ko: '감사', en: 'Thanks', ja: '感謝' },
    summary: {
      ko: '오늘 고마운 일을 한 줄 남겨요.',
      en: 'Write one thing you’re grateful for.',
      ja: '今日感謝したことを一行残す。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_10',
    groupKey: 'productivity',
    icon: 'phone.fill',
    color: '#3b82f6',
    /** 중간 */
    label: {
      ko: '가족에게 안부 전화',
      en: 'Quick family check-in call',
      ja: '家族に安否の電話',
    },
    summary: {
      ko: '짧게라도 안부를 전해요.',
      en: 'A short check-in call.',
      ja: '短くても安否を伝える。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_11',
    groupKey: 'health',
    icon: 'leaf.fill',
    color: '#22c55e',
    /** 중간 */
    label: { ko: '디지털 디톡스', en: 'Digital detox', ja: 'デジタルデトックス' },
    summary: {
      ko: '알림을 끄고 화면에서 멀어져요.',
      en: 'Mute alerts and step away.',
      ja: '通知を切って画面から離れる。',
    },
  },
  {
    id: 'customFlow:screenshot_demo_12',
    groupKey: 'health',
    icon: 'moon.zzz.fill',
    color: '#64748b',
    /** 김 */
    label: {
      ko: '수면 준비 — 조명 낮추고 폰 내려놓기',
      en: 'Wind down — dim lights, phone away',
      ja: '就寝準備 — 明かりを落としスマホを置く',
    },
    summary: {
      ko: '취침 전 루틴으로 하루를 닫아요.',
      en: 'Close the day with a bedtime routine.',
      ja: '就寝前のルーチンで一日を閉じる。',
    },
  },
];

export function isScreenshotExtraFlowId(id: string): boolean {
  return id.startsWith(SCREENSHOT_EXTRA_FLOW_ID_PREFIX);
}

export function getScreenshotExtraRoutineLabel(id: string, locale: AppLocale): string | null {
  const row = SCREENSHOT_EXTRA_ROUTINES.find((item) => item.id === id);
  if (!row) return null;
  return row.label[locale] ?? row.label.en;
}
