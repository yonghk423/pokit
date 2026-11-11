import { memo, useCallback, useEffect, useState } from 'react';
import { photoPreview } from '../lib/heroPhotoPreview';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useCalendarWidgetImageReady } from '../model/calendarWidgetRenderReady';

/** Keep decoded photos cached; returning to a tab must not replay a fade from white. */
export const HeroCalendarPhoto = memo(function HeroCalendarPhoto({ uri, contain = false }: { uri: string; contain?: boolean }) {
  const [displayedUri, setDisplayedUri] = useState('');
  const needsPreview = uri.startsWith('file://') && /\/(hero-photos|hero-ai|calendar-covers|drive-backups)\//.test(uri);
  const [preview, setPreview] = useState<{ original: string; source: string } | null>(null);
  useEffect(() => {
    if (!needsPreview) return;
    let active = true;
    void photoPreview(uri).then(source => {
      if (active) setPreview({ original: uri, source });
    });
    return () => { active = false; };
  }, [uri, needsPreview]);
  const source = needsPreview ? (preview?.original === uri ? preview.source : null) : uri;
  const imageReady = useCalendarWidgetImageReady();
  const onDisplay = useCallback(() => {
    setDisplayedUri(uri);
    imageReady?.();
  }, [uri, imageReady]);
  return <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
    {displayedUri !== uri ? <View testID="calendar-photo-skeleton" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECECEC' }]}><View style={{ position: 'absolute', top: '25%', left: '15%', width: '70%', height: '50%', backgroundColor: '#F5F5F5' }} /></View> : null}
    {source && <Image source={{ uri: source }} contentFit={contain ? 'contain' : 'cover'} cachePolicy="memory-disk" transition={0} priority="high" recyclingKey={uri} style={StyleSheet.absoluteFill} onDisplay={onDisplay} onError={() => {
      if (source !== uri) setPreview({ original: uri, source: uri });
    }} />}
  </View>;
});
