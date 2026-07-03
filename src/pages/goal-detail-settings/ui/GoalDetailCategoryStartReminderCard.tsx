import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  categoryReminderLabelKo,
  clampHhmmToPriorityWindow,
  formatHhmmClockKo,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  parseReminderTimesInput,
  persistSingleCategoryReminderRule,
} from '@features/category-reminder-notifications';
import { ensureLocalNotificationPermission } from '@shared/lib/notifications';
import { loadCategoryReminderRules } from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';
import {
  DailyRhythmStyleAlarmRow,
  SnappedTimePickerField,
  paletteForReminderTimeCard,
} from '@widgets/daily-rhythm-time-field';

import type { CategoryReminderRuleRow } from '@shared/lib/storage';

import type { GoalDetailCategoryKey } from '../model/types';

const BORDER = 'rgba(0,0,0,0.08)';
const MAX_TIME_SLOTS = 5;

type Props = {
  categoryKey: GoalDetailCategoryKey;
};

function readRowForCategory(categoryKey: string) {
  const rules = loadCategoryReminderRules();
  return rules[categoryKey];
}

function buildReminderRow(reminderOn: boolean, times: string[]): CategoryReminderRuleRow {
  const enabledStored = Boolean(reminderOn && times.length > 0);
  return { enabled: enabledStored, times: enabledStored ? times : [] };
}

