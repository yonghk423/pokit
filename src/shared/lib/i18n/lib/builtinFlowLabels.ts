import type { AppLocale } from '../model/locale';
import {
  DEFAULT_BUILTIN_CUSTOM_FLOWS,
  LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS,
} from '@shared/lib/storage/defaultPriorityCatalog';

const BUILTIN_FLOW_KO = Object.fromEntries([
  ...DEFAULT_BUILTIN_CUSTOM_FLOWS.map((flow) => [flow.id, flow.displayName]),
  ...LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS.map((flow) => [flow.id, flow.displayName]),
]) as Record<string, string>;

/** 기본 내장 루틴 — 영어 표시명 (ko는 카탈로그 원문 사용) */
const BUILTIN_FLOW_EN: Record<string, string> = {
  'customFlow:preset_pokit_week_tour': 'Try POKIT quickly',
  'customFlow:preset_daily_bed': 'Make the bed',
  'customFlow:preset_daily_clean': 'Quick clean',
  'customFlow:preset_daily_laundry': 'Do laundry',
  'customFlow:preset_daily_wash': 'Wash up',
  'customFlow:preset_daily_recycle': 'Recycling',
  'customFlow:preset_daily_exercise': 'Exercise',
  'customFlow:preset_daily_shopping': 'Shopping',
  'customFlow:preset_abstain': 'Abstain',
  'customFlow:preset_stretching': 'Stretching',
  'customFlow:preset_focus': 'Focus',
  'customFlow:preset_intermittent_fasting': 'Intermittent fasting',
  'customFlow:preset_good_posture': 'Good posture',
  'customFlow:builtin_hobby_draw': 'Drawing practice',
  'customFlow:builtin_hobby_guitar': 'Guitar practice',
  'customFlow:builtin_hobby_photo': 'Photography',
  'customFlow:builtin_hobby_cooking': 'Cooking experiment',
  'customFlow:builtin_hobby_hiking': 'Hiking · trekking',
  'customFlow:builtin_family_call': 'Family call',
  'customFlow:builtin_family_friends': 'Meet friends',
  'customFlow:builtin_family_parents': 'Check on parents',
  'customFlow:builtin_family_community': 'Community time',
  'customFlow:builtin_family_partner': 'Partner time',
  'customFlow:builtin_mind_gratitude': 'Gratitude journal',
  'customFlow:builtin_mind_pledge': "Today's pledge",
  'customFlow:builtin_mind_nap': 'Power nap',
  'customFlow:builtin_mind_music': 'Listen to music',
  'customFlow:builtin_mind_detox': 'Digital detox',
};

const BUILTIN_FLOW_JA: Record<string, string> = {
  'customFlow:preset_pokit_week_tour': 'POKITをさっと見てみる',
  'customFlow:preset_daily_bed': 'ベッドを整える',
  'customFlow:preset_daily_clean': '掃除',
  'customFlow:preset_daily_laundry': '洗濯',
  'customFlow:preset_daily_wash': '洗顔・身支度',
  'customFlow:preset_daily_recycle': '分別・リサイクル',
  'customFlow:preset_daily_exercise': '運動',
  'customFlow:preset_daily_shopping': '買い物',
  'customFlow:preset_abstain': '禁止',
  'customFlow:preset_stretching': 'ストレッチ',
  'customFlow:preset_focus': '集中する',
  'customFlow:preset_intermittent_fasting': '間歇断食',
  'customFlow:preset_good_posture': '姿勢を正す',
  'customFlow:builtin_hobby_draw': 'デッサン練習',
  'customFlow:builtin_hobby_guitar': 'ギター練習',
  'customFlow:builtin_hobby_photo': '写真撮影',
  'customFlow:builtin_hobby_cooking': '料理実験',
  'customFlow:builtin_hobby_hiking': '登山・トレッキング',
  'customFlow:builtin_family_call': '家族に電話',
  'customFlow:builtin_family_friends': '友達と会う',
  'customFlow:builtin_family_parents': '親の安否確認',
  'customFlow:builtin_family_community': 'コミュニティ参加',
  'customFlow:builtin_family_partner': 'パートナーとの時間',
  'customFlow:builtin_mind_gratitude': '感謝日記',
  'customFlow:builtin_mind_pledge': '今日の誓い',
  'customFlow:builtin_mind_nap': '昼寝・パワーナップ',
  'customFlow:builtin_mind_music': '音楽鑑賞',
  'customFlow:builtin_mind_detox': 'デジタルデトックス',
};

