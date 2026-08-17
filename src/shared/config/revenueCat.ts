/**
 * RevenueCat 공개 SDK 키·엔타이틀먼트·상품 식별자.
 *
 * 대시보드 Entitlement Identifier 는 반드시 `pokit_pro` 로 맞춘다.
 * (표시 이름은 「POKIT Pro」 등으로 둬도 됨.)
 *
 * Offering 패키지:
 * - monthly → Product: monthly
 * - yearly → Product: yearly
 * - lifetime → Product: lifetime
 *
 * API 키는 EXPO_PUBLIC_REVENUECAT_* 환경 변수를 우선한다.
 * 개발 빌드에서만 온보딩 Test 키로 폴백하며, 배포 빌드는 키가 없으면 설정을 건너뛴다.
 */

export const REVENUECAT_ENTITLEMENT_PRO = 'pokit_pro' as const;

/**
 * App Store 상품·RevenueCat Offering 준비가 끝날 때까지 SDK 초기화를 중단한다.
 * 판매 준비 완료 후 true로 바꾸고 샌드박스 구매·복원을 검증한다.
 */
export const REVENUECAT_ENABLED = false;

/** Offering 에 붙일 스토어 Product identifier (App Store / Play 와 동일하게) */
export const REVENUECAT_PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
} as const;

const FALLBACK_TEST_API_KEY = 'test_rCafnJQaqbCdcLovsnhhvYdKKSV';

export function getRevenueCatApiKey(platform: 'ios' | 'android' | 'web' | string): string | null {
  if (platform === 'web') return null;

  const shared = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
  const developmentFallback = __DEV__ ? FALLBACK_TEST_API_KEY : null;
  if (platform === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || shared || developmentFallback;
  }
  if (platform === 'android') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() || shared || developmentFallback
    );
  }
  return shared || developmentFallback;
}
