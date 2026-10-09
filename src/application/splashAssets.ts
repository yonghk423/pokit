import type { ImageSourcePropType } from 'react-native';

/** 네이티브 스플래시와 동일한 배경 — 퍼즐 벽·회백색 (전환 깜빡임 완화) */
export const SPLASH_BACKGROUND_COLOR = '#F5F4F2';

/**
 * 앱 스플래시 — 9칸 루틴 콜라주 (garage-kettlebell 반영본).
 * `assets/splash-routines-9.webp` ≡ `assets/puzzle/collage.webp`
 */
export const SPLASH_COLLAGE_SOURCE = require('../../assets/splash-routines-9.webp') as ImageSourcePropType;

/** @deprecated 단일 콜라주 스플래시로 대체 — 호환용 길이 1 배열 */
export const SPLASH_IMAGE_SOURCES = [SPLASH_COLLAGE_SOURCE] as const;

export type SplashImageSource = (typeof SPLASH_IMAGE_SOURCES)[number];
