import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../../lib/dayPlanPalette';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
  onOpenCalendar?: () => void;
};

export function HorizonPeriodHeader({ c, isDark, label, onPrev, onNext, onOpenCalendar }: Props) {
  if (!label) return null;

  const calendarBtnBg = isDark ? 'rgba(255,255,255,0.08)' : '#ffffff';

  return (
    <View style={styles.row}>
      <View style={styles.cluster}>
        {onPrev ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 기간"
            hitSlop={12}
            onPress={onPrev}
            style={styles.navBtn}>
            <IconSymbol name="chevron.left" size={18} color={c.onVariant} />
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}

        <View style={styles.labelCluster}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                borderColor: c.catBorderIdle,
              },
            ]}>
            <ThemedText style={[styles.badgeText, { color: c.onSurface }]}>{label}</ThemedText>
          </View>

          {onOpenCalendar ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="달력 열기"
              hitSlop={8}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenCalendar();
              }}
              style={[
                styles.calendarBtn,
                {
                  backgroundColor: calendarBtnBg,
                  borderColor: c.catBorderIdle,
                },
              ]}>
              <IconSymbol name="calendar" size={18} color={c.onSurface} />
            </Pressable>
          ) : null}
        </View>

        {onNext ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 기간"
            hitSlop={12}
            onPress={onNext}
            style={styles.navBtn}>
            <IconSymbol name="chevron.right" size={18} color={c.onVariant} />
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 12,
  },
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  labelCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSpacer: {
    width: 36,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  calendarBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
