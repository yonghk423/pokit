import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import {
  RowColorPaletteDesk,
  useRowColorPaletteBridge,
} from '@shared/ui/color-palette-tabs';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { useUiSurfacePresentation } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import type { goalDetailSettingsPalette } from './settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const MINT = '#C8EBDD';
const MINT_INK = '#3D8F7E';
const IDLE = 'rgba(0,0,0,0)';
const BREATHE = Easing.out(Easing.cubic);

export function RoutineSummaryField({
  value,
  onChangeValue,
  palette,
  placeholder: placeholderProp,
  maxLength = 240,
  underline = true,
}: {
  value: string;
  onChangeValue: (next: string) => void;
  palette: Palette;
  placeholder?: string;
  maxLength?: number;
  /** false면 노트 입력 밑줄 생략 — 바로 아래 섹션 실선과 겹칠 때 */
  underline?: boolean;
}) {
  const { t } = useTranslation();
  const presentation = useUiSurfacePresentation();
  const colorBridge = useRowColorPaletteBridge();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const invite = useSharedValue(1);
  const isNote = presentation === 'note';
  const summaryInk = colorBridge?.tabs.find((tab) => tab.id === 'ink')?.choices?.find((choice) => choice.selected)?.color
    ?? colorBridge?.ink
    ?? palette.onSurface;
  const placeholderText = placeholderProp ?? t('goalDetail.summaryPlaceholder');
  const showColorDesk = Boolean(isNote && colorBridge && colorBridge.tabs.length > 0);
  const showInvite = !focused;

  const claimSummaryHost = colorBridge?.claimSummaryHost;
  const releaseSummaryHost = colorBridge?.releaseSummaryHost;
  useLayoutEffect(() => {
    if (!showColorDesk || !claimSummaryHost || !releaseSummaryHost) return;
    claimSummaryHost();
    return () => {
      releaseSummaryHost();
    };
  }, [showColorDesk, claimSummaryHost, releaseSummaryHost]);

  useEffect(() => {
    invite.value = withTiming(showInvite ? 1 : 0, { duration: 260, easing: BREATHE });
  }, [invite, showInvite]);

  const washStyle = useAnimatedStyle(() => ({
    opacity: invite.value * (isNote ? 0.42 : 0.55),
  }));
  const underlineStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      invite.value,
      [0, 1],
      [palette.outlineVariant ?? 'rgba(0,0,0,0.12)', MINT_INK],
    ),
    opacity: underline || !isNote ? 0.9 : invite.value * 0.85,
    transform: [{ scaleY: 1 + invite.value * 0.6 }],
  }));

  const focusField = () => {
    tapHaptic();
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.wrap, isNote && styles.wrapNote]}>
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: palette.onVariant }]}>
          {t('goalDetail.summaryLabel')}
        </ThemedText>
        {showInvite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('goalDetail.summaryTapHint')}
            hitSlop={8}
            onPress={focusField}
            style={({ pressed }) => [styles.hintChip, pressed && { transform: [{ translateY: 1 }] }]}>
            <IconSymbol name="pencil" size={16} color={MINT_INK} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="none"
        onPress={focusField}
        style={({ pressed }) => [styles.padShell, pressed && !focused && { transform: [{ translateY: 1 }] }]}>
        <Animated.View pointerEvents="none" style={[styles.wash, washStyle]} />
        <ThemedTextInput
          // iOS가 기존 입력 문자열의 이전 색을 유지하지 않도록 색 변경 시 입력 뷰만 갱신한다.
          key={summaryInk}
          ref={inputRef}
          value={value}
          onChangeText={onChangeValue}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholderText}
          placeholderTextColor={
            isNote
              ? palette.usesLightInk
                ? 'rgba(255,255,255,0.38)'
                : 'rgba(0,0,0,0.32)'
              : palette.outline
          }
          accessibilityLabel={t('goalDetail.summaryLabel')}
          style={[
            isNote ? styles.inputNote : styles.input,
            isNote && !underline ? styles.inputNoteNoLine : null,
            {
              color: summaryInk,
              ...(isNote
                ? null
                : {
                    borderColor: showInvite ? MINT : palette.outlineVariant,
                    backgroundColor: palette.surfaceLowest,
                  }),
            },
          ]}
          maxLength={maxLength}
          multiline
          textAlignVertical="top"
        />
        {isNote ? <Animated.View pointerEvents="none" style={[styles.inviteLine, underlineStyle]} /> : null}
      </Pressable>
      {showColorDesk ? <RowColorPaletteDesk /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  wrapNote: { gap: 4 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    alignSelf: 'stretch',
  },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1, flexShrink: 0 },
  hintChip: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: MINT,
  },
  padShell: {
    position: 'relative',
    borderRadius: 6,
    overflow: 'hidden',
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: MINT,
  },
  input: {
    minHeight: 88,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  inputNote: {
    minHeight: 56,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 12,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.1,
    backgroundColor: IDLE,
  },
  inputNoteNoLine: {
    paddingBottom: 10,
  },
  inviteLine: {
    height: 2,
    marginHorizontal: 2,
    borderRadius: 1,
  },
});
