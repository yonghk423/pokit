import { Image } from 'expo-image';
import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

const FOUNTAIN_PEN = require('../../../../assets/stationery-desk/fountain-pen.webp');

/** 책상 시안에서 파생한 실제 손그림 도구. 색상만 바꿔 같은 그림을 재사용한다. */
export const StationeryTool = memo(function StationeryTool({ color, height = 88 }: {
  kind: 'pen'; color: string; height?: number; width?: number;
}) {
  return (
    <>
      <Image source={FOUNTAIN_PEN} contentFit="fill" accessible={false} transition={0} useAppleWebpCodec={false} style={{ width: 16, height }} />
      <Svg width={26} height={9} viewBox="0 0 26 9" accessible={false}>
        <Path d="M3 4q5-3 10 0t10-1M6 7q6-2 12-1" stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      </Svg>
    </>
  );
});
