import { PrimaryColor } from '@shared/config/theme';
import { resolveCategoryCatalogAccentColor } from '@entities/day-plan';
import { toPastelColor } from '@shared/lib/ui/toPastelColor';

export function activeIconColorByCategory(categoryKey: string): string {
  return resolveCategoryCatalogAccentColor(categoryKey) || PrimaryColor.rgb;
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
