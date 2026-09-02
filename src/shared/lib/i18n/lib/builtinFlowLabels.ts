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
  'customFlow:preset_daily_bed': 'Make the bed',
  'customFlow:preset_daily_clean': 'Quick clean',
  'customFlow:preset_daily_laundry': 'Do laundry',
  'customFlow:preset_daily_wash': 'Wash up',
  'customFlow:preset_daily_recycle': 'Recycling',
  'customFlow:preset_daily_exercise': 'Exercise',
  'customFlow:preset_daily_shopping': 'Shopping',
  'customFlow:preset_abstain': 'Abstain',
  'customFlow:preset_stretching': 'Stretching',
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
  'customFlow:preset_daily_bed': 'ベッドを整える',
  'customFlow:preset_daily_clean': '掃除',
  'customFlow:preset_daily_laundry': '洗濯',
  'customFlow:preset_daily_wash': '洗顔・身支度',
  'customFlow:preset_daily_recycle': '分別・リサイクル',
  'customFlow:preset_daily_exercise': '運動',
  'customFlow:preset_daily_shopping': '買い物',
  'customFlow:preset_abstain': '禁止',
  'customFlow:preset_stretching': 'ストレッチ',
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

export function getBuiltinFlowDefaultLabel(flowId: string, locale: AppLocale): string | null {
  if (locale === 'en') {
    return BUILTIN_FLOW_EN[flowId] ?? null;
  }
  if (locale === 'ja') {
    return BUILTIN_FLOW_JA[flowId] ?? null;
  }
  return BUILTIN_FLOW_KO[flowId] ?? null;
}

export function getBuiltinFlowKoDefaultLabel(flowId: string): string | null {
  return BUILTIN_FLOW_KO[flowId] ?? null;
}
