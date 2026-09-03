import {
  resolveCustomFlowTemplateDescription,
  resolveCustomFlowTemplateLabel,
  resolveCustomFlowTemplateSummary,
} from './customFlowTemplate';
import {
  CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS,
  type CustomFlowTemplateKey,
} from './customFlowTemplateConfigs';

export type CustomFlowTemplateIconName =
  | 'checklist'
  | 'hand.raised.fill'
  | 'chart.bar.fill'
  | 'checkmark.circle'
  | 'plus.circle'
  | 'timer'
  | 'text.alignleft'
  | 'note.text'
  | 'bell';

export const CUSTOM_FLOW_TEMPLATE_ICONS: Record<CustomFlowTemplateKey, CustomFlowTemplateIconName> = {
  checklist: 'checklist',
  abstain: 'hand.raised.fill',
  measurement: 'chart.bar.fill',
  habit: 'checkmark.circle',
  counter: 'plus.circle',
  focus: 'timer',
  journal: 'text.alignleft',
  memo: 'note.text',
  reminder: 'bell',
};

export const CUSTOM_FLOW_TEMPLATE_PREVIEW_LINES: Record<CustomFlowTemplateKey, string[]> = {
  checklist: ['□ 물 마시기', '□ 스트레칭'],
  abstain: ['✓ 밤늦게 폰 보기', '□ 과자·야식'],
  measurement: ['체중·혈압·수면 등', '단위·목표 설정'],
  habit: ['오늘 완료 ✓', '연속 5일'],
  counter: ['이름·목표 설정', '+1 / 추이'],
  focus: ['25분 집중', '남은 12분'],
  journal: ['오늘 기분: 좋음', '한 줄 메모'],
  memo: ['오늘 할 일 정리', '짧게 메모 남기기'],
  reminder: ['약·물·식사 알림', '시간별 문구 설정'],
};

export type CustomFlowTemplateCatalogEntry = {
  key: CustomFlowTemplateKey;
  label: string;
  description: string;
  summary: string;
  icon: CustomFlowTemplateIconName;
  previewLines: string[];
};

export function listCustomFlowTemplateCatalogEntries(): CustomFlowTemplateCatalogEntry[] {
  return CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS.map((key) => resolveCustomFlowTemplateCatalogEntry(key));
}

export function resolveCustomFlowTemplateCatalogEntry(
  key: CustomFlowTemplateKey,
): CustomFlowTemplateCatalogEntry {
  return {
    key,
    label: resolveCustomFlowTemplateLabel(key),
    description: resolveCustomFlowTemplateDescription(key),
    summary: resolveCustomFlowTemplateSummary(key),
    icon: CUSTOM_FLOW_TEMPLATE_ICONS[key],
    previewLines: CUSTOM_FLOW_TEMPLATE_PREVIEW_LINES[key],
  };
}
