import type { ImageSourcePropType } from 'react-native';
import type { AppLocale } from '@shared/lib/i18n/model/locale';

/** 네이티브 시작 화면과 언어별 스플래시의 공통 배경. */
export const SPLASH_BACKGROUND_COLOR = '#FEFEFF';

const SPLASH_KO_SOURCE = require('../../assets/icon_header7.webp') as ImageSourcePropType;
const SPLASH_EN_SOURCE = require('../../assets/icon_header_en7.webp') as ImageSourcePropType;

export function getSplashImageSource(locale: AppLocale): ImageSourcePropType {
  return locale === 'ko' ? SPLASH_KO_SOURCE : SPLASH_EN_SOURCE;
}

export const SPLASH_IMAGE_SOURCES = [SPLASH_KO_SOURCE, SPLASH_EN_SOURCE] as const;
export type SplashImageSource = (typeof SPLASH_IMAGE_SOURCES)[number];
