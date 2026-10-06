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
export type PostItInkColorPreset = {
  id: string;
  /** 실제 글자색. `auto`는 빈 문자열 — resolve 시 면색 기준 */
  hex: string;
};

export const POST_IT_INK_COLOR_PRESETS = [
  { id: 'auto', hex: '' },
  { id: 'black', hex: POST_IT_DARK_INK },
  { id: 'white', hex: POST_IT_LIGHT_INK },
  /** 뉴트럴 */
  { id: 'charcoal', hex: '#3A3A42' },
  { id: 'graphite', hex: '#4A4A55' },
  { id: 'slate', hex: '#3A4550' },
  { id: 'stone', hex: '#5C564E' },
  { id: 'silver', hex: '#8A8A96' },
  /** 블루 */
  { id: 'navy', hex: '#1E3A5F' },
  { id: 'indigo', hex: '#2A3A6E' },
  { id: 'cobalt', hex: '#1F4E8C' },
  { id: 'sky', hex: '#2E6B9E' },
  { id: 'azure', hex: '#2F7DB5' },
  { id: 'denim', hex: '#3D5A80' },
  { id: 'iceBlue', hex: '#4A7FA0' },
  /** 그린·틸 */
  { id: 'forest', hex: '#1A4028' },
  { id: 'moss', hex: '#3A4A28' },
  { id: 'olive', hex: '#4A5A28' },
  { id: 'emerald', hex: '#1E6B48' },
  { id: 'teal', hex: '#1A5C5A' },
  { id: 'ocean', hex: '#156B75' },
  { id: 'seafoam', hex: '#2A7A68' },
  { id: 'lime', hex: '#5A8A28' },
  /** 레드·핑크·브라운 */
  { id: 'burgundy', hex: '#6B2D3C' },
  { id: 'wine', hex: '#5A2030' },
  { id: 'crimson', hex: '#A82838' },
  { id: 'coral', hex: '#E85D4C' },
  { id: 'rust', hex: '#B04A2E' },
  { id: 'terracotta', hex: '#C45C3A' },
  { id: 'copper', hex: '#8A4A28' },
  { id: 'cocoa', hex: '#4A3428' },
  { id: 'coffee', hex: '#5C4030' },
  { id: 'rose', hex: '#C45A78' },
  { id: 'raspberry', hex: '#B03058' },
  { id: 'hotPink', hex: '#D63B7A' },
  { id: 'magenta', hex: '#B03A8A' },
  { id: 'blush', hex: '#D47890' },
  /** 퍼플 */
  { id: 'purple', hex: '#6B4C9A' },
  { id: 'plum', hex: '#4A3560' },
  { id: 'violet', hex: '#5C3D9E' },
  { id: 'grape', hex: '#6A4580' },
  { id: 'lavender', hex: '#7A6AA8' },
  /** 웜 액센트 */
  { id: 'orange', hex: '#E67E22' },
  { id: 'tangerine', hex: '#E06A20' },
  { id: 'amber', hex: '#D4920A' },
  { id: 'gold', hex: '#C9A227' },
  { id: 'mustard', hex: '#B8941E' },
  { id: 'apricot', hex: '#D4844A' },
] as const satisfies readonly PostItInkColorPreset[];

export type PostItInkColorId = (typeof POST_IT_INK_COLOR_PRESETS)[number]['id'];

export type PostItInkColorByGroup = Record<string, PostItInkColorId>;

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
