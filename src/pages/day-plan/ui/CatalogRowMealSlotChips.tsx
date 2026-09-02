import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatMealSlotLabel, type LocaleDayMealSlot } from '@shared/lib/i18n';
import { useTranslation } from '@shared/lib/i18n';
import {
  DAY_MEAL_SLOT_ORDER,
  type DayMealSlot,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import {
  DAY_MEAL_SLOT_ICON,
  dayMealSlotIconColor,
} from '@widgets/day-plan-meal-slot-timeline/lib/mealSlotIcons';


type Props = {
  selectedSlots: readonly DayMealSlot[];
  ink: string;
  muted: string;
  line: string;
  isDark: boolean;
  disabled?: boolean;
  onToggleSlot: (slot: DayMealSlot) => void;
  /** 기본 34 — 고정 루틴 카드 등에서 조정 */
  contentInsetLeft?: number;
};

/** 루틴 목록 행 — 펼침 시 시간대 세그먼트 */
export function CatalogRowMealSlotChips({
  selectedSlots,
  ink,
  muted,
  line,
  isDark,
  disabled = false,
  onToggleSlot,
  contentInsetLeft = 34,
}: Props) {
  const selectedSet = new Set(selectedSlots);
  const { locale, t } = useTranslation();

  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';

  return (
    <View style={[styles.root, { paddingLeft: contentInsetLeft }]}>
      <View style={[styles.track, { backgroundColor: trackBg, borderColor: line }]}>
        {DAY_MEAL_SLOT_ORDER.map((slot) => {
          const selected = selectedSet.has(slot);
          const iconName = DAY_MEAL_SLOT_ICON[slot] as 'sun.horizon.fill';
          return (
            <Pressable
              key={slot}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${formatMealSlotLabel(slot as LocaleDayMealSlot, locale)} ${selected ? t('common.selected') : t('common.select')}`}
              disabled={disabled}
              onPress={() => {
                if (disabled) return;
                void Haptics.selectionAsync();
                onToggleSlot(slot);
              }}
              style={({ pressed }) => [
                styles.segment,
                selected && { backgroundColor: ink },
                !selected && pressed && { opacity: 0.72 },
                disabled && { opacity: 0.45 },
              ]}>
              <IconSymbol
                name={iconName}
                size={11}
                color={dayMealSlotIconColor(slot, isDark)}
              />
              <ThemedText
                style={[
                  styles.segmentLabel,
                  { color: selected ? selectedFg : muted },
                ]}
                numberOfLines={1}>
                {formatMealSlotLabel(slot as LocaleDayMealSlot, locale)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingRight: 8,
    paddingBottom: 14,
  },
  track: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: 1,
    paddingVertical: 4,
    borderRadius: 7,
  },
  segmentLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  selectedIconList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});

function resolveOrderedSelectedSlots(selectedSlots: readonly DayMealSlot[]): DayMealSlot[] {
  const selectedSet = new Set(selectedSlots);
  return DAY_MEAL_SLOT_ORDER.filter((slot) => selectedSet.has(slot));
}

type SelectedIconsProps = {
  selectedSlots: readonly DayMealSlot[];
  color: string;
  mutedColor: string;
  /** 단일·미선택 아이콘 크기 */
  size?: number;
  /** 복수 선택 시 아이콘 크기 */
  compactSize?: number;
};

/** 행 접힘 상태 — 선택된 시간대 아이콘 목록 */
export function CatalogRowMealSlotSelectedIcons({
  selectedSlots,
  color: _legacyMonoColor,
  mutedColor,
  size = 14,
  compactSize = 10,
}: SelectedIconsProps) {
  void _legacyMonoColor;
  const ordered = resolveOrderedSelectedSlots(selectedSlots);

  if (ordered.length === 0) {
    return <IconSymbol name="sun.horizon.fill" size={size} color={mutedColor} />;
  }

  if (ordered.length === 1) {
    const slot = ordered[0]!;
    return (
      <IconSymbol
        name={DAY_MEAL_SLOT_ICON[slot] as 'sun.horizon.fill'}
        size={size}
        color={dayMealSlotIconColor(slot)}
      />
    );
  }

  return (
    <View style={styles.selectedIconList}>
      {ordered.map((slot) => (
        <IconSymbol
          key={slot}
          name={DAY_MEAL_SLOT_ICON[slot] as 'sun.horizon.fill'}
          size={compactSize}
          color={dayMealSlotIconColor(slot)}
        />
      ))}
    </View>
  );
}

/** 접힘 버튼 너비 — 선택 구간 수에 맞춤 */
export function mealSlotPickerBtnWidth(selectedSlots: readonly DayMealSlot[]): number {
  const count = resolveOrderedSelectedSlots(selectedSlots).length;
  if (count <= 1) return 32;
  return Math.min(56, 24 + count * 11);
}
