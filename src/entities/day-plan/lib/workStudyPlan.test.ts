import { normalizeWorkDetailConfig } from './goalCategorySessionConfig';
import { buildWorkStudyShareText, workStudyModeLabelKo } from './workStudyPlan';

describe('workStudyPlan', () => {
  it('buildWorkStudyShareText includes subject, todo memo, and d-day', () => {
    const cfg = normalizeWorkDetailConfig({
      subject: '수학',
      studyMode: 'pomodoro',
      planMin: 25,
      breakMin: 5,
      ddayEvents: [{ id: '1', title: '기말', dateKey: '2026-07-10' }],
      focusMemo: '3단원 문제\n오답 정리\n함수 그래프 집중',
    });

    const text = buildWorkStudyShareText(cfg);
    expect(text).toContain('과목: 수학');
    expect(text).toContain('뽀모도로');
    expect(text).toContain('집중 25분 · 휴식 5분');
    expect(text).toContain('노트');
    expect(text).toContain('3단원 문제');
    expect(text).toContain('함수 그래프 집중');
    expect(text).toContain('D-Day');
    expect(text).toContain('기말');
  });

  it('workStudyModeLabelKo returns Korean labels', () => {
    expect(workStudyModeLabelKo('free')).toBe('자유 스터디');
    expect(workStudyModeLabelKo('pomodoro')).toBe('뽀모도로');
  });
});
