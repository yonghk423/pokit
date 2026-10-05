/**
 * Expo Router pathname → Firebase Analytics screen_name (영어, 의미 있는 식별자).
 * GA에 RNSScreen 대신 이 이름이 보이도록 logScreenView에 씁니다.
 */
const EXACT_SCREEN_NAMES: Record<string, string> = {
  '': 'home',
  index: 'home',
  'day-plan': 'today',
  'fixed-routines': 'routines',
  'priority-catalog': 'my_routines',
  'day-plan-statistics': 'history',
  'pokit-story': 'bookstore',
  settings: 'settings',
  'notification-settings': 'notification_settings',
  announcements: 'announcements',
  'release-notes': 'release_notes',
  'goal-detail-settings': 'routine_detail',
  'routine-template-detail': 'routine_template',
  'flow-review': 'flow_review',
  'activity-session': 'activity_session',
  'daily-rhythm-settings': 'day_window_settings',
  'appearance-settings': 'appearance_settings',
  'font-settings': 'font_settings',
  'day-plan-view-settings': 'today_view_settings',
  'layout-settings': 'layout_settings',
  'guide-book': 'guide_book',
  'widget-guide': 'widget_guide',
  'welcome-intro': 'welcome_intro',
};

/** pathname에서 그룹 `(tabs)` 등을 제거하고 마지막 세그먼트를 고릅니다. */
export function normalizeRouteKey(pathname: string): string {
  const cleaned = pathname
    .split('?')[0]
    .replace(/\/+/g, '/')
    .replace(/^\//, '')
    .replace(/\/$/, '');
  if (!cleaned) return '';

  const parts = cleaned
    .split('/')
    .filter(Boolean)
    .filter((part) => !(part.startsWith('(') && part.endsWith(')')));

  return parts[parts.length - 1] ?? '';
}

export function resolveAnalyticsScreenName(pathname: string): string {
  const key = normalizeRouteKey(pathname);
  if (key in EXACT_SCREEN_NAMES) {
    return EXACT_SCREEN_NAMES[key]!;
  }
  const fallback = key
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 36);
  return fallback || 'unknown_screen';
}
