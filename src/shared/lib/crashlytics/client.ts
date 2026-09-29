import { Platform } from 'react-native';

import { postSlackCrashAlert } from './slackCrashAlert';

/**
 * Firebase Crashlytics 공용 클라이언트.
 * 네이티브 모듈이 없는 빌드(Expo Go 등)에서도 앱 시작을 막지 않도록 try/catch.
 */
async function getNativeCrashlytics() {
  const {
    getCrashlytics,
    setCrashlyticsCollectionEnabled,
  } = await import('@react-native-firebase/crashlytics');
  const crashlytics = getCrashlytics();
  await setCrashlyticsCollectionEnabled(crashlytics, true);
  return crashlytics;
}

let didInit = false;

/** 수집 활성화 + JS 미처리 예외를 Crashlytics에 기록 + (가능 시) Slack POST */
export async function initCrashlytics(): Promise<void> {
  if (Platform.OS !== 'ios' || didInit) return;
  try {
    const { log, recordError, didCrashOnPreviousExecution } = await import(
      '@react-native-firebase/crashlytics'
    );
    const crashlytics = await getNativeCrashlytics();
    didInit = true;

    log(crashlytics, 'crashlytics_initialized');

    // 네이티브 크래시는 프로세스 종료로 직전 POST가 실패할 수 있어, 다음 실행에서 알림
    try {
      const crashed = await didCrashOnPreviousExecution(crashlytics);
      if (crashed) {
        void postSlackCrashAlert({
          kind: 'previous_execution',
          title: '이전 실행에서 네이티브 크래시 감지',
          detail: 'didCrashOnPreviousExecution=true',
        });
      }
    } catch {
      /* API 버전/미지원 시 무시 */
    }

    const ErrorUtils = (globalThis as { ErrorUtils?: {
      getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
    } }).ErrorUtils;
    if (!ErrorUtils?.getGlobalHandler || !ErrorUtils.setGlobalHandler) return;

    const previous = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      try {
        recordError(crashlytics, error, isFatal ? 'FatalJSError' : 'NonFatalJSError');
      } catch {
        /* native 미연동 시 무시 */
      }
      void postSlackCrashAlert({
        kind: isFatal ? 'fatal_js' : 'non_fatal_js',
        title: isFatal ? 'JS Fatal 예외' : 'JS Non-fatal 예외',
        detail: `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}\n${error?.stack ?? ''}`,
      });
      previous?.(error, isFatal);
    });
  } catch (error) {
    console.warn('[crashlytics] init failed', error);
  }
}

export async function logCrashlytics(message: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const text = message.trim();
  if (!text) return;
  try {
    const { log } = await import('@react-native-firebase/crashlytics');
    const crashlytics = await getNativeCrashlytics();
    log(crashlytics, text.slice(0, 500));
  } catch (error) {
    console.warn('[crashlytics] log failed', error);
  }
}

export async function recordCrashlyticsError(error: unknown, name?: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const { recordError } = await import('@react-native-firebase/crashlytics');
    const crashlytics = await getNativeCrashlytics();
    const err = error instanceof Error ? error : new Error(String(error));
    recordError(crashlytics, err, name);
    void postSlackCrashAlert({
      kind: 'recorded',
      title: name ? `기록된 에러 (${name})` : '기록된 에러',
      detail: `${err.name}: ${err.message}\n${err.stack ?? ''}`,
    });
  } catch (e) {
    console.warn('[crashlytics] recordError failed', e);
  }
}
