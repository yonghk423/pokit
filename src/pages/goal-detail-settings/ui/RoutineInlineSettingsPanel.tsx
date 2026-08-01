import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  isCustomFlowCategoryKey,
  normalizeHealthIntakeDetailConfig,
  normalizeMedicineDetailConfig,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  resolveCustomFlowTemplateKey,
  useDayPlanDraftStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  categoryReminderLabelKo,
} from '@entities/day-plan';
import { readRoutineDisplayNameFromConfig } from '@entities/day-plan/lib/routineDisplayName';
import { persistReminderTemplateNotificationRule } from '@features/category-reminder-notifications';
import { syncMedicineReminderNotifications } from '@features/day-plan-notifications/model/syncMedicineReminderNotifications';
import { RoutineStartNotifyField } from '@features/day-plan-notifications/ui/RoutineStartNotifyField';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import {
  loadGoalDetailCategoryConfig,
  resolveCatalogItemGroupKey,
  saveGoalDetailCategoryConfig,
  updateCatalogItemGroup,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { GoalDetailCategoryKey } from '../model/types';
import { resolveGoalDetailModuleForTarget } from './category';
import { ROUTINE_RENAME_LOCK_MESSAGES } from './category/lib/RoutineTitleField';
import { CustomFlowGroupField } from './category/other/ui/CustomFlowGroupField';
import { CustomFlowTemplateMetaPill } from './CustomFlowTemplateMetaPill';
import { RoutineAppearanceField } from './lib/RoutineAppearanceField';

type Props = {
  categoryKey: string;
  ink: string;
  muted: string;
  border: string;
  isDark?: boolean;
  /** 오늘 일정에서 열면 이름 변경 잠금 */
  lockRename?: boolean;
  previewTitle?: string;
};

function withPreservedRoutineFields(categoryKey: string, next: unknown): unknown {
  if (!next || typeof next !== 'object') return next;
  const o = { ...(next as Record<string, unknown>) };
  const prev = loadGoalDetailCategoryConfig(categoryKey);
  if (!prev || typeof prev !== 'object') return o;
  const prevO = prev as Record<string, unknown>;

  if (!('displayName' in o)) {
    const prevName = readRoutineDisplayNameFromConfig(prev);
    if (prevName.length > 0) o.displayName = prevName;
  }
  if (!('icon' in o) && typeof prevO.icon === 'string') o.icon = prevO.icon;
  if (!('accentColor' in o) && typeof prevO.accentColor === 'string') o.accentColor = prevO.accentColor;
  if (!('templateKey' in o) && typeof prevO.templateKey === 'string') o.templateKey = prevO.templateKey;
  return o;
}

function waterReminderSyncFingerprint(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  const o = raw as Record<string, unknown>;
  return JSON.stringify({
    reminderEnabled: o.reminderEnabled,
    reminderIntervalMin: o.reminderIntervalMin,
    reminderCustomMin: o.reminderCustomMin,
    smartNotification: o.smartNotification,
    reminderTimes: o.reminderTimes,
  });
}

/**
 * 일정 수정 시트 등에 끼워 넣는 루틴 설정 본문.
 * 목표 상세와 동일한 템플릿 Settings + 그룹/아이콘/시작 알림을 모두 포함합니다.
 */
export function RoutineInlineSettingsPanel({
  categoryKey,
  ink,
  muted,
  border,
  isDark = false,
  lockRename = true,
  previewTitle,
}: Props) {
  const key = categoryKey as GoalDetailCategoryKey;
  const [dataConfig, setDataConfig] = useState<unknown>(() => loadGoalDetailCategoryConfig(key) ?? {});
  const [groupKey, setGroupKey] = useState(() => resolveCatalogItemGroupKey(key));
  const medicineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocks = useDayPlanStore((s) => s.blocks);
  const activeBlockId = useDayPlanRuntimeStore((s) => s.activeBlockId);

  useEffect(() => {
    setDataConfig(loadGoalDetailCategoryConfig(key) ?? {});
    setGroupKey(resolveCatalogItemGroupKey(key));
  }, [key]);

  useEffect(
    () => () => {
      if (medicineTimerRef.current) clearTimeout(medicineTimerRef.current);
    },
    [],
  );

  const module = useMemo(
    () => resolveGoalDetailModuleForTarget(key, dataConfig),
    [dataConfig, key],
  );
  /** 실제 activity-session 활성 블록만 ‘실행 중’ — 오늘 담기 자동 집중(isFocusStarted)과 구분 */
  const isCategoryRunning = useCallback(
    (targetKey: string) => {
      if (!activeBlockId) return false;
      const block = blocks.find((b) => b.id === activeBlockId);
      if (!block) return false;
      const blockKey =
        resolveBlockCategoryKey(block) ?? resolveCategoryKeyFromLabel(block.category ?? '');
      return blockKey === targetKey;
    },
    [activeBlockId, blocks],
  );
  const Settings = module.Settings;
  const title =
    previewTitle?.trim() ||
    readRoutineDisplayNameFromConfig(dataConfig) ||
    categoryReminderLabelKo(key);

  const handleChangeDataConfig = useCallback(
    (next: unknown) => {
      const normalizedNext = key === 'healthIntake' ? normalizeHealthIntakeDetailConfig(next) : next;
      const persisted = withPreservedRoutineFields(key, normalizedNext);
      setDataConfig(persisted);
      saveGoalDetailCategoryConfig(key, persisted);
      registerOtherCategoryResolverFromStorage();
      useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();

      if (key === 'healthIntake' || key === 'medicine') {
        if (medicineTimerRef.current) clearTimeout(medicineTimerRef.current);
        medicineTimerRef.current = setTimeout(() => {
          medicineTimerRef.current = null;
          void syncMedicineReminderNotifications();
        }, 450);
      }
      if (key === 'water') {
        const prevWater = loadGoalDetailCategoryConfig('water');
        if (waterReminderSyncFingerprint(prevWater) !== waterReminderSyncFingerprint(persisted)) {
          useDayPlanDraftStore.getState().bumpWaterReminderSyncEpoch();
        }
      }
      if (isCustomFlowCategoryKey(key) && resolveCustomFlowTemplateKey(persisted) === 'reminder') {
        void persistReminderTemplateNotificationRule(key, persisted);
      }
      // medicine normalize path still saves raw when not healthIntake
      if (key === 'medicine') {
        normalizeMedicineDetailConfig(persisted);
      }
    },
    [key],
  );

  const handleChangeGroup = useCallback(
    (nextGroupKey: string) => {
      updateCatalogItemGroup(key, nextGroupKey);
      setGroupKey(nextGroupKey);
    },
    [key],
  );

  const running = isCategoryRunning(key);
  const renameLockedReason = running ? 'running' : lockRename ? 'today' : null;

  return (
    <View style={styles.root}>
      {/* 목표 상세와 동일: 잠금 안내 → 루틴 방식 → 템플릿 본문 */}
      {renameLockedReason ? (
        <View style={[styles.renameLockBanner, { borderBottomColor: border }]}>
          <IconSymbol name="lock.fill" size={13} color={muted} />
          <ThemedText style={[styles.renameLockBannerText, { color: muted }]}>
            {ROUTINE_RENAME_LOCK_MESSAGES[renameLockedReason]}
          </ThemedText>
        </View>
      ) : null}

      {isCustomFlowCategoryKey(key) ? (
        <CustomFlowTemplateMetaPill dataConfig={dataConfig} ink={ink} line={border} />
      ) : null}

      <Settings
        rhythmTitle={title}
        categoryKey={key}
        dataConfig={dataConfig}
        onChangeDataConfig={handleChangeDataConfig}
        allowRename={!lockRename && !running}
        renameLockedReason={renameLockedReason}
        hideTitleField
      />

      <View style={[styles.metaSection, { borderTopColor: border }]}>
        <ThemedText style={[styles.metaTitle, { color: muted }]}>루틴 설정</ThemedText>
        <CustomFlowGroupField groupKey={groupKey} onChangeGroupKey={handleChangeGroup} />
        {!running ? (
          <RoutineAppearanceField
            categoryKey={key}
            previewLabel={title}
            dataConfig={dataConfig}
            onChangeDataConfig={handleChangeDataConfig}
            isDark={isDark}
            ink={ink}
            muted={muted}
          />
        ) : null}
        <RoutineStartNotifyField
          categoryKey={key}
          ink={ink}
          muted={muted}
          border={border}
          isDark={isDark}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  renameLockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  renameLockBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  metaSection: {
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 4,
  },
  metaTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
});
