import { useFixedFlowSetsStore } from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import { useHorizonCompletionStore } from '@entities/horizon-completion';
import {
  ensureDefaultPriorityCatalog,
  flushLocalStorageClientWrites,
  loadFixedFlowSetsState,
  localStorageClient,
} from '@shared/lib/storage';
import {
  HISTORY_SEED_PROFILE_LABEL_KO,
  seedHistoryData,
  type HistorySeedProfile,
} from '@shared/lib/storage/seedHistoryData';
import {
  getDevMockSeedBundleVersion,
  runDevMockClear,
  runDevMockSeed,
  type DevMockSeedResult,
} from '@shared/lib/storage/devMockSeed';
import { horizonCompletionMockSeed } from '@shared/lib/storage/devMockSeed/modules/horizonCompletionMockSeed';

function reloadStoresAfterDevMockChange(): void {
  useHistoryStore.getState().reloadFromStorage();
  useHistoryStore.getState().recomputeAchievements();
  useHorizonCompletionStore.getState().reloadFromStorage();

  const fixed = loadFixedFlowSetsState();
  useFixedFlowSetsStore.setState({
    activeSetIds: fixed.activeSetIds,
    sets: fixed.sets,
    isHydrated: true,
  });
}

export async function runDevMockSeedWithStoreSync(): Promise<DevMockSeedResult> {
  ensureDefaultPriorityCatalog();
  const result = await runDevMockSeed();
  reloadStoresAfterDevMockChange();
  return result;
}

export async function runDevMockSeedProfileWithStoreSync(
  profile: HistorySeedProfile,
): Promise<DevMockSeedResult> {
  ensureDefaultPriorityCatalog();
  const historyDays = await seedHistoryData(profile);
  const horizonPartial = await horizonCompletionMockSeed.seed();
  localStorageClient.setItemRaw(
    'pokit:dev-mock-seed-bundle-version',
    getDevMockSeedBundleVersion(),
  );
  await flushLocalStorageClientWrites();
  reloadStoresAfterDevMockChange();
  return { historyDays, ...horizonPartial };
}

export async function runDevMockClearWithStoreSync(): Promise<void> {
  await runDevMockClear();
  reloadStoresAfterDevMockChange();
}

export function formatDevMockSeedAlertMessage(result: DevMockSeedResult): string {
  const parts: string[] = [];
  if (result.historyDays != null) parts.push(`데일리 ${result.historyDays}일`);
  if (result.weeklyCompletions != null) parts.push(`위클리 ${result.weeklyCompletions}주`);
  if (result.monthlyCompletions != null) parts.push(`먼슬리 ${result.monthlyCompletions}달`);
  if (parts.length === 0) return '목업 데이터를 추가했어요.';
  return `${parts.join(' · ')}\n통계 탭에서 확인하세요.`;
}

export function formatDevMockSeedProfileAlertMessage(
  profile: HistorySeedProfile,
  result: DevMockSeedResult,
): string {
  const label = HISTORY_SEED_PROFILE_LABEL_KO[profile];
  const base = formatDevMockSeedAlertMessage(result);
  return `[${label}] ${base}`;
}
