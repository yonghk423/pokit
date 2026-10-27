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
  'customFlow:preset_pokit_week_tour': 'Try YOUR DAY quickly',
  'customFlow:preset_daily_bed': 'Make the bed',
  'customFlow:preset_daily_clean': 'Quick clean',
  'customFlow:preset_daily_laundry': 'Do laundry',
  'customFlow:preset_daily_wash': 'Wash up',
  'customFlow:preset_daily_recycle': 'Recycling',
  'customFlow:preset_daily_exercise': 'Weekend run',
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
  'customFlow:preset_pokit_week_tour': 'YOUR DAYをさっと見てみる',
  'customFlow:preset_daily_bed': 'ベッドを整える',
  'customFlow:preset_daily_clean': '掃除',
  'customFlow:preset_daily_laundry': '洗濯',
  'customFlow:preset_daily_wash': '洗顔・身支度',
  'customFlow:preset_daily_recycle': '分別・リサイクル',
  'customFlow:preset_daily_exercise': '週末ランニング',
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
  'customFlow:preset_daily_exercise': 'Go for a light run on the weekend.',
  'customFlow:preset_daily_shopping': 'Pick up groceries or daily supplies.',
  'customFlow:preset_abstain': 'Skip a habit you want to cut back on.',
  'customFlow:preset_stretching': 'Stretch to loosen up.',
  'customFlow:preset_focus': 'Dive into one thing without distractions.',
  'customFlow:preset_intermittent_fasting': 'Keep your intermittent fasting window.',
  'customFlow:preset_good_posture': 'Check posture and sit/stand tall.',
};

const BUILTIN_FLOW_ZH: Record<string, string> = {
  'customFlow:preset_pokit_week_tour': '快速看看今日的主角',
  'customFlow:preset_daily_bed': '整理床鋪',
  'customFlow:preset_daily_clean': '快速打掃',
  'customFlow:preset_daily_laundry': '洗衣服',
  'customFlow:preset_daily_wash': '盥洗',
  'customFlow:preset_daily_recycle': '資源回收',
  'customFlow:preset_daily_exercise': '週末跑步',
  'customFlow:preset_daily_shopping': '購物',
  'customFlow:preset_abstain': '戒除',
  'customFlow:preset_stretching': '伸展',
  'customFlow:preset_focus': '專注',
  'customFlow:preset_intermittent_fasting': '間歇斷食',
  'customFlow:preset_good_posture': '端正姿勢',
  'customFlow:builtin_hobby_draw': '素描練習',
  'customFlow:builtin_hobby_guitar': '吉他練習',
  'customFlow:builtin_hobby_photo': '拍照',
  'customFlow:builtin_hobby_cooking': '料理實驗',
  'customFlow:builtin_hobby_hiking': '登山健行',
  'customFlow:builtin_family_call': '打電話給家人',
  'customFlow:builtin_family_friends': '和朋友見面',
  'customFlow:builtin_family_parents': '關心父母',
  'customFlow:builtin_family_community': '社群時間',
  'customFlow:builtin_family_partner': '和伴侶的時間',
  'customFlow:builtin_mind_gratitude': '感恩日記',
  'customFlow:builtin_mind_pledge': '今天的約定',
  'customFlow:builtin_mind_nap': '小睡',
  'customFlow:builtin_mind_music': '聽音樂',
  'customFlow:builtin_mind_detox': '數位排毒',
};

const BUILTIN_FLOW_SUMMARY_ZH: Record<string, string> = {
  'customFlow:preset_pokit_week_tour': '點項目會打開說明。「知道了」會勾選。也可以一次做完。',
  'customFlow:preset_daily_bed': '早上整理床鋪，輕鬆開始一天。',
  'customFlow:preset_daily_clean': '把房間或客廳快速收拾一下。',
  'customFlow:preset_daily_laundry': '洗衣服，或把衣服摺好收起來。',
  'customFlow:preset_daily_wash': '在一天的開始或結束時整理好自己。',
  'customFlow:preset_daily_recycle': '分類後拿去回收。',
  'customFlow:preset_daily_exercise': '週末輕鬆跑一跑。',
  'customFlow:preset_daily_shopping': '買食材或日用品。',
  'customFlow:preset_abstain': '停掉想戒的習慣。',
  'customFlow:preset_stretching': '伸展身體，讓它鬆開。',
  'customFlow:preset_focus': '不受打擾，專心做一件事。',
  'customFlow:preset_intermittent_fasting': '守住間歇斷食的時段。',
  'customFlow:preset_good_posture': '檢查姿勢並調整。',
};

const BUILTIN_FLOW_SUMMARY_JA: Record<string, string> = {
  'customFlow:preset_pokit_week_tour':
    '項目をタップすると説明が開きます。「了解」でチェック。全部まとめて進めてOKです。',
  'customFlow:preset_daily_bed': '朝にベッドを整え、軽やかに一日を始める。',
  'customFlow:preset_daily_clean': '部屋やリビングをさっと片づける。',
  'customFlow:preset_daily_laundry': '洗濯を回すか、たたんで片づける。',
  'customFlow:preset_daily_wash': '一日の始まり・終わりにきれいに整える。',
  'customFlow:preset_daily_recycle': '分別してリサイクルに出す。',
  'customFlow:preset_daily_exercise': '週末に軽く走って体を動かす。',
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
  if (locale === 'zh-TW') {
    return BUILTIN_FLOW_ZH[flowId] ?? null;
  }
  return BUILTIN_FLOW_KO[flowId] ?? null;
}

export function getBuiltinFlowDefaultSummary(flowId: string, locale: AppLocale): string | null {
  if (locale === 'en') return BUILTIN_FLOW_SUMMARY_EN[flowId] ?? null;
  if (locale === 'ja') return BUILTIN_FLOW_SUMMARY_JA[flowId] ?? null;
  if (locale === 'zh-TW') return BUILTIN_FLOW_SUMMARY_ZH[flowId] ?? null;
  const flow = [...DEFAULT_BUILTIN_CUSTOM_FLOWS, ...LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS].find(
    (row) => row.id === flowId,
  );
  return flow?.summary ?? null;
}

export function getBuiltinFlowKoDefaultLabel(flowId: string): string | null {
  return BUILTIN_FLOW_KO[flowId] ?? null;
}

/** 저장 표시명이 내장 루틴의 기본명 중 하나인지 */
export function isBuiltinFlowDefaultDisplayName(flowId: string, displayName: string): boolean {
  const trimmed = displayName.trim();
  if (!trimmed) return false;
  return (['ko', 'en', 'ja', 'zh-TW'] as const).some(
    (locale) => getBuiltinFlowDefaultLabel(flowId, locale) === trimmed,
  );
}

