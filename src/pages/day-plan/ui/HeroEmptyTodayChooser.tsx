/* eslint-disable react-hooks/refs -- The animation hook returns handlers alongside an animated ref; render never reads ref.current. */
import { useEffect, useState } from 'react';
import { getLocalDateKey } from '@entities/day-plan';
import { useTodayDate } from '@shared/lib/time/useTodayDate';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { ThemedText } from '@shared/ui/themed-text';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { SELECTABLE_COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';
import { useComicCharacterNames } from '../lib/heroCharacterName';
import { useHeroLoopingRail } from '../model/useHeroLoopingRail';
import { AppModal } from '@shared/ui/app-modal';
import { loadHeroAiLibrary, subscribeHeroAiLibrary, type HeroAiLibraryImage } from '../lib/heroAiLibrary';
import { HeroGeneratedArtworkPicker } from './HeroGeneratedArtworkPicker';
import { ComicSceneImage } from './HeroSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';

const CAMERA = require('../../../../assets/control-illustrations/personal-camera-hands.webp');
type EmptyChoice = ComicCharacter | 'generated' | null;
const PEOPLE: EmptyChoice[] = [null, ...SELECTABLE_COMIC_CHARACTERS];
const COPIES = [0, 1, 2];
const GAP = 14;
const FOOTER = 28;
const previousPreviews = new Map<string, number>();
function randomPreviews() {
  return Object.fromEntries(SELECTABLE_COMIC_CHARACTERS.map(character => {
    const previous = previousPreviews.get(character.id);
    let index = Math.floor(Math.random() * character.scenes.length);
    if (index === previous && character.scenes.length > 1) index = (index + 1) % character.scenes.length;
    previousPreviews.set(character.id, index);
    return [character.id, character.scenes[index]];
  }));
}

/** A card tap chooses directly; three matching copies keep the loop seamless. */
export function HeroEmptyTodayChooser({ ink, isDark, onStart, onPersonalize, onChooseGenerated }: {
  onChooseGenerated?: (image: HeroAiLibraryImage) => void; ink: string; muted: string; isDark: boolean; hasPreviousRecords?: boolean; onStart: (character: ComicCharacter) => void; onPersonalize: () => void;
}) {
  const { t } = useTranslation();
  const todayLabel = getLocalDateKey(useTodayDate()).replace(/-/g, '.');
  const nameFor = useComicCharacterNames();
  const { width } = useWindowDimensions();
  const [generated, setGenerated] = useState<HeroAiLibraryImage[]>([]);
  const [generatedOpen, setGeneratedOpen] = useState(false);
  useEffect(() => {
    let live = true, revision = 0;
    const refresh = async () => {
      const request = ++revision;
      try { const images = await loadHeroAiLibrary(); if (live && request === revision) setGenerated(images); } catch { /* Keep the last successful device library. */ }
    };
    void refresh();
    const unsubscribe = subscribeHeroAiLibrary(() => { void refresh(); });
    const app = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { live = false; unsubscribe(); app.remove(); };
  }, []);
  const people: EmptyChoice[] = generated.length ? [...PEOPLE, 'generated'] : PEOPLE;
  const [grid, setGrid] = useState(false);
  const toggleLayout = () => { tapHaptic('select'); setGrid(current => !current); };
  const [previews] = useState(randomPreviews);
  const [railSize, setRailSize] = useState({ width, height: 0 });
  const [contentReady, setContentReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // Match the hamburger chooser's 3:4 card and available-width sizing.
  const cardHeight = Math.max(140, Math.min(360, (railSize.height || 444) - 124, railSize.width * 0.58 / 0.75));
  const cardWidth = cardHeight * 0.75;
  const pictureHeight = Math.max(0, cardHeight - FOOTER - 14);
  const span = people.length * (cardWidth + GAP);
  const loop = useHeroLoopingRail(span, contentReady && railSize.height > 0 && !grid && !generatedOpen, 'left');
  const paper = isDark ? '#262B28' : '#FFFFFF';
  const choose = (character: EmptyChoice) => {
    if (character === 'generated') { tapHaptic('select'); setGeneratedOpen(true); return; }
    tapHaptic('select');
    setSelected(character?.id ?? 'personal');
    if (character) onStart(character);
    else onPersonalize();
  };
  const gridWidth = Math.max(70, (railSize.width - 32 - 2 * 10) / 3);
  // Preview half of the third row so the remaining characters are discoverable.
  const gridHeight = railSize.height > 0
    ? Math.max(76, (railSize.height - 10 - 2 * 10) / 2.5)
    : gridWidth * 1.5;
  const renderCard = (choice: EmptyChoice, copy = 1, asGrid = false) => {
    const isGenerated = choice === 'generated';
    const character = typeof choice === 'object' ? choice : null;
    const personal = !character && !isGenerated;
    const id = isGenerated ? 'generated-illustrations' : character?.id ?? 'personal';
    const testID = personal ? 'comic-empty-photo-add' : `hero-empty-character-${id}`;
    const scene = character ? previews[character.id] : undefined;
    const source = isGenerated ? { uri: generated[0].uri } : personal ? CAMERA : COMIC_SCENE_THUMBNAILS[scene!.id as keyof typeof COMIC_SCENE_THUMBNAILS] ?? scene!.source;
    const name = isGenerated ? nameFor('generated-illustrations', t('comicDay.gallery.generated')) : personal ? t('comicDay.emptyChoose.personalName') : nameFor(character!.id, t(character!.name));
    const w = asGrid ? gridWidth : cardWidth;
    const h = asGrid ? gridHeight : cardHeight;
    return <Pressable key={`${copy}:${id}`} testID={copy === 1 && grid === asGrid ? testID : `${testID}-${asGrid ? 'grid' : 'rail'}-${copy}`} 
      accessibilityRole="button" accessibilityLabel={personal ? t('comicDay.emptyChoose.personalA11y') : t('comicDay.character.choose', { name })}
      accessibilityState={{ selected: selected === id }} accessibilityElementsHidden={copy !== 1 || grid !== asGrid} importantForAccessibility={copy === 1 && grid === asGrid ? 'auto' : 'no-hide-descendants'}
      onPress={() => choose(choice)} style={[s.card, { width: w, height: h, backgroundColor: paper }]}>
      <PaperGrain opacity={0.85} />
      <ComicSceneImage source={source} backgroundColor={paper} imageKey={personal ? 'empty-today-personal-camera' : `empty-today:${id}:${isGenerated ? generated[0].uri : scene!.id}`}
        contentFit={personal ? 'contain' : 'cover'} fitToCard={!personal} contentPosition={personal ? 'center' : 'top'} showSkeletonOnMount style={{ width: w - 12, height: (asGrid ? h - FOOTER : pictureHeight + 14) - 12 }} />
      {personal ? <View style={[s.personalOverlay, asGrid && s.gridPersonalOverlay, { backgroundColor: isDark ? 'rgba(38,43,40,0.86)' : 'rgba(255,255,255,0.86)' }]}>
        <ThemedText numberOfLines={1} adjustsFontSizeToFit style={[s.eyebrow, asGrid && s.gridSmallText, { color: ink }]}>{t('comicDay.emptyChoose.personalIntro')}</ThemedText>
        <ThemedText numberOfLines={1} style={[s.personalName, asGrid && s.gridName, { color: ink }]}>{name}</ThemedText>
        <ThemedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.subtitle, asGrid && s.gridSmallText, { color: ink }]}>{t('comicDay.emptyChoose.personalDescription')}</ThemedText>
      </View> : <View style={s.labels}><ThemedText numberOfLines={1} style={[s.name, { color: ink }]}>{name}</ThemedText></View>}

    </Pressable>;
  };
  return <View testID="hero-empty-today-chooser" style={s.content}>
    <View style={s.introRow}>
    <View testID="hero-empty-intro" style={s.intro}>
      <View style={s.introCard}>
        <PaperGrain opacity={0.45} />
        <View style={s.introInset}>
          <PaperGrain opacity={0.2} />
          <Text allowFontScaling={false} style={s.introText}>{t('comicDay.emptyChoose.heading')}</Text>
          <Text allowFontScaling={false} style={s.introText}>{t('comicDay.emptyChoose.description')}</Text>
        </View>
        <Text testID="hero-empty-intro-date" allowFontScaling={false} style={s.introDate}>{todayLabel}</Text>
        <View pointerEvents="none" accessible={false} style={s.introTape}>
          <Svg width="100%" height="100%" viewBox="0 0 82 28" preserveAspectRatio="none">
            <Path d="M3 2 78 1 80 6 79 23 76 26 4 27 1 23 2 7Z" fill="#C5BFAF" fillOpacity={0.52} stroke="#A49C88" strokeOpacity={0.18} strokeWidth={0.6} />
            <Path d="M5 3 77 2M4 25 76 24" stroke="#F8F5E9" strokeOpacity={0.45} strokeWidth={0.7} />
          </Svg>
        </View>
      </View>
    </View>
    <Pressable testID="hero-empty-layout-toggle" accessibilityRole="button" accessibilityLabel={t(grid ? 'comicDay.emptyChoose.showCarousel' : 'comicDay.emptyChoose.showGrid')} accessibilityState={{ expanded: grid }}
      onPress={toggleLayout} hitSlop={6} style={s.layoutToggle}>
      <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}>
        <Path d={grid ? 'M5 5h11v14H5zM19 6v12' : 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'} fill="none" stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
      </Svg>
    </Pressable>
    </View>
    <View style={s.gallery} onLayout={({ nativeEvent: { layout } }) => {
      if (layout.width > 0 && layout.height > 0) setRailSize(current => current.width === layout.width && current.height === layout.height ? current : { width: layout.width, height: layout.height });
    }}>
    <ServiceTutorialTarget steps={['comicStart', 'comicCharacter', 'comicReady']} style={s.gallery}>
      {!grid ? (
        <ScrollView ref={loop.ref} testID="hero-empty-character-rail" style={s.gallery} horizontal bounces={false}
          showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
          onScroll={loop.onScroll} onScrollBeginDrag={loop.onScrollBeginDrag} onScrollEndDrag={loop.onScrollEndDrag}
          decelerationRate="fast" onTouchStart={loop.onTouchStart} onTouchEnd={loop.onTouchEnd} onTouchCancel={loop.onTouchEnd}
          onContentSizeChange={() => setContentReady(true)} contentContainerStyle={s.rail}>
          {COPIES.flatMap(copy => people.map(character => renderCard(character, copy)))}
        </ScrollView>
      ) : (
        <ScrollView testID="hero-empty-character-grid" style={s.gallery} contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
          {people.map(character => renderCard(character, 1, true))}
        </ScrollView>
      )}
    </ServiceTutorialTarget>
    </View>
    {generatedOpen ? <AppModal visible animationType="fade" onRequestClose={() => setGeneratedOpen(false)}><HeroGeneratedArtworkPicker images={generated} onChooseScene={id => { const owner = SELECTABLE_COMIC_CHARACTERS.find(item => item.scenes.some(scene => scene.id === id)); if (owner) { setGeneratedOpen(false); onStart({ ...owner, scenes: owner.scenes.filter(scene => scene.id === id) }); } }} ink={ink} paper={isDark ? '#262B28' : '#FFFFFF'} onClose={() => setGeneratedOpen(false)} onChoose={image => { setGeneratedOpen(false); onChooseGenerated?.(image); }} /></AppModal> : null}


  </View>;
}

