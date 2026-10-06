import { memo, type ReactElement } from 'react';
import { View } from 'react-native';
import Reanimated, { FadeOut, LinearTransition, Easing } from 'react-native-reanimated';

import type { PriorityMarkColorId } from '@entities/day-plan';
import type { DayMealSlot, PostItFaceColorId, PostItInkColorId } from '@shared/lib/storage';
import { ScrapTapeLabel } from '@shared/ui/scrap-tape-label';
import { SmoothEnter } from '@shared/ui/list-row-skeleton';
import { PriorityOrderRow } from '@widgets/day-plan-priority-order';

const PRIORITY_ROW_EXITING = FadeOut.duration(280).easing(Easing.out(Easing.cubic));
const PRIORITY_ROW_LAYOUT = LinearTransition.duration(320).easing(Easing.out(Easing.cubic));

export type PriorityBagRowActions = {
  onEditTime: (rowKey: string, categoryKey: string, label: string) => void;
  onSelectItemMarkColor: (categoryKey: string, color: PriorityMarkColorId | null) => void;
  onSelectItemFaceColor: (categoryKey: string, color: PostItFaceColorId | null) => void;
  onSelectItemInkColor: (categoryKey: string, color: PostItInkColorId | null) => void;
  onToggleComplete: (categoryKey: string, fromSlot?: DayMealSlot) => void;
  onReorderEnd: (categoryKey: string, translationY: number, fromSlot?: DayMealSlot) => void;
  onReorderActive: (categoryKey: string, active: boolean) => void;
  onOpenSettings?: (categoryKey: string) => void;
  onFinishForToday?: (categoryKey: string, label: string) => void;
  onOpenFocusDetail?: (categoryKey: string) => void;
  onToggleExpand: (rowKey: string) => void;
  onRowLayoutHeight: (height: number) => void;
};

type Props = {
  rowKey: string;
  categoryKey: string;
  fromSlot?: DayMealSlot;
  icon: string;
  label: string;
  subtitle: string | null;
  summaryHint: string | null;
  itemMarkColor: PriorityMarkColorId | null;
  itemFaceColor: PostItFaceColorId | null;
  itemInkColor: PostItInkColorId | null;
  isFocusStarted: boolean;
  isCompleted: boolean;
  isDark: boolean;
  ink: string;
  inkMuted: string;
  line: string;
  hideCompleteTape: boolean;
  successTapeLabel: string;
  allowBagReorder: boolean;
  animateOnMount: boolean;
  expanded: boolean;
  layoutAnim: boolean;
  expandedContent: ReactElement | null;
  actions: PriorityBagRowActions;
};

function PriorityBagMountedRowInner({
  rowKey,
  categoryKey,
  fromSlot,
  icon,
  label,
  subtitle,
  summaryHint,
  itemMarkColor,
  itemFaceColor,
  itemInkColor,
  isFocusStarted,
  isCompleted,
  isDark,
  ink,
  inkMuted,
  line,
  hideCompleteTape,
  successTapeLabel,
  allowBagReorder,
  animateOnMount,
  expanded,
  layoutAnim,
  expandedContent,
  actions,
}: Props) {
  return (
    <SmoothEnter>
    <Reanimated.View
      layout={layoutAnim ? PRIORITY_ROW_LAYOUT : undefined}
      exiting={layoutAnim ? PRIORITY_ROW_EXITING : undefined}
      style={wrapStyle}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) actions.onRowLayoutHeight(h);
      }}>
      {isCompleted && !hideCompleteTape ? (
        <View pointerEvents="none" style={tapeAnchorStyle}>
          <ScrapTapeLabel
            text={successTapeLabel}
            isDark={isDark}
            tone="masking"
            rotateDeg={-3}
            accessibilityLabel={successTapeLabel}
          />
        </View>
      ) : null}
      <PriorityOrderRow
        categoryKey={categoryKey}
        icon={icon}
        label={label}
        subtitle={subtitle}
        summaryHint={summaryHint}
        onEditTime={() => actions.onEditTime(rowKey, categoryKey, label)}
        itemMarkColor={itemMarkColor}
        onSelectItemMarkColor={(color) => actions.onSelectItemMarkColor(categoryKey, color)}
        itemFaceColor={itemFaceColor}
        onSelectItemFaceColor={(color) => actions.onSelectItemFaceColor(categoryKey, color)}
        itemInkColor={itemInkColor}
        onSelectItemInkColor={(color) => actions.onSelectItemInkColor(categoryKey, color)}
        isFocusStarted={isFocusStarted}
        isCompleted={isCompleted}
        isDark={isDark}
        ink={ink}
        inkMuted={inkMuted}
        line={line}
        onToggleFocusComplete={() => actions.onToggleComplete(categoryKey, fromSlot)}
        onReorderDragTranslationEnd={
          allowBagReorder
            ? (ty) => actions.onReorderEnd(categoryKey, ty, fromSlot)
            : undefined
        }
        onReorderDragActiveChange={
          allowBagReorder ? (active) => actions.onReorderActive(categoryKey, active) : undefined
        }
        onSettings={
          actions.onOpenSettings
            ? () => actions.onOpenSettings?.(categoryKey)
            : undefined
        }
        onFinishForToday={
          isFocusStarted && actions.onFinishForToday
            ? () => actions.onFinishForToday?.(categoryKey, label)
            : undefined
        }
        onFocusDetail={
          actions.onOpenFocusDetail ? () => actions.onOpenFocusDetail?.(categoryKey) : undefined
        }
        animateOnMount={animateOnMount}
        expanded={expanded}
        onToggleExpand={() => actions.onToggleExpand(rowKey)}
        expandedContent={expandedContent}
      />
    </Reanimated.View>
    </SmoothEnter>
  );
}

const wrapStyle = {
  position: 'relative' as const,
  width: '100%' as const,
  overflow: 'visible' as const,
};

const tapeAnchorStyle = {
  position: 'absolute' as const,
  top: -6,
  left: -2,
  zIndex: 6,
};

export const PriorityBagMountedRow = memo(PriorityBagMountedRowInner);
