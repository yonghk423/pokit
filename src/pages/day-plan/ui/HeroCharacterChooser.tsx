import type { HeroAiResult } from '../lib/heroAiClient';
import { HeroPhotoInvitation } from './HeroPersonalizationFlow';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TouchableWithoutFeedback, useAnimatedValue, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { penContour } from '@shared/ui/pen-frame';
import { SettingsPenFrame } from '../../settings/lib/settingsPen';
import { useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { ServiceTutorialCoach } from '../../welcome-intro/ui/ServiceTutorialCoach';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { SELECTABLE_COMIC_CHARACTERS as COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { ComicSceneImage } from './HeroSceneImage';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Pick once per new chooser, avoiding the previous opening's scene.
const previousOpeningArt = new Map<string, number>();
function openingArtwork() {
  return Object.fromEntries(COMIC_CHARACTERS.map(character => {
    const count = character.scenes.length;
    const previous = previousOpeningArt.get(character.id);
    let index = 1 + Math.floor(Math.random() * count);
    if (count > 1 && index === previous) index = index % count + 1;
    previousOpeningArt.set(character.id, index);
    return [character.id, index];
  }));
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled()).then(value => { if (live) setReduced(Boolean(value)); }, () => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { live = false; subscription.remove(); };
  }, []);
  return reduced;
}

