import {
  clampHhmmToPriorityWindow,
  isOvernightPriorityWindow,
} from './priorityRoutineWindow';

describe('isOvernightPriorityWindow', () => {
  it('detects ranges that cross midnight', () => {
    expect(isOvernightPriorityWindow('22:00', '06:00')).toBe(true);
    expect(isOvernightPriorityWindow('09:00', '12:00')).toBe(false);
    expect(isOvernightPriorityWindow('09:00', '24:00')).toBe(false);
  });
});

describe('clampHhmmToPriorityWindow', () => {
  it('clamps into same-day window', () => {
    expect(clampHhmmToPriorityWindow('08:00', '09:00', '12:00')).toBe('09:00');
    expect(clampHhmmToPriorityWindow('11:00', '09:00', '12:00')).toBe('11:00');
    expect(clampHhmmToPriorityWindow('14:00', '09:00', '12:00')).toBe('12:00');
  });
});
