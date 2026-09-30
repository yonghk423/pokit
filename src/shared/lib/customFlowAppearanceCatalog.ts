/** 사용자 커스텀 플로우 생성·표시용 SF Symbol·강조색 팔레트 */

import { expandCustomFlowIconSearchTokens } from './customFlowIconSearchAliases';
import {
  iconMatchesCategory,
  type CustomFlowIconCategoryId,
} from './customFlowIconCategories';
import {
  SF_SYMBOL_ICON_OPTIONS,
  type SfSymbolIconName,
} from './sfSymbolIconOptions.generated';

export type { CustomFlowIconCategoryId } from './customFlowIconCategories';
export {
  CUSTOM_FLOW_ICON_CATEGORY_IDS,
  CUSTOM_FLOW_ICON_CATEGORY_I18N_KEYS,
  resolveCustomFlowIconCategory,
} from './customFlowIconCategories';

export const DEFAULT_CUSTOM_FLOW_ICON = 'person.fill' as const;
export const DEFAULT_CUSTOM_FLOW_ACCENT_COLOR = '#f97316' as const;

/**
 * 피커 기본 노출(추천) — 검색 전 빠른 선택용.
 * 전체 목록은 `CUSTOM_FLOW_ICON_OPTIONS`(큐레이션 ~1000개).
 */
export const CUSTOM_FLOW_ICON_RECOMMENDED = [
  'person.fill',
  'hand.raised.fill',
  'star.fill',
  'heart.fill',
  'flame.fill',
  'leaf.fill',
  'flag.fill',
  'drop.fill',
  'hands.sparkles.fill',
  'cross.case.fill',
  'pill.fill',
  'pills.fill',
  'scalemass.fill',
  'figure.stand',
  'figure.run',
  'figure.yoga',
  'figure.flexibility',
  'figure.walk',
  'figure.mind.and.body',
  'figure.hiking',
  'dumbbell.fill',
  'moon.fill',
  'moon.zzz.fill',
  'wind',
  'sparkles',
  'eye',
  'book.fill',
  'book.closed.fill',
  'graduationcap.fill',
  'calendar.badge.clock',
  'square.and.pencil',
  'character.bubble',
  'paintpalette.fill',
  'paintbrush.pointed.fill',
  'brain',
  'brain.head.profile',
  'timer',
  'headphones',
  'newspaper.fill',
  'tray.2.fill',
  'bag.fill',
  'cart.fill',
  'phone.fill',
  'person.2.fill',
  'person.3.fill',
  'heart.circle.fill',
  'heart.text.square.fill',
  'camera.fill',
  'guitars.fill',
  'frying.pan.fill',
  'tortoise.fill',
  'chevron.left.forwardslash.chevron.right',
] as const;

/** 기기 SF Symbol 중 루틴 피커용으로 큐레이션한 목록 (~1000) */
export const CUSTOM_FLOW_ICON_OPTIONS = SF_SYMBOL_ICON_OPTIONS;

/** 저장·표시용 — 런타임 Set으로 검증 (거대 union 타입은 TS 성능상 피함) */
export type CustomFlowIconOption = string;

export type { SfSymbolIconName };

export const CUSTOM_FLOW_ACCENT_COLOR_OPTIONS = [
  '#f97316',
  '#ea580c',
  '#dc2626',
  '#e11d48',
  '#ec4899',
  '#d946ef',
  '#a855f7',
  '#8b5cf6',
  '#6366f1',
  '#3b82f6',
  '#2563eb',
  '#0891b2',
  '#14b8a6',
  '#10b981',
  '#22c55e',
  '#16a34a',
  '#ca8a04',
  '#f59e0b',
  '#e9a23b',
  '#64748b',
  '#0ea5e9',
] as const;

export type CustomFlowAccentColorOption = string;

const ICON_SET = new Set<string>(CUSTOM_FLOW_ICON_OPTIONS as readonly string[]);
const RECOMMENDED_SET = new Set<string>(CUSTOM_FLOW_ICON_RECOMMENDED as readonly string[]);

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isAllowedCustomFlowIcon(value: string): value is CustomFlowIconOption {
  return ICON_SET.has(value);
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

/** 검색·분류·브라우즈용 아이콘 목록. 빈 검색+추천 분류는 추천만, 전체는 추천→나머지 순 */
export function filterCustomFlowIcons(
  query: string,
  options: FilterCustomFlowIconsOptions = {},
): readonly string[] {
  const { category = 'recommended', limit = Number.POSITIVE_INFINITY } = options;
  const q = query.trim();
  const tokens = q ? expandCustomFlowIconSearchTokens(q) : null;
  // 검색 중에는 추천 탭도 전체(~1000)에서 찾는다. (추천만 보면 축구·휴지통 등이 0건)
  const browseCategory = q && category === 'recommended' ? 'all' : category;

  const matchesQuery = (name: string) => {
    if (!tokens) return true;
    return tokens.some((token) => name.includes(token));
  };

  if (!q && category === 'recommended') {
    return (CUSTOM_FLOW_ICON_RECOMMENDED as readonly string[]).slice(
      0,
      Math.min(limit, CUSTOM_FLOW_ICON_RECOMMENDED.length),
    );
  }

  if (!q && category === 'all') {
    const recommended = CUSTOM_FLOW_ICON_RECOMMENDED as readonly string[];
    if (limit <= recommended.length) return recommended.slice(0, limit);
    const out: string[] = [...recommended];
    for (const name of CUSTOM_FLOW_ICON_OPTIONS) {
      if (RECOMMENDED_SET.has(name)) continue;
      out.push(name);
      if (out.length >= limit) break;
    }
    return out;
  }

  const out: string[] = [];
  const source =
    browseCategory === 'recommended'
      ? (CUSTOM_FLOW_ICON_RECOMMENDED as readonly string[])
      : CUSTOM_FLOW_ICON_OPTIONS;

  for (const name of source) {
    if (!iconMatchesCategory(name, browseCategory, RECOMMENDED_SET)) continue;
    if (!matchesQuery(name)) continue;
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

export function isPresetCustomFlowAccentColor(value: string): boolean {
  return (CUSTOM_FLOW_ACCENT_COLOR_OPTIONS as readonly string[]).includes(value.toLowerCase());
}

export function normalizeCustomFlowAccentColor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!HEX_COLOR_RE.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}
