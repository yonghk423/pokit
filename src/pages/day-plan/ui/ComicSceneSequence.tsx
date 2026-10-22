import { COMIC_SCENES } from '../lib/comicSceneImages';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { ComicSceneImage } from './ComicSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/comicSceneThumbnails';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, FlatList, StyleSheet, View } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import type { ComicDayScene } from '../lib/comicDayStorage';

const SLOT = 108;
export function moveComicScene(scenes: ComicDayScene[], from: number, to: number) {
  if (from < 0 || from >= scenes.length) return scenes;
  const next = [...scenes];
  const [scene] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, scene);
  return next;
}
export function ComicSceneSequence({ scenes, onChange, onStart }: { scenes: ComicDayScene[]; onChange: (scenes: ComicDayScene[]) => void; onStart?: () => void }) {
  const { t } = useTranslation();
  const [dragId, setDragId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ id: string; moving: boolean } | null>(null);
  const reset = () => { drag.current = null; setDragId(null); setOffset(0); };
  const latest = useRef({ scenes, onChange });
  useEffect(() => { latest.current = { scenes, onChange }; }, [scenes, onChange]);
  // PanResponder stores these callbacks and invokes them only during touch events.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => drag.current !== null,
    onPanResponderGrant: () => { if (drag.current) drag.current.moving = true; },
    onPanResponderMove: (_, gesture) => setOffset(gesture.dx),
    onPanResponderRelease: (_, gesture) => {
      const { scenes: current, onChange: save } = latest.current;
      const index = current.findIndex(scene => scene.id === drag.current?.id);
      if (index >= 0) save(moveComicScene(current, index, index + Math.round(gesture.dx / SLOT)));
      reset();
    },
    onPanResponderTerminate: reset,
    onPanResponderTerminationRequest: () => false,
  }));
  if (!scenes.length) return null;
  return <View style={s.root}>
    <View style={s.heading}>
      <ThemedText numberOfLines={1} style={s.title}>{t('comicDay.sequenceTitle')}</ThemedText>
      <ThemedText style={s.count}>{t('comicDay.sceneCount', { count: scenes.length })}</ThemedText>
      {onStart ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.startDay')} onPress={() => { tapHaptic(); onStart(); }} style={s.start}><HanddrawnFrame color="#52645B" /><ThemedText style={{ color: '#202020', fontSize: 12, lineHeight: 18 }}>{t('comicDay.startDay')} →</ThemedText></Pressable> : null}
    </View>
    {scenes.length > 0 ? <>
    <View {...responder.panHandlers} onTouchEnd={() => { if (!drag.current?.moving) reset(); }}>
      <FlatList horizontal data={scenes} keyExtractor={scene => scene.id} initialNumToRender={4} maxToRenderPerBatch={4} windowSize={3} style={{ flexGrow: 0, height: 88 }} scrollEnabled={!dragId} showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip}
        renderItem={({ item: scene, index }) => <View key={scene.id} style={{ flexDirection: 'row', alignItems: 'center', zIndex: dragId === scene.id ? 2 : 0 }}>
          <View style={[s.card, dragId === scene.id && { transform: [{ translateX: offset }, { scale: 1.03 }], backgroundColor: '#E6F7EE' }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.reorderScene', { label: scene.title })}
              accessibilityActions={[{ name: 'increment', label: t('comicDay.moveLater') }, { name: 'decrement', label: t('comicDay.moveEarlier') }]}
              onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'increment') onChange(moveComicScene(scenes, index, index + 1)); if (event.nativeEvent.actionName === 'decrement') onChange(moveComicScene(scenes, index, index - 1)); }}
              delayLongPress={350} onLongPress={() => { tapHaptic('select'); drag.current = { id: scene.id, moving: false }; setDragId(scene.id); }}>
              <View style={s.number}><ThemedText style={s.ink}>{String(index + 1).padStart(2, '0')}</ThemedText></View>
              <ComicSceneImage imageKey={`${scene.image}:small`} source={COMIC_SCENE_THUMBNAILS[scene.image].small} fallbackSource={COMIC_SCENES.find(item => item.id === scene.image)!.source} style={s.image} />
              <ThemedText numberOfLines={1} style={s.caption}>{scene.title}</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.removeFromSequence', { label: scene.title })} onPress={() => { tapHaptic('warn'); onChange(scenes.filter(item => item.id !== scene.id)); }} hitSlop={5} style={s.remove}><ThemedText style={s.ink}>×</ThemedText></Pressable>
          </View>
          {index < scenes.length - 1 ? <ThemedText style={s.arrow}>↝</ThemedText> : null}
        </View>} />
    </View>
    </> : null}
  </View>;
}
const s = StyleSheet.create({
  root: { height: 134, flexGrow: 0, flexShrink: 0, borderTopWidth: 0.5, borderColor: '#B6B6B0', paddingTop: 4, paddingBottom: 4 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 8, minHeight: 32, marginBottom: 4 },
  start: { minHeight: 32, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C8EBDD' },
  title: { flex: 1, lineHeight: 20, fontSize: 14, color: '#202020' }, count: { lineHeight: 20, fontSize: 11, color: '#777' }, strip: { paddingHorizontal: 16, paddingVertical: 3 },
  card: { width: 88, padding: 3, borderWidth: 0.7, borderColor: '#AAA', borderRadius: 7, backgroundColor: '#FFFFFF' }, number: { position: 'absolute', zIndex: 1, top: 2, left: 2, backgroundColor: '#C8EBDD', paddingHorizontal: 3, borderRadius: 3 },
  ink: { color: '#202020', fontSize: 12, lineHeight: 18 }, image: { width: '100%', height: 52 }, caption: { color: '#202020', fontSize: 10, lineHeight: 16, paddingTop: 2, height: 18 }, remove: { position: 'absolute', right: 0, top: 0, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 20, textAlign: 'center', color: '#202020', fontSize: 22 },
});
