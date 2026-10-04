import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PostItFaceColorId =
  | 'cream'
  | 'sand'
  | 'ivory'
  | 'yellow'
  | 'butter'
  | 'lemon'
  | 'honey'
  | 'peach'
  | 'apricot'
  | 'tangerine'
  | 'coral'
  | 'pink'
  | 'rose'
  | 'blush'
  | 'sakura'
  | 'mint'
  | 'sage'
  | 'melon'
  | 'pistachio'
  | 'aqua'
  | 'seafoam'
  | 'sky'
  | 'powderBlue'
  | 'ice'
  | 'lavender'
  | 'lilac'
  | 'periwinkle'
  | 'grape'
  | 'mauve'
  | 'white'
  | 'taupe'
  | 'mist'
  | 'khaki'
  | 'clay'
  | 'navy'
  | 'darkGreen'
  | 'teal'
  | 'indigo'
  | 'forest'
  | 'burgundy'
  | 'wine'
  | 'plum'
  | 'berry'
  | 'charcoal'
  | 'midnight'
  | 'cocoa'
  | 'slate'
  | 'copper'
  | 'olive';

/** 면 위 텍스트·아이콘 — light = 화이트 계열 */
export type PostItFaceInkTone = 'dark' | 'light';

export type PostItFaceColorPreset = {
  id: PostItFaceColorId;
  /** 라이트 모드 면 색 */
  light: string;
  /** 다크 모드 면 색 */
  dark: string;
  inkTone: PostItFaceInkTone;
};

export type PostItFaceColorByGroup = Record<string, PostItFaceColorId>;

export const POST_IT_FACE_COLOR_PRESETS: readonly PostItFaceColorPreset[] = [
  /** 앱 기본 베이지 (`RetroFlatColors.light.bg`) */
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
] as const;

export const DEFAULT_POST_IT_FACE_COLOR_ID: PostItFaceColorId = 'white';

/** 오늘 탭 투두 리스트 카드 — 기본 면색 (앱 베이지) */
export const DEFAULT_TODO_LIST_POST_IT_FACE_COLOR_ID: PostItFaceColorId = 'cream';

/** 루틴 탭 플랫 목록 카드 — 기본(상시) 면색 */
export const ROUTINE_CATALOG_FLAT_POST_IT_KEY = 'routine-catalog:flat';

/** 오늘 탭 투두 리스트 카드 — 면색 */
export const TODO_LIST_POST_IT_KEY = 'todo-list:today';

const ROUTINE_CATALOG_FLAT_FACE_WHITE_MIGRATED_KEY =
  'pokit:routine-catalog-flat-face-white-migrated';

const TODO_LIST_FACE_CREAM_MIGRATED_KEY = 'pokit:todo-list-face-cream-migrated';

export const POST_IT_LIGHT_INK = '#FFFFFF';
export const POST_IT_LIGHT_MUTED = 'rgba(255,255,255,0.72)';

export function isPostItFaceColorId(value: unknown): value is PostItFaceColorId {
  return (
    typeof value === 'string' &&
    POST_IT_FACE_COLOR_PRESETS.some((preset) => preset.id === value)
  );
}

export function getPostItFaceColorPreset(
  id: PostItFaceColorId | null | undefined,
): PostItFaceColorPreset {
  return (
    POST_IT_FACE_COLOR_PRESETS.find((row) => row.id === id) ??
    POST_IT_FACE_COLOR_PRESETS.find((row) => row.id === DEFAULT_POST_IT_FACE_COLOR_ID)!
  );
}

/** 어두운 면(네이비·다크 그린 등) — 화이트 잉크 필요 */
export function postItFaceUsesLightInk(
  id: PostItFaceColorId | null | undefined,
): boolean {
  return getPostItFaceColorPreset(id).inkTone === 'light';
}

export function resolvePostItFaceColor(
  id: PostItFaceColorId | null | undefined,
  isDark: boolean,
): string {
  const preset = getPostItFaceColorPreset(id);
  return isDark ? preset.dark : preset.light;
}

