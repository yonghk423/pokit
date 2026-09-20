import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatHhmmClock, useTranslation } from '@shared/lib/i18n';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { NativeHhmmWheelPicker } from '@shared/ui/native-hhmm-wheel-picker';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

const PILL_SHADOW = 2;
const DEFAULT_DRAFT = '09:00';

type Props = {
  valueHhmm: string;
  /**
   * 기본: 확인 시에만 호출. `false`를 반환하면 접지 않음(중복 시각 등).
   * `commitOnChange`면 휠 변경마다 호출.
   */
  onChangeHhmm: (next: string) => void | boolean;
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
  /**
   * true면 휠을 돌릴 때마다 onChangeHhmm (알림 추가 초안용).
   * 목록 행은 false(기본) — 확인 전에는 리스트 key/정렬을 건드리지 않음.
   */
  commitOnChange?: boolean;
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
  commitOnChange = false,
}: Props) {
  const { t, locale } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('timePicker.placeholder');
  const resolvedA11y = accessibilityLabel ?? t('timePicker.reminderA11y');
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const hasValue = valueHhmm.trim().length > 0;
  const [draftHhmm, setDraftHhmm] = useState(() =>
    hasValue ? valueHhmm.trim() : DEFAULT_DRAFT,
  );

  // 펼칠 때만 props → draft 동기화. 스크롤 중에는 부모가 바뀌지 않음.
  useEffect(() => {
    if (!expanded) return;
    setDraftHhmm(hasValue ? valueHhmm.trim() : DEFAULT_DRAFT);
  }, [expanded, hasValue, valueHhmm]);

  const displayHhmm = expanded ? draftHhmm : valueHhmm;
  const showPlaceholder = !expanded && !hasValue;
  const label = showPlaceholder
    ? resolvedPlaceholder
    : formatHhmmClock(displayHhmm, locale);
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const timeColor = emphasizeColor ?? (showPlaceholder ? muted : ink);
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
        style={({ pressed }) => [pressed && { transform: [{ translateY: 1 }] }]}>
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
          <NativeHhmmWheelPicker
            valueHhmm={draftHhmm}
            onChangeHhmm={(next) => {
              setDraftHhmm(next);
              if (commitOnChange) onChangeHhmm(next);
            }}
            minuteInterval={1}
            isDark={isDark}
            textColor={ink}
            accessibilityLabelPrefix={resolvedA11y}
            ink={ink}
            muted={muted}
            line={line}
            surface={faceBg}
          />
          <BrutalConfirmButton
            accessibilityLabel={t('timePicker.confirmA11y')}
            onPress={() => {
              const result = onChangeHhmm(draftHhmm);
              if (result === false) return;
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
