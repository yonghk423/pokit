import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

const SOURCES = {
  adjust: require('../../../../assets/routine-action-icons/edit-note.webp'),
  settings: require('../../../../assets/routine-action-icons/settings.webp'),
} as const;

export type RoutineActionIconName = keyof typeof SOURCES | 'ring' | 'expand';

/** 더하기·펼침·완료 원은 주변 연필 그림과 같은 옅은 잉크 농도로 표시한다. */
const PENCIL_INK_OPACITY = 0.38;

/** Ink illustrations for actions; completion contours remain vectors for animated fills. */
export function RoutineActionIcon({
  name,
  size = 20,
  color = '#202020',
}: {
  name: RoutineActionIconName;
  size?: number;
  color?: string;
}) {
  if (name === 'adjust' || name === 'expand') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" opacity={PENCIL_INK_OPACITY} accessible={false} accessibilityElementsHidden>
        {name === 'adjust' ? <>
          <Path d="M4.4 12.4c3.1-.5 6.2-.2 9.1-.3 2.3-.1 4.1-.3 6.2-.1M12.2 4.3c-.5 3-.2 6.2-.1 9.3.1 2.1-.3 4.2-.2 6.1" stroke={color} strokeWidth={1.55} strokeLinecap="round" fill="none" />
          <Path d="M5.2 11.6c3.2.1 5.6-.2 8.5-.1l5.1.1M11.5 5.2c.2 3.4-.2 6.6 0 9.1l.1 4.3" stroke={color} strokeWidth={0.55} strokeLinecap="round" opacity={0.75} fill="none" />
          <Path d="m8.2 12.3 3.7-.1m.1-3.4.2 5.7" stroke={color} strokeWidth={0.75} strokeLinecap="round" fill="none" />
        </> : <>
          <Path d="M4.1 7.8c.8 1.1 1.9 1.7 2.8 2.8 1.2 1.4 2.3 2 3.5 3.5.5.7 1.1 1.5 1.7 1.1 1.1-.7 1.7-2 2.9-3 1.6-1.3 2.8-3 4.9-4.4" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d="M4.8 7.5c1 1.5 2 2.5 3.4 3.5l3.6 4.8c.4.4.8-.3 1.2-.7 1.5-1.8 3.5-3.2 4.8-5.1l1.3-1.3" stroke={color} strokeWidth={0.7} strokeLinecap="round" opacity={0.8} fill="none" />
          <Path d="m6.1 10 .9 1m8.6 1.2 1.4-1.5" stroke={color} strokeWidth={0.5} strokeLinecap="round" opacity={0.6} fill="none" />
        </>}
      </Svg>
    );
  }
  if (name !== 'ring') {
    return (
      <Image
        source={SOURCES[name]}
        contentFit="contain"
        useAppleWebpCodec={false}
        transition={0}
        accessible={false}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={PENCIL_INK_OPACITY} accessible={false} accessibilityElementsHidden>
      <Path d="M12.4 2.5c5.2.1 9.2 4.3 9 9.6-.1 5.4-4.2 9.4-9.6 9.3-5.2-.1-9.4-4.1-9.2-9.5.1-5.3 4.1-9.6 9.8-9.4Z" stroke={color} strokeWidth={1.45} fill="none" />
      <Path d="M4.3 8.8c1.2-3.3 4.1-4.9 7.3-4.8m8.2 10.4c-.8 3.1-3.4 5.1-6.5 5.3" stroke={color} strokeWidth={0.55} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