export function resolvePostItFaceInk(
  id: PostItFaceColorId | null | undefined,
  fallbackInk: string,
): string {
  return postItFaceUsesLightInk(id) ? POST_IT_LIGHT_INK : fallbackInk;
}

export function resolvePostItFaceMuted(
  id: PostItFaceColorId | null | undefined,
  fallbackMuted: string,
): string {
  return postItFaceUsesLightInk(id) ? POST_IT_LIGHT_MUTED : fallbackMuted;
}

function normalizeByGroup(raw: unknown): PostItFaceColorByGroup {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: PostItFaceColorByGroup = {};
  for (const [groupKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = groupKey.trim();
    if (!key || !isPostItFaceColorId(value)) continue;
    out[key] = value;
  }
  return out;
}

/** 묶음(그룹)별 포스트잇 면 색 — 레거시 전역 문자열은 무시하고 맵만 사용 */
export function loadPostItFaceColorByGroup(): PostItFaceColorByGroup {
  const raw = localStorageClient.getJson<unknown>(StorageKeys.postItFaceColor);
  if (typeof raw === 'string') {
    return migrateTodoListFaceToCream(migrateRoutineCatalogFlatFaceToWhite({}));
  }
  return migrateTodoListFaceToCream(migrateRoutineCatalogFlatFaceToWhite(normalizeByGroup(raw)));
}

/** 루틴 목록 상시 면색을 화이트로 맞춘다 (1회) */
function migrateRoutineCatalogFlatFaceToWhite(
  map: PostItFaceColorByGroup,
): PostItFaceColorByGroup {
  if (localStorageClient.getItemRaw(ROUTINE_CATALOG_FLAT_FACE_WHITE_MIGRATED_KEY) === '1') {
    return map;
  }
  const next = { ...map, [ROUTINE_CATALOG_FLAT_POST_IT_KEY]: 'white' as const };
  localStorageClient.setJson(StorageKeys.postItFaceColor, next);
  localStorageClient.setItemRaw(ROUTINE_CATALOG_FLAT_FACE_WHITE_MIGRATED_KEY, '1');
  return next;
}

/** 투두 리스트 기본 면색을 앱 베이지(cream)로 맞춘다 (1회) */
function migrateTodoListFaceToCream(map: PostItFaceColorByGroup): PostItFaceColorByGroup {
  if (localStorageClient.getItemRaw(TODO_LIST_FACE_CREAM_MIGRATED_KEY) === '1') {
    return map;
  }
  const next = {
    ...map,
    [TODO_LIST_POST_IT_KEY]: DEFAULT_TODO_LIST_POST_IT_FACE_COLOR_ID,
  };
  localStorageClient.setJson(StorageKeys.postItFaceColor, next);
  localStorageClient.setItemRaw(TODO_LIST_FACE_CREAM_MIGRATED_KEY, '1');
  return next;
}

export function loadPostItFaceColorIdForGroup(groupKey: string): PostItFaceColorId {
  const key = groupKey.trim();
  if (!key) return DEFAULT_POST_IT_FACE_COLOR_ID;
  const map = loadPostItFaceColorByGroup();
  if (map[key] != null) return map[key]!;
  if (key === TODO_LIST_POST_IT_KEY) return DEFAULT_TODO_LIST_POST_IT_FACE_COLOR_ID;
  return DEFAULT_POST_IT_FACE_COLOR_ID;
}

export function savePostItFaceColorForGroup(
  groupKey: string,
  id: PostItFaceColorId,
): PostItFaceColorByGroup {
  const key = groupKey.trim();
  if (!key || !isPostItFaceColorId(id)) return loadPostItFaceColorByGroup();
  const next = { ...loadPostItFaceColorByGroup(), [key]: id };
  localStorageClient.setJson(StorageKeys.postItFaceColor, next);
  return next;
}

/** @deprecated 전역 단일 색 — 그룹별 API 사용 */
export function loadPostItFaceColorId(): PostItFaceColorId {
  return DEFAULT_POST_IT_FACE_COLOR_ID;
}

/** @deprecated 전역 단일 색 — 그룹별 API 사용 */
export function savePostItFaceColorId(id: PostItFaceColorId): void {
  if (!isPostItFaceColorId(id)) return;
}
