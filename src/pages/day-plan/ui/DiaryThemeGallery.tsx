import { matchesStoreAccess, type StoreAccessFilter } from '../model/storeAccessFilter';
import { BASIC_STORE_THUMBNAILS } from '../lib/basicStoreThumbnails';
import { useTranslation } from '@shared/lib/i18n';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { resetDiaryItem } from '../model/resetDiaryItem';
import { HeroPolaroidSurface, HeroPhotoEmulsion } from './HeroPolaroidSurface';
import { DiaryItemImage } from './DiaryItemImage';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { applyTheme, categoryNames, useDiaryTheme, type ThemeSlot } from '../model/diaryTheme';
import { proDiaryCatalog } from '../model/proDiaryCatalog';
import { classicDiaryCatalog } from '../model/classicDiaryCatalog';

/** Cast the preview's transparent silhouette onto the store paper. */
function StoreItemThumbnail({ source, style }: { source: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: '85%', height: 58, shadowColor: '#49382B', shadowOpacity: 0.24, shadowRadius: 3, shadowOffset: { width: 0, height: 3 } }, style]}>
    <DiaryItemImage source={source} contentFit="contain" style={{ width: '100%', height: '100%' }} />
  </View>;
}

export function DiaryThemeGallery({ category, ink, choose, status, itemWidth, accessFilter = 'all' }: {
  accessFilter?: StoreAccessFilter; itemWidth?: number; category: ThemeSlot; ko: boolean; ink: string;
  choose: (id: string, pro: boolean, apply: () => void) => Promise<void>;
  status: (id: string) => string;
}) {
  const { locale } = useTranslation();
  const active = useDiaryTheme(category);
  const clearSelection = () => resetDiaryItem(category);
  return <>
    {classicDiaryCatalog.filter(item => item.category === category && matchesStoreAccess(accessFilter, false)).map(item => {
      const selected = active?.id === item.id;
      const title = locale === 'en' ? item.titleEn : item.title;
      return <Pressable key={item.id} testID={'diary-item-' + item.id} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ selected }} onPress={() => selected ? clearSelection() : void choose(item.id, false, () => applyTheme(item, category))} style={{ width: itemWidth ?? '33.33%', alignItems: 'center', padding: 6, marginBottom: 16 }}>
        {item.id === 'classic-frame' ? <View style={{ width: '85%', height: 58, alignItems: 'center' }}>
          <View testID="classic-frame-preview" style={{ width: 44, height: 53, paddingHorizontal: 3, paddingTop: 3, paddingBottom: 12, shadowColor: '#302C24', shadowOpacity: 0.16, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }}>
            <HeroPolaroidSurface storeThumbnail />
            <View style={{ flex: 1, backgroundColor: '#DADBD6' }}><HeroPhotoEmulsion /></View>
          </View>
        </View> : <StoreItemThumbnail source={BASIC_STORE_THUMBNAILS[item.id] ?? item.preview} />}
        <ThemedText style={{ color: ink, textAlign: 'center', fontSize: 13 }}>{title}</ThemedText>
        <ThemedText style={{ color: selected ? '#278B77' : ink, fontSize: 12 }}>{selected ? (translateUiText("적용 중")) : (translateUiText("무료"))}</ThemedText>
      </Pressable>;
    })}
    {proDiaryCatalog.filter(item => item.category === category && matchesStoreAccess(accessFilter, true)).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).map(item => {
      const selected = active?.id === item.id;
      const title = locale === 'en' ? item.titleEn : item.title;
      return <Pressable key={item.id} testID={'diary-item-' + item.id} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ selected }} onPress={() => selected ? clearSelection() : void choose(item.id, true, () => applyTheme(item, category))} style={{ width: itemWidth ?? '33.33%', alignItems: 'center', padding: 6, marginBottom: 16 }}>
        {item.category === 'trash' ? <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          {[item.preview, item.filledPreview].map((source, index) => <StoreItemThumbnail key={index} source={source} style={{ flex: 1, maxWidth: 44 }} />)}
        </View> : <StoreItemThumbnail source={item.preview} />}
        <ThemedText style={{ color: ink, textAlign: 'center', fontSize: 13 }}>{title}{item.id.startsWith('decor-') ? ' ' + (locale === 'en' ? category === 'camera' ? 'Camera' : category === 'trash' ? 'Bin' : categoryNames[category][1] : translateUiText(categoryNames[category][0])) : ''}</ThemedText>
        <ThemedText style={{ color: selected ? '#278B77' : ink, fontSize: 12 }}>{selected ? (translateUiText("적용 중")) : status(item.id)}</ThemedText>
      </Pressable>;
    })}
  </>;
}
