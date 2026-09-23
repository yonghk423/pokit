import { resolveRoutineTitleFallback } from './routineTitleFallback';

describe('resolveRoutineTitleFallback', () => {
  it('ignores auto-generated block titles and uses catalog label', () => {
    expect(
      resolveRoutineTitleFallback('customFlow:preset_abstain', '루틴 preset_a'),
    ).toBe('금지');
  });

  it('keeps user-edited rhythm titles', () => {
    expect(resolveRoutineTitleFallback('customFlow:preset_abstain', '나만의 금지')).toBe(
      '나만의 금지',
    );
  });

  it('uses catalog label when rhythm title is empty (persist fallback)', () => {
    expect(resolveRoutineTitleFallback('customFlow:preset_abstain', '')).toBe('금지');
    expect(resolveRoutineTitleFallback('customFlow:abcd1234', '')).toBe('루틴');
  });
});
