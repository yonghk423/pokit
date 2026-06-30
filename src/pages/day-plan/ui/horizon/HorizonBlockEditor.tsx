import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';

import {
  createHorizonBlock,
  getNumberedBlockOrder,
  horizonDocumentHasContent,
  horizonDocumentToPlainText,
  patchHorizonBlockType,
  type HorizonBlockType,
  type HorizonGoalBlock,
  type HorizonGoalDocument,
} from '@shared/lib/storage/horizonGoalBlocks';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../../lib/dayPlanPalette';
import { HorizonFormatToolbar } from './HorizonFormatToolbar';
import { HorizonInlineBlock } from './HorizonInlineBlock';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  strategyEyebrow: string;
  document: HorizonGoalDocument;
  onChangeDocument: (doc: HorizonGoalDocument) => void;
};

export function HorizonBlockEditor({
  c,
  isDark,
  strategyEyebrow,
  document,
  onChangeDocument,
}: Props) {
  const blocks = document.blocks;
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [nextType, setNextType] = useState<HorizonBlockType>('paragraph');
  const [nextBold, setNextBold] = useState(false);
  const [nextUnderline, setNextUnderline] = useState(false);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const blocksRef = useRef(blocks);
  const activeBlockIdRef = useRef<string | null>(null);
  const nextTypeRef = useRef<HorizonBlockType>('paragraph');
  const nextBoldRef = useRef(false);
  const nextUnderlineRef = useRef(false);

  blocksRef.current = blocks;
  activeBlockIdRef.current = activeBlockId;
  nextTypeRef.current = nextType;
  nextBoldRef.current = nextBold;
  nextUnderlineRef.current = nextUnderline;

  const setBlocks = useCallback(
    (nextBlocks: HorizonGoalBlock[]) => {
      blocksRef.current = nextBlocks;
      onChangeDocument({ version: 2, blocks: nextBlocks });
    },
    [onChangeDocument],
  );

  const focusBlock = useCallback((id: string) => {
    setActiveBlockId(id);
    activeBlockIdRef.current = id;
    requestAnimationFrame(() => {
      setTimeout(() => {
        inputRefs.current[id]?.focus();
      }, 0);
    });
  }, []);

  const resolveTargetBlockId = useCallback((): string | null => {
    const activeId = activeBlockIdRef.current;
    if (activeId && blocksRef.current.some((b) => b.id === activeId)) {
      return activeId;
    }
    return blocksRef.current[blocksRef.current.length - 1]?.id ?? null;
  }, []);

  const updateBlock = useCallback(
    (id: string, patch: HorizonGoalBlock) => {
      setBlocks(blocksRef.current.map((b) => (b.id === id ? patch : b)));
    },
    [setBlocks],
  );

  const removeBlock = useCallback(
    (id: string) => {
      const currentBlocks = blocksRef.current;
      const idx = currentBlocks.findIndex((b) => b.id === id);
      if (idx < 0) return;

      if (currentBlocks.length === 1) {
        setBlocks([{ ...currentBlocks[0], text: '' }]);
        focusBlock(currentBlocks[0].id);
        return;
      }

      const next = currentBlocks.filter((b) => b.id !== id);
      setBlocks(next);

      if (activeBlockIdRef.current === id) {
        const focusIdx = idx > 0 ? idx - 1 : 0;
        const focusId = next[focusIdx]?.id;
        if (focusId) {
          focusBlock(focusId);
        }
      }
    },
    [focusBlock, setBlocks],
  );

  const insertBlock = useCallback(
    (
      type: HorizonBlockType = nextTypeRef.current,
      afterId?: string | null,
      options?: { bold?: boolean; underline?: boolean; text?: string },
    ) => {
      const currentBlocks = blocksRef.current;
      const block = createHorizonBlock(type, {
        text: options?.text,
        bold: options?.bold ?? nextBoldRef.current,
        underline: options?.underline ?? nextUnderlineRef.current,
      });
      let next: HorizonGoalBlock[];
      if (!afterId) {
        next = [...currentBlocks, block];
      } else {
        const idx = currentBlocks.findIndex((b) => b.id === afterId);
        if (idx < 0) {
          next = [...currentBlocks, block];
        } else {
          next = [...currentBlocks];
          next.splice(idx + 1, 0, block);
        }
      }
      setBlocks(next);
      focusBlock(block.id);
      return block.id;
    },
    [focusBlock, setBlocks],
  );

  const applyToolbarAction = useCallback(
    (action: () => void) => {
      action();
      const targetId = resolveTargetBlockId();
      if (targetId) {
        focusBlock(targetId);
      }
    },
    [focusBlock, resolveTargetBlockId],
  );

  const pickNextType = useCallback(
    (type: HorizonBlockType) => {
      nextTypeRef.current = type;
      setNextType(type);
      const targetId = resolveTargetBlockId();
      if (!targetId) return;
      const block = blocksRef.current.find((b) => b.id === targetId);
      if (!block) return;
      updateBlock(targetId, patchHorizonBlockType(block, type));
    },
    [resolveTargetBlockId, updateBlock],
  );

  const typeAfterEnter = useCallback((block: HorizonGoalBlock): HorizonBlockType => {
    if (block.type === 'numbered' || block.type === 'bullet' || block.type === 'checklist') {
      return block.type;
    }
    return nextTypeRef.current;
  }, []);

  const syncToolbarFromBlock = useCallback((block: HorizonGoalBlock) => {
    nextTypeRef.current = block.type;
    setNextType(block.type);
    nextBoldRef.current = Boolean(block.bold);
    setNextBold(Boolean(block.bold));
    nextUnderlineRef.current = Boolean(block.underline);
    setNextUnderline(Boolean(block.underline));
  }, []);

  const toggleNextBold = useCallback(() => {
    const targetId = resolveTargetBlockId();
    if (targetId) {
      const block = blocksRef.current.find((b) => b.id === targetId);
      if (block) {
        const next = !block.bold;
        nextBoldRef.current = next;
        setNextBold(next);
        updateBlock(targetId, { ...block, bold: next });
        return;
      }
    }
    const next = !nextBoldRef.current;
    nextBoldRef.current = next;
    setNextBold(next);
  }, [resolveTargetBlockId, updateBlock]);

  const toggleNextUnderline = useCallback(() => {
    const targetId = resolveTargetBlockId();
    if (targetId) {
      const block = blocksRef.current.find((b) => b.id === targetId);
      if (block) {
        const next = !block.underline;
        nextUnderlineRef.current = next;
        setNextUnderline(next);
        updateBlock(targetId, { ...block, underline: next });
        return;
      }
    }
    const next = !nextUnderlineRef.current;
    nextUnderlineRef.current = next;
    setNextUnderline(next);
  }, [resolveTargetBlockId, updateBlock]);

  const startDocument = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (blocksRef.current.length > 0) return;
    insertBlock(nextTypeRef.current);
  }, [insertBlock]);

  const clearAllBlocks = useCallback(() => {
    if (!horizonDocumentHasContent({ version: 2, blocks: blocksRef.current })) return;

    Alert.alert('글 모두 지우기', '작성한 내용을 모두 삭제할까요? 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setActiveBlockId(null);
          activeBlockIdRef.current = null;
          inputRefs.current = {};
          nextTypeRef.current = 'paragraph';
          nextBoldRef.current = false;
          nextUnderlineRef.current = false;
          setNextType('paragraph');
          setNextBold(false);
          setNextUnderline(false);
          setBlocks([]);
        },
      },
    ]);
  }, [setBlocks]);

  const copyAllBlocks = useCallback(async () => {
    const text = horizonDocumentToPlainText({ version: 2, blocks: blocksRef.current }).trim();
    if (text.length === 0) return;

    try {
      await Clipboard.setStringAsync(text);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('복사 실패', '클립보드에 복사하지 못했어요.');
    }
  }, []);

  const hasContent = horizonDocumentHasContent(document);
  const eyebrowActionBtnStyle = (pressed: boolean) => [
    styles.eyebrowActionBtn,
    {
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    pressed && { opacity: 0.65 },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        <View style={styles.eyebrowRow}>
          <ThemedText style={[styles.eyebrow, { color: c.outline }]}>{strategyEyebrow}</ThemedText>
          {hasContent ? (
            <View style={styles.eyebrowActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="글 복사"
                onPress={() => {
                  void copyAllBlocks();
                }}
                hitSlop={8}
                style={({ pressed }) => eyebrowActionBtnStyle(pressed)}>
                <IconSymbol name="doc.on.doc" size={15} color={c.onVariant} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="글 모두 지우기"
                onPress={clearAllBlocks}
                hitSlop={8}
                style={({ pressed }) => eyebrowActionBtnStyle(pressed)}>
                <IconSymbol name="trash" size={15} color={c.onVariant} />
              </Pressable>
            </View>
          ) : null}
        </View>

        {blocks.length === 0 ? (
          <Pressable accessibilityRole="button" onPress={startDocument} style={styles.emptyTap}>
            <ThemedText style={[styles.emptyHint, { color: c.onVariant }]}>
              탭하여 작성을 시작하세요
            </ThemedText>
          </Pressable>
        ) : (
          <View style={styles.flow}>
            {blocks.map((block, index) => (
              <HorizonInlineBlock
                key={block.id}
                c={c}
                isDark={isDark}
                block={block}
                orderNumber={getNumberedBlockOrder(blocks, index) ?? undefined}
                onFocus={() => {
                  setActiveBlockId(block.id);
                  activeBlockIdRef.current = block.id;
                  syncToolbarFromBlock(block);
                }}
                onChange={(next) => updateBlock(block.id, next)}
                onDelete={() => removeBlock(block.id)}
                onEnter={(carryText) => {
                  insertBlock(typeAfterEnter(block), block.id, { text: carryText });
                }}
                inputRef={(ref) => {
                  inputRefs.current[block.id] = ref;
                }}
              />
            ))}
          </View>
        )}

        <View style={styles.toolbarSpacer} />
      </ScrollView>

      <View style={styles.toolbarFloat} pointerEvents="box-none">
        <HorizonFormatToolbar
          c={c}
          isDark={isDark}
          selectedType={nextType}
          boldActive={nextBold}
          underlineActive={nextUnderline}
          onPickType={(type) => applyToolbarAction(() => pickNextType(type))}
          onToggleBold={() => applyToolbarAction(toggleNextBold)}
          onToggleUnderline={() => applyToolbarAction(toggleNextUnderline)}
          onAddBlock={() => {
            applyToolbarAction(() => {
              insertBlock(nextTypeRef.current, resolveTargetBlockId());
            });
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 320,
    position: 'relative',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    flex: 1,
  },
  eyebrowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrowActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flow: {
    gap: 2,
  },
  emptyTap: {
    paddingVertical: 8,
  },
  emptyHint: {
    fontSize: 15,
    fontWeight: '500',
  },
  toolbarSpacer: {
    height: 72,
  },
  toolbarFloat: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
});
