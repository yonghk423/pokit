import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  defaultPriorityWindowFromNow,
  getLocalDateKey,
  useDayPlanDraftStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import { useHorizonCompletionStore } from '@entities/horizon-completion';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import { useAppearanceStore } from '@shared/lib/appearance/appearanceStore';
import {
  createDefaultFixedFlowSetsState,
  ensureDefaultPriorityCatalog,
  resetAppLocalData,
  saveFixedFlowSetsState,
} from '@shared/lib/storage';
import {
  getDisplayedAppVersionLabel,
  openSupportMailComposer,
  SUPPORT_EMAIL,
} from '@shared/lib/support';
import { CityPopSpacing, RetroFlatColors, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

function settingsPalette(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    bg: c.bg,
    surface: c.surfaceAlt,
    border: c.border,
    sectionTitle: c.tertiary,
    title: c.text,
    desc: c.textMuted,
    icon: c.icon,
    chevron: c.textMuted,
    dangerBg: c.dangerBg,
    dangerTitle: isDark ? c.danger : '#B91C1C',
    dangerDesc: isDark ? '#FFB4AB' : '#991B1B',
    dangerIcon: isDark ? c.danger : '#DC2626',
    dangerChevron: isDark ? '#FFB4AB' : '#FCA5A5',
  };
}

