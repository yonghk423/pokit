import { toPastelColor } from '@shared/lib/ui/toPastelColor';

export function insightScopeColor(scope: 'daily' | 'weekly' | 'monthly'): string {
  if (scope === 'daily') return '#22c55e';
  if (scope === 'weekly') return '#6366f1';
  return '#f97316';
}

export function insightScopePastel(scope: 'daily' | 'weekly' | 'monthly'): string {
  return toPastelColor(insightScopeColor(scope));
}

export function insightCatalogGroupColor(groupKey: string): string {
  if (groupKey === 'health') return '#22c55e';
  if (groupKey === 'productivity') return '#2563eb';
  if (groupKey.startsWith('customGroup:')) return '#a855f7';
  return '#64748b';
}

export function insightCatalogGroupPastel(groupKey: string): string {
  return toPastelColor(insightCatalogGroupColor(groupKey));
}
