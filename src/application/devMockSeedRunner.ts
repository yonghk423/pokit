import { useHorizonCompletionStore } from '@entities/horizon-completion';
import { useHistoryStore } from '@entities/history';
import { runDevMockClear, runDevMockSeed, type DevMockSeedResult } from '@shared/lib/storage/devMockSeed';

function reloadStoresAfterDevMockChange(): void {
  useHistoryStore.getState().reloadFromStorage();
  useHistoryStore.getState().recomputeAchievements();
  useHorizonCompletionStore.getState().reloadFromStorage();
}

export async function runDevMockSeedWithStoreSync(): Promise<DevMockSeedResult> {
  const result = await runDevMockSeed();
  reloadStoresAfterDevMockChange();
  return result;
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
