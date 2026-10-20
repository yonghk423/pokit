import { getPreparedIllustration } from './illustrationCache';
import { controlIllustrationSources } from './controlIllustrationSources';
import { Image } from 'expo-image';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { View, StyleProp, ViewStyle, type ColorValue } from 'react-native';

import { HanddrawnControl, hasHanddrawnControl } from './handdrawnControls';
import { routineIllustrationSources } from './routineIllustrationSources';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  /** 앱 전용 routine: ID 또는 기존 SF Symbol 이름 */
  name: SymbolViewProps['name'] | string;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const illustrationAliases: Record<string, string> = { 'washer.fill': 'routine:laundry', washer: 'routine:laundry', 'bed.double.fill': 'routine:bed-making', 'bed.double': 'routine:bed-making' };
  const source = typeof name === 'string' ? (controlIllustrationSources[name] ?? routineIllustrationSources[illustrationAliases[name] ?? name]) : undefined;
  if (source) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image
          source={getPreparedIllustration(source)}
          cachePolicy="memory"
          priority="high"
          contentFit="contain"
          useAppleWebpCodec={false}
          transition={0}
          accessible={false}
          style={{ width: size, height: size }}
        />
      </View>
    );
  }
  if (typeof name === 'string' && hasHanddrawnControl(name)) return <View style={[{ width: size, height: size }, style]}><HanddrawnControl name={name} size={size} color={color} /></View>;
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      type="monochrome"
      resizeMode="scaleAspectFit"
      name={name as SymbolViewProps['name']}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
