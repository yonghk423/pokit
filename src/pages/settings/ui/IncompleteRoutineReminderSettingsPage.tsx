import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatHhmmClockKo } from '@entities/day-plan';
import { saveIncompleteRoutineReminderSettings } from '@features/day-plan-notifications';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
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
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const surface = useMemo(() => paletteForReminderTimeCard(false), []);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderHhmm, setReminderHhmm] = useState('22:00');
  const [timeExpanded, setTimeExpanded] = useState(false);

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
      Alert.alert('알림', '알림을 켜려면 기기에서 알림 권한을 허용해 주세요.');
    }
  }, []);

  const schedulePersist = useCallback(
    (on: boolean, hhmm: string) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        void flushPersist(on, hhmm);
      }, 380);
    },
    [flushPersist],
  );

  useEffect(
    () => () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    },
    [],
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
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={20} color={p.title} />
          </Pressable>
          <ThemedText
            style={[chrome.headerTitle, styles.headerTitleCenter, { color: p.title }]}
            lightColor={p.title}
            darkColor={p.title}>
            미완료 일정 알림
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={chrome.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[chrome.sectionHint, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
            정해진 시간에 아직 끝내지 못한 일정이 있으면 알려 드려요.
          </ThemedText>

          <View style={[styles.card, { borderColor: p.border, backgroundColor: p.surface }]}>
            <DailyRhythmStyleAlarmRow
              title="미완료 일정 알림"
              hint="매일 지정한 시각에 미완료 일정 개수를 알려 드려요."
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
                  label="알림 시각"
                  hint="이 시각에 미완료 일정이 있으면 알림이 울려요."
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
                  예시 · {formatHhmmClockKo(reminderHhmm)}에 일정 4개가 남아 있으면 「아직 완료하지 못한 일정이 4개 있어요. 확인해 보세요.」
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
