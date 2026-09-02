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

export function getBuiltinFlowDefaultLabel(flowId: string, locale: AppLocale): string | null {
  if (locale === 'en') {
    return BUILTIN_FLOW_EN[flowId] ?? null;
  }
  return BUILTIN_FLOW_KO[flowId] ?? null;
}

export function getBuiltinFlowKoDefaultLabel(flowId: string): string | null {
  return BUILTIN_FLOW_KO[flowId] ?? null;
}
