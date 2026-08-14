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
 * API 키는 `.env.local` 의 EXPO_PUBLIC_REVENUECAT_* 를 우선하고,
 * 없으면 온보딩 Test 키로 폴백한다. 출시 빌드 전에는 production 키로 교체할 것.
 */

export const REVENUECAT_ENTITLEMENT_PRO = 'pokit_pro' as const;

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
  if (platform === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || shared || FALLBACK_TEST_API_KEY;
  }
  if (platform === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() || shared || FALLBACK_TEST_API_KEY;
  }
  return shared || FALLBACK_TEST_API_KEY;
}
