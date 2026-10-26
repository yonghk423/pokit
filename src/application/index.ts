/**
 * FSD App layer.
 * 앱 전역 프로바이더, 스타일, 진입점 관련 로직을 둡니다.
 * Expo Router의 app/ 은 라우팅만 담당하고, 여기서는 앱 레벨 로직/프로바이더를 export 합니다.
 */

export { AnalyticsScreenTracker } from './AnalyticsScreenTracker';
export { resolveStatusBarStyle } from './AppStatusBar';
export { SPLASH_BACKGROUND_COLOR } from './splashAssets';
export { resetAppStatusBarCache, syncAppStatusBar } from '@shared/lib/status-bar/appStatusBar';
export { useAppBootstrap } from './useAppBootstrap';
export { useAnalyticsScreenViews } from './useAnalyticsScreenViews';
export { useCityPopFonts } from './useCityPopFonts';