function CastingCard({ character, chosen, width, height, ink, paper, reduced, artIndex, onSelect }: {
  character: ComicCharacter; chosen: boolean; width: number; height: number; ink: string; paper: string;
  reduced: boolean; artIndex: number; onSelect: () => void;
}) {
  const { t } = useTranslation();
  const press = useAnimatedValue(1);
  const scene = character.scenes[artIndex - 1];
  const current = scene
    ? { id: scene.id, source: COMIC_SCENE_THUMBNAILS[scene.id], fallback: scene.source }
    : { id: 'cover', source: character.cover, fallback: character.preview[0].source };
  const pressTo = (value: number) => {
    press.stopAnimation();
    Animated.timing(press, { toValue: value, duration: reduced ? 0 : 130, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  return <Animated.View pointerEvents="auto" style={[s.castingCard, {
    width, height, backgroundColor: paper, transform: [{ scale: press }],
  }]}>
    <PaperGrain opacity={0.18} />
    <Pressable testID={`comic-character-cover-${character.id}`} accessibilityRole="button" accessibilityState={{ selected: chosen }} accessibilityLabel={t('comicDay.character.choose', { name: t(character.name) })} onPress={onSelect} onPressIn={() => pressTo(0.985)} onPressOut={() => pressTo(1)} style={s.mainArtwork}>
      <ComicSceneImage showSkeletonOnMount transitionDuration={180} imageKey={`${character.id}:${current.id}:960`} source={current.source} fallbackSource={current.fallback} contentFit="contain" style={s.cover} priority="high" />
    </Pressable>
    <ThemedText style={[s.personalLabel, { color: ink, paddingTop: 6 }]}>{t(character.name)}</ThemedText>
    <SettingsPenFrame color={ink} />
  </Animated.View>;
}


function CharacterThumbnailRail({ character, artIndex, onChange, showPreviews, reduced, ink }: {
  character: ComicCharacter; artIndex: number; onChange: (index: number) => void;
  showPreviews: boolean; reduced: boolean; ink: string;
}) {
  const { t } = useTranslation();
  const previews = useAnimatedValue(0);
  const artwork = useMemo(() => [
    { id: 'cover', source: character.cover, fallback: character.preview[0].source, label: t(character.name) },
    ...character.scenes.map(scene => ({ id: scene.id, source: COMIC_SCENE_THUMBNAILS[scene.id], fallback: scene.source, label: t(scene.label) })),
  ], [character, t]);
  useEffect(() => {
    previews.stopAnimation();
    const animation = Animated.timing(previews, {
      toValue: showPreviews ? 1 : 0, duration: reduced ? 0 : showPreviews ? 420 : 240,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [showPreviews, reduced, previews]);
  return (
    <Animated.View testID={`comic-character-thumbnails-${character.id}`} pointerEvents={showPreviews ? 'auto' : 'none'} accessibilityElementsHidden={!showPreviews} importantForAccessibility={showPreviews ? 'auto' : 'no-hide-descendants'} style={[s.thumbnailRail, { opacity: previews, transform: [{ translateY: previews.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: previews.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
      <FlatList testID={`comic-character-thumbnail-list-${character.id}`} horizontal data={artwork} keyExtractor={image => image.id} style={{ height: 62 }} contentContainerStyle={s.thumbnailContent} showsHorizontalScrollIndicator={false} nestedScrollEnabled initialNumToRender={4} maxToRenderPerBatch={4} windowSize={3} renderItem={({ item: image, index }) => <Pressable testID={`comic-character-thumbnail-${character.id}-${image.id}`} accessibilityRole="button" accessibilityLabel={image.label} accessibilityState={{ selected: artIndex === index }} onPress={() => { tapHaptic('select'); onChange(index); }} style={s.thumbnail}>
        <ComicSceneImage showSkeletonOnMount transitionDuration={180} backgroundColor="transparent" imageKey={`${character.id}:${image.id}:thumb`} source={image.source} fallbackSource={image.fallback} contentFit="contain" style={s.cover} />
        {artIndex === index ? <SettingsPenFrame color={ink} /> : null}
      </Pressable>} />
    </Animated.View>
  );
}

export function ComicCharacterChooser({ onStart, onClose, ink, muted, isDark, requireExplicitChoice = false, lockedCharacterName, onPersonalize }: { onPersonalize?: () => void; lockedCharacterName?: string; targetDiaryId?: string; onGenerated?: (images: HeroAiResult[], name: string, reuse?: boolean) => void; requireExplicitChoice?: boolean; onStart: (character: ComicCharacter, name?: string) => void; onClose?: () => void; ink: string; muted: string; isDark: boolean }) {
  const { t } = useTranslation();
  const viewport = useWindowDimensions();
  const reduced = useReducedMotion();
  const layoutRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [artIndices, setArtIndices] = useState<Record<string, number>>(openingArtwork);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const [layoutHeight, setLayoutHeight] = useState<number | null>(null);
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null);
  const [selected, setSelected] = useState<ComicCharacter | null>(requireExplicitChoice ? null : COMIC_CHARACTERS[0]);
  const names = useMemo(() => Object.fromEntries(COMIC_CHARACTERS.map(character => [character.id, lockedCharacterName ?? t(character.name)])), [lockedCharacterName, t]);
  const [previewCharacter, setPreviewCharacter] = useState<string | null>(null);
  const [personalChosen, setPersonalChosen] = useState(false);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const alive = useRef(true);
  const startedTutorialRun = useRef<string | null | undefined>(undefined);
  const entrance = useAnimatedValue(0);
  const revealed = useRef(false);
  const exit = useAnimatedValue(0);
  const caption = useAnimatedValue(1);
  const focused = selected ?? COMIC_CHARACTERS[0];
  const tutorialStep = useServiceTutorial(state => state.active && state.mode === 'comic' ? state.step : null);
  const cardPaper = isDark ? '#262B28' : '#FFFFFF';
  // The shell already uses space for its header and tabs. Size the artwork from
  // the remaining flex slot, rather than from the full device window.
  const compact = (layoutHeight ?? viewport.height) < 640;
  const artworkHeight = Math.max(140, Math.min(360, (stageSize?.height ?? 320) - 124, (stageSize?.width ?? viewport.width - 48) * 0.58 / 0.75));
  const artworkWidth = artworkHeight * 0.75;
  const canStart = Boolean(selected);
  const checkTint = useAnimatedValue(0);
  useEffect(() => {
    const animation = Animated.timing(checkTint, { toValue: canStart ? 1 : 0, duration: reduced ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [canStart, checkTint, reduced]);
  const checkInk = checkTint.interpolate({ inputRange: [0, 1], outputRange: [ink, '#69BFAE'] });

  // Wait for the flex slot and its compact layout to settle before revealing it.
  // Only opacity is animated; card dimensions never animate from the placeholder size.
  useEffect(() => {
    if (revealed.current || !layoutHeight || !stageSize?.width || !stageSize.height) return;
    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        revealed.current = true;
        Animated.timing(entrance, { toValue: 1, duration: reduced ? 0 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      });
    });
    return () => { cancelAnimationFrame(firstFrame); if (secondFrame !== undefined) cancelAnimationFrame(secondFrame); };
  }, [entrance, layoutHeight, stageSize, reduced]);

  useEffect(() => {
    const shown = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hidden = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; exit.stopAnimation(); entrance.stopAnimation(); };
  }, [exit, entrance]);
  useEffect(() => {
    if (!onClose) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!startingRef.current) onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);
  const begin = useCallback((character: ComicCharacter, name: string) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    const finish = () => { if (alive.current) onStart(character, name); };
    if (reduced) { finish(); return; }
    Animated.timing(exit, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) finish(); });
  }, [exit, onStart, reduced]);
  useEffect(() => {
    if (!requireExplicitChoice) return;
    const frame = requestAnimationFrame(() => {
      const chosen = selected ?? COMIC_CHARACTERS[0];
      if (tutorialStep === 'comicName' && useServiceTutorial.getState().step === 'comicName') { setSelected(chosen); useServiceTutorial.getState().advance('comicName', 'comicReady'); }
      const tutorial = useServiceTutorial.getState();
      if (tutorialStep === 'comicPick' && tutorial.active && tutorial.mode === 'comic' && startedTutorialRun.current !== tutorial.runId) {
        // Claim the run before the transition; both Start and Later enter here.
        startedTutorialRun.current = tutorial.runId;
        begin(chosen, names[chosen.id]?.trim() || t(chosen.name));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [tutorialStep, requireExplicitChoice, selected, names, begin, t]);
  useEffect(() => {
    caption.stopAnimation();
    caption.setValue(reduced ? 1 : 0);
    const animation = Animated.timing(caption, { toValue: 1, duration: reduced ? 0 : 340, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [focused.id, caption, reduced]);
  const choose = (character: ComicCharacter) => {
    if (startingRef.current) return;
    if (selected?.id !== character.id) tapHaptic('select');
    setPersonalChosen(false);
    setSelected(character);
    setPreviewCharacter(character.id);
    const tutorial = useServiceTutorial.getState();
    tutorial.advance('comicCharacter', 'comicName');
    tutorial.advance('comicName', 'comicReady');
  };
  const start = () => {
    if (!selected || !canStart || startingRef.current) return;
    tapHaptic('confirm');
    if (personalChosen) { Keyboard.dismiss(); onPersonalize?.(); return; }
    const tutorial = useServiceTutorial.getState();
    // Preserve the tutorial hand-off: publish comicPick, then its effect starts once.
    if (requireExplicitChoice && tutorial.active && tutorial.mode === 'comic') {
      if (['comicCharacter', 'comicName', 'comicReady'].includes(tutorial.step)) { tutorial.skipStep(); return; }
      if (tutorial.step === 'comicPick' && startedTutorialRun.current === tutorial.runId) return;
    }
    begin(selected, names[selected.id]?.trim() || t(selected.name));
  };


  return <ServiceTutorialTarget steps={requireExplicitChoice ? ['comicCharacter', 'comicName', 'comicReady'] : []} spotlight={false} style={s.root}>
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
    <KeyboardAvoidingView style={s.root} keyboardVerticalOffset={keyboardOffset} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View ref={layoutRef} testID="comic-character-layout" style={[s.layout, { opacity: entrance }]} onLayout={({ nativeEvent: { layout } }) => { layoutRef.current?.measureInWindow((_x, y) => setKeyboardOffset(previous => previous === y ? previous : y)); if (layout.height > 0) setLayoutHeight(previous => previous === layout.height ? previous : layout.height); }}>
      <View testID="comic-character-scroll-viewport" style={s.scrollViewport}>
      <Animated.ScrollView ref={scrollRef} testID="comic-character-content" scrollEnabled={keyboardVisible} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false} style={[s.content, compact && s.contentCompact]} contentContainerStyle={[s.scrollContent, keyboardVisible && s.keyboardContent]} onContentSizeChange={() => { if (keyboardVisible) scrollRef.current?.scrollToEnd({ animated: true }); }}>
        <Animated.View pointerEvents={starting ? 'none' : 'auto'} style={[s.body, { opacity: exit.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1, 0] }) }]}>
          {onClose ? <View style={[s.heading, compact && s.headingCompact]}>
            <View style={s.titleRow}>
              {onClose ? <Pressable testID="comic-character-close" accessibilityRole="button" accessibilityLabel={t('common.close')} disabled={starting} accessibilityState={{ disabled: starting }} onPress={() => { if (!startingRef.current) { tapHaptic(); onClose(); } }} style={s.closeButton}>
                <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}><Path d="M5 5.4L19 18.6 M18.6 5L5.4 19" fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></Svg>
              </Pressable> : null}
            </View>
          </View> : null}
          <ServiceTutorialTarget steps={requireExplicitChoice && !selected ? ['comicCharacter'] : []} style={[s.spotlight, keyboardVisible && s.keyboardStage]}>
            <Animated.View testID="comic-character-casting" onLayout={({ nativeEvent: { layout } }) => { setStageSize(previous => previous?.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height }); }} style={[s.stage, { transform: [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }, { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }] }]}>
              <ScrollView horizontal testID="comic-character-horizontal-list" showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalCards} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              <View style={{ width: artworkWidth, height: artworkHeight }}>
              <Pressable testID="comic-character-coming-soon" onPress={() => tapHaptic('select')} accessible accessibilityRole="button" accessibilityLabel={`${t('comicDay.character.new')}, ${t('comicDay.character.soon')}`} accessibilityState={{ disabled: true }} style={[s.personalCard, { width: artworkWidth, height: artworkHeight, backgroundColor: cardPaper, zIndex: 0 }]}>
                <PaperGrain opacity={0.18} />
                <ComicSceneImage showSkeletonOnMount transitionDuration={180} imageKey="upcoming:coffee-walk" source={require('../../../../assets/control-illustrations/coming-soon-coffee-walk.png')} contentFit="contain" style={s.upcomingImage} />
                <View style={s.upcomingCaption}>
                  <ThemedText style={[s.personalLabel, { color: muted }]}>{t('comicDay.character.new')}</ThemedText>
                  <ThemedText style={[s.upcomingLabel, { color: muted }]}>{t('comicDay.character.soon')}</ThemedText>
                </View>
                <SettingsPenFrame color={muted} />
              </Pressable>
              </View>
              {COMIC_CHARACTERS.map(character => <View key={character.id} testID={`comic-character-column-${character.id}`} style={{ width: artworkWidth, height: artworkHeight }}>
                <CastingCard character={character} chosen={!personalChosen && selected?.id === character.id} width={artworkWidth} height={artworkHeight} ink={ink} paper={cardPaper} reduced={reduced}
                  artIndex={artIndices[character.id] ?? 0} onSelect={() => choose(character)} />
              </View>)}
              <View style={{ width: artworkWidth, height: artworkHeight }}>
              <AnimatedPressable testID="hero-personal-card" accessibilityRole="button" accessibilityLabel={t('comicDay.personal.title')} onPress={() => { Keyboard.dismiss(); tapHaptic('select'); setPersonalChosen(true); setPreviewCharacter(null); }} accessibilityState={{ selected: personalChosen }} style={[s.personalCard, { width: artworkWidth, height: artworkHeight, backgroundColor: cardPaper, zIndex: personalChosen ? 3 : 1, elevation: personalChosen ? 4 : 2 }]}>
                <PaperGrain opacity={0.18} /><HeroPhotoInvitation ink={ink} size={Math.min(155, artworkWidth * 0.88)} />
                <ThemedText style={[s.personalLabel, { color: ink }]}>{t('comicDay.personal.title')}</ThemedText>
                <SettingsPenFrame color={ink} />
              </AnimatedPressable>
              </View>
              </ScrollView>
              <View testID="comic-character-thumbnail-lane" style={s.thumbnailLane}>
                {COMIC_CHARACTERS.filter(character => previewCharacter === character.id && !personalChosen).map(character => <CharacterThumbnailRail key={character.id} character={character} artIndex={artIndices[character.id] ?? 0} onChange={index => setArtIndices(current => ({ ...current, [character.id]: index }))} showPreviews reduced={reduced} ink={ink} />)}
              </View>
            </Animated.View>
          </ServiceTutorialTarget>
          {requireExplicitChoice ? <ServiceTutorialCoach inline characterChoosing steps={['comicStart', 'comicCharacter', 'comicName', 'comicReady']} /> : null}

        </Animated.View>
      </Animated.ScrollView>

      </View>
      <View style={s.footer}>
        <ServiceTutorialTarget steps={requireExplicitChoice && canStart ? ['comicReady'] : []}>
          <Pressable testID="comic-character-start" accessibilityRole="button" disabled={!canStart || starting} accessibilityState={{ disabled: !canStart || starting, busy: starting }} accessibilityLabel={t('comicDay.character.start')} onPress={start} style={({ pressed }) => [s.start, (!canStart || starting) && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.985 }] }]}>
            <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 180 44" preserveAspectRatio="none" style={StyleSheet.absoluteFill} accessible={false}>
              <Path d="M23 2.2q67-.8 134 0c28-.2 28 39.5 0 39.6q-67 .8-134-.1C-4 41.7-4 2.2 23 2.2Z" fill="none" stroke={ink} strokeWidth={1.05} strokeLinecap="round" />
              <Path d="M8 35q6 7 17 7l132-.1q10-.2 15-6" fill="none" stroke={ink} strokeWidth={0.7} strokeLinecap="round" />
            </Svg>
            <Svg width={34} height={34} viewBox="0 0 36 36" accessible={false}>
              <AnimatedPath testID="comic-character-confirm-check" d={penContour([[6, 18], [14, 26], [30, 8]], 2.25, 0.8)} fill={checkInk} />
              <AnimatedPath d="M6.5 19 14 26.5 29.2 9" fill="none" stroke={checkInk} strokeWidth={0.45} strokeLinecap="round" opacity={0.5} />
            </Svg>
          </Pressable>
        </ServiceTutorialTarget>
      </View>
      </Animated.View>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  </ServiceTutorialTarget>;
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 }, layout: { flex: 1, minHeight: 0 }, content: { flex: 1, minHeight: 0, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }, contentCompact: { paddingTop: 6, paddingBottom: 4 }, body: { flex: 1, minHeight: 0, width: '100%', alignSelf: 'center' },
  heading: { marginBottom: 12, flexShrink: 0 }, headingCompact: { marginBottom: 6 }, titleRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }, closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollViewport: { flex: 1, minHeight: 0, overflow: 'hidden' },
  scrollContent: { flexGrow: 1 }, keyboardContent: { minHeight: 640 }, keyboardStage: { minHeight: 180 },
  spotlight: { flex: 1, minHeight: 0, alignSelf: 'stretch' }, stage: { flex: 1, minHeight: 0, marginHorizontal: -24, alignSelf: 'stretch', overflow: 'hidden' },
  horizontalCards: { gap: 14, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 22 },
  personalCard: { padding: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 1, shadowColor: '#403624', shadowOffset: { width: 2, height: 7 }, shadowRadius: 11, shadowOpacity: 0.12, elevation: 2 }, personalLabel: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  castingCard: { padding: 7, borderRadius: 6, shadowColor: '#403624', shadowOffset: { width: 2, height: 7 }, shadowRadius: 11, shadowOpacity: 0.16, elevation: 3 },
  mainArtwork: { flex: 1, borderRadius: 3, overflow: 'hidden' }, cover: { width: '100%', height: '100%' },
  thumbnailLane: { height: 72, width: '100%' }, thumbnailRail: { width: '100%', height: 62, marginTop: 10 }, thumbnailContent: { gap: 6, paddingBottom: 4, paddingHorizontal: 8 }, thumbnail: { width: 43, height: 56, padding: 0, overflow: 'hidden' },
  caption: { alignItems: 'center', gap: 3, flexShrink: 0 }, name: { fontSize: 24, lineHeight: 30, textAlign: 'center' },
  nameBox: { width: '100%', maxWidth: 320 }, nameInput: { textAlign: 'center', fontSize: 22, minHeight: 46, borderBottomWidth: 0.6 }, editActions: { flexDirection: 'row', justifyContent: 'center', gap: 16 }, editButton: { minWidth: 56, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  renameButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, marginTop: 0, flexShrink: 0 }, renameLabel: { fontSize: 14 },
  upcomingCaption: { alignItems: 'center', gap: 2 },
  upcomingImage: { width: '100%', flex: 1, minHeight: 0, opacity: 0.7 },
  upcomingLabel: { fontSize: 12, opacity: 0.7 },
  footer: { flexShrink: 0, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 6 },
  start: { alignSelf: 'center', width: 180, height: 44, alignItems: 'center', justifyContent: 'center' },

});
