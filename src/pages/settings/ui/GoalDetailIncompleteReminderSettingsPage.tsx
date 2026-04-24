import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clampHhmmToPriorityWindow, formatHhmmClockKo } from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import { useDayPlanDraftStore } from '@pages/day-plan/model/dayPlanDraftStore';
import { parseReminderTimesInput } from '@features/category-reminder-notifications';
import { syncGoalDetailIncompleteReminderNotifications } from '@features/day-plan-notifications';
import { ensureLocalNotificationPermission } from '@shared/lib/notifications';
import {
  loadGoalDetailIncompleteReminderRule,
  saveGoalDetailIncompleteReminderRule,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import {
  DailyRhythmStyleAlarmRow,
  SnappedTimePickerField,
  paletteForReminderTimeCard,
} from '@widgets/daily-rhythm-time-field';

const BG = '#ffffff';
const BORDER = 'rgba(0,0,0,0.08)';
const ON_SURFACE = '#18181b';
const MUTED = '#52525b';
const MAX_TIME_SLOTS = 20;

export function GoalDetailIncompleteReminderSettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const surface = useMemo(() => paletteForReminderTimeCard(false), []);
  const priorityStart = useDayPlanDraftStore((s) => s.priorityStart);
  const priorityEnd = useDayPlanDraftStore((s) => s.priorityEnd);

  const [enabled, setEnabled] = useState(false);
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);

  const loadDraft = useCallback(() => {
    const r = loadGoalDetailIncompleteReminderRule();
    const list = Array.isArray(r?.times) ? [...r.times] : [];
    const on = Boolean(r?.enabled && list.length > 0);
    const rawList = list.length > 0 ? list : ['09:00'];
    const clamped = rawList.map((t) => clampHhmmToPriorityWindow(t, priorityStart, priorityEnd, 1));
    setEnabled(on);
    setTimes(clamped);
    setOpenSlotIndex(null);
  }, [priorityStart, priorityEnd]);

  useFocusEffect(
    useCallback(() => {
      loadDraft();
    }, [loadDraft]),
  );

  const slotCount = useMemo(() => {
    if (!enabled) return 0;
    return parseReminderTimesInput(times.join(',')).length;
  }, [enabled, times]);

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  const onToggleEnabled = useCallback(async (next: boolean) => {
    void Haptics.selectionAsync();
    if (next) {
      await ensureLocalNotificationPermission();
    }
    if (times.length === 0) {
      setTimes(['09:00']);
    }
    setEnabled(next);
  }, [times.length]);

  const updateTimeAt = useCallback((index: number, hhmm: string) => {
    setTimes((prev) => {
      const next = [...prev];
      next[index] = hhmm;
      return parseReminderTimesInput(next.join(','));
    });
  }, []);

  const addTimeSlot = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { priorityStart: ps, priorityEnd: pe } = useDayPlanDraftStore.getState();
    setTimes((prev) => {
      if (prev.length >= MAX_TIME_SLOTS) return prev;
      const nextSlot = clampHhmmToPriorityWindow('12:00', ps, pe, 1);
      return parseReminderTimesInput([...prev, nextSlot].join(','));
    });
    setOpenSlotIndex(null);
  }, []);

  const removeTimeAt = useCallback((index: number) => {
    void Haptics.selectionAsync();
    setTimes((prev) => {
      if (prev.length <= 1) return prev;
      return parseReminderTimesInput(prev.filter((_, i) => i !== index).join(','));
    });
    setOpenSlotIndex(null);
  }, []);

  const handleSave = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const normalized = parseReminderTimesInput(times.join(','));
    const nextEnabled = Boolean(enabled && normalized.length > 0);
    saveGoalDetailIncompleteReminderRule({
      enabled: nextEnabled,
      times: nextEnabled ? normalized : [],
    });
    const scheduledOk = await syncGoalDetailIncompleteReminderNotifications();
    await useLocalNotificationsStore.getState().refreshPermission();
    const perm = useLocalNotificationsStore.getState().permission;
    if (nextEnabled && !scheduledOk) {
      Alert.alert(
        '알림',
        perm !== 'granted'
          ? '알림 권한이 없어 매일 알림을 예약하지 못했어요. 허용한 뒤 다시 저장해 주세요.'
          : '시각을 확인해 주세요. 저장 후 다시 시도해 보세요.',
      );
    } else if (normalized.length > MAX_TIME_SLOTS) {
      Alert.alert(
        '알림',
        '등록한 시각이 많아 최대 20개까지만 예약했어요. 나머지는 줄이거나 나눠 저장해 주세요.',
      );
    }
    router.back();
  }, [enabled, times, router]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: BG }]} darkColor={BG} lightColor={BG}>
      <View style={[styles.safe, { paddingTop: topInset }]}>
        <View style={[styles.header, { borderBottomColor: BORDER }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={22} color={ON_SURFACE} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: ON_SURFACE }]}>목표 상세 알림</ThemedText>
          <Pressable
            onPress={() => void handleSave()}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="저장">
            <ThemedText style={[styles.saveText, { color: ON_SURFACE }]}>저장</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.lead, { color: MUTED }]}>
            상세 설정을 아직 하지 않았거나 기록 체크가 필요할 때, 아래에서 정한 시각마다 가볍게 알려 드려요.
            매일 같은 시각에 반복되며, 저장해야 기기에 예약돼요. 알림 시각은 아래 담기 구간 안으로만 맞춰져요.
          </ThemedText>

          <View
            style={[styles.routineWindowBand, { borderColor: BORDER, backgroundColor: '#f4f4f5' }]}
            accessibilityRole="text"
            accessibilityLabel={`오늘 담기 구간 ${formatHhmmClockKo(priorityStart)}에서 ${formatHhmmClockKo(priorityEnd)}까지`}>
            <ThemedText style={[styles.routineWindowLabel, { color: MUTED }]}>
              오늘 담기 구간(시작~마무리)
            </ThemedText>
            <ThemedText style={[styles.routineWindowTime, { color: ON_SURFACE }]}>
              {formatHhmmClockKo(priorityStart)} – {formatHhmmClockKo(priorityEnd)}
            </ThemedText>
          </View>

          <ThemedText style={[styles.hint, { color: MUTED }]}>
            예약은 최대 {MAX_TIME_SLOTS}개까지 적용돼요. 현재 설정 시각 수: {slotCount}개
          </ThemedText>

          <View style={[styles.outerCard, { borderColor: BORDER }]}>
            <DailyRhythmStyleAlarmRow
              title="알림 받기"
              hint="켜 두면 아래 시각마다 알림을 받아요. 집중 실행 화면은 막지 않아요."
              value={enabled}
              onValueChange={(v) => void onToggleEnabled(v)}
              palette={surface.alarm}
            />

            {enabled ? (
              <View
                style={[
                  styles.innerCard,
                  { backgroundColor: surface.cardBg, borderColor: surface.cardBorder },
                ]}>
                {times.map((hhmm, index) => (
                  <View key={`slot-${index}`}>
                    {index > 0 ? (
                      <View
                        style={[styles.divider, { backgroundColor: surface.timeField.border }]}
                      />
                    ) : null}
                    <View style={styles.slotRow}>
                      <View style={styles.slotField}>
                        <SnappedTimePickerField
                          label={index === 0 ? '알림 시각' : `추가 시각 ${index + 1}`}
                          hint={
                            index === 0
                              ? '매일 이 시각에 알려 드려요.'
                              : '여러 시각에 알릴 수 있어요.'
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
                          <ThemedText
                            style={[styles.removeBtnText, { color: surface.timeField.onVariant }]}>
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
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  saveText: { fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  lead: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  routineWindowBand: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  routineWindowLabel: { fontSize: 12, fontWeight: '600', letterSpacing: -0.15 },
  routineWindowTime: { fontSize: 16, fontWeight: '800', letterSpacing: -0.35 },
  hint: { fontSize: 12, lineHeight: 17, fontWeight: '600', marginBottom: 6 },
  outerCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
    marginTop: 8,
    backgroundColor: '#ffffff',
  },
  innerCard: {
    borderRadius: 14,
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
