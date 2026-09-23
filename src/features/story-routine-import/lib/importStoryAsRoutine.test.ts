import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import { importStoryAsRoutine } from './importStoryAsRoutine';

const article = {
  id: 'story_1',
  slug: 'story_1',
  title: '집중 루틴',
  summary: '15분 정리',
  durationMinutes: 15,
  steps: ['정리하기', '시작하기'],
};

describe('importStoryAsRoutine', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
  });

  it('preserves edited icon and accentColor when re-importing same story routine', () => {
    const first = importStoryAsRoutine(article);
    expect(first.categoryKey).toBe('customFlow:story:story_1');

    saveGoalDetailCategoryConfig(first.categoryKey, {
      displayName: '내 집중 루틴',
      summary: '커스텀 요약',
      checklist: [],
      icon: 'brain.head.profile',
      accentColor: '#3b82f6',
    });

    const second = importStoryAsRoutine({
      ...article,
      title: '집중 루틴 업데이트',
      summary: '20분 정리',
      steps: ['호흡하기', '실행하기'],
    });

    const saved = loadGoalDetailCategoryConfig(second.categoryKey) as {
      displayName?: string;
      summary?: string;
      checklist?: Array<{ text?: string }>;
      icon?: string;
      accentColor?: string;
    } | null;

    expect(second.created).toBe(false);
    expect(saved?.displayName).toBe('집중 루틴 업데이트');
    expect(saved?.summary).toBe('20분 정리');
    expect(saved?.checklist?.map((row) => row.text)).toEqual(['호흡하기', '실행하기']);
    expect(saved?.icon).toBe('brain.head.profile');
    expect(saved?.accentColor).toBe('#3b82f6');
  });
});
