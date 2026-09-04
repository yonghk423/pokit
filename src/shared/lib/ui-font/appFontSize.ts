export type AppFontSizeId = 'sm' | 'md' | 'lg';

/** 기본(md)을 기존보다 한 단계 크게 — 작다는 피드백 반영 */
export const DEFAULT_APP_FONT_SIZE_ID: AppFontSizeId = 'md';

export const APP_FONT_SIZE_IDS: readonly AppFontSizeId[] = ['sm', 'md', 'lg'] as const;

/** ThemedText fontSize/lineHeight 배율 — 보통≈기존 크게, 크게는 한 단계 더 */
export const APP_FONT_SIZE_SCALE: Record<AppFontSizeId, number> = {
  sm: 1.0,
  md: 1.24,
  lg: 1.36,
};

export function isAppFontSizeId(value: unknown): value is AppFontSizeId {
  return value === 'sm' || value === 'md' || value === 'lg';
}

export function resolveAppFontSizeScale(sizeId: AppFontSizeId): number {
  return APP_FONT_SIZE_SCALE[sizeId];
}

export function scaleTypeSize(value: number, scale: number): number {
  return Math.round(value * scale * 10) / 10;
}
