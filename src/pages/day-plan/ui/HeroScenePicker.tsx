import { SELECTABLE_COMIC_CHARACTERS } from '../lib/heroCharacters';
import { AppModal as Modal } from '@shared/ui/app-modal';
import { TutorialGuideLayer } from '@shared/ui/tutorial-guide-layer';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { ServiceTutorialCoach } from '../../welcome-intro/ui/ServiceTutorialCoach';
import { ComicGalleryCard } from './HeroGalleryCard';
import { ComicSceneSequence } from './HeroSceneSequence';
import { newComicScene, type ComicDayScene } from '../lib/heroDayStorage';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, FlatList, Pressable, StyleSheet, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { COMIC_SCENES, COMIC_SCENE_CATEGORIES, comicSceneMatchesCategory, type ComicSceneCategory, type ComicSceneId } from '../lib/heroSceneImages';

const VIEW_KEY = 'pokit:comic-picker-columns';
const modes = [3, 2, 1] as const;
const modeLabels = ['comicDay.viewSmall', 'comicDay.viewTwo', 'comicDay.viewOne'] as const;
function GridIcon({ columns, ink }: { columns: number; ink: string }) {
  return <Svg width={18} height={18} viewBox="0 0 20 20" accessible={false}>
    {Array.from({ length: columns === 3 ? 9 : columns }, (_, index) => {
      const count = columns === 3 ? 3 : columns;
      const size = (16 - (count - 1) * 2) / count;
      return <Rect key={index} x={2 + index % count * (size + 2)} y={columns === 3 ? 2 + Math.floor(index / count) * (size + 2) : 3} width={size} height={columns === 3 ? size : 14} fill="none" stroke={ink} strokeWidth={1.1} />;
    })}
  </Svg>;
}
export function ComicScenePicker({ scenes, onChange, onClose, library = SELECTABLE_COMIC_CHARACTERS[0].scenes, embedded = false }: { targetDiaryId?: string; embedded?: boolean; library?: readonly typeof COMIC_SCENES[number][]; scenes: ComicDayScene[]; onChange: (scenes: ComicDayScene[]) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!embedded) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => subscription.remove();
  }, [embedded, onClose]);
  const [columns, setColumns] = useState<number>(() => {
    const saved = Number(localStorageClient.getItemRaw(VIEW_KEY));
    return modes.some(mode => mode === saved) ? saved : 3;
  });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ComicSceneCategory>('all');
  const [gridWidth, setGridWidth] = useState(320);
  const latest = useRef({ scenes, onChange, t });
  useLayoutEffect(() => { latest.current = { scenes, onChange, t }; }, [scenes, onChange, t]);
  const toggle = useCallback((id: ComicSceneId) => {
    const { scenes: current, onChange: save, t: translate } = latest.current;
    const existing = current.find(scene => scene.image === id);
    const image = COMIC_SCENES.find(scene => scene.id === id)!;
    const added = { ...newComicScene(translate(image.label)), image: id };
    save(existing ? current.filter(scene => scene.id !== existing.id) : [...current, added]);
    if (!existing) useServiceTutorial.getState().advance('comicPick', 'comicReturn', { sceneKey: added.id });
  }, []);
  const tutorialStep = useServiceTutorial(state => state.active && state.mode === 'comic' ? state.step : null);
  useEffect(() => {
    const tut = useServiceTutorial.getState();
    if (tutorialStep !== 'comicReturn' || tut.sceneKey) return;
    const existing = scenes[0];
    const image = library[0];
    if (!image) return;
    const scene = existing ?? { ...newComicScene(t(image.label)), image: image.id };
    if (!existing) onChange([scene]);
    tut.advance('comicReturn', 'comicReturn', { sceneKey: scene.id });
  }, [tutorialStep, scenes, library, onChange, t]);
  const orders = useMemo(() => {
    const map = new Map<ComicSceneId, number>();
    scenes.forEach((scene, index) => { if (!map.has(scene.image)) map.set(scene.image, index + 1); });
    return map;
  }, [scenes]);
  const categoryCounts = useMemo(() => Object.fromEntries(COMIC_SCENE_CATEGORIES.map(item => [item.id, library.filter(scene => comicSceneMatchesCategory(scene.id, item.id)).length])), [library]);
  const filtered = useMemo(() => library.filter(scene => comicSceneMatchesCategory(scene.id, category) && t(scene.label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [library, category, query, t]);
  const cardWidth = Math.max(1, (gridWidth - (columns - 1) * 8) / columns);
  const content = (
    <View style={[s.root, { paddingTop: embedded ? 0 : insets.top, paddingBottom: embedded ? 0 : insets.bottom }]}>
      <PaperGrain opacity={0.2} />
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); onClose(); }} style={s.touch}><ThemedText style={s.back}>‹</ThemedText></Pressable>
        <ThemedText style={s.title}>{t('comicDay.sequencePickerTitle')}</ThemedText>
        <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); onClose(); }} style={s.touch}><ThemedText style={s.ink}>{t('comicDay.pickerClose')}</ThemedText></Pressable>
      </View>
      <ServiceTutorialCoach scenePicker steps={['comicPick', 'comicReturn']} onEnd={onClose} onSkipStep={() => { if (useServiceTutorial.getState().step === 'comicOpen') onClose(); }} />
      <ServiceTutorialTarget steps={['comicPick']} spotlight={false} style={{ flex: 1 }}>
      <View style={s.controls}>
        <ThemedTextInput accessibilityLabel={t('comicDay.search')} placeholder={t('comicDay.search')} placeholderTextColor="#777" value={query} onChangeText={setQuery} style={s.search} clearButtonMode="while-editing" />
        <ScrollView horizontal style={{ height: 32, flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRow}>
          {COMIC_SCENE_CATEGORIES.map(item => { const selected = category === item.id; return <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={t(item.label)} accessibilityState={{ selected }} onPress={() => { tapHaptic('select'); setCategory(item.id); }} style={[s.categoryChip, selected && s.active]}>{selected ? <HanddrawnFrame color="#171510" /> : null}<ThemedText numberOfLines={1} style={s.ink}>{t(item.label)}</ThemedText><ThemedText style={s.categoryCount}>{categoryCounts[item.id]}</ThemedText></Pressable>; })}
        </ScrollView>
        <View style={s.viewModes}>{modes.map((mode, index) => { const selected = columns === mode; return <Pressable key={mode} accessibilityRole="tab" accessibilityLabel={t(modeLabels[index])} accessibilityState={{ selected }} onPress={() => { tapHaptic('select'); setColumns(mode); localStorageClient.setItemRaw(VIEW_KEY, String(mode)); }} style={[s.viewMode, selected && s.active]}>{selected ? <HanddrawnFrame color="#171510" /> : null}<GridIcon columns={mode} ink="#171510" /></Pressable>; })}</View>
      </View>
      <View style={s.gallery} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
        <FlatList key={columns} data={filtered} extraData={orders} numColumns={columns} initialNumToRender={Math.min(9, columns * 3)} maxToRenderPerBatch={columns * 2} windowSize={5} updateCellsBatchingPeriod={40} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          columnWrapperStyle={columns > 1 ? { gap: 8 } : undefined} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          ListEmptyComponent={<ThemedText style={s.empty}>{t('comicDay.noImages')}</ThemedText>}
          renderItem={({ item, index }) => <ServiceTutorialTarget steps={index === 0 ? ['comicPick'] : []}><ComicGalleryCard id={item.id} label={t(item.label)} width={cardWidth} columns={columns} order={orders.get(item.id) ?? 0} onToggle={toggle} /></ServiceTutorialTarget>} />
      </View>
      </ServiceTutorialTarget>
      <ServiceTutorialTarget steps={['comicReturn']}><ComicSceneSequence scenes={scenes} onChange={onChange} onStart={onClose} /></ServiceTutorialTarget>
    </View>
  );
  // Keep the chooser-to-scene transition in the mounted screen. Native modal
  // presentation can be lost while the name keyboard/chooser is being dismissed.
  return embedded ? <View testID="comic-scene-picker-inline" style={[StyleSheet.absoluteFill, { zIndex: 10 }]} accessibilityViewIsModal>
    <TutorialGuideLayer>{content}</TutorialGuideLayer>
  </View> : <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">{content}</Modal>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' }, header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderColor: '#B6B6B0', paddingHorizontal: 12 },
  touch: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, back: { fontSize: 36, color: '#202020' }, title: { flex: 1, textAlign: 'center', fontSize: 22, color: '#202020' },
  controls: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 }, search: { height: 36, minHeight: 36, paddingVertical: 0, lineHeight: 20, borderWidth: 0.8, borderColor: '#999', borderRadius: 8, paddingHorizontal: 12, color: '#202020', fontSize: 14 },
  viewModes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }, viewMode: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#BBBBB5', borderRadius: 6, overflow: 'hidden' },
  categoryRow: { gap: 6 }, categoryChip: { height: 32, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, borderWidth: 0.5, borderColor: '#BBBBB5', borderRadius: 6, overflow: 'hidden' }, categoryCount: { fontSize: 10, lineHeight: 16, color: '#666' }, active: { borderColor: 'transparent', backgroundColor: 'transparent' }, ink: { color: '#171510', fontSize: 13, lineHeight: 18 },
  gallery: { flex: 1, marginHorizontal: 16 }, empty: { color: '#777', textAlign: 'center', paddingVertical: 45 },
});
