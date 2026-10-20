import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { contrastingForeground } from '@shared/lib/colorMath';
import { useTranslation } from '@shared/lib/i18n';
import type { PostItFaceColorId } from '@shared/lib/storage';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { SurfaceTexture } from '@shared/ui/surface-texture';
import { deskPaperChoices, type DeskChoice } from '@shared/ui/stationery-desk/choices';

/** 아이콘 컬러에서 옮긴 정사각 스와치 UI. 폭에 맞춰 열 수를 정한다. */
export function PostItColorGrid({ choices, onClear, isDark, label, clearLabel, texture = 'paper' }: {
  choices: DeskChoice[];
  onClear?: () => void;
  isDark: boolean;
  label?: string;
  clearLabel?: string;
  texture?: 'paper' | 'pigment';
}) {
  const { t } = useTranslation();
  const paletteLabel = label ?? t('catalog.postItColorTitle');
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.floor(width / 44));
  const count = choices.length + (onClear ? 1 : 0);
  const rows = Math.ceil(count / columns);
  const clearSelected = !choices.some((choice) => choice.selected);

  return (
    <View
      style={styles.grid}
      accessibilityRole="toolbar"
      accessibilityLabel={paletteLabel}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        setWidth((current) => Math.abs(current - next) > 1 ? next : current);
      }}>
      {width > 0 && Array.from({ length: rows }, (_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
        {Array.from({ length: columns }, (_, columnIndex) => {
        const index = rowIndex * columns + columnIndex;
        const isClear = Boolean(onClear) && index === 0;
        const choice = choices[index - (onClear ? 1 : 0)];
        if (!isClear && !choice) return <View key={`empty-${index}`} style={styles.slot} />;
        const color = isClear ? (isDark ? '#3A3C52' : '#FFFFFF') : choice.color;
        const selected = isClear ? clearSelected : choice.selected;
        return (
          <View key={`slot-${columnIndex}`} style={styles.slot}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={isClear ? (clearLabel ? `${clearLabel} ${t('common.reset')}` : t('dayPlan.routineFaceColorClearA11y')) : `${paletteLabel} ${choice.label ?? t(choice.labelKey)}`}
              onPress={() => {
                void Haptics.selectionAsync();
                if (isClear) onClear?.();
                else choice.onSelect();
              }}
              style={({ pressed }) => [styles.swatch, { backgroundColor: color, opacity: pressed ? 0.7 : 1 }]}>
              <SurfaceTexture kind={texture} opacity={texture === 'paper' ? 0.4 : 1} />
              {isClear ? <IconSymbol name="xmark" size={14} color={contrastingForeground(color)} /> : null}
              {selected ? <HanddrawnFrame color={contrastingForeground(color)} bold /> : null}
            </Pressable>
          </View>
        );
        })}
        </View>
      ))}
    </View>
  );
}

export function PostItColorPalette({ value, onChange, isDark }: {
  value: PostItFaceColorId | null | undefined;
  onChange: (value: PostItFaceColorId | null) => void;
  isDark: boolean;
}) {
  return <PostItColorGrid texture="pigment" choices={deskPaperChoices(value, onChange, isDark)} onClear={() => onChange(null)} isDark={isDark} />;
}

const styles = StyleSheet.create({
  grid: { width: '100%' },
  row: { width: '100%', flexDirection: 'row' },
  slot: { flex: 1, minWidth: 0, aspectRatio: 1 },
  swatch: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.2)' },
});
