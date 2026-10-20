export type AppFontSizeId = 'sm' | 'smMd' | 'md' | 'mdLg' | 'lg';

/** 앱 기본 글씨 크기 — 작게 */
export const DEFAULT_APP_FONT_SIZE_ID: AppFontSizeId = 'sm';

export const APP_FONT_SIZE_IDS: readonly AppFontSizeId[] = ['sm', 'smMd', 'md', 'mdLg', 'lg'] as const;

/** ThemedText fontSize/lineHeight 배율 — 기존 3단계 크기 사이에 중간값 추가 */
export const APP_FONT_SIZE_SCALE: Record<AppFontSizeId, number> = {
  sm: 1.0,
  smMd: 1.12,
  md: 1.24,
  mdLg: 1.30,
  lg: 1.36,
};

export function isAppFontSizeId(value: unknown): value is AppFontSizeId {
  return value === 'sm' || value === 'smMd' || value === 'md' || value === 'mdLg' || value === 'lg';
}

export function resolveAppFontSizeScale(sizeId: AppFontSizeId): number {
  return APP_FONT_SIZE_SCALE[sizeId];
}

export function scaleTypeSize(value: number, scale: number): number {
  return Math.round(value * scale * 10) / 10;
}
