import { subscribeGoalDetailCategoryConfig } from '@shared/lib/storage/goalDetailSettingsStorage';

import { syncBookstoreWidgetToWidget } from './bookstoreWidgetSync';
import { syncNoteWidgetToWidget } from './noteWidgetSync';
import { syncPinnedRoutineToWidget } from './pinnedRoutineWidgetSync';

let unsubscribe: (() => void) | null = null;
let pinnedSyncTimer: ReturnType<typeof setTimeout> | null = null;

/** 목표 상세·책방·노트 저장 변경 시 홈 위젯 번들을 즉시 갱신한다. */
export function ensureBookstoreNoteWidgetLifecycle(): void {
  if (unsubscribe) return;
  unsubscribe = subscribeGoalDetailCategoryConfig((categoryKey) => {
    if (categoryKey === 'reading') {
      syncBookstoreWidgetToWidget();
    } else if (categoryKey === 'work') {
      syncNoteWidgetToWidget();
    }
    // 체중·체크리스트 등 루틴 위젯 본문 — 연속 입력 시 한 번만 밀어 넣음
    if (pinnedSyncTimer) clearTimeout(pinnedSyncTimer);
    pinnedSyncTimer = setTimeout(() => {
      pinnedSyncTimer = null;
      syncPinnedRoutineToWidget();
    }, 180);
  });
}

export function syncBookstoreAndNoteWidgets(): void {
  syncBookstoreWidgetToWidget();
  syncNoteWidgetToWidget();
}
