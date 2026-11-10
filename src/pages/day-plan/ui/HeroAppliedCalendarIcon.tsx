import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { CITY_CALENDAR_THEMES, useHeroCalendarDesign } from '../model/heroCalendarDesign';
import { getLoadedIllustrationCalendarAssets, loadIllustrationCalendarAssets } from '../lib/illustrationCalendarAssets';
import { CalendarPaper } from './HeroCalendarDesigns';

/** A scaled preview of the selected calendar, using the same paper renderer. */
export function HeroAppliedCalendarIcon({ month, today }: { month: Date; today: Date }) {
  const design = useHeroCalendarDesign();
  const theme = CITY_CALENDAR_THEMES.find(item => item.design === design);
  const illustrated = design === 'illustration' || !!theme;
  const themeId = theme?.themeId ?? '01-rush-hour-commute';
  const [art, setArt] = useState(() => getLoadedIllustrationCalendarAssets(themeId)?.background);
  useEffect(() => {
    if (!illustrated) return;
    let active = true;
    setArt(getLoadedIllustrationCalendarAssets(themeId)?.background);
    loadIllustrationCalendarAssets(themeId).then(value => { if (active) setArt(value.background); }).catch(() => undefined);
    return () => { active = false; };
  }, [illustrated, themeId]);
  return <View pointerEvents="none" accessible={false} style={{ width: 30, height: 39, backgroundColor: design === 'clipboard' ? 'transparent' : '#FAFAF6', shadowColor: '#302C24', shadowOpacity: 0.22, shadowRadius: 2, shadowOffset: { width: 0, height: 2 } }}>
    {illustrated ? <Image cachePolicy="none" source={art ? { uri: art } : undefined} transition={0} contentFit="cover" style={{ width: 30, height: 39 }} /> : <View style={{ width: 300, height: 390, transform: [{ translateX: -135 }, { translateY: -175.5 }, { scale: 0.1 }] }}>
      <CalendarPaper design={design === 'clipboard' || design === 'bold' || design === 'grid' || design === 'photo' ? design : 'bold'} month={month} today={today} diaries={[]} miniature previewSavedCover layoutWidth={300} layoutHeight={390} />
    </View>}
  </View>;
}
