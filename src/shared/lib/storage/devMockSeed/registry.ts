import type { DevMockSeedModule } from './types';
import { historyDailyMockSeed } from './modules/historyDailyMockSeed';
import { horizonCompletionMockSeed } from './modules/horizonCompletionMockSeed';

/**
 * __DEV__ 목업 seed 모듈 목록.
 * 새 도메인 추가: `modules/`에 DevMockSeedModule 구현 → 여기에 등록 → version 올리기.
 * 의존 순서대로 배열한다 (예: horizon은 history-daily 뒤).
 */
export const DEV_MOCK_SEED_MODULES: readonly DevMockSeedModule[] = [
  historyDailyMockSeed,
  horizonCompletionMockSeed,
];
