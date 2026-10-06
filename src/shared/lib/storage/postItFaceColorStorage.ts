import {
  ROUTINE_COLOR_PRESETS,
  type RoutineColorInkTone,
  type RoutineColorPresetId,
} from '@shared/lib/routineColorPresets';

import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PostItFaceColorId = RoutineColorPresetId;

/** 면 위 텍스트·아이콘 — light = 화이트 계열 */
export type PostItFaceInkTone = RoutineColorInkTone;

export type PostItFaceColorPreset = {
  id: PostItFaceColorId;
  /** 라이트 모드 면 색 */
  light: string;
  /** 다크 모드 면 색 */
  dark: string;
  inkTone: PostItFaceInkTone;
};

export type PostItFaceColorByGroup = Record<string, PostItFaceColorId>;

/** 메모지·상세설정 아이콘 색 공통 팔레트 (`routineColorPresets`) */
export const POST_IT_FACE_COLOR_PRESETS: readonly PostItFaceColorPreset[] =
  ROUTINE_COLOR_PRESETS;

export const DEFAULT_POST_IT_FACE_COLOR_ID: PostItFaceColorId = 'white';

/** 오늘 탭 투두 리스트 카드 — 기본 면색 (앱 베이지) */
export const DEFAULT_TODO_LIST_POST_IT_FACE_COLOR_ID: PostItFaceColorId = 'cream';

/** 루틴 탭 플랫 목록 카드 — 기본(상시) 면색 */
export const ROUTINE_CATALOG_FLAT_POST_IT_KEY = 'routine-catalog:flat';

/** 오늘 탭 투두 리스트 카드 — 면색 */
export const TODO_LIST_POST_IT_KEY = 'todo-list:today';

/** 잠금화면 메모(포스트잇) Live Activity — 면색 */
export const QUICK_MEMO_POST_IT_KEY = 'quick-memo:lock';

/** 홈 위젯 기본 면 — 클래식 포스트잇 옐로우 */
export const DEFAULT_WIDGET_POST_IT_FACE_COLOR_ID: PostItFaceColorId = 'yellow';

const ROUTINE_CATALOG_FLAT_FACE_WHITE_MIGRATED_KEY =
  'pokit:routine-catalog-flat-face-white-migrated';

const TODO_LIST_FACE_CREAM_MIGRATED_KEY = 'pokit:todo-list-face-cream-migrated';

export const POST_IT_LIGHT_INK = '#FFFFFF';
export const POST_IT_LIGHT_MUTED = 'rgba(255,255,255,0.72)';
/** 밝은 면 위 기본 잉크 — 테마 onSurface가 밝아도 가독성 유지 */
export const POST_IT_DARK_INK = '#111111';
export const POST_IT_DARK_MUTED = 'rgba(17,17,17,0.55)';

/** WCAG 상대 휘도 — 어두우면 화이트 잉크 */
const LIGHT_INK_LUMINANCE_THRESHOLD = 0.45;

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  let value = hex.trim();
  if (value.startsWith('#')) value = value.slice(1);
  if (value.length === 3) {
    value = value
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (value.length !== 6) return null;
  const n = Number.parseInt(value, 16);
  if (!Number.isFinite(n)) return null;
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
  };
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** `#RRGGBB` 상대 휘도 (0~1). 파싱 실패 시 밝은 면으로 취급 */
export function hexRelativeLuminance(hex: string): number {
  const rgb = parseHexRgb(hex);
  if (!rgb) return 1;
  const r = channelToLinear(rgb.r);
  const g = channelToLinear(rgb.g);
  const b = channelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 실제 면색 hex 기준 — 어두우면 화이트 잉크 */
export function colorHexUsesLightInk(hex: string): boolean {
  return hexRelativeLuminance(hex) < LIGHT_INK_LUMINANCE_THRESHOLD;
}

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

export function resolvePostItFaceColor(
  id: PostItFaceColorId | null | undefined,
  isDark: boolean,
): string {
  const preset = getPostItFaceColorPreset(id);
  return isDark ? preset.dark : preset.light;
}

/**
 * 실제 표시 면색 휘도 기준 — 어두운 면이면 화이트 잉크.
 * `isDark`를 넘기면 다크모드용 `preset.dark` 면색으로 판정한다.
 */
export function postItFaceUsesLightInk(
  id: PostItFaceColorId | null | undefined,
  isDark = false,
): boolean {
  return colorHexUsesLightInk(resolvePostItFaceColor(id, isDark));
}

export function resolvePostItFaceInk(
  id: PostItFaceColorId | null | undefined,
  fallbackInk: string,
  isDark = false,
): string {
  return postItFaceUsesLightInk(id, isDark) ? POST_IT_LIGHT_INK : fallbackInk;
}

export function resolvePostItFaceMuted(
  id: PostItFaceColorId | null | undefined,
  fallbackMuted: string,
  isDark = false,
): string {
  return postItFaceUsesLightInk(id, isDark) ? POST_IT_LIGHT_MUTED : fallbackMuted;
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
