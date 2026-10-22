import { Children, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

/** Measure the first five rows so the limit also follows larger accessibility fonts. */
export function ComicTodoViewport({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const scroll = useRef<ScrollView>(null);
  const previousCount = useRef(rows.length);
  const canScroll = rows.length > 5;
  const rowKey = (row: ReactNode, index: number) => String(row && typeof row === 'object' && 'key' in row ? row.key : index);
  const maxHeight = rows.slice(0, 5).reduce<number>((height, row, index) => height + (heights[rowKey(row, index)] ?? 48), 0);
  return <ScrollView ref={scroll} testID="comic-todo-list" nestedScrollEnabled scrollEnabled={canScroll}
    showsVerticalScrollIndicator={canScroll} keyboardShouldPersistTaps="handled"
    style={{ flexGrow: 0, maxHeight: canScroll ? maxHeight : undefined }}
    onContentSizeChange={() => {
      if (canScroll && rows.length > previousCount.current) scroll.current?.scrollToEnd({ animated: true });
      previousCount.current = rows.length;
    }}>
    {rows.map((row, index) => <View key={rowKey(row, index)} onLayout={event => {
      const height = event.nativeEvent.layout.height;
      const key = rowKey(row, index);
      if (index < 5 && height > 0) setHeights(previous => previous[key] === height ? previous : { ...previous, [key]: height });
    }}>{row}</View>)}
  </ScrollView>;
}
