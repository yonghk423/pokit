import { persistRoutineDisplayName } from './routineDisplayName';

describe('persistRoutineDisplayName', () => {
  it('clears when empty or matches fallback', () => {
    expect(persistRoutineDisplayName('', '명상')).toBe('');
    expect(persistRoutineDisplayName('  명상  ', '명상')).toBe('');
  });

  it('keeps custom names', () => {
    expect(persistRoutineDisplayName('아침 명상', '명상')).toBe('아침 명상');
  });

  it('must not treat the current display name as fallback (story import wipe)', () => {
    const storyTitle = '오후 간식, 견과류 한 줌으로 바꾸기';
    // 잘못된 폴백: 현재 이름 === 폴백 → 저장값이 비워짐
    expect(persistRoutineDisplayName(storyTitle, storyTitle)).toBe('');
    // 올바른 폴백: 카탈로그 기본명만 비교 → 스토리 제목 유지
    expect(persistRoutineDisplayName(storyTitle, '루틴')).toBe(storyTitle);
  });
});
