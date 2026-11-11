import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CITY_CALENDAR_THEMES, useHeroCalendarDesign } from '../model/heroCalendarDesign';
import { loadIllustrationCalendarAssets } from '../lib/illustrationCalendarAssets';
import { photoPreview } from '../lib/heroPhotoPreview';
import { CalendarPaper } from './HeroCalendarDesigns';

/** A scaled preview of the selected calendar, using the same paper renderer. */
export function HeroAppliedCalendarIcon({ month, today }: { month: Date; today: Date }) {
  const design = useHeroCalendarDesign();
  const theme = CITY_CALENDAR_THEMES.find(item => item.design === design);
  const illustrated = design === 'illustration' || !!theme;
  const themeId = theme?.themeId ?? '01-rush-hour-commute';
  const [art, setArt] = useState<{ themeId: string; uri: string } | null>(null);
  useEffect(() => {
    if (!illustrated) return;
    let active = true;
    // 39pt at 3x needs 117px. Keep a little headroom in a reusable WebP.
    loadIllustrationCalendarAssets(themeId)
      .then(value => photoPreview(value.background, 128))
      .then(uri => { if (active) setArt({ themeId, uri }); }).catch(() => undefined);
    return () => { active = false; };
  }, [illustrated, themeId]);
  return <View pointerEvents="none" accessible={false} style={{ width: 30, height: 39, backgroundColor: design === 'clipboard' ? 'transparent' : '#FAFAF6', shadowColor: '#302C24', shadowOpacity: 0.22, shadowRadius: 2, shadowOffset: { width: 0, height: 2 } }}>
    {illustrated ? <Image cachePolicy="memory-disk" source={art?.themeId === themeId ? { uri: art.uri } : undefined} recyclingKey={themeId} transition={0} contentFit="cover" style={{ width: 30, height: 39 }} /> : <View style={{ width: 300, height: 390, transform: [{ translateX: -135 }, { translateY: -175.5 }, { scale: 0.1 }] }}>
      <CalendarPaper design={design === 'clipboard' || design === 'bold' || design === 'grid' || design === 'photo' ? design : 'bold'} month={month} today={today} diaries={[]} miniature previewSavedCover layoutWidth={300} layoutHeight={390} />
    </View>}
    <View testID="calendar-return-arrow" pointerEvents="none" style={{ position: 'absolute', right: -5, bottom: -4, width: 17, height: 17, borderRadius: 9, backgroundColor: '#FAFAF6', alignItems: 'center', justifyContent: 'center', shadowColor: '#302C24', shadowOpacity: 0.18, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}>
      <Feather name="corner-up-left" size={12} color="#32372F" />
    </View>
  </View>;
}
