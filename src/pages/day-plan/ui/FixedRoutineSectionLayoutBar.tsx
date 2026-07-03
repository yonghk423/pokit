import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  enabled: boolean;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  onToggle: () => void;
  onPressScheduleSettings?: () => void;
};

/** 고정 루틴 — 목록 / 시간대 구간 레이아웃 전환 (설정 단계) */
export function FixedRoutineSectionLayoutBar({
  enabled,
  isDark,
  ink,
  muted,
  line,
  cardBg,
  onToggle,
  onPressScheduleSettings,
}: Props) {
  const pill = tabPillColors(isDark);

  return (
    <View style={[styles.root, { backgroundColor: cardBg, borderColor: line }]}>
      <View style={styles.textCol}>
        <ThemedText style={[styles.title, { color: ink }]}>
          {enabled ? '시간대 구간으로 설정 중' : '목록으로 관리 중'}
        </ThemedText>
        <ThemedText style={[styles.summary, { color: muted }]}>
          {enabled
            ? '여기서 구간을 나눠 두면, 오늘 적용 후 오늘 탭에도 같은 구간으로 보여요.'
            : '항목을 한 목록으로 관리해요. 필요하면 구간 보기로 시간대별 배치를 먼저 설정할 수 있어요.'}
        </ThemedText>
      </View>
      <View style={styles.actions}>
        {enabled && onPressScheduleSettings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="시간대 설정"
            onPress={onPressScheduleSettings}
            style={({ pressed }) => [
              styles.iconBtn,
              { borderColor: line, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
              pressed && { opacity: 0.72 },
            ]}>
            <IconSymbol name="clock" size={14} color={ink} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: enabled }}
          accessibilityLabel={enabled ? '목록 보기로 전환' : '시간대 구간으로 보기'}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          style={({ pressed }) => [
            styles.toggleBtn,
            {
              backgroundColor: enabled ? pill.activeBg : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              borderColor: enabled ? pill.activeBorder : line,
              opacity: pressed ? 0.88 : 1,
            },
          ]}>
          <IconSymbol
            name="sun.horizon.fill"
            size={14}
            color={enabled ? pill.activeIcon : muted}
          />
          <ThemedText
            style={[styles.toggleLabel, { color: enabled ? pill.activeIcon : muted }]}
            numberOfLines={1}>
            구간
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 2,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
