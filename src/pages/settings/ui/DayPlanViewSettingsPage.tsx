import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDayPlanLayoutModeVisibilityStore } from '@entities/day-plan';
import { getGoalDetailSessionUi } from '@shared/config/goalDetailSessionUi';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import type { DayPlanLayoutMode } from '@shared/lib/storage/dayPlanLayoutModeVisibility';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const MODE_OPTIONS: {
  key: DayPlanLayoutMode;
  label: string;
  desc: string;
  icon: 'list.bullet.rectangle' | 'sun.horizon.fill' | 'clock';
}[] = [
  {
    key: 'bag',
    label: '목록',
    desc: '담은 루틴을 한 목록으로 봐요.',
    icon: 'list.bullet.rectangle',
  },
  {
    key: 'sections',
    label: '시간대',
    desc: '새벽·아침·점심·저녁·밤 구간으로 나눠 봐요.',
    icon: 'sun.horizon.fill',
  },
  {
    key: 'spine',
    label: '타임라인',
    desc: '하루 시간 흐름에 맞춰 배치해 봐요.',
    icon: 'clock',
  },
];

/** 설정 → 오늘 탭에서 쓸 보기 방식 on/off */
export function DayPlanViewSettingsPage() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = getGoalDetailSessionUi(isDark);
  const insets = useSafeAreaInsets();
  const visibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const setModeVisible = useDayPlanLayoutModeVisibilityStore((s) => s.setModeVisible);
  const visibleCount = MODE_OPTIONS.filter((opt) => visibility[opt.key]).length;

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.screenBg }]} darkColor={c.screenBg} lightColor={c.screenBg}>
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[styles.header, { backgroundColor: c.screenBg, borderBottomColor: c.border }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={22} color={c.onSurface} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: c.onSurface }]}>오늘 탭 보기</ThemedText>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.sectionHint, { color: c.muted }]}>
            켜 둔 보기만 오늘 탭 상단에 표시돼요. 하나만 켜 두면 전환 버튼이 숨겨져요.
          </ThemedText>

          <View style={[styles.section, { borderColor: c.border }]}>
            {MODE_OPTIONS.map((opt) => {
              const enabled = visibility[opt.key];
              const disableOff = enabled && visibleCount <= 1;
              return (
                <View key={opt.key} style={[styles.item, { borderTopColor: c.border }]}>
                  <View style={styles.itemMain}>
                    <View style={[styles.iconBox, { borderColor: c.border, backgroundColor: c.surface }]}>
                      <IconSymbol name={opt.icon} size={16} color={c.onSurface} />
                    </View>
                    <View style={styles.itemTextWrap}>
                      <ThemedText style={[styles.itemTitle, { color: c.onSurface }]}>{opt.label}</ThemedText>
                      <ThemedText style={[styles.itemDesc, { color: c.muted }]}>{opt.desc}</ThemedText>
                    </View>
                  </View>
                  <Switch
                    value={enabled}
                    disabled={disableOff}
                    onValueChange={(next) => {
                      void Haptics.selectionAsync();
                      setModeVisible(opt.key, next);
                    }}
                    trackColor={{ false: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)', true: c.primary }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}
                    accessibilityLabel={`${opt.label} 보기 ${enabled ? '끄기' : '켜기'}`}
                  />
                </View>
              );
            })}
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
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  container: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  sectionHint: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  section: { borderWidth: 1, borderRadius: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  itemTextWrap: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  itemDesc: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
});
