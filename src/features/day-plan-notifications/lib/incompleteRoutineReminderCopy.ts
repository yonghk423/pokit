export function buildIncompleteRoutineReminderNotificationContent(count: number): {
  title: string;
  body: string;
} {
  const n = Math.max(0, Math.floor(count));
  return {
    title: '미완료 일정',
    body: `아직 완료하지 못한 일정이 ${n}개 있어요. 확인해 보세요.`,
  };
}
