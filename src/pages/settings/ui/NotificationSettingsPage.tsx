import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDayPlanDraftStore } from '@entities/day-plan';
import { syncPriorityDayEndAlarm, syncPriorityDayStartAlarm } from '@features/day-plan-notifications';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { loadPriorityDayEndAlarm, loadPriorityDayStartAlarm } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
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
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const surface = useMemo(() => paletteForReminderTimeCard(isDark), [isDark]);
  const priorityStart = useDayPlanDraftStore((s) => s.priorityStart);

  const [dayStartAlarmOn, setDayStartAlarmOn] = useState(
    () => loadPriorityDayStartAlarm().enabled,
  );
  const [dayEndAlarmOn, setDayEndAlarmOn] = useState(() => loadPriorityDayEndAlarm().enabled);
  const [dayEndAlarmHhmm, setDayEndAlarmHhmm] = useState(
    () => loadPriorityDayEndAlarm().reminderHhmm,
  );
  const [dayEndAlarmTimeExpanded, setDayEndAlarmTimeExpanded] = useState(false);

  const endPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEndPersistRef = useRef<{ on: boolean; hhmm: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      setDayStartAlarmOn(loadPriorityDayStartAlarm().enabled);
      const endAlarm = loadPriorityDayEndAlarm();
      setDayEndAlarmOn(endAlarm.enabled);
      setDayEndAlarmHhmm(endAlarm.reminderHhmm);
      setDayEndAlarmTimeExpanded(false);
    }, []),
  );

  const flushDayEndPersist = useCallback(async (on: boolean, hhmm: string) => {
    const ok = await syncPriorityDayEndAlarm({ enabled: on, reminderHhmm: hhmm });
    if (on && !ok) {
      setDayEndAlarmOn(false);
      Alert.alert(t('alert.permission.title'), t('alert.permission.message'));
    }
  }, [t]);

  const scheduleDayEndPersist = useCallback(
    (on: boolean, hhmm: string) => {
      if (endPersistTimerRef.current) clearTimeout(endPersistTimerRef.current);
      pendingEndPersistRef.current = { on, hhmm };
      endPersistTimerRef.current = setTimeout(() => {
        endPersistTimerRef.current = null;
        pendingEndPersistRef.current = null;
        void flushDayEndPersist(on, hhmm);
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
      if (pending) void flushDayEndPersist(pending.on, pending.hhmm);
    },
    [flushDayEndPersist],
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
      await flushDayEndPersist(next, dayEndAlarmHhmm);
    },
    [dayEndAlarmHhmm, flushDayEndPersist],
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
                  onChangeHhmm={(next) => {
                    setDayEndAlarmHhmm(next);
                    scheduleDayEndPersist(true, next);
                  }}
                  expanded={dayEndAlarmTimeExpanded}
                  onToggleExpand={() => setDayEndAlarmTimeExpanded((v) => !v)}
                  isDark={isDark}
                  palette={surface.timeField}
                  snapStepMinutes={1}
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
});
