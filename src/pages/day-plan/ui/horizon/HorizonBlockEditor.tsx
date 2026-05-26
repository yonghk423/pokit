import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';

import {
  createHorizonBlock,
  getNumberedBlockOrder,
  type HorizonBlockType,
  type HorizonGoalBlock,
  type HorizonGoalDocument,
} from '@shared/lib/storage/horizonGoalBlocks';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../../lib/dayPlanPalette';
import { HorizonFormatToolbar } from './HorizonFormatToolbar';
import { HorizonInlineBlock } from './HorizonInlineBlock';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  strategyEyebrow: string;
  emptyTitleHint?: string;
  document: HorizonGoalDocument;
  onChangeDocument: (doc: HorizonGoalDocument) => void;
};

export function HorizonBlockEditor({
  c,
  isDark,
  strategyEyebrow,
  emptyTitleHint = '이번 주 핵심 전략',
  document,
  onChangeDocument,
}: Props) {
  const blocks = document.blocks;
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [nextType, setNextType] = useState<HorizonBlockType>('paragraph');
  const [nextBold, setNextBold] = useState(false);
  const [nextUnderline, setNextUnderline] = useState(false);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const activeBlockIdRef = useRef<string | null>(null);

  activeBlockIdRef.current = activeBlockId;

  const setBlocks = useCallback(
    (nextBlocks: HorizonGoalBlock[]) => {
      onChangeDocument({ version: 2, blocks: nextBlocks });
    },
    [onChangeDocument],
  );

  const focusBlock = useCallback((id: string) => {
    setActiveBlockId(id);
    requestAnimationFrame(() => {
      inputRefs.current[id]?.focus();
    });
  }, []);

  const updateBlock = useCallback(
    (id: string, patch: HorizonGoalBlock) => {
      setBlocks(blocks.map((b) => (b.id === id ? patch : b)));
    },
    [blocks, setBlocks],
  );

  const removeBlock = useCallback(
    (id: string) => {
      const next = blocks.filter((b) => b.id !== id);
      setBlocks(next);
      if (activeBlockIdRef.current === id) {
        const fallback = next[next.length - 1]?.id ?? null;
        setActiveBlockId(fallback);
      }
    },
    [blocks, setBlocks],
  );

  const insertBlock = useCallback(
    (
      type: HorizonBlockType = nextType,
      afterId?: string | null,
      options?: { bold?: boolean; underline?: boolean; text?: string },
    ) => {
      const block = createHorizonBlock(type, {
        text: options?.text,
        bold: options?.bold ?? nextBold,
        underline: options?.underline ?? nextUnderline,
      });
      let next: HorizonGoalBlock[];
      if (!afterId) {
        next = [...blocks, block];
      } else {
        const idx = blocks.findIndex((b) => b.id === afterId);
        if (idx < 0) {
          next = [...blocks, block];
        } else {
          next = [...blocks];
          next.splice(idx + 1, 0, block);
        }
      }
      setBlocks(next);
      focusBlock(block.id);
      return block.id;
    },
    [blocks, focusBlock, nextBold, nextType, nextUnderline, setBlocks],
  );

  const pickNextType = useCallback((type: HorizonBlockType) => {
    setNextType(type);
  }, []);

  const typeAfterEnter = useCallback(
    (block: HorizonGoalBlock): HorizonBlockType => {
      if (block.type === 'numbered' || block.type === 'bullet' || block.type === 'checklist') {
        return block.type;
      }
      return nextType;
    },
    [nextType],
  );

  const toggleNextBold = useCallback(() => {
    setNextBold((v) => !v);
  }, []);

  const toggleNextUnderline = useCallback(() => {
    setNextUnderline((v) => !v);
  }, []);

  const startDocument = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (blocks.length > 0) return;
    insertBlock(nextType);
  }, [blocks.length, insertBlock, nextType]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        <ThemedText style={[styles.eyebrow, { color: c.outline }]}>{strategyEyebrow}</ThemedText>

        {blocks.length === 0 ? (
          <Pressable accessibilityRole="button" onPress={startDocument} style={styles.emptyTap}>
            <ThemedText style={[styles.emptyTitle, { color: c.onSurface }]}>
              {emptyTitleHint}
            </ThemedText>
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
                onFocus={() => setActiveBlockId(block.id)}
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
          onPickType={pickNextType}
          onToggleBold={toggleNextBold}
          onToggleUnderline={toggleNextUnderline}
          onAddBlock={() => {
            const afterId = activeBlockIdRef.current;
            insertBlock(nextType, afterId);
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
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  flow: {
    gap: 2,
  },
  emptyTap: {
    paddingVertical: 8,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    opacity: 0.35,
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
