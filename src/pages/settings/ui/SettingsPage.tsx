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
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

/** 앱 설정 (로그인·Profile 없음). 문의하기 탭 시 네이티브 메일 작성을 바로 엽니다. */
export function SettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        priorityBagDismissedDateKey: today,
        priorityBagDismissedKeys: [],
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
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: insets.bottom + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>알림</ThemedText>

          <Pressable
            style={styles.item}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notification-settings');
            }}
            accessibilityRole="button"
            accessibilityLabel="알림 설정">
            <View style={styles.itemLeft}>
              <IconSymbol name="bell.fill" size={20} color="#6B7280" />
              <View style={styles.itemTextWrap}>
                <ThemedText style={styles.itemTitle}>알림</ThemedText>
                <ThemedText style={styles.itemDesc}>나를 위한 다양한 알림 기능</ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>화면</ThemedText>

          <Pressable
            style={styles.item}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/appearance-settings');
            }}
            accessibilityRole="button"
            accessibilityLabel="화면 테마 설정">
            <View style={styles.itemLeft}>
              <IconSymbol name="paintbrush.fill" size={20} color="#6B7280" />
              <View style={styles.itemTextWrap}>
                <ThemedText style={styles.itemTitle}>화면 테마</ThemedText>
                <ThemedText style={styles.itemDesc}>{appearanceLabel}</ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>고객센터</ThemedText>

          <Pressable
            style={styles.item}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void openSupportMailComposer();
            }}
            accessibilityRole="button"
            accessibilityLabel="문의 메일 작성">
            <View style={styles.itemLeft}>
              <IconSymbol name="paperplane.fill" size={20} color="#6B7280" />
              <View style={styles.itemTextWrap}>
                <ThemedText style={styles.itemTitle}>문의하기</ThemedText>
                <ThemedText style={styles.itemDesc}>{SUPPORT_EMAIL}</ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
          </Pressable>

          <View style={[styles.item, styles.infoItem]}>
            <View style={styles.itemLeft}>
              <IconSymbol name="info.circle" size={20} color="#6B7280" />
              <View style={styles.itemTextWrap}>
                <ThemedText style={styles.itemTitle}>앱 버전</ThemedText>
                <ThemedText style={styles.itemDesc}>{appVersionLabel}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>데이터</ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.item,
              styles.dangerItem,
              pressed && { opacity: 0.9 },
              isResettingData && styles.disabledItem,
            ]}
            onPress={confirmResetData}
            disabled={isResettingData}
            accessibilityRole="button"
            accessibilityLabel="앱 데이터 초기화">
            <View style={styles.itemLeft}>
              <IconSymbol name="trash.fill" size={20} color="#DC2626" />
              <View style={styles.itemTextWrap}>
                <ThemedText style={[styles.itemTitle, styles.dangerTitle]}>
                  {isResettingData ? '초기화 중...' : '앱 데이터 초기화'}
                </ThemedText>
                <ThemedText style={[styles.itemDesc, styles.dangerDesc]}>
                  저장된 로컬 데이터와 예약 알림을 모두 삭제해요
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#FCA5A5" />
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
  container: {
    padding: 24,
    gap: 20,
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    color: '#6B7280',
  },
  item: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
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
    opacity: 0.65,
  },
  infoItem: {
    borderBottomWidth: 0,
  },
  dangerItem: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  dangerTitle: {
    color: '#B91C1C',
  },
  dangerDesc: {
    color: '#991B1B',
    opacity: 0.85,
  },
  disabledItem: {
    opacity: 0.7,
  },
});
