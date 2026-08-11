import {
  createPriorityRoutineInstanceKey,
  isPriorityRoutineInstanceKey,
  materializePriorityRoutineOccurrenceKeys,
  resolvePriorityRoutineCategoryKey,
} from './priorityRoutineInstance';

describe('priorityRoutineInstance', () => {
  it('keeps the first category key and creates unique keys for repeats', () => {
    const [first, second] = materializePriorityRoutineOccurrenceKeys(
      ['reading', 'reading'],
      [],
    );

    expect(first).toBe('reading');
    expect(second).not.toBe('reading');
    expect(isPriorityRoutineInstanceKey(second!)).toBe(true);
    expect(resolvePriorityRoutineCategoryKey(second!)).toBe('reading');
  });

  it('creates another occurrence when the base category already exists', () => {
    const [next] = materializePriorityRoutineOccurrenceKeys(
      ['customFlow:user-a'],
      ['customFlow:user-a'],
    );

    expect(next).toBeDefined();
    expect(resolvePriorityRoutineCategoryKey(next!)).toBe('customFlow:user-a');
    expect(next).not.toBe('customFlow:user-a');
  });

  it('round-trips an explicit instance key', () => {
    const key = createPriorityRoutineInstanceKey('healthIntake');
    expect(resolvePriorityRoutineCategoryKey(key)).toBe('healthIntake');
  });
});
