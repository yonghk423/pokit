import {
  resolveCategoryCatalogAccentColor,
  resolveCategoryCatalogIconTile,
} from '@entities/day-plan';
import { toPastelColor } from '@shared/lib/ui/toPastelColor';

export function activeIconColorByCategory(categoryKey: string, isDark = false): string {
  return resolveCategoryCatalogIconTile(categoryKey, isDark).iconColor;
}

/** 히스토리·통계 등 차트형 UI — 카테고리 색을 파스텔 톤으로 완화 */
export function categoryAccentColorPastel(categoryKey: string): string {
  return toPastelColor(resolveCategoryCatalogAccentColor(categoryKey));
}

/** 목표 상세 미리보기와 동일한 아이콘 칸 */
export function categoryIconAccent(categoryKey: string, isDark = false): { color: string; surface: string } {
  const tile = resolveCategoryCatalogIconTile(categoryKey, isDark);
  return { color: tile.iconColor, surface: tile.boxBg };
}
