import { PokitIconPalette } from '@shared/config/theme';
import { toPastelColor } from '@shared/lib/ui/toPastelColor';

export function insightScopeColor(scope: 'daily'): string {
  return PokitIconPalette.sage;
}

export function insightScopePastel(scope: 'daily'): string {
  return toPastelColor(insightScopeColor(scope));
}

export function insightCatalogGroupColor(groupKey: string): string {
  if (groupKey === 'health') return PokitIconPalette.sage;
  if (groupKey === 'productivity') return PokitIconPalette.teal;
  if (groupKey.startsWith('customGroup:')) return PokitIconPalette.sageMuted;
  return PokitIconPalette.tealMuted;
}

export function insightCatalogGroupPastel(groupKey: string): string {
  return toPastelColor(insightCatalogGroupColor(groupKey));
}
