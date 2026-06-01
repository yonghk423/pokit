import { StyleSheet, View } from 'react-native';

import {
  getNumberedBlockOrder,
  horizonDocumentHasContent,
  type HorizonGoalBlock,
  type HorizonGoalDocument,
} from '@shared/lib/storage/horizonGoalBlocks';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  document: HorizonGoalDocument;
  ink: string;
  muted: string;
  isDark: boolean;
};

function baseTextStyle(type: HorizonGoalBlock['type']) {
  switch (type) {
    case 'heading1':
      return styles.textH1;
    case 'heading2':
      return styles.textH2;
    case 'heading3':
      return styles.textH3;
    default:
      return styles.textBody;
  }
}

function ReadBlock({
  block,
  blocks,
  index,
  ink,
  muted,
  isDark,
}: {
  block: HorizonGoalBlock;
  blocks: HorizonGoalBlock[];
  index: number;
  ink: string;
  muted: string;
  isDark: boolean;
}) {
  const boldWeight =
    block.type === 'heading1' ? '900' : block.type === 'heading2' || block.type === 'heading3' ? '800' : '700';

  const textStyle = [
    baseTextStyle(block.type),
    { color: ink },
    block.bold && { fontWeight: boldWeight as '700' | '800' | '900' },
    block.underline && { textDecorationLine: 'underline' as const },
  ];

  if (block.type === 'checklist') {
    return (
      <View style={styles.row}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: block.checked ? ink : muted,
              backgroundColor: block.checked ? ink : 'transparent',
            },
          ]}>
          {block.checked ? (
            <IconSymbol name="checkmark" size={12} color={isDark ? '#09090b' : '#fff'} />
          ) : null}
        </View>
        <ThemedText style={[textStyle, styles.flexText]}>{block.text}</ThemedText>
      </View>
    );
  }

  if (block.type === 'bullet') {
    return (
      <View style={[styles.row, styles.bulletRow]}>
        <View style={styles.bulletDotWrap}>
          <View style={[styles.bulletDot, { backgroundColor: muted }]} />
        </View>
        <ThemedText style={[textStyle, styles.flexText]}>{block.text}</ThemedText>
      </View>
    );
  }

  if (block.type === 'numbered') {
    const order = getNumberedBlockOrder(blocks, index) ?? 1;
    return (
      <View style={[styles.row, styles.numberedRow]}>
        <ThemedText style={[styles.numberLabel, { color: muted }]}>{order}.</ThemedText>
        <ThemedText style={[textStyle, styles.flexText]}>{block.text}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.blockWrap}>
      <ThemedText style={textStyle}>{block.text}</ThemedText>
    </View>
  );
}

export function HorizonDocumentReadView({ document, ink, muted, isDark }: Props) {
  const blocks = document.blocks.filter((block) => block.text.trim().length > 0);
  if (!horizonDocumentHasContent(document) || blocks.length === 0) {
    return null;
  }

  return (
    <View style={styles.root}>
      {blocks.map((block, index) => (
        <ReadBlock
          key={block.id}
          block={block}
          blocks={document.blocks}
          index={document.blocks.indexOf(block)}
          ink={ink}
          muted={muted}
          isDark={isDark}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 2,
  },
  blockWrap: {
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 3,
  },
  bulletRow: {
    paddingLeft: 4,
  },
  numberedRow: {
    paddingLeft: 2,
  },
  flexText: {
    flex: 1,
  },
  numberLabel: {
    minWidth: 28,
    textAlign: 'right',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    paddingTop: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletDotWrap: {
    width: 8,
    paddingTop: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  textH1: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  textH2: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 6,
  },
  textH3: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    marginTop: 4,
  },
  textBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
});
