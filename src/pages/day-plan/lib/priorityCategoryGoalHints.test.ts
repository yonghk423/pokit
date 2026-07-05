import { saveGoalDetailCategoryConfig } from '@shared/lib/storage';

import { getPriorityCategoryGoalHint } from './priorityCategoryGoalHints';

describe('getPriorityCategoryGoalHint', () => {
  beforeEach(() => {
    saveGoalDetailCategoryConfig('other', {});
  });

  it('요약은 부제로 쓰지 않고 체크리스트 힌트만 반환한다', () => {
    saveGoalDetailCategoryConfig('other', {
      displayName: '책상에서 견갑 모으기',
      summary: '모니터 앞에서 어깨를 뒤로 당겨 상체 긴장을 푸는 2분 루틴',
      checklist: [
        { id: '1', text: '턱 당기기 30초', done: false },
        { id: '2', text: '견갑 모으기', done: true },
      ],
    });

    expect(getPriorityCategoryGoalHint('other')).toBe('할 일 2개 · 완료 1');
  });

  it('체크리스트가 없으면 null을 반환한다', () => {
    saveGoalDetailCategoryConfig('other', {
      summary: '요약만 있는 경우',
      checklist: [],
    });

    expect(getPriorityCategoryGoalHint('other')).toBeNull();
  });
});
