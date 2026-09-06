import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PostItFaceColorId =
  | 'yellow'
  | 'mint'
  | 'pink'
  | 'peach'
  | 'lavender'
  | 'white'
  | 'navy'
  | 'darkGreen';

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
  { id: 'yellow', light: '#FFE566', dark: '#8A7618', inkTone: 'dark' },
  { id: 'mint', light: '#A8DADC', dark: '#1A4E50', inkTone: 'dark' },
  { id: 'pink', light: '#F5C6C6', dark: '#7A4545', inkTone: 'dark' },
  { id: 'peach', light: '#FFD8A8', dark: '#8A5A28', inkTone: 'dark' },
  { id: 'lavender', light: '#D4C8F5', dark: '#4A3F72', inkTone: 'dark' },
  { id: 'white', light: '#FFFFFF', dark: '#3A3C52', inkTone: 'dark' },
  { id: 'navy', light: '#1E3A5F', dark: '#152844', inkTone: 'light' },
  { id: 'darkGreen', light: '#1F4D3A', dark: '#16362A', inkTone: 'light' },
] as const;

export const DEFAULT_POST_IT_FACE_COLOR_ID: PostItFaceColorId = 'white';

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
    return {};
  }
  return normalizeByGroup(raw);
}

export function loadPostItFaceColorIdForGroup(groupKey: string): PostItFaceColorId {
  const key = groupKey.trim();
  if (!key) return DEFAULT_POST_IT_FACE_COLOR_ID;
  const map = loadPostItFaceColorByGroup();
  return map[key] ?? DEFAULT_POST_IT_FACE_COLOR_ID;
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
