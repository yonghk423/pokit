import { PokitIconPalette } from '@shared/config/theme';
import { toPastelColor } from '@shared/lib/ui/toPastelColor';

export function insightScopeColor(scope: 'daily' | 'weekly' | 'monthly'): string {
  if (scope === 'daily') return PokitIconPalette.sage;
  if (scope === 'weekly') return PokitIconPalette.teal;
  return PokitIconPalette.tealMuted;
}

export function insightScopePastel(scope: 'daily' | 'weekly' | 'monthly'): string {
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
