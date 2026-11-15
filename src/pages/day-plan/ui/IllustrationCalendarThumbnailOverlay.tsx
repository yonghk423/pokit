import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';
import * as template from '../../../../docs/design/photo-diary/city-calendar-template.json';
import { CALENDAR_ARTWORK_LAYOUTS } from '../lib/illustrationCalendarLayouts';
import { CALENDAR_CONTRAST } from '../lib/illustrationCalendarContrast';

/** Lightweight calendar text over the same centered cover crop as the card image. */
export const IllustrationCalendarThumbnailOverlay = memo(function IllustrationCalendarThumbnailOverlay({ themeId, month, width, height }: {
  themeId: string; month: Date; width: number; height: number;
}) {
  const layout = CALENDAR_ARTWORK_LAYOUTS[themeId];
  const [sw, sh] = layout?.size ?? template.size;
  const region = (name: 'month' | 'weekdays' | 'grid') => layout
    ? layout[name].map((v, i) => v * (i % 2 ? sh : sw))
    : template[name];
  const [mx, my, mw, mh] = region('month');
  const [wx, wy, ww, wh] = region('weekdays');
  const [gx, gy, gw, gh] = region('grid');
  const contrast = CALENDAR_CONTRAST[themeId];
  const ink = contrast?.title ?? '#513921';
  const year = month.getFullYear(), m = month.getMonth();
  const offset = (new Date(year, m, 1, 12).getDay() + 6) % 7;
  const count = new Date(year, m + 1, 0, 12).getDate();
  return <View testID="illustration-thumbnail-calendar" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { borderRadius: 14, overflow: 'hidden' }]}>
    <Svg width={width} height={height} viewBox={`0 0 ${sw} ${sh}`} preserveAspectRatio="xMidYMid slice">
      <SvgText testID="illustration-thumbnail-month" x={mx + mw / 2} y={my + mh * .66} textAnchor="middle" fontFamily="serif" fontSize={mh * .46} fill={ink}>{year}.{String(m + 1).padStart(2, '0')}</SvgText>
      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, col) =>
        <SvgText key={day} x={wx + (col + .5) * ww / 7} y={wy + wh * .66} textAnchor="middle" fontFamily="serif" fontSize={wh * .41} fill={contrast?.weekdays[col] ?? ink}>{day}</SvgText>)}
      {Array.from({ length: count }, (_, index) => {
        const slot = offset + index;
        return <SvgText key={index} testID={`illustration-thumbnail-day-${index + 1}`} x={gx + (slot % 7 + .5) * gw / 7} y={gy + (Math.floor(slot / 7) + .57) * gh / 6} textAnchor="middle" fontFamily="serif" fontSize={gh / 6 * .29} fill={contrast?.dates[slot] ?? ink}>{index + 1}</SvgText>;
      })}
    </Svg>
  </View>;
});
