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
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: order > 0 }} onPress={() => { tapHaptic('select'); onToggle(id); }} style={{ width }}>
    <View style={[s.photo, order > 0 && s.selected]}>
      <ComicSceneImage imageKey={`${id}:960`} source={source} fallbackSource={COMIC_SCENES.find(scene => scene.id === id)!.source} style={{ width: '100%', aspectRatio: 3 / 4 }} />
      {order > 0 ? <View style={s.check}><ThemedText style={{ color: '#171510', fontSize: 15 }}>{order}</ThemedText></View> : null}
    </View>
    {columns < 3 ? <ThemedText numberOfLines={1} style={s.caption}>{label}</ThemedText> : null}
  </Pressable>;
});
const s = StyleSheet.create({
  photo: { borderWidth: 2, borderColor: 'transparent', padding: 1 }, selected: { borderColor: '#171510', borderRadius: 3 }, check: { position: 'absolute', top: 6, right: 6, width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: '#171510', backgroundColor: '#FFFEF8', alignItems: 'center', justifyContent: 'center' }, caption: { fontSize: 14, color: '#171510', paddingTop: 5, paddingHorizontal: 2, lineHeight: 20 },
});
