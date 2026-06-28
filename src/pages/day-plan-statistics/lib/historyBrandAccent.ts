import { PokitIconPalette } from '@shared/config/theme';
import { toPastelColor } from '@shared/lib/ui/toPastelColor';

/** 히스토리 UI 강조(집중도 링·차트·태그·수치) — 앱 아이콘 틸 */
export const historyUiAccent = PokitIconPalette.teal;

/** 히스토리 UI 파스텔 배경(태그·카드) — 앱 아이콘 세이지 */
export const historyUiAccentPastel = toPastelColor(PokitIconPalette.sage);

export const historyUiSecondary = PokitIconPalette.sage;

/** 월간·주간 카테고리 막대 등 순위 UI (아이콘 제외) */
export function historyUiRankedPastel(index: number): string {
  const palette = [
    PokitIconPalette.teal,
    PokitIconPalette.sage,
    PokitIconPalette.tealMuted,
    PokitIconPalette.sageMuted,
  ];
  return toPastelColor(palette[index % palette.length]);
}

export function historyUiRankedAccent(index: number): string {
  const palette = [
    PokitIconPalette.teal,
    PokitIconPalette.sage,
    PokitIconPalette.tealMuted,
    PokitIconPalette.sageMuted,
  ];
  return palette[index % palette.length];
}
