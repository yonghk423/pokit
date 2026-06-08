import { PrimaryColor } from '@shared/config/theme';
import { resolveCustomFlowCatalogColor } from '@shared/lib/storage';

/** 우선순위·카탈로그 행 — 집중 중 펄스 시 카테고리별 아이콘 색 */
export function activeIconColorByCategory(categoryKey: string): string {
  if (categoryKey === 'work') return '#1e3a8a';
  if (categoryKey === 'reading') return '#22c55e';
  if (categoryKey === 'study') return '#2563eb';
  if (categoryKey === 'planning') return '#0891b2';
  if (categoryKey === 'writing') return '#7c3aed';
  if (categoryKey === 'deepwork') return '#1e40af';
  if (categoryKey === 'journal') return '#ca8a04';
  if (categoryKey === 'meditation') return '#9333ea';
  if (categoryKey === 'medicine') return '#dc2626';
  if (categoryKey === 'fasting') return '#8b5a2b';
  if (categoryKey === 'water') return '#7dd3fc';
  if (categoryKey === 'other') return '#f97316';
  if (categoryKey.startsWith('customFlow:')) return resolveCustomFlowCatalogColor(categoryKey);
  if (categoryKey === 'stretching') return '#0d9488';
  if (categoryKey === 'straightenBack') return '#6366f1';
  if (categoryKey === 'neckPosture') return '#a855f7';
  return PrimaryColor.rgb;
}
