import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isSpineBlockScheduleWithinPriorityWindow,
  resolveSpinePriorityWindow,
} from '@entities/day-plan';
import { formatHhmmClock, useTranslation } from '@shared/lib/i18n';
import {
  CityPopTypography,
  RETRO_BORDER_WIDTH,
  RetroFlatColors,
} from '@shared/config/retroFlat';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import {
  CatalogRowSpineTimePanel,
  type CatalogRowSpineTimePanelHandle,
} from './CatalogRowSpineTimePanel';

const DELETE_SHADOW = 3;

export type SpineBlockEditDraft = {
  blockId: string;
  /** 저장 시 기존 블록 제목 유지(시트에서 편집하지 않음) */
  title: string;
  categoryKey: string | null;
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay?: boolean;
};

type Props = {
  visible: boolean;
  draft: SpineBlockEditDraft | null;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  priorityStart: string;
  priorityEnd: string;
  /** 일정 시작 기준 달력일 — 시간 패널 날짜 표시용 */
  baseDateKey?: string;
  onClose: () => void;
  onSave: (input: {
    title: string;
    categoryKey: string | null;
    startMinutes: number;
    endMinutes: number;
    endsNextCalendarDay: boolean;
    blockId: string;
  }) => void;
  onDelete?: (blockId: string) => void;
  /**
   * 연결된 루틴의 전체 설정(템플릿·그룹·아이콘·알림).
   * app 레이어에서 GoalDetail 패널을 주입한다.
   */
  renderRoutineSettings?: (categoryKey: string) => ReactNode;
};

/** 타임라인 블록 탭 — 일정 + 루틴 설정을 한 시트에서 수정 */
export function SpineBlockEditSheet({
  visible,
  draft,
  isDark,
  ink,
  muted,
  surface,
  line,
  priorityStart,
  priorityEnd,
  baseDateKey,
  onClose,
  onSave,
  onDelete,
  renderRoutineSettings,
}: Props) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : '#000000';
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [endMinutes, setEndMinutes] = useState(9 * 60 + 30);
  const [endsNextCalendarDay, setEndsNextCalendarDay] = useState(false);
  const timePanelRef = useRef<CatalogRowSpineTimePanelHandle>(null);

  useEffect(() => {
    if (!visible || !draft) return;
    setCategoryKey(draft.categoryKey);
    setStartMinutes(draft.startMinutes);
    setEndMinutes(draft.endMinutes);
    setEndsNextCalendarDay(Boolean(draft.endsNextCalendarDay));
  }, [visible, draft]);

  const handleScheduleChange = useCallback((start: number, end: number, endsNext: boolean) => {
    let nextEnd = end;
    if (!endsNext && nextEnd <= start) {
      nextEnd = Math.min(24 * 60, start + 15);
    }
    setStartMinutes(start);
    setEndMinutes(nextEnd);
    setEndsNextCalendarDay(endsNext);
  }, []);

  const handleSave = useCallback(() => {
    if (!draft) return;
    const pending = timePanelRef.current?.commitPendingSchedule();
    if (timePanelRef.current && !pending) return;
    const finalStartMinutes = pending?.startMinutes ?? startMinutes;
    const finalEndMinutes = pending?.endMinutes ?? endMinutes;
    const finalEndsNextCalendarDay = pending?.endsNextCalendarDay ?? endsNextCalendarDay;
    const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
    if (
      !window ||
      !isSpineBlockScheduleWithinPriorityWindow(
        {
          startMinutes: finalStartMinutes,
          endMinutes: finalEndMinutes,
          endsNextCalendarDay: finalEndsNextCalendarDay,
        },
        window,
      )
    ) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('catalog.checkTimeTitle'),
        t('dayPlan.blockExceedsEnd', { end: formatHhmmClock(priorityEnd, locale) }),
      );
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      title: draft.title,
      categoryKey,
      startMinutes: finalStartMinutes,
      endMinutes: finalEndMinutes,
      endsNextCalendarDay: finalEndsNextCalendarDay,
      blockId: draft.blockId,
    });
  }, [
    categoryKey,
    draft,
    endMinutes,
    endsNextCalendarDay,
    onSave,
    priorityEnd,
    priorityStart,
    startMinutes,
  ]);

  if (!draft) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          <ThemedText style={[styles.title, { color: ink }]}>{t('dayPlan.blockEditTitle')}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {categoryKey && renderRoutineSettings ? (
            <View style={styles.routineSettingsPanel}>{renderRoutineSettings(categoryKey)}</View>
          ) : null}

          <View style={styles.fieldBlock}>
            <ThemedText style={[styles.sectionLabel, { color: muted }]}>{t('common.time')}</ThemedText>
            <CatalogRowSpineTimePanel
              ref={timePanelRef}
              presentation="sheet"
              startMinutes={startMinutes}
              endMinutes={endMinutes}
              endsNextCalendarDay={endsNextCalendarDay}
              baseDateKey={baseDateKey}
              ink={ink}
              muted={muted}
              line={line}
              isDark={isDark}
              priorityStart={priorityStart}
              priorityEnd={priorityEnd}
              onScheduleChange={handleScheduleChange}
              contentInsetLeft={0}
            />
          </View>

          {onDelete ? (
            <View style={styles.deleteShell}>
              <View
                pointerEvents="none"
                style={[
                  styles.deleteShadow,
                  {
                    backgroundColor: tone.danger,
                    borderColor: line,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('alert.deleteBlock.title')}
                onPress={() => onDelete(draft.blockId)}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  {
                    borderColor: line,
                    backgroundColor: pressed ? '#F5B8B2' : tone.dangerBg,
                  },
                  pressed && { opacity: 0.94 },
                ]}>
                <ThemedText style={[styles.deleteBtnText, { color: tone.danger }]}>{t('common.delete')}</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: line,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: surface,
            },
          ]}>
          <BrutalConfirmButton
            label={t('common.save')}
            accessibilityLabel={t('common.save')}
            align="stretch"
            fill={ink}
            labelColor={isDark ? '#09090b' : '#FAFAFA'}
            border={line}
            shadowColor={shadowInk}
            onPress={handleSave}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16, paddingHorizontal: 20, gap: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: RETRO_BORDER_WIDTH,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  fieldBlock: {
    marginBottom: 8,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 10,
    ...CityPopTypography.labelMd,
  },
  routineSettingsPanel: {
    marginBottom: 8,
  },
  deleteShell: {
    position: 'relative',
    marginTop: 20,
    marginRight: DELETE_SHADOW,
    marginBottom: DELETE_SHADOW,
  },
  deleteShadow: {
    position: 'absolute',
    top: DELETE_SHADOW,
    left: DELETE_SHADOW,
    right: -DELETE_SHADOW,
    bottom: -DELETE_SHADOW,
    borderWidth: RETRO_BORDER_WIDTH,
  },
  deleteBtn: {
    borderWidth: RETRO_BORDER_WIDTH,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: RETRO_BORDER_WIDTH,
  },
});
