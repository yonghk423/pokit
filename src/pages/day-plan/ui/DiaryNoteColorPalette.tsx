import { PostItColorGrid } from '@shared/ui/post-it-color-palette';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
const diaryNotePalette = [
  '#FFF8E8', '#F6E3E6', '#FFD6BA', '#FFF0AE', '#E4EFE4', '#BBE4DB', '#E3EEF6', '#D4DBFF', '#E4D4F4', '#F3C8DF',
  '#E44251', '#FF7344', '#EDA420', '#E7CF28', '#62AD42', '#179E84', '#208EC4', '#3056C8', '#8553BD', '#BC2780',
  '#302D2A', '#763849', '#855037', '#706031', '#365444', '#285E64', '#234C67', '#35395E', '#604264', '#814E70',
  '#FFFFFF', '#D4D0C9', '#9C9691', '#625F5D', '#222222',
];

/** The date diary and independent Notes deliberately share the same swatches and pigment texture. */
export function DiaryNoteColorPalette({ value, onChange, isDark, label }: { value?: string; onChange: (color?: string) => void; isDark: boolean; label: string }) {
  return <PostItColorGrid texture="pigment" isDark={isDark} label={label} clearLabel={translateUiText('기본색')} onClear={() => onChange()}
    choices={diaryNotePalette.map(color => ({ id: color, color, label: color, labelKey: 'catalog.postItColorTitle', selected: value === color, onSelect: () => onChange(color) }))} />;
}
