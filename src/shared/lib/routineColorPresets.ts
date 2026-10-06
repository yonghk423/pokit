/**
 * 루틴 메모지 면색 · 상세설정 아이콘 accent 공통 팔레트.
 * 두 UI는 동일한 light hex를 같은 순서로 보여 준다.
 */

export type RoutineColorInkTone = 'dark' | 'light';

export type RoutineColorPreset = {
  id: string;
  light: string;
  dark: string;
  inkTone: RoutineColorInkTone;
};

export const ROUTINE_COLOR_PRESETS = [
  { id: 'cream', light: '#F5F2EB', dark: '#2D2F44', inkTone: 'dark' },
  { id: 'sand', light: '#EDE4D4', dark: '#3A3428', inkTone: 'dark' },
  { id: 'ivory', light: '#FBF8F1', dark: '#323248', inkTone: 'dark' },
  { id: 'yellow', light: '#FFE566', dark: '#8A7618', inkTone: 'dark' },
  { id: 'butter', light: '#FFF3B8', dark: '#6E6528', inkTone: 'dark' },
  { id: 'lemon', light: '#FFF59A', dark: '#7A7020', inkTone: 'dark' },
  { id: 'honey', light: '#F5D98A', dark: '#6E5820', inkTone: 'dark' },
  { id: 'peach', light: '#FFD8A8', dark: '#8A5A28', inkTone: 'dark' },
  { id: 'apricot', light: '#FFC9A0', dark: '#7A4A28', inkTone: 'dark' },
  { id: 'tangerine', light: '#FFC078', dark: '#8A5020', inkTone: 'dark' },
  { id: 'coral', light: '#FFB4A8', dark: '#7A3A34', inkTone: 'dark' },
  { id: 'pink', light: '#F5C6C6', dark: '#7A4545', inkTone: 'dark' },
  { id: 'rose', light: '#F2B8C8', dark: '#6E3848', inkTone: 'dark' },
  { id: 'blush', light: '#F5D0D8', dark: '#6E404C', inkTone: 'dark' },
  { id: 'sakura', light: '#FFD0E0', dark: '#7A4058', inkTone: 'dark' },
  { id: 'mint', light: '#A8DADC', dark: '#1A4E50', inkTone: 'dark' },
  { id: 'sage', light: '#C5D9B8', dark: '#3A4E32', inkTone: 'dark' },
  { id: 'melon', light: '#D8F0A8', dark: '#4A6230', inkTone: 'dark' },
  { id: 'pistachio', light: '#C8E0A8', dark: '#3E5630', inkTone: 'dark' },
  { id: 'aqua', light: '#B8E8E0', dark: '#2A5550', inkTone: 'dark' },
  { id: 'seafoam', light: '#B8E0D2', dark: '#2A5448', inkTone: 'dark' },
  { id: 'sky', light: '#B8D4F0', dark: '#2A4568', inkTone: 'dark' },
  { id: 'powderBlue', light: '#D0E4F5', dark: '#33485C', inkTone: 'dark' },
  { id: 'ice', light: '#D8F0F5', dark: '#2E4A55', inkTone: 'dark' },
  { id: 'lavender', light: '#D4C8F5', dark: '#4A3F72', inkTone: 'dark' },
  { id: 'lilac', light: '#E4D4F0', dark: '#4A3858', inkTone: 'dark' },
  { id: 'periwinkle', light: '#C8D0F5', dark: '#3A4270', inkTone: 'dark' },
  { id: 'grape', light: '#D8C0E8', dark: '#4A3858', inkTone: 'dark' },
  { id: 'mauve', light: '#E0C8D8', dark: '#503848', inkTone: 'dark' },
  { id: 'white', light: '#FFFFFF', dark: '#3A3C52', inkTone: 'dark' },
  { id: 'taupe', light: '#D8D0C8', dark: '#3A3632', inkTone: 'dark' },
  { id: 'mist', light: '#E8E8F0', dark: '#383848', inkTone: 'dark' },
  { id: 'khaki', light: '#D8D0A8', dark: '#4A4630', inkTone: 'dark' },
  { id: 'clay', light: '#E0C8B0', dark: '#5A4434', inkTone: 'dark' },
  /** 상세설정 accent에 있던 중간 톤 — 연한 파스텔과 다크 사이 보완 */
  { id: 'softRed', light: '#E77575', dark: '#7A3A34', inkTone: 'dark' },
  { id: 'softMagenta', light: '#F28EBF', dark: '#6E404C', inkTone: 'dark' },
  { id: 'softFuchsia', light: '#E68DF4', dark: '#4A3858', inkTone: 'dark' },
  { id: 'softViolet', light: '#B89CF9', dark: '#4A3F72', inkTone: 'dark' },
  { id: 'softIndigo', light: '#9FA1F5', dark: '#3A4270', inkTone: 'dark' },
  { id: 'softBlue', light: '#88B3F9', dark: '#2A4568', inkTone: 'dark' },
  { id: 'softSky', light: '#6AC6F0', dark: '#2A5550', inkTone: 'dark' },
  { id: 'softCyan', light: '#5FCEE1', dark: '#1A4E50', inkTone: 'dark' },
  { id: 'softTeal', light: '#61CDC1', dark: '#1A4E50', inkTone: 'dark' },
  { id: 'softGreen', light: '#6DD694', dark: '#3A4E32', inkTone: 'dark' },
  { id: 'softLime', light: '#ADDB67', dark: '#4A6230', inkTone: 'dark' },
  { id: 'softSlate', light: '#919DAE', dark: '#3A4550', inkTone: 'dark' },
  { id: 'navy', light: '#1E3A5F', dark: '#152844', inkTone: 'light' },
  { id: 'darkGreen', light: '#1F4D3A', dark: '#16362A', inkTone: 'light' },
  { id: 'teal', light: '#1A5C5A', dark: '#124240', inkTone: 'light' },
  { id: 'indigo', light: '#2A3A6E', dark: '#1C284C', inkTone: 'light' },
  { id: 'forest', light: '#1A4028', dark: '#12301E', inkTone: 'light' },
  { id: 'burgundy', light: '#6B2D3C', dark: '#4A1E2A', inkTone: 'light' },
  { id: 'wine', light: '#5A2030', dark: '#3E1622', inkTone: 'light' },
  { id: 'plum', light: '#4A3560', dark: '#342440', inkTone: 'light' },
  { id: 'berry', light: '#5A2848', dark: '#3E1C32', inkTone: 'light' },
  { id: 'charcoal', light: '#3A3A42', dark: '#25252C', inkTone: 'light' },
  { id: 'midnight', light: '#1A1A32', dark: '#121224', inkTone: 'light' },
  { id: 'cocoa', light: '#4A3428', dark: '#32241C', inkTone: 'light' },
  { id: 'slate', light: '#3A4550', dark: '#282E36', inkTone: 'light' },
  { id: 'copper', light: '#6A3A28', dark: '#4A281C', inkTone: 'light' },
  { id: 'olive', light: '#3A4A28', dark: '#28341C', inkTone: 'light' },
] as const satisfies readonly RoutineColorPreset[];

export type RoutineColorPresetId = (typeof ROUTINE_COLOR_PRESETS)[number]['id'];

/** 상세설정 accent 저장·선택용 — 라이트 면 hex (소문자) */
export const ROUTINE_COLOR_LIGHT_HEXES = ROUTINE_COLOR_PRESETS.map((row) =>
  row.light.toLowerCase(),
) as readonly string[];

const LIGHT_HEX_TO_PRESET = new Map(
  ROUTINE_COLOR_PRESETS.map((row) => [row.light.toLowerCase(), row] as const),
);

export function findRoutineColorPresetByLightHex(
  hex: string,
): (typeof ROUTINE_COLOR_PRESETS)[number] | undefined {
  return LIGHT_HEX_TO_PRESET.get(hex.trim().toLowerCase());
}

export function isRoutineColorPresetLightHex(hex: string): boolean {
  return LIGHT_HEX_TO_PRESET.has(hex.trim().toLowerCase());
}

/** 아코디언·상세설정 스와치 — 테마에 맞는 면색 */
export function resolveRoutineColorSwatch(lightHex: string, isDark: boolean): string {
  const preset = findRoutineColorPresetByLightHex(lightHex);
  if (!preset) return lightHex;
  return isDark ? preset.dark : preset.light;
}
