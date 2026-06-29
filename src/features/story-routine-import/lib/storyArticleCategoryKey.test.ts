import { storyArticleCategoryKey, suggestCatalogGroupKey } from './storyArticleCategoryKey';
import type { StoryRoutineArticle } from '../model/storyRoutinePayload';

const baseArticle: StoryRoutineArticle = {
  id: 'saturday-morning-weekly-close',
  slug: 'saturday-morning-weekly-close',
  title: '토요일 아침 20분, 한 주를 가볍게 닫기',
  durationMinutes: 20,
};

describe('storyArticleCategoryKey', () => {
  it('uses stable customFlow key from slug', () => {
    expect(storyArticleCategoryKey(baseArticle)).toBe(
      'customFlow:story:saturday-morning-weekly-close',
    );
  });

  it('returns same key for repeated imports', () => {
    const first = storyArticleCategoryKey(baseArticle);
    const second = storyArticleCategoryKey({ ...baseArticle, title: '다른 제목' });
    expect(first).toBe(second);
  });

  it('suggests health group for movement categories', () => {
    expect(
      suggestCatalogGroupKey({ ...baseArticle, categoryKey: 'movement' }),
    ).toBe('health');
  });
});
