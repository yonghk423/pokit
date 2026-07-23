/** 네이티브 스플래시와 동일한 배경 — 전환 깜빡임 완화 */
export const SPLASH_BACKGROUND_COLOR = '#B1C8B6';

/** 스플래시 한 화면에 깔 6장 (2열 × 3행) */
export const SPLASH_IMAGE_SOURCES = [
  require('../../assets/splash.png'),
  require('../../assets/splash2.png'),
  require('../../assets/splash3.png'),
  require('../../assets/splash4.png'),
  require('../../assets/splash5.png'),
  require('../../assets/splash6.png'),
] as const;

export type SplashImageSource = (typeof SPLASH_IMAGE_SOURCES)[number];
