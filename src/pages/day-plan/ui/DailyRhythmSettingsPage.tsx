import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { syncPriorityDayStartAlarm } from '@features/day-plan-notifications';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { loadPriorityDayStartAlarm } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { palette } from '../lib/dayPlanPalette';
import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { DailyRhythmTimeEditorBody } from './DailyRhythmTimeEditorBody';

/** 설정 탭에서 우선순위 데이플랜의 하루 시작·마무리 시각을 바꿀 때 */
export function DailyRhythmSettingsPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const c = palette(isDark);

  const { priorityStart, priorityEnd, setPriorityStart, setPriorityEnd, syncOvernightPriorityPlanDates } =
    useDayPlanDraftStore(
      useShallow((s) => ({
        priorityStart: s.priorityStart,
        priorityEnd: s.priorityEnd,
        setPriorityStart: s.setPriorityStart,
        setPriorityEnd: s.setPriorityEnd,
        syncOvernightPriorityPlanDates: s.syncOvernightPriorityPlanDates,
      })),
    );

  const [seedStart, setSeedStart] = useState(priorityStart);
  const [seedEnd, setSeedEnd] = useState(priorityEnd);
  const [seedKey, setSeedKey] = useState(0);
  const [dayStartAlarmOn, setDayStartAlarmOn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const st = useDayPlanDraftStore.getState();
      setSeedStart(st.priorityStart);
      setSeedEnd(st.priorityEnd);
      setDayStartAlarmOn(loadPriorityDayStartAlarm().enabled);
      setSeedKey((k) => k + 1);
    }, []),
  );

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  const headerFg = c.onSurface;

  const handleSave = useCallback(
    async (start: string, end: string) => {
      setPriorityStart(start);
      setPriorityEnd(end);
      syncOvernightPriorityPlanDates();
      const ok = await syncPriorityDayStartAlarm({ enabled: dayStartAlarmOn, startHhmm: start });
      if (dayStartAlarmOn && !ok) {
        setDayStartAlarmOn(false);
        Alert.alert('알림', '알림을 켜려면 기기에서 알림 권한을 허용해 주세요.');
      }
      router.back();
    },
    [dayStartAlarmOn, router, setPriorityEnd, setPriorityStart, syncOvernightPriorityPlanDates],
  );

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <View style={[styles.safe, { paddingTop: topInset }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: c.bg,
              borderBottomColor: c.border,
            },
          ]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={22} color={headerFg} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: headerFg }]} lightColor={headerFg} darkColor={headerFg}>
            시작·마무리 시간
          </ThemedText>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <DailyRhythmTimeEditorBody
          c={c}
          isDark={isDark}
          seedStart={seedStart}
          seedEnd={seedEnd}
          seedKey={seedKey}
          variant="settings"
          primaryLabel="저장"
          onPrimaryPress={handleSave}
          dayStartAlarmOn={dayStartAlarmOn}
          onDayStartAlarmChange={setDayStartAlarmOn}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
  },
});
