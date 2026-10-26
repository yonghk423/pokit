import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import { FEATURE_FLAGS } from '@shared/config/featureFlags';
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
export async function requestSystemAppReview(): Promise<boolean> {
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

/** 같은 실행에서 스플래시 효과가 두 번 돌아도 평가 창은 한 번만 판단한다. */
let reviewDueCheck: Promise<void> | null = null;

/**
 * 스플래시가 닫힌 뒤 호출한다.
 * 처음 연 시각을 남기고, 그로부터 하루가 지났거나 어제 이전 사용 기록이 있을 때만 창을 연다.
 * 이미 요청한 적 있으면(튜토리얼 종료 포함) 다시 열지 않는다.
 */
export function requestAppReviewIfDue(nowMs = Date.now()): Promise<void> {
  if (reviewDueCheck) return reviewDueCheck;
  reviewDueCheck = runAppReviewIfDue(nowMs);
  return reviewDueCheck;
}

async function runAppReviewIfDue(nowMs: number): Promise<void> {
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
      // 하루 시작·마무리 게이트가 꺼져 있으면 그 완료 여부로 평가 창을 막지 않는다.
      setupComplete: !FEATURE_FLAGS.dailyRhythmWindow || loadDailyRhythmOnboardingCompleted(),
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
