import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  DAY_PLAN_ANCHOR_ICON_SIZE,
  dayPlanAnchorIconColor,
  dayPlanAnchorNodeBackground,
  formatMinuteOfDayKo,
  type SpineTimelineRow,
  resolveBlockCategoryKey,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { SpineTimelineBlockRow } from './SpineTimelineBlockRow';

export type SpineTimelinePalette = {
  ink: string;
  muted: string;
  line: string;
  surface: string;
  accent: string;
};

type Props = {
  rows: SpineTimelineRow[];
  completedBlockIds: ReadonlySet<string>;
  isDark: boolean;
  palette: SpineTimelinePalette;
  /** 스와이프 행 전경 — 타임라인 카드 배경과 동일해야 삭제 레이어가 비치지 않음 */
  rowSurface: string;
  onAddBlockInGap: (fromMinutes: number, toMinutes: number) => void;
  onToggleBlockComplete: (blockId: string) => void;
  onPressBlock?: (blockId: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  onOpenBlockSettings?: (blockId: string, categoryKey: string) => void;
  onReorderBlocks?: (fromIndex: number, toIndex: number) => void;
  onReorderDragActiveChange?: (active: boolean) => void;
};

function formatRailMinutes(minutes: number): string {
  const m = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, '0')}`;
}

function CompleteRadio({
  checked,
  isDark,
  tone,
  onPress,
}: {
  checked: boolean;
  isDark: boolean;
  tone: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      hitSlop={8}
      style={styles.completeHit}>
      {({ pressed }) => (
        <MaterialIcons
          name={checked ? 'radio-button-checked' : 'radio-button-unchecked'}
          size={22}
          color={
            checked
              ? tone
              : pressed
                ? isDark
                  ? 'rgba(255,255,255,0.58)'
                  : '#D1D5DB'
                : isDark
                  ? 'rgba(255,255,255,0.42)'
                  : '#9CA3AF'
          }
        />
      )}
    </Pressable>
  );
}

function SpineAnchorNode({
  icon,
  isDark,
}: {
  icon: 'sun.horizon.fill' | 'moon.fill';
  isDark: boolean;
}) {
  const color = dayPlanAnchorIconColor(isDark);
  return (
    <View
      style={[
        styles.nodeCircle,
        styles.nodeCircleLg,
        {
          backgroundColor: dayPlanAnchorNodeBackground(isDark),
          borderColor: '#000000',
          borderWidth: 2,
        },
      ]}>
      <IconSymbol
        name={icon}
        size={DAY_PLAN_ANCHOR_ICON_SIZE}
        color={color}
        weight="semibold"
      />
    </View>
  );
}

function SpineNode({
  variant,
  palette,
  isDark,
}: {
  variant: 'start' | 'block' | 'end';
  palette: SpineTimelinePalette;
  isDark: boolean;
}) {
  const blockBg = dayPlanAnchorNodeBackground(isDark);

  if (variant === 'start') {
    return <SpineAnchorNode icon="sun.horizon.fill" isDark={isDark} />;
  }
  if (variant === 'end') {
    return <SpineAnchorNode icon="moon.fill" isDark={isDark} />;
  }
  return (
    <View style={[styles.nodeCircle, { backgroundColor: blockBg }]}>
      <IconSymbol name="bookmark.fill" size={14} color={palette.accent} />
    </View>
  );
}

function AnchorRow({
  row,
  palette,
  isDark,
}: {
  row: Extract<SpineTimelineRow, { kind: 'anchor' }>;
  palette: SpineTimelinePalette;
  isDark: boolean;
}) {
  const isStart = row.role === 'dayStart';
  return (
    <View style={styles.eventRow}>
      <View style={styles.railCol}>
        <ThemedText style={[styles.railTime, { color: palette.muted }]}>
          {formatRailMinutes(row.minutes)}
        </ThemedText>
      </View>
      <View style={styles.spineCol}>
        <SpineNode variant={isStart ? 'start' : 'end'} palette={palette} isDark={isDark} />
        <View style={[styles.spineLine, { backgroundColor: palette.line }]} />
      </View>
      <View style={styles.contentCol}>
        <ThemedText style={[styles.metaText, { color: palette.muted }]}>
          {formatMinuteOfDayKo(row.minutes)} ↻
        </ThemedText>
        <ThemedText style={[styles.titleText, { color: palette.ink }]}>{row.label}</ThemedText>
      </View>
      <View style={styles.completeSpacer} />
    </View>
  );
}

function GapRow({
  row,
  palette,
  accent,
  onAdd,
}: {
  row: Extract<SpineTimelineRow, { kind: 'gap' }>;
  palette: SpineTimelinePalette;
  accent: string;
  onAdd: () => void;
}) {
  return (
    <View style={styles.gapRow}>
      <View style={styles.railCol}>
        {row.nowMinutes != null ? (
          <ThemedText style={[styles.railTimeNow, { color: accent }]}>
            {formatRailMinutes(row.nowMinutes)}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.spineColGap}>
        <View style={[styles.spineLineGap, { backgroundColor: palette.line }]} />
      </View>
      <View style={styles.gapContentCol}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="일정 추가"
          hitSlop={8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAdd();
          }}
          style={({ pressed }) => [
            styles.addIconButton,
            {
              backgroundColor: palette.surface,
              borderColor: palette.line,
            },
            pressed && styles.pressed,
          ]}>
          <IconSymbol name="plus" size={15} color={accent} />
        </Pressable>
      </View>
      <View style={styles.completeSpacer} />
    </View>
  );
}

export function SpineTimelineView({
  rows,
  completedBlockIds,
  isDark,
  palette,
  rowSurface,
  onAddBlockInGap,
  onToggleBlockComplete,
  onPressBlock,
  onDeleteBlock,
  onOpenBlockSettings,
  onReorderBlocks,
  onReorderDragActiveChange,
}: Props) {
  const blockRowHeightRef = useRef(56);

  const spineBlockCount = useMemo(
    () => rows.filter((row) => row.kind === 'block').length,
    [rows],
  );
  const reorderEnabled = spineBlockCount >= 2 && Boolean(onReorderBlocks);

  const onRowMeasured = useCallback((height: number) => {
    if (height > 0 && Math.abs(height - blockRowHeightRef.current) > 2) {
      blockRowHeightRef.current = height;
    }
  }, []);

  const onCommitReorder = useCallback(
    (fromIndex: number, translationY: number) => {
      if (!onReorderBlocks || spineBlockCount < 2) return;
      const rowHeight = Math.max(48, blockRowHeightRef.current);
      const delta = Math.round(translationY / rowHeight);
      const toIndex = Math.max(0, Math.min(spineBlockCount - 1, fromIndex + delta));
      if (toIndex !== fromIndex) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onReorderBlocks(fromIndex, toIndex);
      }
    },
    [onReorderBlocks, spineBlockCount],
  );

  const rendered = useMemo(() => {
    let blockIndex = 0;
    return rows.map((row, index) => {
      const key =
        row.kind === 'block'
          ? `block-${row.block.id}`
          : row.kind === 'anchor'
            ? `anchor-${row.role}-${row.minutes}`
            : `gap-${row.fromMinutes}-${row.toMinutes}-${index}`;

      if (row.kind === 'anchor') {
        return (
          <AnchorRow
            key={key}
            row={row}
            palette={palette}
            isDark={isDark}
          />
        );
      }
      if (row.kind === 'block') {
        const currentIndex = blockIndex;
        blockIndex += 1;
        const categoryKey = resolveBlockCategoryKey(row.block);
        return (
          <SpineTimelineBlockRow
            key={key}
            row={row}
            blockIndex={currentIndex}
            palette={palette}
            isDark={isDark}
            rowSurface={rowSurface}
            completed={completedBlockIds.has(row.block.id)}
            reorderEnabled={reorderEnabled}
            onToggleComplete={() => onToggleBlockComplete(row.block.id)}
            onPress={onPressBlock ? () => onPressBlock(row.block.id) : undefined}
            onDelete={onDeleteBlock ? () => onDeleteBlock(row.block.id) : undefined}
            onOpenSettings={
              categoryKey && onOpenBlockSettings
                ? () => onOpenBlockSettings(row.block.id, categoryKey)
                : undefined
            }
            onRowMeasured={onRowMeasured}
            onReorderDragActiveChange={onReorderDragActiveChange}
            onCommitReorder={reorderEnabled ? onCommitReorder : undefined}
          />
        );
      }
      return (
        <GapRow
          key={key}
          row={row}
          palette={palette}
          accent={palette.accent}
          onAdd={() => onAddBlockInGap(row.fromMinutes, row.toMinutes)}
        />
      );
    });
  }, [
    rows,
    palette,
    isDark,
    rowSurface,
    completedBlockIds,
    reorderEnabled,
    onAddBlockInGap,
    onToggleBlockComplete,
    onPressBlock,
    onDeleteBlock,
    onOpenBlockSettings,
    onRowMeasured,
    onReorderDragActiveChange,
    onCommitReorder,
  ]);

  if (rows.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
          시작·마무리 시각을 설정하면 타임라인이 표시돼요.
        </ThemedText>
      </View>
    );
  }

  return <View style={styles.root}>{rendered}</View>;
}

const RAIL_W = 44;
const SPINE_W = 36;
const COMPLETE_W = 28;

const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: 0,
    paddingVertical: 4,
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    minHeight: 56,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 14,
    minHeight: 72,
  },
  railCol: {
    width: RAIL_W,
    alignItems: 'flex-end',
    paddingTop: 4,
    gap: 2,
  },
  railTime: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  railTimeSecondary: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.72,
  },
  railTimeNow: {
    fontSize: 11,
    fontWeight: '700',
  },
  spineCol: {
    width: SPINE_W,
    alignItems: 'center',
  },
  spineColGap: {
    width: SPINE_W,
    alignItems: 'center',
    paddingTop: 4,
  },
  spineLine: {
    width: 2,
    height: 20,
    marginTop: 4,
    borderRadius: 1,
    opacity: 0.35,
  },
  spineLineGap: {
    width: 2,
    flex: 1,
    minHeight: 48,
    borderRadius: 1,
    opacity: 0.25,
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircleLg: {
    width: 40,
    height: 40,
    borderRadius: 0,
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingTop: 2,
  },
  gapContentCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  addIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 2,
    flexShrink: 0,
  },
  completeHit: {
    width: COMPLETE_W,
    height: COMPLETE_W,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  completeSpacer: {
    width: COMPLETE_W,
  },
  pressed: {
    opacity: 0.72,
  },
});
