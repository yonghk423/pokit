import {
  isLikelyPriorityCatalogMonolineTitle,
  isPriorityCompoundBlockTitle,
  parseNumberedFlowLines,
} from './priorityBlockTitle';

describe('parseNumberedFlowLines', () => {
  it('parses numbered lines', () => {
    expect(parseNumberedFlowLines('1. 독서\n2. 명상')).toEqual(['독서', '명상']);
  });

  it('returns plain lines when not all numbered', () => {
    expect(parseNumberedFlowLines('독서\n명상')).toEqual(['독서', '명상']);
  });

  it('returns empty for blank title', () => {
    expect(parseNumberedFlowLines('  \n  ')).toEqual([]);
  });
});

describe('isPriorityCompoundBlockTitle', () => {
  it('is true when two or more lines', () => {
    expect(isPriorityCompoundBlockTitle('a\nb')).toBe(true);
    expect(isPriorityCompoundBlockTitle('only')).toBe(false);
  });
});

describe('isLikelyPriorityCatalogMonolineTitle', () => {
  it('matches known catalog labels', () => {
    expect(isLikelyPriorityCatalogMonolineTitle('독서')).toBe(true);
    expect(isLikelyPriorityCatalogMonolineTitle('독서\n명상')).toBe(false);
    expect(isLikelyPriorityCatalogMonolineTitle('없는항목')).toBe(false);
  });
});
