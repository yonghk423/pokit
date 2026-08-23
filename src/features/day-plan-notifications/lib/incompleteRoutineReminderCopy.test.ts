import { buildIncompleteRoutineReminderNotificationContent } from './incompleteRoutineReminderCopy';

describe('buildIncompleteRoutineReminderNotificationContent', () => {
  it('builds icon copy for modes that have pending routines', () => {
    expect(
      buildIncompleteRoutineReminderNotificationContent({
        bag: 2,
        sections: 3,
        spine: 1,
      }),
    ).toEqual({
      title: '미완료 루틴 6개가 있습니다.',
      body: '▤ 2개   ☀︎ 3개   ◷ 1개',
    });
  });

  it('omits empty modes and clamps invalid counts to zero', () => {
    expect(
      buildIncompleteRoutineReminderNotificationContent({
        bag: -2,
        sections: 3,
        spine: 0,
      }),
    ).toEqual({
      title: '미완료 루틴 3개가 있습니다.',
      body: '☀︎ 3개',
    });
  });
});
