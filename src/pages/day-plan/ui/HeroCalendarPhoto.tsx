import { memo, useCallback, useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useCalendarWidgetImageReady } from '../model/calendarWidgetRenderReady';

/** Keep decoded photos cached; returning to a tab must not replay a fade from white. */
export const HeroCalendarPhoto = memo(function HeroCalendarPhoto({ uri, contain = false }: { uri: string; contain?: boolean }) {
  const [displayedUri, setDisplayedUri] = useState('');
  const imageReady = useCalendarWidgetImageReady();
  const onDisplay = useCallback(() => {
    setDisplayedUri(uri);
    imageReady?.();
  }, [uri, imageReady]);
  return <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
    {displayedUri !== uri ? <View testID="calendar-photo-skeleton" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECECEC' }]}><View style={{ position: 'absolute', top: '25%', left: '15%', width: '70%', height: '50%', backgroundColor: '#F5F5F5' }} /></View> : null}
    <Image source={{ uri }} contentFit={contain ? 'contain' : 'cover'} cachePolicy="memory-disk" transition={0} priority="high" recyclingKey={uri} style={StyleSheet.absoluteFill} onDisplay={onDisplay} />
  </View>;
});