export function GoalDetailCategoryStartReminderCard({ categoryKey }: Props) {
  const priorityStart = useDayPlanDraftStore((s) => s.priorityStart);
  const priorityEnd = useDayPlanDraftStore((s) => s.priorityEnd);
  const categoryLabelEpoch = useDayPlanDraftStore((s) => s.categoryLabelEpoch);
  const label = useMemo(
    () => categoryReminderLabelKo(categoryKey),
    [categoryKey, categoryLabelEpoch],
  );
  const startHint = useMemo(
    () => `${label} — 매일 지정한 시각에 일정 확인 알림을 받아요. 아래 담기 구간 안에서만 골라요.`,
    [label],
  );
  const routineWindowLine = useMemo(
    () => `${formatHhmmClockKo(priorityStart)} – ${formatHhmmClockKo(priorityEnd)}`,
    [priorityEnd, priorityStart],
  );
  /** 목표 상세 화면은 라이트 고정 — 데이플랜 시작·마무리 설정과 동일 UI 토큰(라이트) */
  const surface = useMemo(() => paletteForReminderTimeCard(false), []);

  const [reminderOn, setReminderOn] = useState(false);
  const [times, setTimes] = useState<string[]>([]);
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPersist = useCallback(
    async (on: boolean, slotTimes: string[]) => {
      const normalized = parseReminderTimesInput(slotTimes.join(','));
      const row = buildReminderRow(on, normalized);
      await persistSingleCategoryReminderRule(categoryKey, row);
      await useLocalNotificationsStore.getState().refreshPermission();
      const perm = useLocalNotificationsStore.getState().permission;
      if (row.enabled && perm !== 'granted') {
        Alert.alert('알림', '알림을 받으려면 기기 설정에서 알림 권한을 허용해 주세요.');
      }
    },
    [categoryKey],
  );

  const schedulePersist = useCallback(
    (on: boolean, slotTimes: string[]) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        void flushPersist(on, slotTimes);
      }, 380);
    },
    [flushPersist],
  );

  useEffect(() => {
    const r = readRowForCategory(categoryKey);
    const list = Array.isArray(r?.times) ? [...r.times] : [];
    const on = Boolean(r?.enabled && list.length > 0);
    const rawList = list.length > 0 ? list : ['09:00'];
    const clamped = rawList.map((t) => clampHhmmToPriorityWindow(t, priorityStart, priorityEnd, 1));
    setReminderOn(on);
    setTimes(clamped);
    setOpenSlotIndex(null);
    if (on && list.length > 0 && JSON.stringify(list) !== JSON.stringify(clamped)) {
      void flushPersist(on, clamped);
    }
  }, [categoryKey, priorityStart, priorityEnd, flushPersist]);

  useEffect(
    () => () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    },
    [],
  );

  const onToggleReminder = useCallback(
    async (next: boolean) => {
      void Haptics.selectionAsync();
      if (next) {
        await ensureLocalNotificationPermission();
      }
      const slotTimes = times.length > 0 ? times : ['09:00'];
      if (times.length === 0) {
        setTimes(['09:00']);
      }
      setReminderOn(next);
      await flushPersist(next, slotTimes);
    },
    [flushPersist, times],
  );

  const updateTimeAt = useCallback(
    (index: number, hhmm: string) => {
      setTimes((prev) => {
        const next = [...prev];
        next[index] = hhmm;
        const normalized = parseReminderTimesInput(next.join(','));
        schedulePersist(reminderOn, normalized);
        return normalized;
      });
    },
    [reminderOn, schedulePersist],
  );

  const addTimeSlot = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimes((prev) => {
      if (prev.length >= MAX_TIME_SLOTS) return prev;
      const next = [...prev, '12:00'];
      const normalized = parseReminderTimesInput(next.join(','));
      schedulePersist(reminderOn, normalized);
      return normalized;
    });
    setOpenSlotIndex(null);
  }, [reminderOn, schedulePersist]);

  const removeTimeAt = useCallback(
    (index: number) => {
      void Haptics.selectionAsync();
      setTimes((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((_, i) => i !== index);
        schedulePersist(reminderOn, next);
        return next;
      });
      setOpenSlotIndex(null);
    },
    [reminderOn, schedulePersist],
  );

  return (
    <View style={[styles.outerCard, { borderColor: BORDER, backgroundColor: '#ffffff' }]}>
      <DailyRhythmStyleAlarmRow
        title="시작 알림"
        hint={startHint}
        value={reminderOn}
        onValueChange={(v) => void onToggleReminder(v)}
        palette={surface.alarm}
      />

      <View
        style={[
          styles.routineWindowBand,
          { backgroundColor: surface.cardBg, borderColor: surface.cardBorder },
        ]}
        accessibilityRole="text"
        accessibilityLabel={`오늘 담기 구간 ${routineWindowLine}`}>
        <ThemedText style={[styles.routineWindowLabel, { color: surface.timeField.onVariant }]}>
          오늘 담기 구간(시작~마무리)
        </ThemedText>
        <ThemedText style={[styles.routineWindowTime, { color: surface.timeField.onSurface }]}>
          {routineWindowLine}
        </ThemedText>
      </View>

      {reminderOn ? (
        <View
          style={[
            styles.innerCard,
            { backgroundColor: surface.cardBg, borderColor: surface.cardBorder },
          ]}>
          {times.map((hhmm, index) => (
            <View key={`slot-${index}`}>
              {index > 0 ? (
                <View style={[styles.divider, { backgroundColor: surface.timeField.border }]} />
              ) : null}
              <View style={styles.slotRow}>
                <View style={styles.slotField}>
                  <SnappedTimePickerField
                    label={index === 0 ? '알림 시각' : `추가 시각 ${index + 1}`}
                    hint={
                      index === 0
                        ? '매일 이 시각에 알려 드려요.'
                        : '같은 카테고리로 여러 번 알릴 수 있어요.'
                    }
                    valueHhmm={hhmm}
                    onChangeHhmm={(next) => updateTimeAt(index, next)}
                    expanded={openSlotIndex === index}
                    onToggleExpand={() =>
                      setOpenSlotIndex((j) => (j === index ? null : index))
                    }
                    isDark={false}
                    palette={surface.timeField}
                    routineDayStartHhmm={priorityStart}
                    routineDayEndHhmm={priorityEnd}
                    snapStepMinutes={1}
                  />
                </View>
                {times.length > 1 ? (
                  <Pressable
                    onPress={() => removeTimeAt(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`${index + 1}번 시각 삭제`}
                    hitSlop={8}
                    style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.65 }]}>
                    <ThemedText style={[styles.removeBtnText, { color: surface.timeField.onVariant }]}>
                      삭제
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}

          {times.length < MAX_TIME_SLOTS ? (
            <Pressable
              onPress={addTimeSlot}
              style={({ pressed }) => [styles.addLink, pressed && { opacity: 0.75 }]}
              accessibilityRole="button"
              accessibilityLabel="알림 시각 추가">
              <ThemedText style={[styles.addLinkText, { color: surface.timeField.onSurface }]}>
                + 시각 추가
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outerCard: {
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  routineWindowBand: {
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  routineWindowLabel: { fontSize: 12, fontWeight: '600', letterSpacing: -0.15 },
  routineWindowTime: { fontSize: 16, fontWeight: '800', letterSpacing: -0.35 },
  innerCard: {
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  slotField: { flex: 1, minWidth: 0 },
  removeBtn: { paddingTop: 10, paddingHorizontal: 4 },
  removeBtnText: { fontSize: 13, fontWeight: '700' },
  addLink: { paddingVertical: 8, paddingHorizontal: 2, alignSelf: 'flex-start' },
  addLinkText: { fontSize: 14, fontWeight: '800' },
});
