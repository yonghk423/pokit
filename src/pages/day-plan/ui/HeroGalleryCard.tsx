import { HeroPolaroidSurface } from './HeroPolaroidSurface';
import { HeroPrintStaple } from './HeroPrintStaple';
import { memo } from 'react';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { ComicSceneImage } from './HeroSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { COMIC_SCENES, type ComicSceneId } from '../lib/heroSceneImages';

export const ComicGalleryCard = memo(function ComicGalleryCard({ id, label, width, columns, order, onToggle }: {
  id: ComicSceneId; label: string; width: number; columns: number; order: number; onToggle: (id: ComicSceneId) => void;
}) {
  const source = COMIC_SCENE_THUMBNAILS[id];
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: order > 0 }} onPress={() => { tapHaptic('select'); onToggle(id); }} style={{ width, padding: 7, paddingTop: 13, backgroundColor: '#FFFEFA', shadowColor: '#403624', shadowOpacity: 0.16, shadowRadius: 3, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
    <HeroPolaroidSurface /><HeroPrintStaple />
    <View style={[s.photo, order > 0 && s.selected]}>
      <ComicSceneImage preserveFullImage contentFit="contain" showSkeletonOnMount transitionDuration={120} backgroundColor="#FFFFFF" imageKey={`${id}:960`} source={source} fallbackSource={COMIC_SCENES.find(scene => scene.id === id)!.source} style={{ width: '100%', aspectRatio: 3 / 4 }} />
      {order > 0 ? <View style={s.check}><ThemedText style={{ color: '#171510', fontSize: 15 }}>{order}</ThemedText></View> : null}
    </View>
    <View style={{ minHeight: columns === 3 ? 28 : 38, justifyContent: 'center' }}><ThemedText numberOfLines={1} style={[s.caption, { fontSize: columns === 3 ? 11 : 14 }]}>{label}</ThemedText></View>
  </Pressable>;
});
const s = StyleSheet.create({
  photo: { borderWidth: 2, borderColor: 'transparent', padding: 1 }, selected: { borderColor: '#171510', borderRadius: 3 }, check: { position: 'absolute', top: 6, right: 6, width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: '#171510', backgroundColor: '#FFFEF8', alignItems: 'center', justifyContent: 'center' }, caption: { fontSize: 14, color: '#171510', paddingTop: 5, paddingHorizontal: 2, lineHeight: 20 },
});
