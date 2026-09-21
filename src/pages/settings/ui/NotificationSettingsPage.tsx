import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addDaysToLocalDateKey,
  clampNotifyTimeToPriorityWindow,
  formatMinutesToHHmm,
  getLocalDateKey,
  isNotifyTimeWithinPriorityWindow,
  parseHHmmToMinutes,
  resolveSpinePriorityWindow,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { syncPriorityDayEndAlarm, syncPriorityDayStartAlarm } from '@features/day-plan-notifications';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { formatDateKeyCompact, useTranslation } from '@shared/lib/i18n';
import { loadPriorityDayEndAlarm, loadPriorityDayStartAlarm } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { SmoothSegmentedControl } from '@shared/ui/smooth-segmented-control';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import {
  DailyRhythmStyleAlarmRow,
  paletteForReminderTimeCard,
  SnappedTimePickerField,
} from '@widgets/daily-rhythm-time-field';

import { buildSettingsPalette, settingsChromeStyles as chrome } from '../lib/settingsChrome';

/** 설정 → 알림 */
export function NotificationSettingsPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const surface = useMemo(() => paletteForReminderTimeCard(isDark), [isDark]);
  const ink = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const priorityStart = useDayPlanDraftStore((s) => s.priorityStart);
  const priorityEnd = useDayPlanDraftStore((s) => s.priorityEnd);

  const priorityWindow = useMemo(
    () => resolveSpinePriorityWindow(priorityStart, priorityEnd),
    [priorityEnd, priorityStart],
  );
  const overnight = priorityWindow?.overnight === true;

  const [dayStartAlarmOn, setDayStartAlarmOn] = useState(
    () => loadPriorityDayStartAlarm().enabled,
  );
  const [dayEndAlarmOn, setDayEndAlarmOn] = useState(() => loadPriorityDayEndAlarm().enabled);
  const [dayEndAlarmHhmm, setDayEndAlarmHhmm] = useState(
    () => loadPriorityDayEndAlarm().reminderHhmm,
  );
  const [dayEndAlarmNextDay, setDayEndAlarmNextDay] = useState(
    () => loadPriorityDayEndAlarm().reminderNextDay,
  );
  const [dayEndAlarmTimeExpanded, setDayEndAlarmTimeExpanded] = useState(false);

  const endPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEndPersistRef = useRef<{
    on: boolean;
    hhmm: string;
    nextDay: boolean;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      setDayStartAlarmOn(loadPriorityDayStartAlarm().enabled);
      const endAlarm = loadPriorityDayEndAlarm();
      setDayEndAlarmOn(endAlarm.enabled);
      setDayEndAlarmHhmm(endAlarm.reminderHhmm);
      setDayEndAlarmNextDay(endAlarm.reminderNextDay);
      setDayEndAlarmTimeExpanded(false);
    }, []),
  );

  const flushDayEndPersist = useCallback(
    async (on: boolean, hhmm: string, nextDay: boolean) => {
      const ok = await syncPriorityDayEndAlarm({
        enabled: on,
        reminderHhmm: hhmm,
        reminderNextDay: nextDay,
      });
      if (on && !ok) {
        setDayEndAlarmOn(false);
        Alert.alert(t('alert.permission.title'), t('alert.permission.message'));
      }
    },
    [t],
  );

  const scheduleDayEndPersist = useCallback(
    (on: boolean, hhmm: string, nextDay: boolean) => {
      if (endPersistTimerRef.current) clearTimeout(endPersistTimerRef.current);
      pendingEndPersistRef.current = { on, hhmm, nextDay };
      endPersistTimerRef.current = setTimeout(() => {
        endPersistTimerRef.current = null;
        pendingEndPersistRef.current = null;
        void flushDayEndPersist(on, hhmm, nextDay);
      }, 380);
    },
    [flushDayEndPersist],
  );

  useEffect(
    () => () => {
      if (!endPersistTimerRef.current) return;
      clearTimeout(endPersistTimerRef.current);
      endPersistTimerRef.current = null;
      const pending = pendingEndPersistRef.current;
      pendingEndPersistRef.current = null;
      if (pending) void flushDayEndPersist(pending.on, pending.hhmm, pending.nextDay);
    },
    [flushDayEndPersist],
  );

  /** 당일 구간이면 다음 날 플래그 해제 */
  useEffect(() => {
    if (overnight || !dayEndAlarmNextDay) return;
    setDayEndAlarmNextDay(false);
    if (dayEndAlarmOn) {
      scheduleDayEndPersist(true, dayEndAlarmHhmm, false);
    }
  }, [dayEndAlarmHhmm, dayEndAlarmNextDay, dayEndAlarmOn, overnight, scheduleDayEndPersist]);

  const applyDayEndTime = useCallback(
    (hhmm: string, nextDay: boolean) => {
      if (!priorityWindow) {
        setDayEndAlarmHhmm(hhmm);
        setDayEndAlarmNextDay(false);
        scheduleDayEndPersist(true, hhmm, false);
        return;
      }
      const minutes = parseHHmmToMinutes(hhmm);
      if (minutes === null) return;
      const wantNext = overnight && nextDay;
      const clamped = isNotifyTimeWithinPriorityWindow(minutes, wantNext, priorityWindow)
        ? { minutes, nextCalendarDay: wantNext }
        : clampNotifyTimeToPriorityWindow(minutes, wantNext, priorityWindow);
      const nextHhmm = formatMinutesToHHmm(clamped.minutes);
      const nextDayFlag = overnight && clamped.nextCalendarDay;
      setDayEndAlarmHhmm(nextHhmm);
      setDayEndAlarmNextDay(nextDayFlag);
      scheduleDayEndPersist(true, nextHhmm, nextDayFlag);
    },
    [overnight, priorityWindow, scheduleDayEndPersist],
  );

  const onToggleDayStart = useCallback(
    async (next: boolean) => {
      void Haptics.selectionAsync();
      setDayStartAlarmOn(next);
      const ok = await syncPriorityDayStartAlarm({
        enabled: next,
        startHhmm: priorityStart,
      });
      if (next && !ok) {
        setDayStartAlarmOn(false);
        Alert.alert(t('alert.permission.title'), t('alert.permission.message'));
      }
    },
    [priorityStart, t],
  );

  const onToggleDayEnd = useCallback(
    async (next: boolean) => {
      void Haptics.selectionAsync();
      setDayEndAlarmOn(next);
      if (!next) setDayEndAlarmTimeExpanded(false);
      await flushDayEndPersist(next, dayEndAlarmHhmm, overnight && dayEndAlarmNextDay);
    },
    [dayEndAlarmHhmm, dayEndAlarmNextDay, flushDayEndPersist, overnight],
  );

  const todayKey = getLocalDateKey();
  const todayChoiceLabel = t('dayRhythm.todayChoice', {
    date: formatDateKeyCompact(todayKey, locale),
  });
  const nextDayChoiceLabel = t('dayRhythm.nextDayChoice', {
    date: formatDateKeyCompact(addDaysToLocalDateKey(todayKey, 1), locale),
  });
  const dateCaption = overnight
    ? formatDateKeyCompact(
        dayEndAlarmNextDay ? addDaysToLocalDateKey(todayKey, 1) : todayKey,
        locale,
      )
    : undefined;

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
            {t('settings.notificationTitle')}
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={chrome.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[chrome.sectionHint, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
            {t('settings.notification.pageHint')}
          </ThemedText>

          <CityPopCardShell
            isDark={isDark}
            faceColor={p.surface}
            shadowColor={isDark ? RetroFlatColors.dark.solidShadow : RetroFlatColors.light.text}
            contentStyle={styles.card}>
            <DailyRhythmStyleAlarmRow
              title={t('dayRhythm.dayStartAlarmTitle')}
              hint={t('dayRhythm.dayStartAlarmHint')}
              value={dayStartAlarmOn}
              onValueChange={(v) => void onToggleDayStart(v)}
              palette={surface.alarm}
            />
            <View style={[styles.divider, { backgroundColor: p.border }]} />
            <DailyRhythmStyleAlarmRow
              title={t('dayRhythm.dayEndAlarmTitle')}
              hint={t('dayRhythm.dayEndAlarmHint')}
              value={dayEndAlarmOn}
              onValueChange={(v) => void onToggleDayEnd(v)}
              palette={surface.alarm}
            />
            {dayEndAlarmOn ? (
              <View
                style={[
                  styles.innerCard,
                  {
                    backgroundColor: isDark
                      ? RetroFlatColors.dark.surfaceAlt
                      : RetroFlatColors.light.bg,
                  },
                ]}>
                <SnappedTimePickerField
                  label={t('dayRhythm.reminderTimeLabel')}
                  hint={t('dayRhythm.reminderTimeHint')}
                  valueHhmm={dayEndAlarmHhmm}
                  onChangeHhmm={(next) => applyDayEndTime(next, dayEndAlarmNextDay)}
                  expanded={dayEndAlarmTimeExpanded}
                  onToggleExpand={() => setDayEndAlarmTimeExpanded((v) => !v)}
                  isDark={isDark}
                  palette={surface.timeField}
                  snapStepMinutes={1}
                  dateCaption={dateCaption}
                  expandedExtra={
                    overnight ? (
                      <View style={styles.endDateChoiceInline}>
                        <ThemedText
                          style={[styles.endDateChoiceQuestion, { color: surface.timeField.onVariant }]}
                          lightColor={surface.timeField.onVariant}
                          darkColor={surface.timeField.onVariant}>
                          {t('dayRhythm.endDateQuestion')}
                        </ThemedText>
                        <SmoothSegmentedControl
                          options={[
                            {
                              value: 'today',
                              label: todayChoiceLabel,
                              accessibilityLabel: t('dayRhythm.setTodayA11y'),
                            },
                            {
                              value: 'nextDay',
                              label: nextDayChoiceLabel,
                              accessibilityLabel: t('dayRhythm.setNextDayA11y'),
                            },
                          ]}
                          value={dayEndAlarmNextDay ? 'nextDay' : 'today'}
                          onChange={(next) => {
                            void Haptics.selectionAsync();
                            applyDayEndTime(dayEndAlarmHhmm, next === 'nextDay');
                          }}
                          selectedFill={ink.bgMint}
                          trackFill={isDark ? ink.surfaceAlt : ink.bg}
                          selectedInk={isDark ? ink.text : ink.tertiary}
                          unselectedInk={surface.timeField.onVariant}
                          shadowColor={isDark ? RetroFlatColors.dark.solidShadow : '#000000'}
                          minHeight={36}
                        />
                        {dayEndAlarmNextDay ? (
                          <ThemedText
                            style={[styles.endDateChoiceHint, { color: surface.timeField.onVariant }]}
                            lightColor={surface.timeField.onVariant}
                            darkColor={surface.timeField.onVariant}>
                            {t('dayRhythm.overnightHint')}
                          </ThemedText>
                        ) : null}
                      </View>
                    ) : undefined
                  }
                />
              </View>
            ) : null}
          </CityPopCardShell>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  innerCard: {
    borderRadius: 0,
    padding: 12,
    gap: 10,
  },
  endDateChoiceInline: {
    marginTop: 4,
    gap: 10,
  },
  endDateChoiceQuestion: {
    fontSize: 13,
    fontWeight: '600',
  },
  endDateChoiceHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
