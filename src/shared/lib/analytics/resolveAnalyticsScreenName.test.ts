import { resolveAnalyticsScreenName } from './resolveAnalyticsScreenName';

describe('resolveAnalyticsScreenName', () => {
  it('maps tab and stack routes to meaningful English names', () => {
    expect(resolveAnalyticsScreenName('/(tabs)/day-plan')).toBe('today');
    expect(resolveAnalyticsScreenName('/fixed-routines')).toBe('routines');
    expect(resolveAnalyticsScreenName('/(tabs)/priority-catalog')).toBe('my_routines');
    expect(resolveAnalyticsScreenName('/(tabs)/day-plan-statistics')).toBe('history');
    expect(resolveAnalyticsScreenName('/(tabs)/pokit-story')).toBe('bookstore');
    expect(resolveAnalyticsScreenName('/settings')).toBe('settings');
    expect(resolveAnalyticsScreenName('/release-notes')).toBe('release_notes');
    expect(resolveAnalyticsScreenName('/goal-detail-settings')).toBe('routine_detail');
    expect(resolveAnalyticsScreenName('/activity-session')).toBe('activity_session');
    expect(resolveAnalyticsScreenName('/widget-guide')).toBe('widget_guide');
  });

  it('falls back for unknown paths', () => {
    expect(resolveAnalyticsScreenName('/some-new-screen')).toBe('some-new-screen');
  });
});
