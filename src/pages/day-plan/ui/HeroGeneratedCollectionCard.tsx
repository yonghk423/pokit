export { useHeroGeneratedImages } from './useHeroGeneratedImages';
import type { ComicSceneId } from '../lib/heroSceneImages';
import { useState } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { type HeroAiLibraryImage } from '../lib/heroAiLibrary';
import { useComicCharacterNames } from '../lib/heroCharacterName';
import { ComicSceneImage } from './HeroSceneImage';
import { PenFrame } from '@shared/ui/pen-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { HeroGeneratedArtworkPicker } from './HeroGeneratedArtworkPicker';

/** Select a saved illustration for a new blank entry, leaving its original intact. */
export function HeroGeneratedCollectionCard({ width, height, ink, paper, onChoose, onChooseScene, images, compact = false, original = false, ...press }: {
  onChooseScene?: (scene: ComicSceneId) => void; width: number; height: number; ink: string; paper: string; images: HeroAiLibraryImage[]; compact?: boolean; original?: boolean; onChoose?: (image: HeroAiLibraryImage) => void;
} & Pick<PressableProps, 'onPress' | 'onPressIn' | 'onPressOut' | 'onLongPress' | 'delayLongPress'>) {
  const { t } = useTranslation();
  const nameFor = useComicCharacterNames();
  const [open, setOpen] = useState(false);
  if (!images.length) return null;
  return <>
    <Pressable testID={original ? 'hero-original-collection-card' : 'hero-generated-collection-card'} accessibilityRole="button" accessibilityLabel={nameFor(original ? 'original-photos' : 'generated-illustrations', t(original ? 'comicDay.gallery.originalPhotos' : 'comicDay.gallery.generated'))} {...press} onPress={event => { const result: unknown = press.onPress?.(event); if (result !== false) { tapHaptic('select'); setOpen(true); } }} style={{ width, height, padding: compact ? 5 : 7, backgroundColor: paper, shadowColor: '#403624', shadowOffset: { width: 1, height: 5 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 3 }}>
      {compact ? <PaperGrain opacity={0.85} /> : null}
      <ComicSceneImage source={{ uri: images[0].uri }} imageKey={`generated-collection-cover:${images[0].uri}`} fitToCard backgroundColor={paper} style={compact ? { width: width - 10, height: height - 48 } : { width: width - 14, flex: 1 }} />
      <View style={compact ? { height: 38, alignItems: 'center', justifyContent: 'center' } : { paddingTop: 6, alignItems: 'center' }}><ThemedText numberOfLines={1} adjustsFontSizeToFit style={{ color: ink, fontSize: compact ? 14 : 15, lineHeight: 22 }}>{nameFor(original ? 'original-photos' : 'generated-illustrations', t(original ? 'comicDay.gallery.originalPhotos' : 'comicDay.gallery.generated'))}</ThemedText></View>
      {!compact ? <PenFrame color={ink} straight /> : null}
    </Pressable>
    {open ? <AppModal visible animationType="fade" onRequestClose={() => setOpen(false)}><HeroGeneratedArtworkPicker images={images} initialCollectionId={original ? 'original-photos' : 'generated-illustrations'} onChooseScene={scene => { setOpen(false); onChooseScene?.(scene); }} ink={ink} paper={paper} onClose={() => setOpen(false)} onChoose={image => { setOpen(false); onChoose?.(image); }} /></AppModal> : null}
  </>;
}
