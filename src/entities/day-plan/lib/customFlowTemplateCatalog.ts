import {
  resolveCustomFlowTemplateDescription,
  resolveCustomFlowTemplateLabel,
  resolveCustomFlowTemplateSummary,
} from './customFlowTemplate';
import {
  CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS,
  type CustomFlowTemplateKey,
} from './customFlowTemplateConfigs';
import { getTemplateDemoCopy } from './templateDemoCopy';

export type CustomFlowTemplateIconName =
  | 'checklist'
  | 'hand.raised.fill'
  | 'chart.bar.fill'
  | 'pills.fill'
  | 'figure.stand'
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
  healthIntake: 'pills.fill',
  fasting: 'figure.stand',
  habit: 'checkmark.circle',
  counter: 'plus.circle',
  focus: 'timer',
  journal: 'text.alignleft',
  memo: 'note.text',
  reminder: 'bell',
};

/** 카탈로그 미리보기 줄 — 현재 로케일 기준 스냅샷(호환 export) */
export function getCustomFlowTemplatePreviewLines(): Record<CustomFlowTemplateKey, string[]> {
  return getTemplateDemoCopy().previewLines;
}

/** @deprecated `getCustomFlowTemplatePreviewLines()` 사용 */
export const CUSTOM_FLOW_TEMPLATE_PREVIEW_LINES: Record<CustomFlowTemplateKey, string[]> =
  getTemplateDemoCopy('ko').previewLines;

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
    previewLines: [...getTemplateDemoCopy().previewLines[key]],
  };
}
