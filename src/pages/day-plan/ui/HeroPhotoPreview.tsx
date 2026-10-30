import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

/** Native byte progress where available; completion waits for the decoded image. */
export function HeroPhotoPreview({ uri, style, resizeMode }: { uri: string; style: StyleProp<ImageStyle>; resizeMode?: 'contain' | 'cover' }) {
  return <PhotoSession key={uri} uri={uri} style={style} resizeMode={resizeMode} />;
}
function PhotoSession({ uri, style, resizeMode }: { uri: string; style: StyleProp<ImageStyle>; resizeMode?: 'contain' | 'cover' }) {
  const { t } = useTranslation();
  const [percent, setPercent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return <View style={style}>
    <Image testID="hero-photo-preview-image" source={{ uri }} resizeMode={resizeMode ?? 'contain'} style={StyleSheet.absoluteFill}
      onProgress={({ nativeEvent: { loaded: bytes, total } }) => { if (total > 0) setPercent(current => Math.max(current, Math.min(99, Math.floor(bytes / total * 100)))); }}
      onLoad={() => { setPercent(100); setLoaded(true); }} onError={() => setFailed(true)} />
    {!loaded ? <View pointerEvents="none" style={s.overlay}>
      <ThemedText accessibilityLiveRegion="polite" style={s.label}>{failed ? t('comicDay.photo.pickError') : t('comicDay.photo.importProgress', { percent })}</ThemedText>
      {!failed ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={s.track}><View style={[s.fill, { width: `${percent}%` }]} /></View> : null}
    </View> : null}
  </View>;
}
export function HeroPhotoImporting({ camera = false }: { camera?: boolean }) {
  const { t } = useTranslation();
  return <View testID="hero-photo-opening" pointerEvents="none" style={s.overlay} accessibilityState={{ busy: true }}><ActivityIndicator size="small" color="#53594F" /><ThemedText accessibilityLiveRegion="polite" style={s.label}>{t(camera ? 'comicDay.photo.openingCamera' : 'comicDay.photo.openingLibrary')}</ThemedText></View>;
}
const s = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#F7F6F1', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 },
  label: { fontSize: 13, lineHeight: 20, color: '#73746E', textAlign: 'center' },
  track: { width: '75%', maxWidth: 180, height: 3, backgroundColor: '#DDDCD5', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#55594F' },
});
