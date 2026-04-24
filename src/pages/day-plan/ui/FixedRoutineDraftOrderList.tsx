import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { PickerCategoryItem } from '../lib/dayPlanEditorShared';

const LONG_PRESS_MS = 420;
const SPRING = { damping: 20, stiffness: 280, mass: 0.85 };

function moveIndex(keys: string[], from: number, to: number): string[] {
  if (to < 0 || to >= keys.length || from === to) return keys;
  const next = [...keys];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

type RowProps = {
  categoryKey: string;
  cat: PickerCategoryItem;
  index: number;
  ink: string;
  muted: string;
  line: string;
  surface: string;
  tabColors: ReturnType<typeof tabPillColors>;
  onRowMeasured: (height: number) => void;
  onDragActiveChange: (active: boolean) => void;
  onCommitReorder: (fromIndex: number, translationY: number) => void;
  onRemove: (key: string) => void;
};

function DraggableFixedRoutineRow({
  categoryKey,
  cat,
  index,
  ink,
  muted,
  line,
  surface,
  tabColors,
  onRowMeasured,
  onDragActiveChange,
  onCommitReorder,
  onRemove,
}: RowProps) {
  const translateY = useSharedValue(0);
  const dragging = useSharedValue(0);

  const triggerDragStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDragActiveChange(true);
  }, [onDragActiveChange]);

  const triggerDragEnd = useCallback(
    (fromIndex: number, translationY: number) => {
      onCommitReorder(fromIndex, translationY);
    },
    [onCommitReorder],
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .maxPointers(1)
    .onStart(() => {
      dragging.value = 1;
      runOnJS(triggerDragStart)();
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(triggerDragEnd)(index, e.translationY);
    })
    .onFinalize(() => {
      translateY.value = withSpring(0, SPRING);
      dragging.value = 0;
      runOnJS(onDragActiveChange)(false);
    });

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: dragging.value ? 50 : 0,
    elevation: dragging.value ? 10 : 0,
    shadowOpacity: dragging.value ? 0.12 : 0,
    shadowRadius: dragging.value ? 8 : 0,
    shadowOffset: { width: 0, height: dragging.value ? 4 : 0 },
  }));

  return (
    <Animated.View
      style={[
        styles.orderRowWrap,
        animatedRowStyle,
        { borderBottomColor: line, shadowColor: '#000', backgroundColor: surface },
      ]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) {
          onRowMeasured(h);
        }
      }}>
      <GestureDetector gesture={pan}>
        <View
          style={styles.orderRowDragHit}
          accessibilityRole="adjustable"
          accessibilityLabel={`${cat.label}, 길게 눌러 순서를 바꿀 수 있어요`}>
          <ThemedText style={[styles.orderIdx, { color: muted }]}>{index + 1}</ThemedText>
          <IconSymbol name={cat.icon as any} size={20} color={muted} />
          <ThemedText style={[styles.orderLabel, { color: ink }]} numberOfLines={1}>
            {cat.label}
          </ThemedText>
        </View>
      </GestureDetector>
      <View style={styles.orderActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${cat.label} 고정에서 빼기`}
          hitSlop={8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRemove(categoryKey);
          }}
          style={({ pressed }) => [
            styles.trashPill,
            {
              backgroundColor: tabColors.inactiveBg,
              borderColor: tabColors.inactiveBorder,
              opacity: pressed ? 0.92 : 1,
            },
          ]}>
          <IconSymbol name="trash" size={18} color={tabColors.inactiveIcon} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

type Props = {
  orderedKeys: string[];
  byKey: Map<string, PickerCategoryItem>;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  surface: string;
  onReorder: (nextKeys: string[]) => void;
  onRemove: (key: string) => void;
  onDragActiveChange: (active: boolean) => void;
};

export function FixedRoutineDraftOrderList({
  orderedKeys,
  byKey,
  isDark,
  ink,
  muted,
  line,
  surface,
  onReorder,
  onRemove,
  onDragActiveChange,
}: Props) {
  const tabColors = useMemo(() => tabPillColors(isDark), [isDark]);
  const keysRef = useRef(orderedKeys);
  const rowHeightRef = useRef(52);
  keysRef.current = orderedKeys;

  const onRowMeasured = useCallback((height: number) => {
    if (height > 0 && Math.abs(height - rowHeightRef.current) > 2) {
      rowHeightRef.current = height;
    }
  }, []);

  const onCommitReorder = useCallback(
    (fromIndex: number, translationY: number) => {
      const keys = keysRef.current;
      const len = keys.length;
      if (len === 0) return;
      const h = Math.max(36, rowHeightRef.current);
      const delta = Math.round(translationY / h);
      const to = Math.max(0, Math.min(len - 1, fromIndex + delta));
      if (to !== fromIndex) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onReorder(moveIndex(keys, fromIndex, to));
      }
    },
    [onReorder],
  );

  return (
    <View style={[styles.listRoot, { borderTopColor: line }]}>
      {orderedKeys.map((key, idx) => {
        const cat = byKey.get(key);
        if (!cat) return null;
        return (
          <DraggableFixedRoutineRow
            key={key}
            categoryKey={key}
            cat={cat}
            index={idx}
            ink={ink}
            muted={muted}
            line={line}
            surface={surface}
            tabColors={tabColors}
            onRowMeasured={onRowMeasured}
            onDragActiveChange={onDragActiveChange}
            onCommitReorder={onCommitReorder}
            onRemove={onRemove}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listRoot: {
    borderTopWidth: 1,
    overflow: 'visible',
  },
  orderRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  /** 길게 눌러 드래그 — 휴지통은 제외 */
  orderRowDragHit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    paddingVertical: 2,
  },
  orderIdx: { width: 22, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  orderLabel: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  orderActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trashPill: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
