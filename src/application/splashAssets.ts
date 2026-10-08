/** 네이티브 스플래시와 동일한 배경 — 퍼즐 벽·회백색 (전환 깜빡임 완화) */
export const SPLASH_BACKGROUND_COLOR = '#F5F4F2';

/** 스플래시 한 화면에 깔 6장 (2열 × 3행) */
export const SPLASH_IMAGE_SOURCES = [
  require('../../assets/splash.webp'),
  require('../../assets/splash2.webp'),
  require('../../assets/splash3.webp'),
  require('../../assets/splash4.webp'),
  require('../../assets/splash5.webp'),
  require('../../assets/splash6.webp'),
] as const;

export type SplashImageSource = (typeof SPLASH_IMAGE_SOURCES)[number];
