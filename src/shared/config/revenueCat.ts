/**
 * RevenueCat 공개 SDK 키·엔타이틀먼트·상품 식별자.
 *
 * 대시보드 Entitlement Identifier 는 반드시 `yourday_pro` 로 맞춘다.
 * 표시 이름은 `yourday pro`, 내부 식별자는 `yourday_pro`이다.
 *
 * Offering 패키지:
 * - monthly → Product: monthly
 * - yearly → Product: yearly
 * - lifetime → Product: lifetime
 *
 * API 키는 EXPO_PUBLIC_REVENUECAT_* 환경 변수를 우선한다.
 * 개발 빌드에서만 온보딩 Test 키로 폴백하며, 배포 빌드는 키가 없으면 설정을 건너뛴다.
 */

export const REVENUECAT_ENTITLEMENT_PRO = 'yourday_pro' as const;

/** 개발 빌드는 연동하며, 배포 빌드는 판매 준비 후 명시적으로 활성화한다. */
export const REVENUECAT_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_REVENUECAT_ENABLED === 'true';

/** Offering 에 붙일 스토어 Product identifier (App Store / Play 와 동일하게) */
export const REVENUECAT_PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
} as const;

const FALLBACK_TEST_API_KEY = 'test_rCafnJQaqbCdcLovsnhhvYdKKSV';

export function getRevenueCatApiKey(platform: 'ios' | 'android' | 'web' | string): string | null {
  if (platform === 'web') return null;
  const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim();
  if (__DEV__ && testKey?.startsWith('test_')) return testKey;

  const shared = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
  const developmentFallback = __DEV__ ? FALLBACK_TEST_API_KEY : null;
  if (platform === 'ios') {
    const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || shared || developmentFallback;
    return !__DEV__ && key?.startsWith('test_') ? null : key;
  }
  if (platform === 'android') {
    const key = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() || shared || developmentFallback;
    return !__DEV__ && key?.startsWith('test_') ? null : key;
  }
  return shared || developmentFallback;
}
