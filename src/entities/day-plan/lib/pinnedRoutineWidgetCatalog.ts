import {
  listAllCustomFlowCatalogEntries,
  loadGoalDetailCategoryConfig,
  loadHiddenStandardCatalogKeys,
} from '@shared/lib/storage';

import { resolveCategoryCatalogIcon } from './categoryCatalogAppearance';
import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { resolveCustomFlowDisplayLabel } from './customFlowDisplayLabel';
import {
  resolveStandardCatalogDisplayLabel,
} from './priorityCatalogPickerLabels';
import { getPriorityCatalogStandardKeys } from './priorityCatalogRegistry';
import { readRoutineDisplayNameFromConfig } from './routineDisplayName';

export type PinnedRoutineWidgetCandidate = {
  key: string;
  label: string;
  icon: string;
};

function resolveCandidateLabel(categoryKey: string): string {
  const displayName = readRoutineDisplayNameFromConfig(
    loadGoalDetailCategoryConfig(categoryKey),
  );
  if (isCustomFlowCategoryKey(categoryKey)) {
    return resolveCustomFlowDisplayLabel(categoryKey, displayName);
  }
  return resolveStandardCatalogDisplayLabel(categoryKey, displayName);
}

/** 위젯 설정·App Group 번들에 넣을 루틴 후보 목록 */
export function listPinnedRoutineWidgetCandidates(): PinnedRoutineWidgetCandidate[] {
  const hidden = new Set(loadHiddenStandardCatalogKeys());
  const standards = getPriorityCatalogStandardKeys()
    .filter((key) => !hidden.has(key))
    .map((key) => ({
      key,
      label: resolveCandidateLabel(key),
      icon: resolveCategoryCatalogIcon(key),
    }));

  const customs = listAllCustomFlowCatalogEntries().map((entry) => ({
    key: entry.id,
    label: resolveCandidateLabel(entry.id),
    icon: resolveCategoryCatalogIcon(entry.id),
  }));

  const seen = new Set<string>();
  const out: PinnedRoutineWidgetCandidate[] = [];
  for (const row of [...customs, ...standards]) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    out.push(row);
  }
  return out;
}
