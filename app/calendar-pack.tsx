import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { CALENDAR_ARTWORK_LAYOUTS } from '../src/pages/day-plan/lib/illustrationCalendarLayouts';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IllustrationThemeCard, type CityTheme } from '../src/pages/day-plan/ui/IllustrationThemeCard';
import { calendarPackThemes } from '../src/pages/day-plan/lib/cityCalendarPack';
import { EVERYDAY_CINEMA_GEOMETRY } from '../src/pages/day-plan/lib/everydayCinemaLayouts';
import { loadIllustrationCalendarAssets } from '../src/pages/day-plan/lib/illustrationCalendarAssets';
import { applyHeroCalendarDesign, useHeroCalendarDesign } from '../src/pages/day-plan/model/heroCalendarDesign';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { selectCanTestProStoreItems, useSubscriptionStore } from '@features/subscriptions';
import { isProCalendarPack } from '../src/pages/day-plan/lib/cityCalendarPack';
import { usePremiumPackPaywall } from '../src/pages/day-plan/ui/usePremiumPackPaywall';

export default function CalendarPackPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { pack: value } = useLocalSearchParams<{ pack?: string }>();
  const pack = value === 'season-winter' ? 'season-winter' : value === 'city' ? 'city' : value === 'warm-sepia' ? 'warm-sepia' : value === 'citypop-retro' ? 'citypop-retro' : value === 'textured-watercolor' ? 'textured-watercolor' : 'everyday';
  const themes = calendarPackThemes(pack);
  const title = pack === 'season-winter' ? translateUiText("겨울") : pack === 'city' ? translateUiText("시티 애니메이션") : pack === 'warm-sepia' ? 'Warm Sepia Open Panel' : pack === 'citypop-retro' ? translateUiText("시티팝 레트로") : pack === 'textured-watercolor' ? translateUiText("텍스처 수채화") : 'Everyday Cinema';
  const proPack = (pack === 'season-winter' || FEATURE_FLAGS.proIllustrationPacks) && isProCalendarPack(pack);
  const isPro = useSubscriptionStore(selectCanTestProStoreItems);
  const paywall = usePremiumPackPaywall();
  const selected = useHeroCalendarDesign();
  const dark = useColorScheme() === 'dark';
  const ink = dark ? '#E8E5DF' : '#242321';
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(1, (width - 32) / 2);
  const [artWidth, artHeight] = EVERYDAY_CINEMA_GEOMETRY.size;
  const cardHeight = cardWidth * (pack === 'city' ? 1640 / 959 : artHeight / artWidth);
  const [error, setError] = useState<string | null>(null);
  const apply = useCallback(async (theme: CityTheme) => {
    tapHaptic('select');
    if (proPack && !isPro) {
      const result = await paywall.present();
      if (result !== 'purchased' && result !== 'restored') return;
      if (!selectCanTestProStoreItems(useSubscriptionStore.getState())) return;
    }
    void loadIllustrationCalendarAssets(theme.themeId).then(() => {
      setError(null); applyHeroCalendarDesign(theme.design);
    }).catch(() => setError(theme.themeId));
  }, [isPro, paywall, proPack]);
  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: dark ? '#242321' : '#F7F6F4' }}>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => { tapHaptic('select'); router.back(); }} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <HanddrawnControl name="chevron.left" size={24} color={ink} />
      </Pressable>
      <ThemedText accessibilityRole="header" style={{ flex: 1, color: ink, fontSize: 18, lineHeight: 26, textAlign: 'center' }}>{title}{proPack ? ' · Pro' : ''}</ThemedText>
      <View accessible={false} style={{ width: 44 }} />
    </View>
    <FlatList data={themes as readonly CityTheme[]} numColumns={2} keyExtractor={theme => theme.design}
      contentContainerStyle={{ padding: 12 }} columnWrapperStyle={{ gap: 8 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => <IllustrationThemeCard theme={item} pro={proPack} width={cardWidth} height={pack === 'season-winter' ? cardWidth * CALENDAR_ARTWORK_LAYOUTS[item.themeId].size[1] / CALENDAR_ARTWORK_LAYOUTS[item.themeId].size[0] : cardHeight} dark={dark} selected={selected === item.design} error={error === item.themeId} onApply={apply} />}
    />
    {paywall.modal}
  </SafeAreaView>;
}
