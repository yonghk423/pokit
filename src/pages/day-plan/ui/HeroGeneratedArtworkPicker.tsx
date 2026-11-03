import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@shared/ui/themed-text';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import type { HeroAiLibraryImage } from '../lib/heroAiLibrary';
import { ComicSceneImage } from './HeroSceneImage';

/** Writing entry point: selecting an image never opens the gallery or its preview. */
export function HeroGeneratedArtworkPicker({ images, ink, paper, onClose, onChoose }: {
  images: HeroAiLibraryImage[]; ink: string; paper: string;
  onClose: () => void; onChoose: (image: HeroAiLibraryImage) => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const size = (width - 64) / 3;
  return <View testID="hero-generated-writing-picker" style={{ flex: 1, backgroundColor: paper, paddingTop: insets.top, paddingBottom: insets.bottom }}>
    <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}>
      <ThemedText style={{ flex: 1, color: ink, fontSize: 20 }}>{t('comicDay.gallery.chooseForWriting')}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); onClose(); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: ink, fontSize: 28 }}>×</ThemedText></Pressable>
    </View>
    <FlatList data={images} numColumns={3} keyExtractor={item => item.uri} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }} columnWrapperStyle={{ gap: 8 }} renderItem={({ item }) => <Pressable testID={`hero-generated-write-${item.uri}`} accessibilityRole="button" accessibilityLabel={t('comicDay.gallery.chooseForWriting')} onPress={() => { tapHaptic('select'); onChoose(item); }} style={{ width: size, height: size * 1.5, marginBottom: 8, borderWidth: 0.9, borderColor: ink }}>
      <ComicSceneImage source={{ uri: item.uri }} imageKey={item.uri} contentFit="contain" style={{ width: '100%', height: '100%' }} />
    </Pressable>} />
  </View>;
}
