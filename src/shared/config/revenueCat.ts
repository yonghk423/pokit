import { FEATURE_FLAGS } from '@shared/config/featureFlags';
/**
 * RevenueCat 공개 SDK 키·엔타이틀먼트·상품 식별자.
 *
 * 대시보드 Entitlement Identifier 는 반드시 `daylight_pro` 로 맞춘다.
 * 앱 표시 이름은 `Daylight Pro`, 결제 내부 식별자는 `daylight_pro`이다.
 *
 * Offering 패키지:
 * - monthly → Product: monthly
 * - yearly → Product: yearly
 * - lifetime → Product: lifetime
 *
 * API 키는 EXPO_PUBLIC_REVENUECAT_* 환경 변수를 우선한다.
 * 개발·배포 모두 앱 SDK 키를 사용하며 키가 없으면 설정을 건너뛴다.
 */

export const REVENUECAT_ENTITLEMENT_PRO = 'daylight_pro' as const;

/** 개발 빌드는 연동하며, 배포 빌드는 판매 준비 후 명시적으로 활성화한다. */
export const REVENUECAT_ENABLED = FEATURE_FLAGS.proSubscriptions && (__DEV__ || process.env.EXPO_PUBLIC_REVENUECAT_ENABLED === 'true');

/** Offering 에 붙일 스토어 Product identifier (App Store / Play 와 동일하게) */
export const REVENUECAT_PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
} as const;

/** Development uses the real app SDK key too; StoreKit Sandbox handles test purchases. */
export function getRevenueCatApiKey(platform: string): string | null {
  const key = (platform === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY :
    platform === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY : undefined)?.trim()
    || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
  if (platform === 'ios') return key?.startsWith('appl_') ? key : null;
  if (platform === 'android') return key?.startsWith('goog_') ? key : null;
  return null;
}
