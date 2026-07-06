import { isInternalAutoRoutineLabel } from './customFlowDisplayLabel';

describe('isInternalAutoRoutineLabel', () => {
  it('detects auto-generated preset labels', () => {
    expect(isInternalAutoRoutineLabel('루틴 preset_a')).toBe(true);
    expect(isInternalAutoRoutineLabel('루틴 preset_abstain')).toBe(true);
  });

  it('detects generic auto labels', () => {
    expect(isInternalAutoRoutineLabel('루틴')).toBe(true);
    expect(isInternalAutoRoutineLabel('루틴 abcd1234')).toBe(true);
  });

  it('allows user-facing names', () => {
    expect(isInternalAutoRoutineLabel('금지')).toBe(false);
    expect(isInternalAutoRoutineLabel('아침 단식')).toBe(false);
  });
});
