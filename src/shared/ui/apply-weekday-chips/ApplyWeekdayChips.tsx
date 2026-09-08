import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import {
  WEEKDAY_PICKER_ORDER,
  type WeekdayIndex,
} from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';

const WEEKDAY_LABEL_KEYS: Record<WeekdayIndex, I18nKey> = {
  0: 'fixedRoutine.weekdayShort.sun',
  1: 'fixedRoutine.weekdayShort.mon',
  2: 'fixedRoutine.weekdayShort.tue',
  3: 'fixedRoutine.weekdayShort.wed',
  4: 'fixedRoutine.weekdayShort.thu',
  5: 'fixedRoutine.weekdayShort.fri',
  6: 'fixedRoutine.weekdayShort.sat',
};

/** 선택(켜짐) — 민트 CTA, 포스트잇 면색과 무관하게 항상 구분 */
const ON_FILL = RetroFlatColors.light.bgMint;
const ON_INK = '#111111';
/** 비선택(꺼짐) — 흰 면 + 흐린 글자 */
const OFF_FILL = '#FFFFFF';
const OFF_INK = 'rgba(0,0,0,0.38)';

const CHIP = 32;
const SHADOW = 2;

type Props = {
  selected: readonly WeekdayIndex[];
  ink: string;
  muted: string;
  line: string;
  faceBg: string;
  shadowColor?: string;
  onChange: (next: WeekdayIndex[]) => void;
};

/** 고정 루틴 묶음 — 적용 요일 토글 (월~일) */
export function ApplyWeekdayChips({
  selected,
  muted,
  shadowColor = '#000000',
  onChange,
}: Props) {
  const { t } = useTranslation();
  const selectedSet = new Set(selected);

  const toggle = (day: WeekdayIndex) => {
    const next = WEEKDAY_PICKER_ORDER.filter((d) =>
      d === day ? !selectedSet.has(d) : selectedSet.has(d),
    );
    if (next.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
  };

  return (
    <View
      style={styles.root}
      accessibilityRole="toolbar"
      accessibilityLabel={t('fixedRoutine.weekdayPickerTitle')}>
      <ThemedText style={[styles.title, { color: muted }]}>
        {t('fixedRoutine.weekdayPickerTitle')}
      </ThemedText>
      <View style={styles.row}>
        {WEEKDAY_PICKER_ORDER.map((day) => {
          const on = selectedSet.has(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t('fixedRoutine.weekdayOptionA11y', {
                day: t(WEEKDAY_LABEL_KEYS[day]),
              })}
              hitSlop={4}
              onPress={() => toggle(day)}
              style={({ pressed }) => [
                styles.chipShell,
                pressed && { opacity: 0.88, transform: [{ translateX: 1 }, { translateY: 1 }] },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.chipShadow,
                  {
                    backgroundColor: on ? shadowColor : 'rgba(0,0,0,0.28)',
                    transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
                  },
                ]}
              />
              <View
                style={[
                  styles.chipFace,
                  {
                    backgroundColor: on ? ON_FILL : OFF_FILL,
                  },
                ]}>
                <ThemedText
                  style={[styles.chipLabel, { color: on ? ON_INK : OFF_INK }]}
                  numberOfLines={1}>
                  {t(WEEKDAY_LABEL_KEYS[day])}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
      <ThemedText style={[styles.hint, { color: muted }]}>
        {t('fixedRoutine.weekdayPickerHint')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipShell: {
    width: CHIP,
    height: CHIP,
    marginRight: SHADOW,
    marginBottom: SHADOW,
  },
  chipShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
  chipFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  hint: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
});
