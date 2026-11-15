import { IllustrationCalendarThumbnailOverlay } from './IllustrationCalendarThumbnailOverlay';
import { Image } from 'expo-image';
import { useStoreArtwork } from '../lib/storeArtwork';
import { EVERYDAY_CINEMA_GEOMETRY } from '../lib/everydayCinemaLayouts';
import { memo } from 'react';
import * as calendarTemplate from '../../../../docs/design/photo-diary/city-calendar-template.json';
import { View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

// App-bundled cover: deliberately independent of downloaded theme files and readiness.
export const CityCalendarPackCover = memo(function CityCalendarPackCover({ width, month, pack = 'everyday', borderRadius = 14, cropToGrid = true }: { width: number; month: Date; borderRadius?: number; cropToGrid?: boolean; pack?: 'season-spring' | 'season-summer' | 'season-autumn' | 'season-winter' | 'everyday' | 'city' | 'warm-sepia' | 'citypop-retro' | 'textured-watercolor' }) {
  const { artwork } = useStoreArtwork();
  const previewSize = EVERYDAY_CINEMA_GEOMETRY.size;
  const height = pack === 'season-winter' ? width * 1912 / 823 : width * previewSize[1] / previewSize[0];
  // Everyday artwork uses the same content coordinates as the downloaded calendars.
  const layout = pack === 'city'
    ? { month: [50, 788, 730, 84], weekdays: [50, 895, 730, 43], grid: [50, 960, 730, 654] }
    : calendarTemplate;
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const offset = (new Date(year, monthIndex, 1, 12).getDay() + 6) % 7;
  const count = new Date(year, monthIndex + 1, 0, 12).getDate();
  const [mx, my, mw, mh] = layout.month;
  const [wx, wy, ww, wh] = layout.weekdays;
  const [gx, gy, gw, gh] = layout.grid;
  const visibleHeight = cropToGrid ? Math.min(height, width * (gy + gh + 36) / previewSize[0]) : height;
  const seasonalCover = pack === 'season-spring' ? { source: require('../../../../assets/store-previews/season-spring.webp'), id: 'season-spring-01-light-footsteps' } : pack === 'season-summer' ? { source: require('../../../../assets/store-previews/season-summer.webp'), id: 'season-summer-01-shoreline-walk' } : pack === 'season-autumn' ? { source: require('../../../../assets/store-previews/season-autumn.webp'), id: 'season-autumn-01-dog-leaf-walk' } : null;
  if (seasonalCover) { const h = width * 1896 / 830; return <View style={{ width, height: h, borderRadius, overflow: 'hidden' }}><Image source={seasonalCover.source} contentFit="fill" transition={0} style={{ width, height: h }} /><IllustrationCalendarThumbnailOverlay themeId={seasonalCover.id} month={month} width={width} height={h} /></View>; }
  if (pack === 'season-winter') return <View style={{ width, height, borderRadius, overflow: 'hidden' }}><Image source={require('../../../../assets/store-previews/season-winter.webp')} contentFit="fill" transition={0} style={{ width, height }} /><IllustrationCalendarThumbnailOverlay themeId="season-winter-01-snow-walk" month={month} width={width} height={height} /></View>;
  if (!artwork) return <View style={{ width, height: visibleHeight, borderRadius, backgroundColor: '#E6E5E1' }} />;
  return <View testID="city-calendar-bundled-cover" pointerEvents="none" style={{ width, height: visibleHeight, borderRadius, overflow: 'hidden' }}>
    <Image source={pack === 'city' ? artwork.legacyCover : pack === 'warm-sepia' ? artwork.warmSepiaCover : pack === 'citypop-retro' ? artwork.citypopRetroCover : pack === 'textured-watercolor' ? artwork.texturedWatercolorCover : artwork.cover} contentFit="fill" transition={0} style={{ position: 'absolute', width, height }} />
    <Svg pointerEvents="none" width={width} height={height} viewBox="0 0 830 1896" style={{ position: 'absolute' }}>
      <SvgText x={mx + mw / 2} y={my + mh * .66} textAnchor="middle" fontFamily="serif" fontSize={42} fill="#513921">{year}.{String(monthIndex + 1).padStart(2, '0')}</SvgText>
      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, col) =>
        <SvgText key={day} x={wx + (col + .5) * ww / 7} y={wy + wh * .66} textAnchor="middle" fontFamily="serif" fontSize={22} fill="#513921">{day}</SvgText>)}
      {Array.from({ length: count }, (_, index) => {
        const slot = offset + index;
        return <SvgText key={index} testID={`cover-day-${index + 1}`} x={gx + (slot % 7 + .5) * gw / 7} y={gy + (Math.floor(slot / 7) + .57) * gh / 6} textAnchor="middle" fontFamily="serif" fontSize={30} fill="#513921">{index + 1}</SvgText>;
      })}
    </Svg>
  </View>;
});
