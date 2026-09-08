import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatHhmmClock } from '@shared/lib/i18n';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import {
  DigitalHhmmInput,
  type DigitalHhmmInputHandle,
} from '@shared/ui/digital-hhmm-input';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

const PILL_SHADOW = 2;

type Props = {
  valueHhmm: string;
  onChangeHhmm: (next: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  ink: string;
  muted: string;
  line: string;
  surface: string;
  placeholder?: string;
  accessibilityLabel?: string;
  /** 목록 행·추가 폼 — 가로 전체 */
  fullWidth?: boolean;
  /** 다음 알림 등 강조 색 */
  emphasizeColor?: string;
};

export function ReminderTimePickerPill({
  valueHhmm,
  onChangeHhmm,
  expanded,
  onToggleExpand,
  ink,
  muted,
  line,
  surface,
  placeholder,
  accessibilityLabel,
  fullWidth = false,
  emphasizeColor,
}: Props) {
  const { t, locale } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('timePicker.placeholder');
  const resolvedA11y = accessibilityLabel ?? t('timePicker.reminderA11y');
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const hasValue = valueHhmm.trim().length > 0;
  const label = hasValue ? formatHhmmClock(valueHhmm, locale) : resolvedPlaceholder;
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
  const editorValue = hasValue ? valueHhmm : '09:00';
  const digitalInputRef = useRef<DigitalHhmmInputHandle>(null);
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const timeColor = emphasizeColor ?? (hasValue ? ink : muted);
  const iconColor = emphasizeColor ?? muted;
  const shadowInk = isDark ? tone.solidShadow : '#000000';
  const faceBg = surface === 'transparent' ? (isDark ? tone.surfaceAlt : '#FFFFFF') : surface;
  const pillShadow = expanded ? 0 : PILL_SHADOW;

  return (
    <View style={[styles.root, fullWidth && styles.rootFull]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={resolvedA11y}
        onPress={() => {
          void Haptics.selectionAsync();
          onToggleExpand();
        }}
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <View
          style={[
            styles.pillShell,
            fullWidth && styles.pillShellFull,
            pillShadow > 0 && { marginRight: pillShadow, marginBottom: pillShadow },
          ]}>
          {pillShadow > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.pillShadow,
                {
                  backgroundColor: emphasizeColor ?? shadowInk,
                  transform: [{ translateX: pillShadow }, { translateY: pillShadow }],
                },
              ]}
            />
          ) : null}
          <View
            style={[
              styles.pill,
              fullWidth && styles.pillFull,
              { backgroundColor: faceBg },
            ]}>
            <View style={styles.pillLeft}>
              <IconSymbol name="clock" size={15} color={iconColor} />
              <ThemedText
                style={[
                  styles.pillText,
                  fullWidth && styles.pillTextFull,
                  { color: timeColor },
                ]}
                numberOfLines={1}>
                {label}
              </ThemedText>
            </View>
            <ThemedText style={[styles.pillHint, { color: muted }]}>
              {expanded ? t('common.collapse') : t('common.change')}
            </ThemedText>
          </View>
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.inputBlock}>
          <DigitalHhmmInput
            ref={digitalInputRef}
            valueHhmm={editorValue}
            onChangeHhmm={onChangeHhmm}
            ink={ink}
            muted={muted}
            line={line}
            surface={faceBg}
            selectedForeground={selectedFg}
            snapStepMinutes={1}
            accessibilityLabelPrefix={resolvedA11y}
          />
          <BrutalConfirmButton
            accessibilityLabel={t('timePicker.confirmA11y')}
            onPress={() => {
              const flushed = digitalInputRef.current?.flush();
              if (flushed) onChangeHhmm(flushed);
              void Haptics.selectionAsync();
              onToggleExpand();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexShrink: 0,
    maxWidth: '100%',
  },
  rootFull: {
    alignSelf: 'stretch',
  },
  pillShell: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  pillShellFull: {
    alignSelf: 'stretch',
  },
  pillShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  pill: {
    minWidth: 84,
    maxWidth: 148,
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    zIndex: 1,
  },
  pillFull: {
    maxWidth: '100%',
    alignSelf: 'stretch',
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  pillTextFull: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.25,
    lineHeight: 20,
  },
  pillHint: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
  inputBlock: {
    marginTop: 8,
    gap: 8,
  },
});
