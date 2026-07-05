import {
  CUSTOM_FLOW_TEMPLATE_DESCRIPTIONS,
  CUSTOM_FLOW_TEMPLATE_LABELS,
  CUSTOM_FLOW_TEMPLATE_SUMMARIES,
} from './customFlowTemplate';
import {
  CUSTOM_FLOW_TEMPLATE_KEYS,
  type CustomFlowTemplateKey,
} from './customFlowTemplateConfigs';

export type CustomFlowTemplateIconName =
  | 'checklist'
  | 'chart.bar.fill'
  | 'checkmark.circle'
  | 'plus.circle'
  | 'timer'
  | 'text.alignleft'
  | 'bell';

export const CUSTOM_FLOW_TEMPLATE_ICONS: Record<CustomFlowTemplateKey, CustomFlowTemplateIconName> = {
  checklist: 'checklist',
  measurement: 'chart.bar.fill',
  habit: 'checkmark.circle',
  counter: 'plus.circle',
  focus: 'timer',
  journal: 'text.alignleft',
  reminder: 'bell',
};

export const CUSTOM_FLOW_TEMPLATE_PREVIEW_LINES: Record<CustomFlowTemplateKey, string[]> = {
  checklist: ['□ 물 마시기', '□ 스트레칭'],
  measurement: ['오늘 68.5 kg', '어제 68.9 kg'],
  habit: ['오늘 완료 ✓', '연속 5일'],
  counter: ['3 / 8회', '+1'],
  focus: ['25분 집중', '남은 12분'],
  journal: ['오늘 기분: 좋음', '한 줄 메모'],
  reminder: ['09:00 알림', '완료 체크'],
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
  return CUSTOM_FLOW_TEMPLATE_KEYS.map((key) => resolveCustomFlowTemplateCatalogEntry(key));
}

export function resolveCustomFlowTemplateCatalogEntry(
  key: CustomFlowTemplateKey,
): CustomFlowTemplateCatalogEntry {
  return {
    key,
    label: CUSTOM_FLOW_TEMPLATE_LABELS[key],
    description: CUSTOM_FLOW_TEMPLATE_DESCRIPTIONS[key],
    summary: CUSTOM_FLOW_TEMPLATE_SUMMARIES[key],
    icon: CUSTOM_FLOW_TEMPLATE_ICONS[key],
    previewLines: CUSTOM_FLOW_TEMPLATE_PREVIEW_LINES[key],
  };
}
