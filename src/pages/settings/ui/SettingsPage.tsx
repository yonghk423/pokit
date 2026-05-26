import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { formatHhmmClockKo, useDayPlanDraftStore } from '@entities/day-plan';
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
  const { priorityStart, priorityEnd } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
    })),
  );
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
          <ThemedText style={styles.sectionTitle}>데이플랜</ThemedText>

          <Pressable
            style={styles.item}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/daily-rhythm-settings');
            }}
            accessibilityRole="button"
            accessibilityLabel="시작과 마무리 시간 설정">
            <View style={styles.itemLeft}>
              <IconSymbol name="sun.horizon.fill" size={20} color="#6B7280" />
              <View style={styles.itemTextWrap}>
                <ThemedText style={styles.itemTitle}>시작·마무리</ThemedText>
                <ThemedText style={styles.itemDesc}>
                  {formatHhmmClockKo(priorityStart)} – {formatHhmmClockKo(priorityEnd)}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
          </Pressable>

          {/* 목표 상세 알림 — 잠시 비활성
          <Pressable
            style={styles.item}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/goal-detail-incomplete-reminder-settings');
            }}
            accessibilityRole="button"
            accessibilityLabel="목표 상세 알림">
            <View style={styles.itemLeft}>
              <IconSymbol name="doc.text.fill" size={20} color="#6B7280" />
              <View style={styles.itemTextWrap}>
                <ThemedText style={styles.itemTitle}>목표 상세 알림</ThemedText>
                <ThemedText style={styles.itemDesc}>
                  상세 설정을 아직 하지 않았거나 기록 체크가 필요할 때, 정한 시각에 가볍게 알려 드려요
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
          </Pressable>
          */}
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
});
