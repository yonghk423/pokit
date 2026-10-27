import type { AppLocale } from '@shared/lib/i18n';

/** App Store Connect 앱 ID (POKIT) */
export const APP_STORE_IOS_ID = '6762331629';

/** Google Play 패키지명 */
export const PLAY_STORE_PACKAGE_ID = 'com.yonghee.pokit';

/** 앱 UI 로케일 → App Store 스토어프론트 경로 */
export function appStoreStorefrontPath(locale: AppLocale | string | undefined): 'kr' | 'us' | 'jp' | 'tw' {
  if (locale === 'ko') return 'kr';
  if (locale === 'ja') return 'jp';
  if (locale === 'zh-TW') return 'tw';
  return 'us';
}

type StoreUrlOptions = {
  /** 앱 UI 로케일. iOS 링크 미리보기·스토어 페이지 언어에 영향 */
  locale?: AppLocale | string;
};

/** 스토어 앱 상세(공유·열기용). 리뷰 작성 파라미터 없음 */
export function getAppStoreListingUrl(
  platform: 'ios' | 'android' | 'web' | string,
  options?: StoreUrlOptions,
): string {
  if (platform === 'android') {
    return `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE_ID}`;
  }
  const storefront = appStoreStorefrontPath(options?.locale);
  return `https://apps.apple.com/${storefront}/app/id${APP_STORE_IOS_ID}`;
}

/** iOS: `action=write-review` → 리뷰 작성 시트. Android: 스토어 상세(리뷰 작성 가능) */
export function getAppStoreWriteReviewUrl(
  platform: 'ios' | 'android' | 'web' | string,
  options?: StoreUrlOptions,
): string {
  if (platform === 'android') {
    return getAppStoreListingUrl('android', options);
  }
  return `${getAppStoreListingUrl('ios', options)}?action=write-review`;
}

/**
 * iOS App Store 앱으로 바로 여는 write-review 딥링크.
 * https 링크가 막히거나 브라우저로만 열릴 때 폴백용.
 */
export function getAppStoreWriteReviewItmsUrl(): string {
  return `itms-apps://itunes.apple.com/app/id${APP_STORE_IOS_ID}?action=write-review`;
}
