import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { COMIC_CHECK_MINT } from './ComicCheck';
import { ComicSceneImage } from './ComicSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/comicSceneThumbnails';
import type { ComicSceneId } from '../lib/comicSceneImages';

export const ComicGalleryCard = memo(function ComicGalleryCard({ id, label, width, columns, order, onToggle }: {
  id: ComicSceneId; label: string; width: number; columns: number; order: number; onToggle: (id: ComicSceneId) => void;
}) {
  const source = columns === 1 ? COMIC_SCENE_THUMBNAILS[id].large : COMIC_SCENE_THUMBNAILS[id].small;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: order > 0 }} onPress={() => onToggle(id)} style={{ width }}>
    <View style={[s.photo, order > 0 && s.selected]}>
      <ComicSceneImage imageKey={`${id}:${columns === 1 ? 'large' : 'small'}`} source={source} style={{ width: '100%', aspectRatio: columns === 3 ? 1 : 1.5 }} />
      <View style={[s.check, order > 0 && { backgroundColor: COMIC_CHECK_MINT }]}><ThemedText style={{ color: '#202020', fontSize: 15 }}>{order || ''}</ThemedText></View>
    </View>
    {columns < 3 ? <ThemedText numberOfLines={1} style={s.caption}>{label}</ThemedText> : null}
  </Pressable>;
});
const s = StyleSheet.create({
  photo: { borderWidth: 2, borderColor: 'transparent', padding: 1 }, selected: { borderColor: '#8DDAC2', borderRadius: 3 }, check: { position: 'absolute', top: 6, right: 6, width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: '#202020', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, caption: { fontSize: 14, color: '#202020', paddingTop: 5, paddingHorizontal: 2, lineHeight: 20 },
});
