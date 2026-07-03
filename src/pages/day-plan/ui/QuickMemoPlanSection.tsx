import { forwardRef, useEffect, useRef, type ForwardedRef } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import type { DayPlanQuickMemo } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  memos: DayPlanQuickMemo[];
  draft: string;
  onChangeDraft: (v: string) => void;
  onInputContentSizeChange?: () => void;
  onSavePress: () => void;
};

export const QuickMemoPlanSection = forwardRef(function QuickMemoPlanSection(
  { c, isDark, memos, draft, onChangeDraft, onInputContentSizeChange, onSavePress }: Props,
  ref: ForwardedRef<TextInput>,
) {
  const { width } = useWindowDimensions();
  const hydratedRef = useRef(false);
  const pill = tabPillColors(isDark);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (draft.trim().length > 0) {
      hydratedRef.current = true;
      return;
    }
    const undone = memos
      .filter((m) => !m.isDone)
      .map((m) => m.text.trim())
      .filter((t) => t.length > 0);
    if (undone.length === 0) {
      hydratedRef.current = true;
      return;
    }
    onChangeDraft(undone.join('\n'));
    hydratedRef.current = true;
  }, [draft, memos, onChangeDraft]);

  const fontSize = width >= 768 ? 26 : width >= 390 ? 22 : 20;
  const lineHeight = Math.round(fontSize * 1.45);

  return (
    <View style={[styles.root, { backgroundColor: c.containerLowest }]}>
      <TextInput
        ref={ref}
        value={draft}
        onChangeText={onChangeDraft}
        onContentSizeChange={() => onInputContentSizeChange?.()}
        placeholder="잠금화면에 표시할 메모를 입력하세요"
        placeholderTextColor={c.outline}
        multiline
        scrollEnabled={false}
        textAlignVertical="top"
        autoFocus
        style={[
          styles.zenInput,
          {
            backgroundColor: 'transparent',
            color: c.onSurface,
            fontSize,
            lineHeight,
          },
        ]}
      />
      <View style={styles.gradientHint} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="잠금화면 메모 저장"
        hitSlop={8}
        onPress={onSavePress}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor: pill.activeBg,
            borderColor: pill.activeBorder,
          },
          pressed && { opacity: 0.92 },
        ]}>
        <IconSymbol name="square.and.arrow.down" size={22} color={pill.activeIcon} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    minHeight: 300,
    flexGrow: 1,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  zenInput: {
    minHeight: 260,
    alignSelf: 'stretch',
    padding: 0,
    margin: 0,
    fontWeight: '500',
    borderWidth: 0,
  },
  gradientHint: {
    height: 4,
    borderRadius: 0,
    marginTop: 12,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  saveBtn: {
    marginTop: 18,
    alignSelf: 'stretch',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
