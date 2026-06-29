import { persistRoutineDisplayName } from './routineDisplayName';

describe('persistRoutineDisplayName', () => {
  it('clears when empty or matches fallback', () => {
    expect(persistRoutineDisplayName('', '명상')).toBe('');
    expect(persistRoutineDisplayName('  명상  ', '명상')).toBe('');
  });

  it('keeps custom names', () => {
    expect(persistRoutineDisplayName('아침 명상', '명상')).toBe('아침 명상');
  });
});
