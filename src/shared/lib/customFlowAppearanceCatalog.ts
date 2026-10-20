/** 사용자 커스텀 플로우 전용 아이콘과 이전 강조색 저장값 호환 */

import type { CustomFlowIconCategoryId } from './customFlowIconCategories';
import { SF_SYMBOL_ICON_OPTIONS, type SfSymbolIconName } from './sfSymbolIconOptions.generated';
import { ROUTINE_ILLUSTRATIONS } from './routineIllustrationCatalog';

export type { CustomFlowIconCategoryId } from './customFlowIconCategories';
export {
  CUSTOM_FLOW_ICON_CATEGORY_IDS,
  CUSTOM_FLOW_ICON_CATEGORY_I18N_KEYS,
  resolveCustomFlowIconCategory,
} from './customFlowIconCategories';

export const DEFAULT_CUSTOM_FLOW_ICON = 'routine:journal' as const;
/** 메모지 탠저린과 동일 — 공통 팔레트 light hex */
export const DEFAULT_CUSTOM_FLOW_ACCENT_COLOR = '#ffffff' as const;

/** 선택창은 앱 전용 그림만 제공한다. 기존 SF 저장값은 표시 호환용으로 유지한다. */
export const CUSTOM_FLOW_ICON_OPTIONS: readonly string[] = ROUTINE_ILLUSTRATIONS.map((item) => item.id);
export const CUSTOM_FLOW_ICON_RECOMMENDED = CUSTOM_FLOW_ICON_OPTIONS.slice(0, 10);

/** 저장·표시용 — 런타임 Set으로 검증 (거대 union 타입은 TS 성능상 피함) */
export type CustomFlowIconOption = string;

export type { SfSymbolIconName };

export type CustomFlowAccentColorOption = string;

const ICON_SET = new Set<string>(CUSTOM_FLOW_ICON_OPTIONS as readonly string[]);
const LEGACY_ICON_SET = new Set<string>(SF_SYMBOL_ICON_OPTIONS);

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isAllowedCustomFlowIcon(value: string): value is CustomFlowIconOption {
  return ICON_SET.has(value) || LEGACY_ICON_SET.has(value);
}

export function normalizeCustomFlowIcon(raw: unknown): CustomFlowIconOption | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return isAllowedCustomFlowIcon(trimmed) ? trimmed : undefined;
}

export type FilterCustomFlowIconsOptions = {
  category?: CustomFlowIconCategoryId;
  limit?: number;
};

/** 앱 전용 그림의 다국어 검색·분류. */
export function filterCustomFlowIcons(
  query: string,
  options: FilterCustomFlowIconsOptions = {},
): readonly string[] {
  const { category = 'recommended', limit = Number.POSITIVE_INFINITY } = options;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return ROUTINE_ILLUSTRATIONS.filter((item) => {
    if (category === 'recommended' && tokens.length === 0 && !CUSTOM_FLOW_ICON_RECOMMENDED.includes(item.id)) return false;
    if (category !== 'all' && category !== 'recommended' && item.category !== category) return false;
    const haystack = `${item.id} ${Object.values(item.labels).join(' ')} ${item.keywords}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  }).slice(0, Math.max(0, limit)).map((item) => item.id);
}

export function normalizeCustomFlowAccentColor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!HEX_COLOR_RE.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}
