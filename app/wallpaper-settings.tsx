import Svg, { Path } from 'react-native-svg';
import { LINEN_WALLPAPER, useWallpaperStore } from '@shared/lib/wallpaper/wallpaperStore';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { buildSettingsPalette, settingsChromeStyles as chrome } from '../src/pages/settings/lib/settingsChrome';

export default function WallpaperSettingsRoute() {
  const wallpaper = useWallpaperStore(state => state.wallpaper);
  const setWallpaper = useWallpaperStore(state => state.setWallpaper);
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const p = buildSettingsPalette(useColorScheme() === 'dark');
  return <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: p.bg }}>
    <View style={[chrome.header, { backgroundColor: 'transparent' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('settings.back')} onPress={() => { tapHaptic(); router.back(); }} style={chrome.headerBtn} hitSlop={12}>
        <IconSymbol name="chevron.left" size={20} color={p.title} />
      </Pressable>
      <ThemedText style={[chrome.headerTitle, { color: p.title }]}>{t('settings.wallpaper.title')}</ThemedText>
      <View style={chrome.headerBtn} />
    </View>
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <ThemedText style={{ color: p.desc }}>{t('settings.wallpaper.choose')}</ThemedText>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 16 }}>
        {(['default', 'linen'] as const).map(value => <Pressable key={value} testID={`wallpaper-${value}`} accessibilityRole="radio" accessibilityState={{ checked: wallpaper === value }} accessibilityLabel={t(`settings.wallpaper.${value}`)} onPress={() => { if (wallpaper !== value) { tapHaptic('select'); setWallpaper(value); } }} style={{ flex: 1, gap: 12 }}>
          <View style={{ height: 240, borderRadius: 12, overflow: 'hidden', backgroundColor: p.bg, borderWidth: wallpaper === value ? 2 : 0.5, borderColor: p.title }}>
            {value === 'linen' ? <Image source={LINEN_WALLPAPER} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}
            {wallpaper === value ? <View accessible={false} style={{ position: 'absolute', right: 9, top: 9, width: 28, height: 28, borderRadius: 14, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={20} height={22} viewBox="0 0 24 24" accessible={false}><Path d="M4 12.5 9.2 18 20 5.5" fill="none" stroke={p.title} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </View> : null}
          </View>
          <ThemedText style={{ color: p.title, textAlign: 'center' }}>{t(`settings.wallpaper.${value}`)}</ThemedText>
        </Pressable>)}
      </View>
      <ThemedText style={{ color: p.desc, fontSize: 13 }}>{t('settings.wallpaper.savedHint')}</ThemedText>
    </ScrollView>
  </View>;
}
