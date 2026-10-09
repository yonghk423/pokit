import {
  syncBookstoreAndNoteWidgets,
  syncPinnedRoutineToWidget,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanStore,
  useDayPlanTodoStore,
  useFixedFlowSetsStore,
  useGoalDetailSettingsStore,
} from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import { useHorizonCompletionStore } from '@entities/horizon-completion';
import { clearPuzzleRevealSeen, usePuzzleHistoryStore } from '@entities/puzzle-history';
import { getAppLocale } from '@shared/lib/i18n';
import {
  ensureDefaultPriorityCatalog,
  flushLocalStorageClientWrites,
  loadFixedFlowSetsState,
  localStorageClient,
} from '@shared/lib/storage';
import {
  HISTORY_SEED_PROFILE_LABEL_KO,
  fillCurrentMonthHistoryForScreenshotDemo,
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
import {
  puzzleHistoryMockSeed,
  seedPuzzleHistoryMockData,
} from '@shared/lib/storage/devMockSeed/modules/puzzleHistoryMockSeed';
import { screenshotDemoMockSeed } from '@shared/lib/storage/devMockSeed/modules/screenshotDemoMockSeed';
import {
  clearDevTemplateDemoRoutines,
  seedDevTemplateDemoRoutines,
} from './devTemplateDemoRoutinesSeed';

function reloadStoresAfterDevMockChange(): void {
  useHistoryStore.getState().reloadFromStorage();
  useHorizonCompletionStore.getState().reloadFromStorage();
  clearPuzzleRevealSeen();
  usePuzzleHistoryStore.getState().reloadFromStorage();
  useGoalDetailSettingsStore.getState().reloadAllFromStorage();

  const fixed = loadFixedFlowSetsState();
  useFixedFlowSetsStore.setState({
    activeSetIds: fixed.activeSetIds,
    sets: fixed.sets,
    isHydrated: true,
  });

  // draft/dayPlan hydrate는 1회성이라 시드/클리어 후 강제 재로드
  useDayPlanDraftStore.setState({ isHydrated: false });
  useDayPlanDraftStore.getState().hydrate();
  useDayPlanStore.setState({ isHydrated: false });
  useDayPlanStore.getState().hydrate();
  useDayPlanTodoStore.getState().hydrate();
  useDayPlanLayoutModeVisibilityStore.getState().hydrate();
  useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
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

/** 생성 가능 템플릿 7종 + 책방·노트·빠른 메모 체험 (`buildTemplateDemoConfig`) */
export async function runTemplateDemoRoutinesSeedWithStoreSync(): Promise<DevMockSeedResult> {
  const result = await seedDevTemplateDemoRoutines();
  await flushLocalStorageClientWrites();
  reloadStoresAfterDevMockChange();
  syncPinnedRoutineToWidget();
  syncBookstoreAndNoteWidgets();
  return result;
}

/** Puzzle 탭 전용 — `assets/puzzle` 샘플 사진 목업만 */
export async function runPuzzleHistoryMockSeedWithStoreSync(): Promise<DevMockSeedResult> {
  const puzzlePartial = seedPuzzleHistoryMockData();
  localStorageClient.setItemRaw(
    'pokit:dev-mock-seed-bundle-version',
    `${getDevMockSeedBundleVersion()}+puzzle-history@${puzzleHistoryMockSeed.version}`,
  );
  await flushLocalStorageClientWrites();
  clearPuzzleRevealSeen();
  usePuzzleHistoryStore.getState().reloadFromStorage();
  return puzzlePartial;
}

/** 앱스토어 스크린샷용 — 오늘 루틴·투두·도서·노트 + 고달성 히스토리/호라이즌 */
export async function runScreenshotDemoSeedWithStoreSync(): Promise<DevMockSeedResult> {
  ensureDefaultPriorityCatalog();
  const screenshotPartial = await screenshotDemoMockSeed.seed();
  const historyDays = await seedHistoryData('strong');
  await fillCurrentMonthHistoryForScreenshotDemo();
  const horizonPartial = await horizonCompletionMockSeed.seed();
  localStorageClient.setItemRaw(
    'pokit:dev-mock-seed-bundle-version',
    `${getDevMockSeedBundleVersion()}+screenshot-demo@${screenshotDemoMockSeed.version}`,
  );
  await flushLocalStorageClientWrites();
  reloadStoresAfterDevMockChange();
  return { ...screenshotPartial, historyDays, ...horizonPartial };
}

export async function runDevMockClearWithStoreSync(): Promise<void> {
  await runDevMockClear();
  await screenshotDemoMockSeed.clear();
  await clearDevTemplateDemoRoutines();
  await flushLocalStorageClientWrites();
  reloadStoresAfterDevMockChange();
}

export function formatDevMockSeedAlertMessage(result: DevMockSeedResult): string {
  const locale = getAppLocale();
  const parts: string[] = [];
  if (result.screenshotRoutines != null) parts.push(`루틴 ${result.screenshotRoutines}개`);
  if (result.templateDemoRoutines != null) {
    parts.push(`템플릿 체험 루틴 ${result.templateDemoRoutines}개`);
  }
  if (result.screenshotTodos != null) parts.push(`투두 ${result.screenshotTodos}개`);
  if (result.screenshotBooks != null) parts.push(`도서 ${result.screenshotBooks}권`);
  if (result.screenshotNotes != null) parts.push(`노트 ${result.screenshotNotes}개`);
  if (result.screenshotQuickMemos != null) parts.push(`빠른 메모 ${result.screenshotQuickMemos}개`);
  if (result.historyDays != null) parts.push(`데일리 ${result.historyDays}일`);
  if (result.weeklyCompletions != null) parts.push(`위클리 ${result.weeklyCompletions}주`);
  if (result.monthlyCompletions != null) parts.push(`먼슬리 ${result.monthlyCompletions}달`);
  if (result.puzzleHistories != null) {
    parts.push(
      `Puzzle ${result.puzzleHistories}개(진행 ${result.puzzleActive ?? 0} · Album ${result.puzzleAlbum ?? 0})`,
    );
  }
  if (parts.length === 0) return `목업 데이터를 추가했어요. (${locale})`;
  const hint =
    result.templateDemoRoutines != null
      ? '오늘 탭·책방·노트·빠른 메모·위젯 Edit에서 확인하세요.'
      : result.screenshotRoutines != null
        ? '데이플랜·투두·서재·노트·나만의 루틴·Puzzle·히스토리에서 확인하세요.'
        : '통계·Puzzle 탭에서 확인하세요.';
  return `[${locale}] ${parts.join(' · ')}\n${hint}`;
}

export function formatDevMockSeedProfileAlertMessage(
  profile: HistorySeedProfile,
  result: DevMockSeedResult,
): string {
  const label = HISTORY_SEED_PROFILE_LABEL_KO[profile];
  const base = formatDevMockSeedAlertMessage(result);
  return `[${label}] ${base}`;
}
