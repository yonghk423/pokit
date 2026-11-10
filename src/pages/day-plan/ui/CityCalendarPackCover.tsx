import { Image } from 'expo-image';
import { useStoreArtwork } from '../lib/storeArtwork';
import { memo } from 'react';
import { Platform, Text, View } from 'react-native';

// App-bundled cover: deliberately independent of downloaded theme files and readiness.
export const CityCalendarPackCover = memo(function CityCalendarPackCover({ width, month }: { width: number; month: Date }) {
  const { artwork } = useStoreArtwork();
  const height = width * 1896 / 830;
  const year = month.getFullYear(), index = month.getMonth();
  const offset = (new Date(year, index, 1, 12).getDay() + 6) % 7;
  const count = new Date(year, index + 1, 0, 12).getDate();
  const ink = '#513921';
  const fontFamily = Platform.OS === 'ios' ? 'Baskerville' : 'serif';
  if (!artwork) return <View style={{ width, height, borderRadius: 14, backgroundColor: '#E6E5E1' }} />;
  return <View testID="city-calendar-bundled-cover" pointerEvents="none" style={{ width, height, borderRadius: 14, overflow: 'hidden' }}>
    <Image source={artwork.cover} contentFit="fill" transition={0} style={{ position: 'absolute', width, height }} />
    <View style={{ position: 'absolute', left: width * .06428916, top: height * .41562236, width: width * .86785542, height: height * .04531118, justifyContent: 'center', alignItems: 'center' }}>
      <Text allowFontScaling={false} style={{ fontFamily, color: ink, fontSize: width * .064 }}>{year}.{String(index + 1).padStart(2, '0')}</Text>
    </View>
    <View style={{ position: 'absolute', left: width * .06428916, top: height * .475, width: width * .86785542, height: height * .025, flexDirection: 'row', alignItems: 'center' }}>
      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => <Text key={day} allowFontScaling={false} style={{ width: `${100 / 7}%`, textAlign: 'center', color: ink, fontFamily, fontSize: width * .025 }}>{day}</Text>)}
    </View>
    {Array.from({ length: count }, (_, i) => {
      const slot = offset + i;
      return <View key={i} style={{ position: 'absolute', left: width * (.06428916 + slot % 7 * .86785542 / 7), top: height * (.50625 + Math.floor(slot / 7) * .34531118 / 6), width: width * .86785542 / 7, height: height * .34531118 / 6, justifyContent: 'center', alignItems: 'center' }}>
        <Text testID={`cover-day-${i + 1}`} allowFontScaling={false} style={{ color: ink, fontFamily, fontSize: width * .045 }}>{i + 1}</Text>
      </View>;
    })}
  </View>;
});
