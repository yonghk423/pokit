import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import {
  RowColorPaletteDesk,
  useRowColorPaletteBridge,
} from '@shared/ui/color-palette-tabs';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PaperGrain } from '@shared/ui/paper-grain';
import { useUiSurfacePresentation } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import type { goalDetailSettingsPalette } from './settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const MINT = '#C8EBDD';
const MINT_INK = '#3D8F7E';
const PENCIL = '#5A7468';
const IDLE = 'rgba(0,0,0,0)';
const BREATHE = Easing.out(Easing.cubic);
const UNDERLINE_LEN = 100;

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
    opacity: invite.value * (isNote ? 0.28 : 0.55),
  }));
  const underlineWrapStyle = useAnimatedStyle(() => ({
    opacity: underline || !isNote ? 0.88 : 0.22 + invite.value * 0.58,
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
            <PaperGrain opacity={0.22} />
            <HanddrawnFrame color={PENCIL} />
            <IconSymbol name="pencil" size={15} color={MINT_INK} />
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
        {isNote ? (
          <Animated.View pointerEvents="none" style={[styles.inviteLine, underlineWrapStyle]}>
            <Svg width="100%" height={7} viewBox={`0 0 ${UNDERLINE_LEN} 7`} preserveAspectRatio="none">
              <Path
                d="M1 2.3q14-.25 28 .1t28-.12 28 .18 14-.05"
                fill="none"
                stroke={showInvite ? MINT_INK : (palette.outlineVariant ?? PENCIL)}
                strokeWidth={0.95}
                strokeLinecap="round"
              />
              <Path
                d="M1.5 5.1q13 .12 27-.08t29 .1 27-.06 14 .04"
                fill="none"
                stroke={showInvite ? MINT_INK : (palette.outlineVariant ?? PENCIL)}
                strokeWidth={0.8}
                strokeLinecap="round"
                opacity={0.55}
              />
            </Svg>
          </Animated.View>
        ) : null}
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
    overflow: 'hidden',
    backgroundColor: MINT,
  },
  padShell: {
    position: 'relative',
    overflow: 'visible',
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
    height: 7,
    marginHorizontal: 2,
    marginTop: -2,
  },
});
