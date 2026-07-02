import type { ReactNode } from 'react';
import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import type { PlanMode } from '../lib/dayPlanEditorShared';

type ModeButton = {
  mode: PlanMode;
  icon: string;
  label: string;
};

const MODE_BUTTONS: ModeButton[] = [
  { mode: 'priority', icon: 'list.number', label: '데일리' },
  { mode: 'quickMemo', icon: 'note.text', label: '잠금화면 메모' },
];

type Props = {
  planMode: PlanMode;
  onSelectMode: (mode: PlanMode) => void;
  /** @deprecated onSelectPriority — onSelectMode 사용 */
  onSelectPriority?: () => void;
  /** @deprecated onSelectQuickMemo — onSelectMode 사용 */
  onSelectQuickMemo?: () => void;
  c: DayPlanPalette;
  /** `null`이면 하단 설명 숨김 */
  description?: string | null;
  /** 상단 행 오른쪽(문의 등) — 좌측 모드 버튼과 동일 베이스라인 */
  trailing?: ReactNode;
};

export function PlanModeSwitch({
  planMode,
  onSelectMode,
  onSelectPriority,
  onSelectQuickMemo,
  c,
  description,
  trailing,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const pill = tabPillColors(isDark);

  const hint =
    description !== undefined
      ? description
      : planMode === 'quickMemo'
        ? '잠금화면에서 상시 확인할 메모를 적어 두세요.'
        : null;

  const activeModeForSwitch = planMode === 'todoList' ? 'priority' : planMode;

  const handleSelect = useCallback(
    (mode: PlanMode) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (onSelectMode) {
        onSelectMode(mode);
      } else if (mode === 'priority' && onSelectPriority) {
        onSelectPriority();
      } else if (mode === 'quickMemo' && onSelectQuickMemo) {
        onSelectQuickMemo();
      }
    },
    [onSelectMode, onSelectPriority, onSelectQuickMemo],
  );

  return (
    <View style={styles.root}>
      <View style={styles.bleed}>
        <View
          style={[
            styles.row,
            { backgroundColor: c.containerLow, borderBottomColor: c.border },
            trailing ? styles.rowWithTrailing : null,
          ]}>
          <View style={styles.leftButtonGroup}>
            {MODE_BUTTONS.map((btn) => {
              const active = activeModeForSwitch === btn.mode;
              return (
                <Pressable
                  key={btn.mode}
                  accessibilityRole="button"
                  accessibilityLabel={btn.label}
                  onPress={() => handleSelect(btn.mode)}
                  style={({ pressed }) => [
                    styles.iconHit,
                    {
                      backgroundColor: active ? pill.activeBg : c.containerLowest,
                      borderColor: active ? pill.activeBorder : c.border,
                    },
                    pressed && styles.iconPressed,
                  ]}>
                  <IconSymbol
                    name={btn.icon as any}
                    size={18}
                    color={active ? pill.activeIcon : c.onVariant}
                  />
                </Pressable>
              );
            })}
          </View>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
      </View>
      {hint != null && hint !== '' ? (
        <ThemedText style={[styles.modeHint, { color: c.outline }]}>{hint}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  bleed: {
    width: '100%',
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    /** 상단 모드 아이콘 행 — 과한 세로 여백 없이 터치 영역만 유지 */
    minHeight: 40,
  },
  rowWithTrailing: {
    justifyContent: 'space-between',
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconHit: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
  },
  iconPressed: {
    opacity: 0.72,
  },
  modeHint: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 24,
    marginTop: 6,
  },
});
