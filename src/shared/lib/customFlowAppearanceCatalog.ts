/** 사용자 커스텀 플로우 생성·표시용 SF Symbol·강조색 팔레트 */

export const DEFAULT_CUSTOM_FLOW_ICON = 'person.fill' as const;
export const DEFAULT_CUSTOM_FLOW_ACCENT_COLOR = '#f97316' as const;

/** 담기·기본 플로우에서 쓰는 SF Symbol — 신규 루틴 선택지 */
export const CUSTOM_FLOW_ICON_OPTIONS = [
  'person.fill',
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
  'figure.stand',
  'figure.run',
  'figure.yoga',
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

export type CustomFlowIconOption = (typeof CUSTOM_FLOW_ICON_OPTIONS)[number];

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
  '#64748b',
  '#0ea5e9',
] as const;

export type CustomFlowAccentColorOption = string;

const ICON_SET = new Set<string>(CUSTOM_FLOW_ICON_OPTIONS);

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isAllowedCustomFlowIcon(value: string): value is CustomFlowIconOption {
  return ICON_SET.has(value);
}

export function normalizeCustomFlowIcon(raw: unknown): CustomFlowIconOption | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return isAllowedCustomFlowIcon(trimmed) ? trimmed : undefined;
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
