import { clearHistoryStorage } from '../../historyStorage';
import { seedHistoryData } from '../../seedHistoryData';

import type { DevMockSeedModule } from '../types';

export const historyDailyMockSeed: DevMockSeedModule = {
  id: 'history-daily',
  version: 9,
  async seed() {
    const historyDays = await seedHistoryData('mixed');
    return { historyDays };
  },
  async clear() {
    clearHistoryStorage();
  },
};
