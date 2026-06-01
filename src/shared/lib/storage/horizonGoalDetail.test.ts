import {
  horizonGoalHasContent,
  horizonGoalToPlainText,
  parseHorizonGoalStored,
} from './horizonGoalDetail';

describe('horizonGoalDetail', () => {
  it('parses legacy string as body', () => {
    const goal = parseHorizonGoalStored('본문만');
    expect(goal.body).toBe('본문만');
    expect(goal.mainTitle).toBe('');
  });

  it('parses object fields', () => {
    const goal = parseHorizonGoalStored({
      mainTitle: ' 주간 ',
      subTitle: '부제',
      body: '상세',
    });
    expect(goal.mainTitle).toBe(' 주간 ');
    expect(goal.subTitle).toBe('부제');
    expect(goal.body).toBe('상세');
  });

  it('detects content across title fields', () => {
    expect(horizonGoalHasContent(parseHorizonGoalStored({ mainTitle: '핵심' }))).toBe(true);
    expect(horizonGoalHasContent(parseHorizonGoalStored({}))).toBe(false);
  });

  it('joins non-empty fields for plain text', () => {
    const text = horizonGoalToPlainText(
      parseHorizonGoalStored({ mainTitle: 'A', subTitle: '', body: 'B' }),
    );
    expect(text).toBe('A\nB');
  });
});
