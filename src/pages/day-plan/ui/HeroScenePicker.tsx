import { BackChevron } from '@shared/ui/icon-symbol';
import { ComicSceneImage } from './HeroSceneImage';
import { useHeroGeneratedImages } from './useHeroGeneratedImages';
import type { HeroAiLibraryImage } from '../lib/heroAiLibrary';
import { SELECTABLE_COMIC_CHARACTERS } from '../lib/heroCharacters';
import { useComicCharacterNames } from '../lib/heroCharacterName';
import { AppModal as Modal } from '@shared/ui/app-modal';
import { TutorialGuideLayer } from '@shared/ui/tutorial-guide-layer';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { ServiceTutorialCoach } from '../../welcome-intro/ui/ServiceTutorialCoach';
import { ComicGalleryCard } from './HeroGalleryCard';
import { ComicSceneSequence } from './HeroSceneSequence';
import { newComicScene, type ComicDayScene } from '../lib/heroDayStorage';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, FlatList, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { COMIC_SCENES, type ComicSceneId } from '../lib/heroSceneImages';

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
export function ComicScenePicker({ scenes, onChange, onClose, library = SELECTABLE_COMIC_CHARACTERS[0].scenes, embedded = false, onSelectScene, selectedImage, selectionPurpose, onSelectArtwork, initialCollectionId }: { initialCollectionId?: string; onSelectArtwork?: (image: HeroAiLibraryImage) => void; selectionPurpose?: 'add'; onSelectScene?: (image: ComicSceneId) => void; selectedImage?: ComicSceneId; targetDiaryId?: string; embedded?: boolean; library?: readonly typeof COMIC_SCENES[number][]; scenes: ComicDayScene[]; onChange: (scenes: ComicDayScene[]) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const nameFor = useComicCharacterNames();
  const generated = useHeroGeneratedImages();
  const originals = useHeroGeneratedImages(true);
  const chooseSaved = (image: HeroAiLibraryImage) => {
    if (onSelectArtwork) { onSelectArtwork(image); return; }
    onChange([...scenes, { ...newComicScene(''), image: image.sceneId ?? library[0]?.id ?? COMIC_SCENES[0].id, artworkUri: image.uri }]);
    onClose();
  };
  const [chosenCharacterId, setChosenCharacterId] = useState<string | null>(initialCollectionId ?? null);
  const selectedCharacterId = chosenCharacterId ?? SELECTABLE_COMIC_CHARACTERS.find(character => character.scenes.some(scene => scene.id === library[0]?.id))?.id;
  const visibleLibrary = chosenCharacterId ? SELECTABLE_COMIC_CHARACTERS.find(character => character.id === chosenCharacterId)?.scenes ?? library : library;
  const savedImages = selectedCharacterId === 'generated-illustrations' ? generated : selectedCharacterId === 'original-photos' ? originals : null;
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
  const [gridWidth, setGridWidth] = useState(320);
  const latest = useRef({ scenes, onChange, t });
  useLayoutEffect(() => { latest.current = { scenes, onChange, t }; }, [scenes, onChange, t]);
  const toggle = useCallback((id: ComicSceneId) => {
    const { scenes: current, onChange: save, t: translate } = latest.current;
    const existing = current.find(scene => !scene.artworkUri && scene.image === id);
    const image = COMIC_SCENES.find(scene => scene.id === id)!;
    const added = { ...newComicScene(translate(image.label)), image: id };
    save(existing ? current.filter(scene => scene.id !== existing.id) : [...current, added]);
    if (!existing) useServiceTutorial.getState().advance('comicPick', 'comicReturn', { sceneKey: added.id });
  }, []);
  const tutorialStep = useServiceTutorial(state => state.active && state.mode === 'comic' ? state.step : null);
  useEffect(() => {
    const tut = useServiceTutorial.getState();
    if (onSelectScene || tutorialStep !== 'comicReturn' || tut.sceneKey) return;
    const existing = scenes[0];
    const image = library[0];
    if (!image) return;
    const scene = existing ?? { ...newComicScene(t(image.label)), image: image.id };
    if (!existing) onChange([scene]);
    tut.advance('comicReturn', 'comicReturn', { sceneKey: scene.id });
  }, [tutorialStep, scenes, library, onChange, t, onSelectScene]);
  const orders = useMemo(() => {
    const map = new Map<ComicSceneId, number>();
    scenes.forEach((scene, index) => { if (!scene.artworkUri && !map.has(scene.image)) map.set(scene.image, index + 1); });
    return map;
  }, [scenes]);
  const cardWidth = Math.max(1, (gridWidth - (columns - 1) * 8) / columns);
  const content = (
    <View style={[s.root, { paddingTop: embedded ? 0 : insets.top, paddingBottom: embedded ? 0 : insets.bottom }]}>
      <PaperGrain opacity={0.2} />
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); onClose(); }} style={s.touch}><BackChevron color="#202020" /></Pressable>
        <ThemedText style={s.title}>{t(selectionPurpose === 'add' ? 'comicDay.add' : onSelectScene ? 'comicDay.selectScene' : 'comicDay.sequencePickerTitle')}</ThemedText>
        <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); onClose(); }} style={s.touch}><ThemedText style={s.ink}>{t('comicDay.pickerClose')}</ThemedText></Pressable>
      </View>
      {!onSelectScene ? <ServiceTutorialCoach scenePicker steps={['comicPick', 'comicReturn']} onEnd={onClose} onSkipStep={() => { if (useServiceTutorial.getState().step === 'comicOpen') onClose(); }} /> : null}
      <ServiceTutorialTarget steps={['comicPick']} spotlight={false} style={{ flex: 1 }}>
      <View style={s.controls}>
        <ScrollView testID="comic-scene-picker-characters" horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={s.characterRail} contentContainerStyle={s.characterIcons}>
          {SELECTABLE_COMIC_CHARACTERS.map(character => {
            const selected = selectedCharacterId === character.id;
            const label = nameFor(character.id, t(character.name));
            return <Pressable key={character.id} testID={`comic-scene-picker-${character.id}`} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => { tapHaptic('select'); setChosenCharacterId(character.id); }} style={[s.characterChoice, selected && s.selectedCharacter]}>
              <View style={s.characterPortrait}><Image source={character.cover} resizeMode="contain" style={s.characterImage} /></View>
              <ThemedText numberOfLines={1} adjustsFontSizeToFit style={s.characterLabel}>{label}</ThemedText>
            </Pressable>;
          })}
          {([{ id: 'generated-illustrations', images: generated, label: 'comicDay.gallery.generated', testID: 'hero-generated-collection-card' }, { id: 'original-photos', images: originals, label: 'comicDay.gallery.originalPhotos', testID: 'hero-original-collection-card' }] as const).filter(collection => collection.images.length > 0).map(collection => {
            const selected = selectedCharacterId === collection.id;
            const label = nameFor(collection.id, t(collection.label));
            return <Pressable key={collection.id} testID={collection.testID} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => { tapHaptic('select'); setChosenCharacterId(collection.id); }} style={[s.characterChoice, selected && s.selectedCharacter]}>
              <View style={s.characterPortrait}><ComicSceneImage source={{ uri: collection.images[0].uri }} imageKey={`scene-picker-cover:${collection.images[0].uri}`} contentFit="contain" backgroundColor="#F3F0E8" style={s.characterImage} /></View>
              <ThemedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={s.characterLabel}>{label}</ThemedText>
            </Pressable>;
          })}
        </ScrollView>
        <View style={s.viewModes}>{modes.map((mode, index) => { const selected = columns === mode; return <Pressable key={mode} accessibilityRole="tab" accessibilityLabel={t(modeLabels[index])} accessibilityState={{ selected }} onPress={() => { tapHaptic('select'); setColumns(mode); localStorageClient.setItemRaw(VIEW_KEY, String(mode)); }} style={[s.viewMode, selected && s.active]}>{selected ? <HanddrawnFrame color="#171510" /> : null}<GridIcon columns={mode} ink="#171510" /></Pressable>; })}</View>
      </View>
      <View style={s.gallery} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
        {savedImages ? <FlatList key={`${columns}:${selectedCharacterId}`} testID="comic-scene-picker-saved-grid" data={savedImages} numColumns={columns} initialNumToRender={Math.min(9, columns * 3)} maxToRenderPerBatch={columns * 2} windowSize={5} keyExtractor={item => item.uri} showsVerticalScrollIndicator={false} columnWrapperStyle={columns > 1 ? { gap: 8 } : undefined} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          ListEmptyComponent={<ThemedText style={s.empty}>{t('comicDay.noImages')}</ThemedText>}
          renderItem={({ item }) => <Pressable testID={`comic-scene-picker-saved-${item.uri}`} accessibilityRole="button" accessibilityLabel={item.title || t(selectedCharacterId === 'original-photos' ? 'comicDay.gallery.originalPhotos' : 'comicDay.gallery.generated')} onPress={() => { tapHaptic('select'); chooseSaved(item); }} style={{ width: cardWidth, padding: 3 }}>
            <ComicSceneImage source={{ uri: item.uri }} imageKey={`scene-picker-saved:${item.uri}`} contentFit="contain" backgroundColor="#FFFFFF" style={{ width: '100%', aspectRatio: 3 / 4 }} />
            {columns < 3 && item.title ? <ThemedText numberOfLines={1} style={s.savedCaption}>{item.title}</ThemedText> : null}
          </Pressable>} /> :
        <FlatList key={`${columns}:${selectedCharacterId ?? 'custom'}`} data={visibleLibrary} extraData={orders} numColumns={columns} initialNumToRender={Math.min(9, columns * 3)} maxToRenderPerBatch={columns * 2} windowSize={5} updateCellsBatchingPeriod={40} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          columnWrapperStyle={columns > 1 ? { gap: 8 } : undefined} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          ListEmptyComponent={<ThemedText style={s.empty}>{t('comicDay.noImages')}</ThemedText>}
          renderItem={({ item, index }) => <ServiceTutorialTarget steps={index === 0 ? ['comicPick'] : []}><ComicGalleryCard id={item.id} label={t(item.label)} width={cardWidth} columns={columns} order={onSelectScene ? (selectedImage === item.id ? 1 : 0) : orders.get(item.id) ?? 0} onToggle={onSelectScene ?? toggle} /></ServiceTutorialTarget>} />}
      </View>
      </ServiceTutorialTarget>
      {!onSelectScene ? <ServiceTutorialTarget steps={['comicReturn']}><ComicSceneSequence scenes={scenes} onChange={onChange} onStart={onClose} /></ServiceTutorialTarget> : null}
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
  controls: { paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  characterRail: { width: '100%', flexGrow: 0, flexShrink: 0 }, characterIcons: { gap: 8, paddingHorizontal: 2, paddingVertical: 5 },
  characterChoice: { width: 54, alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 6, backgroundColor: '#FFFEFA', borderWidth: 1, borderColor: 'transparent', shadowColor: '#403624', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.30, shadowRadius: 3, elevation: 4 },
  characterPortrait: { width: 44, height: 48, backgroundColor: '#F3F0E8' },
  selectedCharacter: { borderColor: '#9FCAD8', shadowOpacity: 0.34 },
  characterImage: { width: '100%', height: '100%' },
  characterLabel: { fontSize: 10, lineHeight: 14, color: '#252A26', textAlign: 'center' },
  viewModes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }, viewMode: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#BBBBB5', borderRadius: 6, overflow: 'hidden' },
  active: { borderColor: 'transparent', backgroundColor: 'transparent' }, ink: { color: '#171510', fontSize: 13, lineHeight: 18 },
  savedCaption: { fontSize: 14, color: '#171510', paddingTop: 5, paddingHorizontal: 2, lineHeight: 20 },
  gallery: { flex: 1, marginHorizontal: 16 }, empty: { color: '#777', textAlign: 'center', paddingVertical: 45 },
});
