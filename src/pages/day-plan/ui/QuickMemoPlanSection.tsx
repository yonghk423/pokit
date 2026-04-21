import { forwardRef, useEffect, useRef, type ForwardedRef } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import type { DayPlanQuickMemo } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  /** 기존 저장소에 남아 있을 수 있는 줄 단위 메모 — 최초 한 번만 초안에 합침 */
  memos: DayPlanQuickMemo[];
  draft: string;
  onChangeDraft: (v: string) => void;
  /** 줄바꿈 등으로 입력 높이가 바뀔 때 바깥 ScrollView 가 따라 내려가도록 */
  onInputContentSizeChange?: () => void;
  onSavePress: () => void;
};

/**
 * 빠른 메모: 한 화면에 큰 입력만 두고 빠르게 적는 UX(불필요한 카드·체크리스트 제거).
 * 줄바꿈마다 하나의 할 일이 됩니다.
 */
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

  const fontSize = width >= 768 ? 34 : width >= 390 ? 28 : 24;
  const lineHeight = Math.round(fontSize * 1.25);

  return (
    <View style={[styles.root, { backgroundColor: c.containerLowest }]}>
      <TextInput
        ref={ref}
        value={draft}
        onChangeText={onChangeDraft}
        onContentSizeChange={() => onInputContentSizeChange?.()}
        placeholder="빠르게 메모해보세요"
        placeholderTextColor={c.outline}
        multiline
        /** 내부 스크롤을 끄면 엔터로 줄이 늘어날 때 바깥 ScrollView·키보드 회피 레이아웃이 따라간다 */
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
        accessibilityLabel="메모 저장"
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
  /** shell(containerLow)보다 한 단계만 밝은 입력 면 — 순백 아님 */
  root: {
    minHeight: 300,
    flexGrow: 1,
    borderRadius: 14,
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
    borderRadius: 999,
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
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
