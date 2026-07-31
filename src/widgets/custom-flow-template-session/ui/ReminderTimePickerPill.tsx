import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatHhmmClockKo } from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  DigitalHhmmInput,
  type DigitalHhmmInputHandle,
} from '@shared/ui/digital-hhmm-input';
import { ThemedText } from '@shared/ui/themed-text';

const PRIMARY = 'rgb(0, 0, 0)';

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
  placeholder = '시간 선택',
  accessibilityLabel = '알림 시간',
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const hasValue = valueHhmm.trim().length > 0;
  const label = hasValue ? formatHhmmClockKo(valueHhmm) : placeholder;
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
  const editorValue = hasValue ? valueHhmm : '09:00';
  const digitalInputRef = useRef<DigitalHhmmInputHandle>(null);

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          void Haptics.selectionAsync();
          onToggleExpand();
        }}
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: surface,
              borderColor: expanded ? PRIMARY : line,
            },
          ]}>
          <ThemedText
            style={[
              styles.pillText,
              { color: hasValue ? ink : muted },
            ]}
            numberOfLines={1}>
            {label}
          </ThemedText>
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
            surface={surface}
            selectedForeground={selectedFg}
            snapStepMinutes={1}
            accessibilityLabelPrefix={accessibilityLabel}
          />
          <Pressable
            onPress={() => {
              const flushed = digitalInputRef.current?.flush();
              if (flushed) onChangeHhmm(flushed);
              void Haptics.selectionAsync();
              onToggleExpand();
            }}
            accessibilityRole="button"
            accessibilityLabel="시간 선택 확인"
            style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.86 }]}>
            <ThemedText style={styles.confirmBtnText}>확인</ThemedText>
          </Pressable>
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
  pill: {
    minWidth: 92,
    maxWidth: 132,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  inputBlock: {
    marginTop: 6,
    paddingTop: 4,
    gap: 4,
  },
  confirmBtn: {
    alignSelf: 'flex-end',
    minWidth: 68,
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: -0.1,
  },
});
