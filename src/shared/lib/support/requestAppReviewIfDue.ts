import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import {
  loadAppReviewPrompt,
  loadDailyRhythmOnboardingCompleted,
  loadHistoryDailyStats,
  saveAppReviewPrompt,
  type AppReviewPromptRow,
} from '@shared/lib/storage';

import { decideAppReviewPrompt, hasPriorCalendarDayUse, localCalendarDateKey } from './appReviewEligibility';

type ExpoStoreReviewNative = {
  isAvailableAsync?: () => Promise<boolean>;
  requestReview?: () => Promise<void>;
};

/**
 * `expo-store-review`를 직접 import하면 네이티브 모듈이 없는 개발 빌드에서
 * 시작 시점에 예외가 난다. 모듈이 있을 때만 시스템 평가 창을 연다.
 */
async function requestSystemAppReview(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const native = requireOptionalNativeModule<ExpoStoreReviewNative>('ExpoStoreReview');
  if (!native?.requestReview) return false;
  try {
    if (native.isAvailableAsync && !(await native.isAvailableAsync())) return false;
    await native.requestReview();
    return true;
  } catch {
    return false;
  }
}

function sameRecord(a: AppReviewPromptRow | null, b: AppReviewPromptRow): boolean {
  return a?.firstOpenedAt === b.firstOpenedAt && a?.requestedAt === b.requestedAt;
}

/** 스플래시가 닫힌 뒤 한 번 호출한다. 조건이 아니면 아무 창도 열지 않는다. */
export async function requestAppReviewIfDue(nowMs = Date.now()): Promise<void> {
  try {
    const existing = loadAppReviewPrompt();
    const todayKey = localCalendarDateKey(nowMs);
    const decision = decideAppReviewPrompt({
      record: existing,
      nowMs,
      todayKey,
      priorDayUse: hasPriorCalendarDayUse(
        loadHistoryDailyStats().map((row) => row.dateKey),
        todayKey,
      ),
      setupComplete: loadDailyRhythmOnboardingCompleted(),
    });

    if (!decision.request) {
      if (!sameRecord(existing, decision.record)) saveAppReviewPrompt(decision.record);
      return;
    }

    const asked = await requestSystemAppReview();
    const next = asked
      ? decision.record
      : { firstOpenedAt: decision.record.firstOpenedAt };
    if (!sameRecord(existing, next)) saveAppReviewPrompt(next);
  } catch {
    // 평가 창 실패가 앱 시작을 막지 않게 한다.
  }
}