/** 앱 설정 (로그인·Profile 없음). 문의하기 탭 시 네이티브 메일 작성을 바로 엽니다. */
export function SettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const p = settingsPalette(isDark);
  const appVersionLabel = getDisplayedAppVersionLabel();
  const [isResettingData, setIsResettingData] = useState(false);
  const appearanceMode = useAppearanceStore((s) => s.mode);
  const appearanceLabel = appearanceMode === 'dark' ? '다크 모드' : '라이트 모드';
  const runResetData = async () => {
    if (isResettingData) return;
    setIsResettingData(true);
    try {
      await resetAppLocalData();
      ensureDefaultPriorityCatalog();
      const today = getLocalDateKey();
      const defaultWindow = defaultPriorityWindowFromNow();
      const defaultFixedSets = createDefaultFixedFlowSetsState();

      useDayPlanStore.setState({
        dateKey: today,
        blocks: [],
        completedBlockIds: [],
        skippedBlockIds: [],
        liveActivityChecklistFocusBlockId: null,
        quickMemos: [],
        isHydrated: true,
      });

      useDayPlanDraftStore.setState({
        planMode: 'priority',
        isFocusStarted: false,
        completedFocusCategoryKeys: [],
        planCompletionDismissedKeys: [],
        priorityPlanDateKey: today,
        priorityPlanDateKeyEnd: today,
        priorityPlanExplicitMultiDay: false,
        priorityOvernightEndAuto: false,
        priorityStart: defaultWindow.startTime,
        priorityEnd: defaultWindow.endTime,
        priorityCategoryOrder: [],
        categoryLabelEpoch: 0,
        waterReminderSyncEpoch: 0,
        quickMemoDraft: '',
        isHydrated: true,
      });

      useDayPlanRuntimeStore.getState().stopTicker();
      useDayPlanRuntimeStore.getState().clearRuntime();

      useFixedFlowSetsStore.setState({
        activeSetIds: defaultFixedSets.activeSetIds,
        sets: defaultFixedSets.sets,
        todayAppliedCategoryKeys: [],
        todayAppliedRevision: 0,
        isHydrated: true,
      });
      saveFixedFlowSetsState(defaultFixedSets);

      useHistoryStore.getState().reloadFromStorage();
      useHorizonCompletionStore.getState().reloadFromStorage();
      await useLocalNotificationsStore.getState().refreshPermission();

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('초기화 완료', '로컬 데이터와 예약 알림을 초기화했어요.');
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('초기화 실패', '데이터 초기화 중 문제가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setIsResettingData(false);
    }
  };

  const confirmResetData = () => {
    if (isResettingData) return;
    Alert.alert(
      '데이터 초기화',
      '저장된 일정/루틴/통계/목표 설정과 예약 알림을 모두 삭제합니다. 이 작업은 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '초기화', style: 'destructive', onPress: () => void runResetData() },
      ],
    );
  };

  return (
    <ThemedView style={styles.root} lightColor={p.bg} darkColor={p.bg}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: p.border,
            backgroundColor: p.bg,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}>
          <IconSymbol name="chevron.left" size={22} color={p.title} />
        </Pressable>
        <ThemedText
          style={[styles.headerTitle, { color: p.title }]}
          lightColor={p.title}
          darkColor={p.title}>
          설정
        </ThemedText>
        <View style={styles.headerBtn} pointerEvents="none" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: 12,
            paddingBottom: insets.bottom + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { borderColor: p.border, backgroundColor: p.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: p.sectionTitle }]}>알림</ThemedText>

          <Pressable
            style={[styles.item, { borderTopColor: p.border }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notification-settings');
            }}
            accessibilityRole="button"
            accessibilityLabel="알림 설정">
            <View style={styles.itemLeft}>
              <IconSymbol name="bell.fill" size={20} color={p.icon} />
              <View style={styles.itemTextWrap}>
                <ThemedText style={[styles.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                  알림
                </ThemedText>
                <ThemedText style={[styles.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                  나를 위한 다양한 알림 기능
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color={p.chevron} />
          </Pressable>
        </View>

        <View style={[styles.section, { borderColor: p.border, backgroundColor: p.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: p.sectionTitle }]}>화면</ThemedText>

          <Pressable
            style={[styles.item, { borderTopColor: p.border }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/appearance-settings');
            }}
            accessibilityRole="button"
            accessibilityLabel="화면 테마 설정">
            <View style={styles.itemLeft}>
              <IconSymbol name="paintbrush.fill" size={20} color={p.icon} />
              <View style={styles.itemTextWrap}>
                <ThemedText style={[styles.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                  화면 테마
                </ThemedText>
                <ThemedText style={[styles.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                  {appearanceLabel}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color={p.chevron} />
          </Pressable>
        </View>

        <View style={[styles.section, { borderColor: p.border, backgroundColor: p.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: p.sectionTitle }]}>고객센터</ThemedText>

          <Pressable
            style={[styles.item, { borderTopColor: p.border }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void openSupportMailComposer();
            }}
            accessibilityRole="button"
            accessibilityLabel="문의 메일 작성">
            <View style={styles.itemLeft}>
              <IconSymbol name="paperplane.fill" size={20} color={p.icon} />
              <View style={styles.itemTextWrap}>
                <ThemedText style={[styles.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                  문의하기
                </ThemedText>
                <ThemedText style={[styles.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                  {SUPPORT_EMAIL}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color={p.chevron} />
          </Pressable>

          <View style={[styles.item, styles.infoItem, { borderTopColor: p.border }]}>
            <View style={styles.itemLeft}>
              <IconSymbol name="info.circle" size={20} color={p.icon} />
              <View style={styles.itemTextWrap}>
                <ThemedText style={[styles.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                  앱 버전
                </ThemedText>
                <ThemedText style={[styles.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                  {appVersionLabel}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { borderColor: p.border, backgroundColor: p.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: p.sectionTitle }]}>데이터</ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.item,
              { borderTopColor: p.border, backgroundColor: p.dangerBg },
              pressed && { opacity: 0.9 },
              isResettingData && styles.disabledItem,
            ]}
            onPress={confirmResetData}
            disabled={isResettingData}
            accessibilityRole="button"
            accessibilityLabel="앱 데이터 초기화">
            <View style={styles.itemLeft}>
              <IconSymbol name="trash.fill" size={20} color={p.dangerIcon} />
              <View style={styles.itemTextWrap}>
                <ThemedText
                  style={[styles.itemTitle, { color: p.dangerTitle }]}
                  lightColor={p.dangerTitle}
                  darkColor={p.dangerTitle}>
                  {isResettingData ? '초기화 중...' : '앱 데이터 초기화'}
                </ThemedText>
                <ThemedText
                  style={[styles.itemDesc, { color: p.dangerDesc }]}
                  lightColor={p.dangerDesc}
                  darkColor={p.dangerDesc}>
                  저장된 로컬 데이터와 예약 알림을 모두 삭제해요
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color={p.dangerChevron} />
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  container: {
    padding: CityPopSpacing.md,
    paddingHorizontal: CityPopSpacing.marginMobile,
    gap: CityPopSpacing.lg / 2,
  },
  scroll: {
    flex: 1,
  },
  section: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: CityPopSpacing.gutter,
    paddingTop: 18,
    paddingBottom: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  item: {
    minHeight: 80,
    paddingHorizontal: CityPopSpacing.gutter,
    paddingVertical: CityPopSpacing.sm,
    borderTopWidth: RETRO_BORDER_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemTextWrap: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: 12,
  },
  infoItem: {
    borderBottomWidth: 0,
  },
  disabledItem: {
    opacity: 0.7,
  },
});
