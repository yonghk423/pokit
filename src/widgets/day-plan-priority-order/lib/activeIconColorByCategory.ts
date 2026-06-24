import { PrimaryColor } from '@shared/config/theme';
import { resolveCustomFlowCatalogColor } from '@shared/lib/storage';
import { toPastelColor } from '@shared/lib/ui/toPastelColor';

/** 우선순위·카탈로그 행 — 집중 중 펄스 시 카테고리별 아이콘 색 */
const CATEGORY_ICON_COLORS: Record<string, string> = {
  water: '#7dd3fc',
  medicine: '#dc2626',
  fasting: '#8b5a2b',
  stretching: '#0d9488',
  straightenBack: '#6366f1',
  neckPosture: '#a855f7',
  meditation: '#9333ea',
  workout: '#e11d48',
  walking: '#16a34a',
  yoga: '#14b8a6',
  sleep: '#4f46e5',
  breathing: '#06b6d4',
  skincare: '#ec4899',
  vitamins: '#b91c1c',
  posture: '#6366f1',
  eyerest: '#0284c7',
  reading: '#22c55e',
  study: '#2563eb',
  planning: '#0891b2',
  writing: '#7c3aed',
  language: '#1d4ed8',
  creative: '#c026d3',
  inbox: '#64748b',
  deepwork: '#1e40af',
  journal: '#ca8a04',
  pomodoro: '#ea580c',
  review: '#0f766e',
  news: '#334155',
  organize: '#78716c',
  podcast: '#7c3aed',
  work: '#1e3a8a',
  coding: '#172554',
  other: '#f97316',
};

export function activeIconColorByCategory(categoryKey: string): string {
  if (categoryKey.startsWith('customFlow:')) return resolveCustomFlowCatalogColor(categoryKey);
  return CATEGORY_ICON_COLORS[categoryKey] ?? PrimaryColor.rgb;
}

/** 히스토리·통계 등 차트형 UI — 카테고리 색을 파스텔 톤으로 완화 */
export function categoryAccentColorPastel(categoryKey: string): string {
  return toPastelColor(activeIconColorByCategory(categoryKey));
}

/** 루틴 탭 집중 아이콘과 동일한 색 + 연한 배경(히스토리 데일리 등) */
export function categoryIconAccent(categoryKey: string): { color: string; surface: string } {
  const color = activeIconColorByCategory(categoryKey);
  return { color, surface: categoryAccentColorPastel(categoryKey) };
}
