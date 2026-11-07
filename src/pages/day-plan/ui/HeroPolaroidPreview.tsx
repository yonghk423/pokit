import { formatHeroPolaroidDate } from './HeroPolaroidExport';
import { HeroPolaroidSurface } from './HeroPolaroidSurface';
import { useEffect, useState } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import type { AppFontId } from '@shared/lib/ui-font';
import { ComicSceneImage } from './HeroSceneImage';

/** White print with a wider caption border, matching the downloadable card. */
export function HeroPolaroidPreview({ source, title, pen, fontId, date }: { source?: ImageSourcePropType; title: string; pen?: string; fontId?: AppFontId; date?: string | number }) {
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const [ratio, setRatio] = useState(2 / 3);
  useEffect(() => {
    let live = true;
    const asset = source ? Image.resolveAssetSource(source) : null;
    if (asset?.width && asset.height) setRatio(asset.width / asset.height);
    else if (asset?.uri) Image.getSize(asset.uri, (w, h) => { if (live && w > 0 && h > 0) setRatio(w / h); }, () => {});
    return () => { live = false; };
  }, [source]);
  // Fit the whole print, including its caption border, inside the available area.
  const designWidth = 360;
  const designHeight = 32 + (designWidth - 36) / ratio + 106;
  const scale = Math.max(0, Math.min((space.width - 32) / designWidth, (space.height - 16) / designHeight));
  return <View testID="detail-polaroid-preview" onLayout={e => {
    const { width, height } = e.nativeEvent.layout;
    setSpace(previous => previous.width === width && previous.height === height ? previous : { width, height });
  }} style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {scale > 0 ? <View style={{ width: designWidth * scale, height: designHeight * scale }}>
      <View style={{ position: 'absolute', width: designWidth, height: designHeight, left: (designWidth * scale - designWidth) / 2, top: (designHeight * scale - designHeight) / 2, transform: [{ scale }], backgroundColor: '#F9F9F6', padding: 18, paddingTop: 32 }}>
        <HeroPolaroidSurface />
        <ComicSceneImage source={source} imageKey="detail-polaroid" preserveFullImage contentFit="contain" backgroundColor="#F9F9F6" style={{ width: designWidth - 36, height: (designWidth - 36) / ratio }} />
        <View style={{ height: 88, paddingTop: 18, paddingHorizontal: 8, paddingBottom: 8, overflow: 'hidden' }}>
          {title.trim() ? <ThemedText fontId={fontId} numberOfLines={2} style={{ flexShrink: 1, fontSize: 22, lineHeight: 30, color: pen ?? '#292D28' }}>{title.trim()}</ThemedText> : null}
          <ThemedText testID="detail-polaroid-date" fontId={fontId} allowFontScaling={false} style={{ marginTop: 'auto', textAlign: 'right', fontSize: 15, lineHeight: 22, color: pen ?? '#565A52' }}>{formatHeroPolaroidDate(date)}</ThemedText>
        </View>
      </View>
    </View> : null}
  </View>;
}
