import { useEffect, useRef } from 'react';
import { StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import type { DayPlanQuickMemo } from '@entities/day-plan';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

type Props = {
  c: DayPlanPalette;
  /** 기존 저장소에 남아 있을 수 있는 줄 단위 메모 — 최초 한 번만 초안에 합침 */
  memos: DayPlanQuickMemo[];
  draft: string;
  onChangeDraft: (v: string) => void;
};

/**
 * 빠른 메모: 한 화면에 큰 입력만 두고 빠르게 적는 UX(불필요한 카드·체크리스트 제거).
 * 줄바꿈마다 하나의 할 일이 됩니다.
 */
export function QuickMemoPlanSection({ c, memos, draft, onChangeDraft }: Props) {
  const { width } = useWindowDimensions();
  const hydratedRef = useRef(false);

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
    <View style={styles.root}>
      <TextInput
        value={draft}
        onChangeText={onChangeDraft}
        placeholder="지금 어떤 생각이 드나요?"
        placeholderTextColor={c.outline}
        multiline
        scrollEnabled
        textAlignVertical="top"
        autoFocus
        style={[
          styles.zenInput,
          {
            color: c.onSurface,
            fontSize,
            lineHeight,
          },
        ]}
      />
      <View style={styles.gradientHint} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 320,
    flexGrow: 1,
  },
  zenInput: {
    flex: 1,
    minHeight: 280,
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
    backgroundColor: 'rgba(249, 115, 22, 0.22)',
  },
});
