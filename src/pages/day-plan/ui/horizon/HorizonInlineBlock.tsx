import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInput as TextInputType } from 'react-native';

import type { HorizonGoalBlock } from '@shared/lib/storage/horizonGoalBlocks';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../../lib/dayPlanPalette';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  block: HorizonGoalBlock;
  onFocus: () => void;
  onChange: (block: HorizonGoalBlock) => void;
  onDelete: () => void;
  onEnter: (carryText: string) => void;
  inputRef?: (ref: TextInputType | null) => void;
  /** numbered 타입일 때 표시할 순번 (1부터) */
  orderNumber?: number;
};

function baseInputStyle(type: HorizonGoalBlock['type']) {
  switch (type) {
    case 'heading1':
      return styles.inputH1;
    case 'heading2':
      return styles.inputH2;
    case 'heading3':
      return styles.inputH3;
    default:
      return styles.inputBody;
  }
}

function placeholderForType(type: HorizonGoalBlock['type']): string {
  switch (type) {
    case 'heading1':
      return '섹션제목1';
    case 'heading2':
      return '섹션제목2';
    case 'heading3':
      return '섹션제목3';
    case 'bullet':
      return '리스트 항목';
    case 'numbered':
      return '번호 리스트 항목';
    case 'checklist':
      return '할 일';
    default:
      return '내용을 입력하세요';
  }
}

export function HorizonInlineBlock({
  c,
  isDark,
  block,
  onFocus,
  onChange,
  onDelete,
  onEnter,
  inputRef,
  orderNumber = 1,
}: Props) {
  const localRef = useRef<TextInputType>(null);
  const ink = c.onSurface;

  const setRef = (ref: TextInputType | null) => {
    localRef.current = ref;
    inputRef?.(ref);
  };

  const boldWeight =
    block.type === 'heading1' ? '900' : block.type === 'heading2' || block.type === 'heading3' ? '800' : '700';

  const inputStyle = [
    baseInputStyle(block.type),
    { color: ink },
    block.bold && { fontWeight: boldWeight as '700' | '800' | '900' },
    block.underline && { textDecorationLine: 'underline' as const },
  ];

  const handleTextChange = (nextText: string) => {
    if (!nextText.includes('\n')) {
      onChange({ ...block, text: nextText });
      return;
    }
    const [head, ...rest] = nextText.split('\n');
    const carryText = rest.join('\n');
    onChange({ ...block, text: head });
    onEnter(carryText);
  };

  const inputCommon = {
    value: block.text,
    onChangeText: handleTextChange,
    onFocus,
    placeholder: placeholderForType(block.type),
    placeholderTextColor: c.outline,
    multiline: true as const,
    scrollEnabled: false as const,
    textAlignVertical: 'top' as const,
    style: inputStyle,
  };

  if (block.type === 'checklist') {
    return (
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Boolean(block.checked) }}
          onPress={() => onChange({ ...block, checked: !block.checked })}
          style={[
            styles.checkbox,
            {
              borderColor: block.checked ? c.onSurface : c.outline,
              backgroundColor: block.checked ? c.onSurface : 'transparent',
            },
          ]}>
          {block.checked ? (
            <IconSymbol name="checkmark" size={12} color={isDark ? '#09090b' : '#fff'} />
          ) : null}
        </Pressable>
        <TextInput
          ref={setRef}
          {...inputCommon}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && block.text.length === 0) onDelete();
          }}
        />
      </View>
    );
  }

  if (block.type === 'bullet') {
    return (
      <View style={[styles.row, styles.bulletRow]}>
        <ThemedTextBullet color={c.onVariant} />
        <TextInput
          ref={setRef}
          {...inputCommon}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && block.text.length === 0) onDelete();
          }}
          style={[inputCommon.style, styles.bulletInput]}
        />
      </View>
    );
  }

  if (block.type === 'numbered') {
    return (
      <View style={[styles.row, styles.numberedRow]}>
        <ThemedText style={[styles.numberLabel, { color: c.onVariant }]}>{orderNumber}.</ThemedText>
        <TextInput
          ref={setRef}
          {...inputCommon}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && block.text.length === 0) onDelete();
          }}
          style={[inputCommon.style, styles.numberedInput]}
        />
      </View>
    );
  }

  return (
    <View style={styles.blockWrap}>
      <TextInput
        ref={setRef}
        {...inputCommon}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace' && block.text.length === 0) onDelete();
        }}
      />
    </View>
  );
}

function ThemedTextBullet({ color }: { color: string }) {
  return <View style={styles.bulletDotWrap}><View style={[styles.bulletDot, { backgroundColor: color }]} /></View>;
}

const styles = StyleSheet.create({
  blockWrap: {
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  bulletRow: {
    paddingLeft: 4,
  },
  numberedRow: {
    paddingLeft: 2,
  },
  numberLabel: {
    minWidth: 28,
    textAlign: 'right',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '600',
    paddingTop: 1,
  },
  numberedInput: {
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bulletDotWrap: {
    width: 8,
    paddingTop: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletInput: {
    flex: 1,
  },
  inputH1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
    padding: 0,
    minHeight: 40,
  },
  inputH2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.35,
    padding: 0,
    minHeight: 32,
    marginTop: 8,
  },
  inputH3: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    padding: 0,
    minHeight: 28,
    marginTop: 6,
  },
  inputBody: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
    padding: 0,
    minHeight: 28,
  },
});
