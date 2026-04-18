import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { openSupportMailComposer } from '../lib/openSupportMail';
import { getDisplayedAppVersionLabel, SUPPORT_EMAIL } from '../lib/supportMailContent';

/** 앱 설정 (로그인·Profile 없음). 문의하기 탭 시 네이티브 메일 작성을 바로 엽니다. */
export function SettingsPage() {
  const insets = useSafeAreaInsets();
  const appVersionLabel = getDisplayedAppVersionLabel();

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
        <View style={styles.header}>
          <ThemedText type="title">설정</ThemedText>
          <ThemedText style={styles.sub}>
            앱 사용 중 불편한 점은 고객센터에서 빠르게 도움받을 수 있어요.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>고객센터</ThemedText>

          <Pressable
            style={styles.item}
            onPress={() => void openSupportMailComposer()}
            accessibilityRole="button"
            accessibilityLabel="문의 메일 작성">
            <View style={styles.itemLeft}>
              <IconSymbol name="envelope" size={20} color="#6B7280" />
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
  header: {
    gap: 8,
  },
  sub: {
    opacity: 0.65,
    fontSize: 14,
    lineHeight: 20,
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
