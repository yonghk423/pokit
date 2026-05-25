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

  it('clamps overnight window to evening or morning band', () => {
    expect(clampHhmmToPriorityWindow('23:00', '22:00', '06:00')).toBe('23:00');
    expect(clampHhmmToPriorityWindow('03:00', '22:00', '06:00')).toBe('03:00');
    /** 낮 시간은 저녁·아침 구간 밖 → 가까운 쪽(아침 상한)으로 스냅 */
    expect(clampHhmmToPriorityWindow('12:00', '22:00', '06:00')).toBe('06:00');
  });

  it('returns fallback when parse fails', () => {
    expect(clampHhmmToPriorityWindow('', 'bad', '12:00')).toBe('09:00');
  });
});
