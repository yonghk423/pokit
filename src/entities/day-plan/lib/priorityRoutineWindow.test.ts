import {
  clampHhmmToPriorityWindow,
  isHhmmBeforeSameDayWindowStart,
  isOvernightPriorityWindow,
} from './priorityRoutineWindow';

describe('isOvernightPriorityWindow', () => {
  it('detects ranges that cross midnight', () => {
    expect(isOvernightPriorityWindow('22:00', '06:00')).toBe(true);
    expect(isOvernightPriorityWindow('09:00', '12:00')).toBe(false);
    expect(isOvernightPriorityWindow('09:00', '24:00')).toBe(false);
  });
});

describe('isHhmmBeforeSameDayWindowStart', () => {
  it('treats 01:00 as next day when the window is 07:00–23:00', () => {
    expect(isHhmmBeforeSameDayWindowStart('01:00', '07:00', '23:00')).toBe(true);
    expect(isHhmmBeforeSameDayWindowStart('08:00', '07:00', '23:00')).toBe(false);
  });

  it('does not flag overnight windows', () => {
    expect(isHhmmBeforeSameDayWindowStart('01:00', '22:00', '06:00')).toBe(false);
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

  it('clamps a late-night clock into a same-day afternoon window end', () => {
    // 확인 버튼에서 이 함수로 입력을 덮으면 11:30이 PM 2:30으로 바뀐다.
    expect(clampHhmmToPriorityWindow('23:30', '11:30', '14:30', 1)).toBe('14:30');
    expect(clampHhmmToPriorityWindow('23:28', '11:28', '13:30', 1)).toBe('13:30');
  });
});
