import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  countPendingRoutinesByLayout,
  formatHhmmClockKo,
  totalPendingRoutinesByLayout,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanStore,
} from '@entities/day-plan';
import {
  buildIncompleteRoutineReminderNotificationContent,
  saveIncompleteRoutineReminderSettings,
} from '@features/day-plan-notifications';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { t, useTranslation } from '@shared/lib/i18n';
import { loadIncompleteRoutineReminder } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import {
  DailyRhythmStyleAlarmRow,
  paletteForReminderTimeCard,
  SnappedTimePickerField,
} from '@widgets/daily-rhythm-time-field';

import { buildSettingsPalette, settingsChromeStyles as chrome } from '../lib/settingsChrome';


/** 설정 → 알림 → 미완료 일정 알림 */
export function IncompleteRoutineReminderSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const surface = useMemo(() => paletteForReminderTimeCard(false), []);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPersistRef = useRef<{ on: boolean; hhmm: string } | null>(null);

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderHhmm, setReminderHhmm] = useState('22:00');
  const [timeExpanded, setTimeExpanded] = useState(false);
  const priorityCategoryOrder = useDayPlanDraftStore((s) => s.priorityCategoryOrder);
  const prioritySectionsCategoryOrder = useDayPlanDraftStore(
    (s) => s.prioritySectionsCategoryOrder,
  );
  const prioritySectionsMealSlots = useDayPlanDraftStore((s) => s.prioritySectionsMealSlots);
  const completedFocusCategoryKeys = useDayPlanDraftStore((s) => s.completedFocusCategoryKeys);
  const planCompletionDismissedKeys = useDayPlanDraftStore((s) => s.planCompletionDismissedKeys);
  const isFocusStarted = useDayPlanDraftStore((s) => s.isFocusStarted);
  const priorityStart = useDayPlanDraftStore((s) => s.priorityStart);
  const priorityEnd = useDayPlanDraftStore((s) => s.priorityEnd);
  const visibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const blocks = useDayPlanStore((s) => s.blocks);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);
  const pendingCounts = useMemo(
    () =>
      countPendingRoutinesByLayout({
        visibility,
        priorityCategoryOrder,
        prioritySectionsCategoryOrder,
        prioritySectionsMealSlots,
        completedFocusCategoryKeys,
        planCompletionDismissedKeys,
        isFocusStarted,
        priorityStart,
        priorityEnd,
        blocks,
        completedBlockIds,
        skippedBlockIds,
      }),
    [
      visibility,
      priorityCategoryOrder,
      prioritySectionsCategoryOrder,
      prioritySectionsMealSlots,
      completedFocusCategoryKeys,
      planCompletionDismissedKeys,
      isFocusStarted,
      priorityStart,
      priorityEnd,
      blocks,
      completedBlockIds,
      skippedBlockIds,
    ],
  );
  const pendingTotal = totalPendingRoutinesByLayout(pendingCounts);
  const pendingPreview = useMemo(
    () => buildIncompleteRoutineReminderNotificationContent(pendingCounts),
    [pendingCounts],
  );

  const hydrateFromStorage = useCallback(() => {
    const row = loadIncompleteRoutineReminder();
    setReminderOn(row.enabled);
    setReminderHhmm(row.reminderHhmm);
    setTimeExpanded(false);
  }, []);


  useFocusEffect(
    useCallback(() => {
      hydrateFromStorage();
    }, [hydrateFromStorage]),
  );

  const flushPersist = useCallback(async (on: boolean, hhmm: string) => {
    const ok = await saveIncompleteRoutineReminderSettings({
      enabled: on,
      reminderHhmm: hhmm,
    });
    if (on && !ok) {
      setReminderOn(false);
      Alert.alert(t('alert.permission.title'), t('alert.permission.message'));
    }
  }, []);

  const schedulePersist = useCallback(
    (on: boolean, hhmm: string) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      pendingPersistRef.current = { on, hhmm };
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        pendingPersistRef.current = null;
        void flushPersist(on, hhmm);
      }, 380);
    },
    [flushPersist],
  );

  useEffect(
    () => () => {
      if (!persistTimerRef.current) return;
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
      const pending = pendingPersistRef.current;
      pendingPersistRef.current = null;
      if (pending) void flushPersist(pending.on, pending.hhmm);
    },
    [flushPersist],
  );

  const onToggleReminder = useCallback(
    async (next: boolean) => {
      void Haptics.selectionAsync();
      setReminderOn(next);
      await flushPersist(next, reminderHhmm);
    },
    [flushPersist, reminderHhmm],
  );

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <ThemedView
      style={[styles.screen, { backgroundColor: p.bg }]}
      darkColor={p.bg}
      lightColor={p.bg}>
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[chrome.header, { backgroundColor: p.bg, borderBottomColor: p.border }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={chrome.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.back')}>
            <IconSymbol name="chevron.left" size={20} color={p.title} />
          </Pressable>
          <ThemedText
            style={[chrome.headerTitle, styles.headerTitleCenter, { color: p.title }]}
            lightColor={p.title}
            darkColor={p.title}>
            {t('settings.incompleteReminder.title')}
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={chrome.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[chrome.sectionHint, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
            {t('settings.incompleteReminder.hint')}
          </ThemedText>

          <View style={[styles.card, { borderColor: p.border, backgroundColor: p.surface }]}>
            <DailyRhythmStyleAlarmRow
              title={t('settings.incompleteReminder.rowTitle')}
              hint={t('settings.incompleteReminder.rowHint')}
              value={reminderOn}
              onValueChange={(v) => void onToggleReminder(v)}
              palette={surface.alarm}
            />

            {reminderOn ? (
              <View
                style={[
                  styles.innerCard,
                  {
                    backgroundColor: isDark
                      ? RetroFlatColors.dark.surfaceAlt
                      : RetroFlatColors.light.bg,
                    borderColor: p.border,
                  },
                ]}>
                <SnappedTimePickerField
                  label={t('settings.incompleteReminder.timeLabel')}
                  hint={t('settings.incompleteReminder.timeHint')}
                  valueHhmm={reminderHhmm}
                  onChangeHhmm={(next) => {
                    setReminderHhmm(next);
                    schedulePersist(true, next);
                  }}
                  expanded={timeExpanded}
                  onToggleExpand={() => setTimeExpanded((v) => !v)}
                  isDark={false}
                  palette={surface.timeField}
                  snapStepMinutes={1}
                />
                <ThemedText style={[styles.previewLine, { color: p.desc }]}>
                  {pendingTotal > 0
                    ? t('settings.incompleteReminder.previewScheduled', { time: formatHhmmClockKo(reminderHhmm), title: pendingPreview.title, body: pendingPreview.body })
                    : t('settings.incompleteReminder.previewNone')}
                </ThemedText>
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
  headerTitleCenter: {
    flex: 1,
    textAlign: 'center',
  },
  card: {
    borderRadius: 0,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  innerCard: {
    borderRadius: 0,
    borderWidth: 2,
    padding: 12,
    gap: 10,
  },
  previewLine: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
});
