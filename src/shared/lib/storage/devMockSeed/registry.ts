import type { DevMockSeedModule } from './types';
import { historyDailyMockSeed } from './modules/historyDailyMockSeed';
import { horizonCompletionMockSeed } from './modules/horizonCompletionMockSeed';
import { puzzleHistoryMockSeed } from './modules/puzzleHistoryMockSeed';

/**
 * __DEV__ 목업 seed 모듈 목록.
 * 담기 카탈로그(기본 그룹·플로우)는 앱 기본값(`ensureDefaultPriorityCatalog`)으로만 둔다.
 * Dev Menu seed는 통계·호라이즌·Puzzle 등 데모용 데이터만 추가한다.
 */
export const DEV_MOCK_SEED_MODULES: readonly DevMockSeedModule[] = [
  historyDailyMockSeed,
  horizonCompletionMockSeed,
  puzzleHistoryMockSeed,
];