const s = StyleSheet.create({
  content: { flex: 1, minHeight: 0, paddingBottom: 14 },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', paddingRight: 16 },
  intro: { flex: 1, minWidth: 0, paddingLeft: 24, paddingRight: 8, paddingTop: 18, paddingBottom: 18 },
  introCard: {
    alignSelf: 'flex-start', maxWidth: '100%',
    backgroundColor: '#FAF9F5', borderRadius: 3,
    padding: 12, paddingBottom: 40,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(96,83,60,0.08)',
    shadowColor: '#403624', shadowOffset: { width: -1, height: 4 }, shadowRadius: 4, shadowOpacity: 0.24, elevation: 3,
  },
  introInset: { backgroundColor: '#FFFEFB', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(96,83,60,0.12)', paddingHorizontal: 18, paddingVertical: 17, gap: 18 },
  introTape: { position: 'absolute', top: -3, left: -12, width: 62, height: 19, transform: [{ rotate: '-35deg' }] },
  introDate: { position: 'absolute', bottom: 12, right: 16, fontFamily: 'OwnglyphCorncorn_400Regular', fontSize: 11, lineHeight: 16, color: '#000000' },
  // This card keeps its own typography, independent of app font preferences.
  introText: { fontFamily: 'OwnglyphCorncorn_400Regular', fontWeight: '400', fontSize: 16, lineHeight: 24, color: '#000000' },
  gallery: { flex: 1, minHeight: 0 },
  rail: { height: '100%', paddingHorizontal: 16, paddingVertical: 22, gap: GAP, alignItems: 'center' },
  card: { flexShrink: 0, padding: 6, borderRadius: 0, position: 'relative', shadowColor: '#403624', shadowOffset: { width: 2, height: 9 }, shadowRadius: 14, shadowOpacity: 0.23, elevation: 5 },
  labels: { height: FOOTER, alignItems: 'center', justifyContent: 'center', paddingBottom: 2 },
  name: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  personalName: { fontSize: 24, lineHeight: 32, textAlign: 'center' },
  grid: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', justifyContent: 'flex-start', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  layoutToggle: { flexShrink: 0, marginTop: 18, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gridPersonalOverlay: { bottom: 4, gap: 0 },
  gridSmallText: { fontSize: 11, lineHeight: 14 },
  gridName: { fontSize: 16, lineHeight: 20 },
  personalOverlay: { position: 'absolute', left: 7, right: 7, bottom: 0, alignItems: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 2, borderRadius: 3 },
  eyebrow: { fontSize: 16, lineHeight: 22, textAlign: 'center', width: '100%' },
  subtitle: { fontSize: 16, lineHeight: 22, textAlign: 'center', width: '100%', marginTop: 2 },
});
