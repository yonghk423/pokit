import { buildIncompleteRoutineReminderNotificationContent } from './incompleteRoutineReminderCopy';

describe('buildIncompleteRoutineReminderNotificationContent', () => {
  it('builds Korean copy with pending count', () => {
    expect(buildIncompleteRoutineReminderNotificationContent(4)).toEqual({
      title: '미완료 일정',
      body: '아직 완료하지 못한 일정이 4개 있어요. 확인해 보세요.',
    });
  });

  it('clamps invalid counts to zero', () => {
    expect(buildIncompleteRoutineReminderNotificationContent(-2).body).toBe(
      '아직 완료하지 못한 일정이 0개 있어요. 확인해 보세요.',
    );
  });
});