const BUILTIN_FLOW_SUMMARY_EN: Record<string, string> = {
  'customFlow:preset_pokit_week_tour':
    'Tap an item for a tip. “Got it” checks it off. You can finish them all in one go.',
  'customFlow:preset_daily_bed': 'Make the bed and start the day light.',
  'customFlow:preset_daily_clean': 'Quick tidy of your living space.',
  'customFlow:preset_daily_laundry': 'Wash or fold laundry.',
  'customFlow:preset_daily_wash': 'Freshen up at the start or end of the day.',
  'customFlow:preset_daily_recycle': 'Sort recyclables and take them out.',
  'customFlow:preset_daily_exercise': 'Move your body with a short workout.',
  'customFlow:preset_daily_shopping': 'Pick up groceries or daily supplies.',
  'customFlow:preset_abstain': 'Skip a habit you want to cut back on.',
  'customFlow:preset_stretching': 'Stretch to loosen up.',
  'customFlow:preset_focus': 'Dive into one thing without distractions.',
  'customFlow:preset_intermittent_fasting': 'Keep your intermittent fasting window.',
  'customFlow:preset_good_posture': 'Check posture and sit/stand tall.',
};

const BUILTIN_FLOW_SUMMARY_JA: Record<string, string> = {
  'customFlow:preset_pokit_week_tour':
    '項目をタップすると説明が開きます。「了解」でチェック。全部まとめて進めてOKです。',
  'customFlow:preset_daily_bed': '朝にベッドを整え、軽やかに一日を始める。',
  'customFlow:preset_daily_clean': '部屋やリビングをさっと片づける。',
  'customFlow:preset_daily_laundry': '洗濯を回すか、たたんで片づける。',
  'customFlow:preset_daily_wash': '一日の始まり・終わりにきれいに整える。',
  'customFlow:preset_daily_recycle': '分別してリサイクルに出す。',
  'customFlow:preset_daily_exercise': '短時間でも体を動かす。',
  'customFlow:preset_daily_shopping': '食材や日用品を買う。',
  'customFlow:preset_abstain': '控えたい習慣をやめる。',
  'customFlow:preset_stretching': 'ストレッチで体をほぐす。',
  'customFlow:preset_focus': '邪魔されず、ひとつのことに深く没頭する。',
  'customFlow:preset_intermittent_fasting': '間歇断食の時間帯を守る。',
  'customFlow:preset_good_posture': '姿勢を確認して正す。',
};

export function getBuiltinFlowDefaultLabel(flowId: string, locale: AppLocale): string | null {
  if (locale === 'en') {
    return BUILTIN_FLOW_EN[flowId] ?? null;
  }
  if (locale === 'ja') {
    return BUILTIN_FLOW_JA[flowId] ?? null;
  }
  return BUILTIN_FLOW_KO[flowId] ?? null;
}

export function getBuiltinFlowDefaultSummary(flowId: string, locale: AppLocale): string | null {
  if (locale === 'en') return BUILTIN_FLOW_SUMMARY_EN[flowId] ?? null;
  if (locale === 'ja') return BUILTIN_FLOW_SUMMARY_JA[flowId] ?? null;
  const flow = [...DEFAULT_BUILTIN_CUSTOM_FLOWS, ...LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS].find(
    (row) => row.id === flowId,
  );
  return flow?.summary ?? null;
}

export function getBuiltinFlowKoDefaultLabel(flowId: string): string | null {
  return BUILTIN_FLOW_KO[flowId] ?? null;
}

/** 저장 표시명이 내장 루틴의 ko/en/ja 기본명 중 하나인지 */
export function isBuiltinFlowDefaultDisplayName(flowId: string, displayName: string): boolean {
  const trimmed = displayName.trim();
  if (!trimmed) return false;
  return (['ko', 'en', 'ja'] as const).some(
    (locale) => getBuiltinFlowDefaultLabel(flowId, locale) === trimmed,
  );
}

