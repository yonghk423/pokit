import { POST_IT_FACE_COLOR_PRESETS, POST_IT_INK_COLOR_PRESETS, type PostItFaceColorId, type PostItFaceColorPreset, type PostItInkColorId } from '@shared/lib/storage';
import { POST_IT_SELECTION_COLOR_PRESETS } from '@shared/lib/routineColorPresets';
import type { I18nKey } from '@shared/lib/i18n';

export type DeskChoice = { id: string; color: string; selected: boolean; labelKey: I18nKey; label?: string; onSelect: () => void };

export function deskPaperChoices(value: PostItFaceColorId | null | undefined, onChange: (value: PostItFaceColorId | null) => void, isDark: boolean): DeskChoice[] {
  const choices: PostItFaceColorPreset[] = [...POST_IT_SELECTION_COLOR_PRESETS];
  const saved = POST_IT_FACE_COLOR_PRESETS.find((preset) => preset.id === value);
  if (saved && !choices.some((preset) => preset.id === saved.id)) choices.push(saved);
  return choices.map((preset) => ({
    id: preset.id,
    color: isDark ? preset.dark : preset.light,
    selected: value === preset.id,
    labelKey: preset.id.startsWith('paper-') ? 'catalog.postItColorTitle' : `catalog.postItColor.${preset.id}` as I18nKey,
    ...(preset.id.startsWith('paper-') ? { label: preset.light.toUpperCase() } : {}),
    onSelect: () => onChange(value === preset.id ? null : preset.id),
  }));
}

/** 저장 가능한 전체 펜 팔레트. 자동 색상은 초기화 버튼으로 선택한다. */
export function deskInkChoices(value: PostItInkColorId | null | undefined, onChange: (value: PostItInkColorId | null) => void): DeskChoice[] {
  return POST_IT_INK_COLOR_PRESETS.filter((preset) => preset.id !== 'auto').map((preset) => ({
    id: preset.id,
    color: preset.hex,
    selected: value === preset.id,
    labelKey: `dayPlan.quickMemoInkSwatch.${preset.id}` as I18nKey,
    onSelect: () => onChange(value === preset.id ? null : preset.id),
  }));
}
