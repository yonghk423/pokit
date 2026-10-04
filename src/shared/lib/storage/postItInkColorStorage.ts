import { localStorageClient } from './localStorageClient';
import {
  colorHexUsesLightInk,
  POST_IT_DARK_INK,
  POST_IT_LIGHT_INK,
  resolvePostItFaceColor,
  type PostItFaceColorId,
} from './postItFaceColorStorage';
import { StorageKeys } from './storageKeys';

/**
 * 잠금화면 포스트잇 글자색.
 * `auto` = 면색 밝기에 따라 검정/화이트.
 */
export type PostItInkColorId =
  | 'auto'
  | 'black'
  | 'white'
  | 'charcoal'
  | 'navy'
  | 'burgundy'
  | 'forest'
  | 'teal'
  | 'coral'
  | 'orange'
  | 'gold'
  | 'sky'
  | 'purple'
  | 'hotPink';

export type PostItInkColorPreset = {
  id: PostItInkColorId;
  /** 실제 글자색. `auto`는 빈 문자열 — resolve 시 면색 기준 */
  hex: string;
};

export type PostItInkColorByGroup = Record<string, PostItInkColorId>;

export const POST_IT_INK_COLOR_PRESETS: readonly PostItInkColorPreset[] = [
  { id: 'auto', hex: '' },
  { id: 'black', hex: POST_IT_DARK_INK },
  { id: 'white', hex: POST_IT_LIGHT_INK },
  { id: 'charcoal', hex: '#3A3A42' },
  { id: 'navy', hex: '#1E3A5F' },
  { id: 'burgundy', hex: '#6B2D3C' },
  { id: 'forest', hex: '#1A4028' },
  { id: 'teal', hex: '#1A5C5A' },
  { id: 'coral', hex: '#E85D4C' },
  { id: 'orange', hex: '#E67E22' },
  { id: 'gold', hex: '#C9A227' },
  { id: 'sky', hex: '#2E6B9E' },
  { id: 'purple', hex: '#6B4C9A' },
  { id: 'hotPink', hex: '#D63B7A' },
] as const;

export const DEFAULT_POST_IT_INK_COLOR_ID: PostItInkColorId = 'auto';

/** 잠금화면 메모(포스트잇) Live Activity — 글자색 (면색 키와 동일 그룹) */
export const QUICK_MEMO_POST_IT_INK_KEY = 'quick-memo:lock';

export function isPostItInkColorId(value: unknown): value is PostItInkColorId {
  return (
    typeof value === 'string' &&
    POST_IT_INK_COLOR_PRESETS.some((preset) => preset.id === value)
  );
}

export function getPostItInkColorPreset(
  id: PostItInkColorId | null | undefined,
): PostItInkColorPreset {
  return (
    POST_IT_INK_COLOR_PRESETS.find((row) => row.id === id) ??
    POST_IT_INK_COLOR_PRESETS.find((row) => row.id === DEFAULT_POST_IT_INK_COLOR_ID)!
  );
}

/**
 * 선택 잉크 → 실제 hex.
 * `auto`면 면색 휘도로 검정/화이트.
 */
export function resolvePostItInkHex(
  inkId: PostItInkColorId | null | undefined,
  faceId: PostItFaceColorId | null | undefined,
  isDark = false,
): string {
  const preset = getPostItInkColorPreset(inkId);
  if (preset.id !== 'auto' && preset.hex.length > 0) return preset.hex;
  const faceHex = resolvePostItFaceColor(faceId, isDark);
  return colorHexUsesLightInk(faceHex) ? POST_IT_LIGHT_INK : POST_IT_DARK_INK;
}

/** 글자색이 밝으면 밝은 muted, 어두우면 어두운 muted */
export function resolvePostItInkMuted(inkHex: string): string {
  // colorHexUsesLightInk = 배경이 어두움 → 여기선 잉크 휘도가 높으면(밝으면) true가 아님
  // 잉크 hex 자체가 밝으면(!dark) muted도 화이트 계열
  return hexLooksLight(inkHex) ? 'rgba(255,255,255,0.72)' : 'rgba(17,17,17,0.55)';
}

function hexLooksLight(hex: string): boolean {
  return !colorHexUsesLightInk(hex);
}

function normalizeByGroup(raw: unknown): PostItInkColorByGroup {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: PostItInkColorByGroup = {};
  for (const [groupKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = groupKey.trim();
    if (!key || !isPostItInkColorId(value)) continue;
    out[key] = value;
  }
  return out;
}

export function loadPostItInkColorByGroup(): PostItInkColorByGroup {
  const raw = localStorageClient.getJson<unknown>(StorageKeys.postItInkColor);
  return normalizeByGroup(raw);
}

export function loadPostItInkColorIdForGroup(groupKey: string): PostItInkColorId {
  const key = groupKey.trim();
  if (!key) return DEFAULT_POST_IT_INK_COLOR_ID;
  const map = loadPostItInkColorByGroup();
  return map[key] ?? DEFAULT_POST_IT_INK_COLOR_ID;
}

export function savePostItInkColorForGroup(
  groupKey: string,
  id: PostItInkColorId,
): PostItInkColorByGroup {
  const key = groupKey.trim();
  if (!key || !isPostItInkColorId(id)) return loadPostItInkColorByGroup();
  const next = { ...loadPostItInkColorByGroup(), [key]: id };
  localStorageClient.setJson(StorageKeys.postItInkColor, next);
  return next;
}
