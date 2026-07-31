import type { ImageSourcePropType } from 'react-native';

/**
 * 서비스 소개 슬라이드별 배경 (슬라이드 순서와 1:1).
 * 1: pokit5 · 4: pokit4 · 나머지 splash
 */
export const WELCOME_INTRO_BACKGROUNDS: readonly ImageSourcePropType[] = [
  require('../../../../assets/pokit5.png'),
  require('../../../../assets/splash4.png'),
  require('../../../../assets/splash3.png'),
  require('../../../../assets/pokit4.png'),
  require('../../../../assets/splash5.png'),
] as const;
