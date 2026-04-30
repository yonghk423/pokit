import { PrimaryColor } from '@shared/config/theme';

/** 우선순위·카탈로그 행 — 집중 중 펄스 시 카테고리별 아이콘 색 */
export function activeIconColorByCategory(categoryKey: string): string {
  if (categoryKey === 'work') return '#1e3a8a';
  if (categoryKey === 'reading') return '#22c55e';
  if (categoryKey === 'medicine') return '#dc2626';
  if (categoryKey === 'fasting') return '#8b5a2b';
  if (categoryKey === 'water') return '#7dd3fc';
  if (categoryKey === 'other' || categoryKey.startsWith('customFlow:')) return '#f97316';
  if (categoryKey === 'stretching') return '#0d9488';
  if (categoryKey === 'straightenBack') return '#6366f1';
  if (categoryKey === 'neckPosture') return '#a855f7';
  return PrimaryColor.rgb;
}
