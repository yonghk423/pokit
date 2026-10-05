import { getAppLocale, type AppLocale } from '@shared/lib/i18n';

import type { CustomFlowTemplateKey } from './customFlowTemplateConfigs';

type TemplateDemoCopy = {
  experienceName: string;
  measurementMetricLabel: string;
  healthDoseLabel: string;
  counterActivityLabel: string;
  journalPrompt: string;
  journalEntries: Array<{ text: string; mood: string }>;
  memoLastEntry: string;
  memoRecent: string[];
  reminderLabels: [string, string, string];
  focusMemo: string;
  checklistItems: [string, string, string];
  abstainItems: [string, string, string];
  previewLines: Record<CustomFlowTemplateKey, [string, string]>;
};

const KO: TemplateDemoCopy = {
  experienceName: '체험',
  measurementMetricLabel: '체중',
  healthDoseLabel: '종합비타민',
  counterActivityLabel: '푸쉬업',
  journalPrompt: '오늘 기분은?',
  journalEntries: [
    { text: '어제는 괜찮았어요', mood: '보통' },
    { text: '운동하고 기분 좋음', mood: '좋음' },
  ],
  memoLastEntry: '출근 전 가방에 충전기·이어폰 챙기기',
  memoRecent: [
    '장보기: 계란·우유·샐러드 재료',
    '병원 예약 — 목요일 오후 3시',
    '책 30쪽까지 읽기 (챕터 4)',
    '팀 회고: 다음 주 스프린트 목표 정리',
    '세탁·빨래 개기 끝',
  ],
  reminderLabels: ['아침 영양제', '물 한 잔', '저녁 약'],
  focusMemo: '방해 금지 모드 켜기',
  checklistItems: ['물 한 잔 마시기', '5분 스트레칭', '창문 열고 환기'],
  abstainItems: ['밤늦게 폰 보기', '과자·야식 먹기', 'SNS 무한 스크롤'],
  previewLines: {
    checklist: ['□ 물 마시기', '□ 스트레칭'],
    abstain: ['✓ 밤늦게 폰 보기', '□ 과자·야식'],
    measurement: ['체중·혈압·수면 등', '단위·목표 설정'],
    healthIntake: ['아침·점심·저녁 중 필요한 슬롯', '복용 시간 설정'],
    fasting: ['현재·목표 체중', '주간 감량 목표'],
    habit: ['오늘 완료 ✓', '연속 5일'],
    counter: ['이름·목표 설정', '+1 / 추이'],
    focus: ['25분 집중', '남은 12분'],
    journal: ['오늘 기분: 좋음', '한 줄 메모'],
    memo: ['장보기·예약·할 일', '짧게 남기고 저장'],
    reminder: ['약·물·식사 알림', '시간별 문구 설정'],
  },
};

const EN: TemplateDemoCopy = {
  experienceName: 'Demo',
  measurementMetricLabel: 'Weight',
  healthDoseLabel: 'Multivitamin',
  counterActivityLabel: 'Push-ups',
  journalPrompt: 'How do you feel today?',
  journalEntries: [
    { text: 'Yesterday was okay', mood: 'Okay' },
    { text: 'Felt good after a workout', mood: 'Good' },
  ],
  memoLastEntry: 'Pack charger & earbuds before leaving',
  memoRecent: [
    'Groceries: eggs, milk, salad stuff',
    'Doctor appointment — Thu 3 PM',
    'Read to page 30 (chapter 4)',
    'Team retro: next sprint goals',
    'Laundry folded',
  ],
  reminderLabels: ['Morning vitamins', 'Drink water', 'Evening meds'],
  focusMemo: 'Turn on Do Not Disturb',
  checklistItems: ['Drink a glass of water', 'Stretch 5 minutes', 'Open a window'],
  abstainItems: ['Late-night phone use', 'Snacks & late eating', 'Endless social scroll'],
  previewLines: {
    checklist: ['□ Drink water', '□ Stretch'],
    abstain: ['✓ Late-night phone', '□ Snacks'],
    measurement: ['Weight, BP, sleep…', 'Unit & goal'],
    healthIntake: ['Morning / lunch / dinner slots', 'Dose times'],
    fasting: ['Current & goal weight', 'Weekly loss target'],
    habit: ['Done today ✓', '5-day streak'],
    counter: ['Name & goal', '+1 / trend'],
    focus: ['25 min focus', '12 min left'],
    journal: ['Mood: good', 'One-line note'],
    memo: ['Groceries · booking · todos', 'Save a short note'],
    reminder: ['Meds · water · meals', 'Per-time labels'],
  },
};

const JA: TemplateDemoCopy = {
  experienceName: '体験',
  measurementMetricLabel: '体重',
  healthDoseLabel: 'マルチビタミン',
  counterActivityLabel: '腕立て伏せ',
  journalPrompt: '今日の気分は？',
  journalEntries: [
    { text: '昨日はまあまあでした', mood: 'ふつう' },
    { text: '運動して気分がよい', mood: 'よい' },
  ],
  memoLastEntry: '出勤前に充電器・イヤホンを入れる',
  memoRecent: [
    '買い物: 卵・牛乳・サラダ材料',
    '病院予約 — 木曜 15時',
    '本を30ページまで（第4章）',
    'チーム振り返り: 来週の目標',
    '洗濯・たたみ完了',
  ],
  reminderLabels: ['朝のサプリ', '水を一杯', '夜の薬'],
  focusMemo: '集中モードをオン',
  checklistItems: ['水を一杯飲む', '5分ストレッチ', '窓を開けて換気'],
  abstainItems: ['夜遅くスマホを見る', 'お菓子・夜食', 'SNSをだらだら見る'],
  previewLines: {
    checklist: ['□ 水を飲む', '□ ストレッチ'],
    abstain: ['✓ 夜遅くスマホ', '□ お菓子'],
    measurement: ['体重・血圧・睡眠など', '単位・目標設定'],
    healthIntake: ['朝・昼・夜の必要な枠', '服用時間の設定'],
    fasting: ['現在・目標体重', '週間減量目標'],
    habit: ['今日完了 ✓', '連続5日'],
    counter: ['名前・目標設定', '+1 / 推移'],
    focus: ['25分集中', '残り12分'],
    journal: ['今日の気分: よい', '一行メモ'],
    memo: ['買い物・予約・やること', '短く残して保存'],
    reminder: ['薬・水・食事の通知', '時間ごとの文言'],
  },
};

const BY_LOCALE: Record<AppLocale, TemplateDemoCopy> = {
  ko: KO,
  en: EN,
  ja: JA,
};

export function getTemplateDemoCopy(locale?: AppLocale): TemplateDemoCopy {
  return BY_LOCALE[locale ?? getAppLocale()] ?? EN;
}
