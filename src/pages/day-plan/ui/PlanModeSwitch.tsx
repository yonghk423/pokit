import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n/hooks/useTranslation';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { PlanMode } from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';

type ModeButton = {
  mode: PlanMode;
  icon: string;
  labelKey: 'planMode.daily' | 'planMode.quickMemo' | 'planMode.dayNote' | 'planMode.reading';
};

const MODE_BUTTONS: ModeButton[] = [
  { mode: 'priority', icon: 'list.bullet.rectangle', labelKey: 'planMode.daily' },
  { mode: 'quickMemo', icon: 'note.text', labelKey: 'planMode.quickMemo' },
  { mode: 'dayNote', icon: 'square.and.pencil', labelKey: 'planMode.dayNote' },
  { mode: 'reading', icon: 'book.closed.fill', labelKey: 'planMode.reading' },
];

/** 설정·펼침 액션 버튼과 동일 — 흰 면 · 얇은 검정 테두리 · 솔리드 음영 */
const SHADOW = 2;
const FACE = 34;
const BORDER = 1;
const ICON_LIGHT = '#000000';
const ICON_DARK = '#FAFAFA';
const BORDER_LIGHT = '#000000';
const BORDER_DARK = 'rgba(255,255,255,0.55)';
const SHADOW_LIGHT = 'rgba(24, 26, 46, 0.22)';
const SHADOW_DARK = 'rgba(0, 0, 0, 0.45)';

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
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadow = isDark ? SHADOW_DARK : SHADOW_LIGHT;
  const border = isDark ? BORDER_DARK : BORDER_LIGHT;
  const inactiveFace = isDark ? tone.surfaceAlt : '#FFFFFF';
  const activeFace = isDark ? tone.primaryContainer : tone.bgMint;
  const iconColor = isDark ? ICON_DARK : ICON_LIGHT;

  const hint =
    description !== undefined
      ? description
      : planMode === 'quickMemo'
        ? t('planMode.quickMemoHint')
        : planMode === 'dayNote'
          ? null
          : planMode === 'reading'
            ? null
            : planMode === 'todoList'
              ? null
              : null;

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

  const modeLabels = useMemo(
    () =>
      Object.fromEntries(MODE_BUTTONS.map((btn) => [btn.mode, t(btn.labelKey)])) as Record<
        PlanMode,
        string
      >,
    [t],
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
              const active =
                planMode === btn.mode || (btn.mode === 'priority' && planMode === 'todoList');
              const label = modeLabels[btn.mode];
              return (
                <Pressable
                  key={btn.mode}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                  onPress={() => handleSelect(btn.mode)}
                  style={({ pressed }) => [
                    styles.shell,
                    { marginRight: SHADOW, marginBottom: SHADOW },
                    pressed && styles.pressed,
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.shadow,
                      {
                        backgroundColor: shadow,
                        transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.face,
                      {
                        backgroundColor: active ? activeFace : inactiveFace,
                        borderColor: border,
                      },
                    ]}>
                    <IconSymbol name={btn.icon as 'book.closed.fill'} size={18} color={iconColor} />
                  </View>
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
  shell: {
    position: 'relative',
    width: FACE + SHADOW,
    height: FACE + SHADOW,
  },
  shadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FACE,
    height: FACE,
    borderRadius: 0,
  },
  face: {
    width: FACE,
    height: FACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: BORDER,
    zIndex: 1,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  modeHint: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 24,
    marginTop: 6,
  },
});
