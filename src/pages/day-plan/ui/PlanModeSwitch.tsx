import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n/hooks/useTranslation';
import { HeaderIcon, type HeaderIconName } from '@shared/ui/header-icon';
import { ThemedText } from '@shared/ui/themed-text';

import type { PlanMode } from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';

type ModeButton = {
  mode: PlanMode;
  icon: HeaderIconName;
  labelKey: 'planMode.daily' | 'planMode.quickMemo' | 'planMode.dayNote' | 'planMode.reading';
};

const MODE_BUTTONS: ModeButton[] = [
  { mode: 'priority', icon: 'daily', labelKey: 'planMode.daily' },
  { mode: 'quickMemo', icon: 'lock-memo', labelKey: 'planMode.quickMemo' },
  { mode: 'dayNote', icon: 'note', labelKey: 'planMode.dayNote' },
];

/** 설정·펼침 액션 버튼과 동일 — 흰 면 · 얇은 검정 테두리 · 솔리드 음영 */
const SHADOW = 1;
const FACE = 34;
const BORDER = 0;
const BORDER_LIGHT = '#929B8B';
const BORDER_DARK = '#A3AE9C';
const SHADOW_LIGHT = 'rgba(65, 78, 58, 0.07)';
const SHADOW_DARK = 'rgba(0, 0, 0, 0.15)';

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
  middle?: ReactNode;
  fixedMiddle?: boolean;
  /** `start`면 오른쪽 버튼을 헤더 위에 붙이고, 그 아래에 내용을 둘 수 있다. */
  trailingAlign?: 'center' | 'start';
};

export function PlanModeSwitch({
  planMode,
  onSelectMode,
  onSelectPriority,
  onSelectQuickMemo,
  c,
  description,
  trailing,
  middle,
  fixedMiddle = false,
  trailingAlign = 'center',
}: Props) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadow = isDark ? SHADOW_DARK : SHADOW_LIGHT;
  const border = isDark ? BORDER_DARK : BORDER_LIGHT;
  const inactiveFace = isDark ? tone.surfaceAlt : '#FFFFFF';
  const activeFace = isDark ? tone.primaryContainer : tone.bgMint;

  const hint = description !== undefined
    ? description
    : planMode === 'quickMemo'
      ? t('planMode.quickMemoHint')
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
  const visibleModes = MODE_BUTTONS.filter((btn) =>
    (btn.mode !== 'quickMemo' || FEATURE_FLAGS.quickMemoShortcut)
    && (btn.mode !== 'dayNote' || FEATURE_FLAGS.dayNoteShortcut),
  );
  // 전환할 모드가 하나뿐이면 왼쪽 모드 버튼은 비운다.
  const showModeButtons = visibleModes.length > 1;

  return (
    <View style={styles.root}>
      <View style={styles.bleed}>
        <View
          style={[
            styles.row,
            { backgroundColor: c.containerLow, borderBottomColor: c.border },
            trailing ? styles.rowWithTrailing : null,
          ]}>
          {showModeButtons ? <View style={styles.leftButtonGroup}>
            {visibleModes.map((btn) => {
              const active =
                planMode === btn.mode;
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
                  <View pointerEvents="none" style={[styles.shadow, { backgroundColor: shadow, transform: [{ translateX: SHADOW }, { translateY: SHADOW }] }]} />
                  <View
                    style={[
                      styles.face,
                      { backgroundColor: active ? activeFace : inactiveFace, borderColor: border },
                    ]}>
                    <PaperGrain opacity={0.25} />
                    <HanddrawnFrame color={border} />
                    <HeaderIcon name={btn.icon} />
                  </View>
                </Pressable>
              );
            })}
          </View> : null}
          {middle ? fixedMiddle ? <View style={styles.fixedMiddle}>{middle}</View> : <ScrollView testID="day-plan-header-layout-actions" horizontal showsHorizontalScrollIndicator={false} style={styles.middle} contentContainerStyle={styles.middleContent}>{middle}</ScrollView> : null}
          {trailing ? <View style={[styles.trailing, trailingAlign === 'start' && styles.trailingStart]}>{trailing}</View> : null}
        </View>
      </View>
      {hint != null && hint !== '' ? (
        <ThemedText style={[styles.modeHint, { color: isDark ? '#FAFAFA' : '#000000' }]}>
          {hint}
        </ThemedText>
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
    borderBottomWidth: 0,
    /** 상단 모드 아이콘 행 — 과한 세로 여백 없이 터치 영역만 유지 */
    minHeight: 40,
  },
  rowWithTrailing: {
    justifyContent: 'flex-start',
    gap: 4,
  },
  middle: { flexGrow: 0, flexShrink: 1, minWidth: 0 },
  middleContent: { flexGrow: 0, justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 1 },
  fixedMiddle: { flex: 1, minWidth: 0, alignSelf: 'flex-start' },
  trailing: {
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingStart: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  leftButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
