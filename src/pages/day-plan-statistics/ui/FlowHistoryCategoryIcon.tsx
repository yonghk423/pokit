import { StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { POST_IT_SOLID_SHADOW } from '@shared/ui/post-it-card-shell';
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

/** 히스토리 카드 — 루틴 목록과 같은 pastel 아이콘 + 검정 솔리드 음영 */
export function FlowHistoryCategoryIcon({ categoryKey, icon, palette: _palette }: Props) {
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
            backgroundColor: POST_IT_SOLID_SHADOW,
            transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
          },
        ]}
      />
      <View style={[styles.box, { backgroundColor: boxBg }]}>
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
    borderWidth: 0,
    borderRadius: 0,
  },
  box: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
});
