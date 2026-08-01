import { StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';
import {
  activeIconColorByCategory,
  categoryAccentColorPastel,
} from '@widgets/day-plan-priority-order';

import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';

const SHADOW_SM = 2;

type Props = {
  categoryKey: string;
  icon: string;
  palette: FlowHistoryPalette;
};

/** 히스토리 카드 — 루틴 목록과 같은 pastel 아이콘 박스 */
export function FlowHistoryCategoryIcon({ categoryKey, icon, palette }: Props) {
  const iconColor = activeIconColorByCategory(categoryKey);
  const boxBg = categoryAccentColorPastel(categoryKey);

  return (
    <View
      style={[
        styles.shell,
        { marginRight: SHADOW_SM, marginBottom: SHADOW_SM },
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            backgroundColor: palette.shadow,
            borderColor: palette.border,
            transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
          },
        ]}
      />
      <View
        style={[
          styles.box,
          { backgroundColor: boxBg, borderColor: palette.border },
        ]}>
        <IconSymbol name={icon as SymbolViewProps['name']} size={16} color={iconColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    flexShrink: 0,
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  box: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
});
