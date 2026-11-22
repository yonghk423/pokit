import { useTranslation } from '@shared/lib/i18n/hooks/useTranslation';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { Image as ExpoImage } from 'expo-image';
import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import * as fs from 'expo-file-system/legacy';
import { Pressable, View } from 'react-native';
import { CITY_CALENDAR_THEMES } from '../model/heroCalendarDesign';
import { illustrationCalendarBackgroundUri } from '../lib/illustrationCalendarAssets';
import { PAID_CALENDAR_ORIGINALS } from '../lib/paidCalendarOriginals';
import { useTodayDate } from '@shared/lib/time/useTodayDate';
import { ThemedText } from '@shared/ui/themed-text';
import { IllustrationCalendarThumbnailOverlay } from './IllustrationCalendarThumbnailOverlay';
import { CALENDAR_ARTWORK_LAYOUTS } from '../lib/illustrationCalendarLayouts';
export type CityTheme = typeof CITY_CALENDAR_THEMES[number];
type CardProps = { theme: CityTheme; width: number; height: number; dark: boolean; selected: boolean; error: boolean; pro?: boolean; onApply: (theme: CityTheme) => void };
export const IllustrationThemeCard = memo(function IllustrationThemeCard(props: CardProps) {
  return <ThemeCardContent key={props.theme.themeId} {...props} />;
});
function ThemeCardContent({ theme, width, height, dark, selected, error, pro = false, onApply }: CardProps) {
  useTranslation();
  const [previewReady, setPreviewReady] = useState(false);
  const [installedSource, setInstalledSource] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const uri = illustrationCalendarBackgroundUri(theme.themeId);
    // Downloaded packs used their full artwork before store thumbnails were added.
    void fs.getInfoAsync(uri, { md5: true }).then(info => {
      if (active && info.exists && !info.isDirectory && info.size > 0 && info.md5 === CALENDAR_ARTWORK_LAYOUTS[theme.themeId]?.md5) setInstalledSource(uri);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [theme.themeId]);
  const today = useTodayDate();
  const month = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1, 12), [today]);
  const ink = dark ? '#E8E5DF' : '#242321';
  const apply = useCallback(() => onApply(theme), [onApply, theme]);
  // Artwork can leave a large paper tail below the last calendar row. Crop
  // only the store preview; keep the full source dimensions for the image and
  // date overlay so their coordinates remain aligned with the original art.
  const artwork = CALENDAR_ARTWORK_LAYOUTS[theme.themeId];
  const isCityAnimation = /^city-animation-\d+$/.test(theme.design);
  const visibleHeight = artwork && !isCityAnimation && !theme.themeId.startsWith('season-winter-')
    ? Math.min(height, height * (artwork.grid[1] + artwork.grid[3] + 36 / artwork.size[1]))
    : height;
  return <Pressable testID={`illustration-theme-${theme.themeId}`} accessibilityRole="button" accessibilityLabel={translateUiText("{title} 캘린더 적용", { title: theme.title }) + (pro ? ", Pro" : "")} accessibilityState={{ selected }} onPress={apply} style={{ width }}>
    <View style={{ width, height: visibleHeight, borderRadius: 14, shadowColor: '#27231E', shadowOpacity: 0.25, shadowRadius: 9, shadowOffset: { width: 0, height: 7 } }}>
      <View style={{ width, height: visibleHeight, borderRadius: 14, overflow: 'hidden' }}>
        <ExpoImage source={installedSource ? { uri: installedSource } : PAID_CALENDAR_ORIGINALS[theme.themeId] ?? { uri: illustrationCalendarBackgroundUri(theme.themeId) }} contentFit="cover" cachePolicy="memory" transition={0} allowDownscaling={false} onDisplay={() => setPreviewReady(true)} style={{ position: 'absolute', top: 0, left: 0, width, height }} />
        {previewReady ? <IllustrationCalendarThumbnailOverlay themeId={theme.themeId} month={month} width={width} height={height} /> : <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height: visibleHeight, backgroundColor: dark ? '#383633' : '#E6E5E1', padding: 12, gap: 10 }}>
          <View style={{ height: '48%', borderRadius: 8, backgroundColor: dark ? '#484643' : '#D7D5D0' }} />
          <View style={{ width: '46%', height: 8, alignSelf: 'center', borderRadius: 4, backgroundColor: dark ? '#55524E' : '#CFCCC6' }} />
        </View>}
      </View>
    </View>
    <View style={{ padding: 8, minHeight: 68, gap: 2 }}>
      <ThemedText numberOfLines={2} style={{ color: ink, fontSize: 12, lineHeight: 16, textAlign: 'center' }}>{theme.title}</ThemedText>
      <View style={{ minHeight: 16, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {pro ? <ThemedText style={{ color: '#278B77', fontSize: 11, lineHeight: 16 }}>Pro</ThemedText> : null}
        <ThemedText accessible={selected} accessibilityElementsHidden={!selected} importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'} style={{ color: '#278B77', fontSize: 11, lineHeight: 16, opacity: selected ? 1 : 0 }}>{translateUiText("적용 중")}</ThemedText>
      </View>
      {error ? <ThemedText accessibilityLiveRegion="polite" style={{ color: ink, fontSize: 12 }}>{translateUiText("적용하지 못했어요. 사진을 눌러 다시 시도해주세요.")}</ThemedText> : null}
    </View>
  </Pressable>;
}
