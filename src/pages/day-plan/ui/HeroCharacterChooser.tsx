import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, KeyboardAvoidingView, Platform, Pressable, StyleSheet, useAnimatedValue, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { SettingsPenFrame } from '../../settings/lib/settingsPen';
import { useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { ComicSceneImage } from './HeroSceneImage';

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

function CastingCard({ character, active, side, width, height, ink, paper, reduced, showPreviews, onSelect }: {
  character: ComicCharacter; active: boolean; side: number; width: number; height: number; ink: string; paper: string;
  reduced: boolean; showPreviews: boolean; onSelect: () => void;
}) {
  const { t } = useTranslation();
  const [artIndex, setArtIndex] = useState(0);
  const focus = useAnimatedValue(active ? 1 : 0);
  const press = useAnimatedValue(1);
  const artwork = [
    { id: 'cover', source: character.cover, fallback: character.preview[0].source, label: t(character.name) },
    ...character.preview.map(scene => ({ id: scene.id, source: COMIC_SCENE_THUMBNAILS[scene.id], fallback: scene.source, label: t(scene.label) })),
  ];
  const current = artwork[artIndex] ?? artwork[0];
  useEffect(() => {
    focus.stopAnimation();
    const animation = Animated.timing(focus, { toValue: active ? 1 : 0, duration: reduced ? 0 : 460, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [active, focus, reduced]);
  const pressTo = (value: number) => {
    press.stopAnimation();
    Animated.timing(press, { toValue: value, duration: reduced ? 0 : 130, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  return <><Animated.View pointerEvents="auto" style={[s.castingCard, {
    width, height, marginLeft: -width / 2 - 22, zIndex: active ? 2 : 1, backgroundColor: paper,
    opacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
    transform: [
      { translateX: focus.interpolate({ inputRange: [0, 1], outputRange: [side * width * 0.49, side * width * 0.49] }) },
      { translateY: focus.interpolate({ inputRange: [0, 1], outputRange: [18, 8] }) },
      { rotate: focus.interpolate({ inputRange: [0, 1], outputRange: [`${side * 9}deg`, `${side * 7}deg`] }) },
      { scale: Animated.multiply(press, focus.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] })) },
    ],
  }]}>
    <PaperGrain opacity={0.18} />
    <Pressable testID={`comic-character-cover-${character.id}`} accessibilityRole="button" accessibilityLabel={t('comicDay.character.choose', { name: t(character.name) })} onPress={onSelect} onPressIn={() => pressTo(0.985)} onPressOut={() => pressTo(1)} style={s.mainArtwork}>
      <ComicSceneImage imageKey={`${character.id}:${current.id}:960`} source={current.source} fallbackSource={current.fallback} contentFit="contain" style={s.cover} priority="high" />
    </Pressable>
    <SettingsPenFrame color={ink} />
  </Animated.View>
    {showPreviews ? <View testID={`comic-character-thumbnails-${character.id}`} style={s.thumbnailRail}>
      {artwork.map((image, index) => <Pressable key={image.id} testID={`comic-character-thumbnail-${character.id}-${image.id}`} accessibilityRole="button" accessibilityLabel={image.label} accessibilityState={{ selected: artIndex === index }} onPress={() => { tapHaptic('select'); setArtIndex(index); }} style={[s.thumbnail, { backgroundColor: paper }]}>
        <ComicSceneImage imageKey={`${character.id}:${image.id}:thumb`} source={image.source} fallbackSource={image.fallback} contentFit="contain" style={s.cover} />
        {artIndex === index ? <SettingsPenFrame color={ink} /> : null}
      </Pressable>)}
    </View> : null}
  </>;
}

export function ComicCharacterChooser({ onStart, onClose, ink, muted, isDark, requireExplicitChoice = false }: { requireExplicitChoice?: boolean; onStart: (character: ComicCharacter, name?: string) => void; onClose?: () => void; ink: string; muted: string; isDark: boolean }) {
  const { t } = useTranslation();
  const viewport = useWindowDimensions();
  const reduced = useReducedMotion();
  const [layoutHeight, setLayoutHeight] = useState<number | null>(null);
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null);
  const [selected, setSelected] = useState<ComicCharacter | null>(requireExplicitChoice ? null : COMIC_CHARACTERS[0]);
  // Names belong to this new diary draft, never to the shared character artwork.
  const [names, setNames] = useState<Record<string, string | null>>(() => Object.fromEntries(COMIC_CHARACTERS.map(character => [character.id, null])));
  const [previewCharacter, setPreviewCharacter] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const alive = useRef(true);
  const startedTutorialRun = useRef<string | null | undefined>(undefined);
  const exit = useAnimatedValue(0);
  const caption = useAnimatedValue(1);
  const focused = selected ?? COMIC_CHARACTERS[0];
  const focusedName = names[focused.id] ?? t(focused.name);
  const tutorialStep = useServiceTutorial(state => state.active && state.mode === 'comic' ? state.step : null);
  const cardPaper = isDark ? '#262B28' : '#FFFFFF';
  // The shell already uses space for its header and tabs. Size the artwork from
  // the remaining flex slot, rather than from the full device window.
  const compact = (layoutHeight ?? viewport.height) < 640;
  const tight = (layoutHeight ?? viewport.height) < 430;
  const tightEditing = tight && (editing !== null || requireExplicitChoice);
  const artworkHeight = Math.max(0, Math.min(380, (stageSize?.height ?? 200) - 62, ((stageSize?.width ?? viewport.width - 48) - 64) / 2.15 / 0.75));
  const artworkWidth = artworkHeight * 0.75;
  const canStart = Boolean(selected && (!requireExplicitChoice || names[selected.id]?.trim()));

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; exit.stopAnimation(); };
  }, [exit]);
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
      if (tutorialStep === 'comicName' && !selected) setSelected(chosen);
      if (tutorialStep === 'comicReady' && !names[chosen.id]?.trim()) {
        setSelected(chosen);
        setNames(current => ({ ...current, [chosen.id]: t(chosen.name) }));
      }
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
    setSelected(character);
    setPreviewCharacter(character.id);
    setEditing(null);
    useServiceTutorial.getState().advance('comicCharacter', 'comicName');
  };
  const saveName = () => {
    if (!editing) return;
    const name = draft.trim().slice(0, 24);
    if (!name) return;
    setNames(current => ({ ...current, [editing]: name }));
    setEditing(null);
  };
  const editName = () => { tapHaptic('select'); setDraft(focusedName); setEditing(focused.id); };
  const updateTutorialName = (value: string) => {
    setSelected(focused);
    setNames(current => ({ ...current, [focused.id]: value }));
    const tutorial = useServiceTutorial.getState();
    tutorial.advance('comicCharacter', 'comicName');
    if (value.trim()) tutorial.advance('comicName', 'comicReady');
    else tutorial.advance('comicReady', 'comicName');
  };
  const start = () => {
    if (!selected || !canStart || startingRef.current) return;
    tapHaptic('confirm');
    const tutorial = useServiceTutorial.getState();
    // Preserve the tutorial hand-off: publish comicPick, then its effect starts once.
    if (requireExplicitChoice && tutorial.active && tutorial.mode === 'comic') {
      if (['comicCharacter', 'comicName', 'comicReady'].includes(tutorial.step)) { tutorial.skipStep(); return; }
      if (tutorial.step === 'comicPick' && startedTutorialRun.current === tutorial.runId) return;
    }
    begin(selected, names[selected.id]?.trim() || t(selected.name));
  };

  return <ServiceTutorialTarget steps={requireExplicitChoice ? ['comicCharacter', 'comicName', 'comicReady'] : []} spotlight={false} style={s.root}>
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View testID="comic-character-layout" style={s.layout} onLayout={({ nativeEvent: { layout } }) => { if (layout.height > 0) setLayoutHeight(previous => previous === layout.height ? previous : layout.height); }}>
      <View style={[s.content, compact && s.contentCompact]}>
        <Animated.View pointerEvents={starting ? 'none' : 'auto'} style={[s.body, { opacity: exit.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1, 0] }) }]}>
          {onClose ? <View style={[s.heading, compact && s.headingCompact]}>
            <View style={s.titleRow}>
              {onClose ? <Pressable testID="comic-character-close" accessibilityRole="button" accessibilityLabel={t('common.close')} disabled={starting} accessibilityState={{ disabled: starting }} onPress={() => { if (!startingRef.current) { tapHaptic(); onClose(); } }} style={s.closeButton}>
                <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}><Path d="M5 5.4L19 18.6 M18.6 5L5.4 19" fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></Svg>
              </Pressable> : null}
            </View>
          </View> : null}
          <ServiceTutorialTarget steps={requireExplicitChoice && !selected ? ['comicCharacter'] : []} style={s.spotlight}>
            <Animated.View testID="comic-character-casting" onLayout={({ nativeEvent: { layout } }) => { setStageSize(previous => previous?.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height }); }} style={[s.stage, { transform: [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }, { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }] }]}>
              {artworkHeight >= 100 && !tightEditing ? COMIC_CHARACTERS.map((character, index) => <CastingCard key={character.id} side={index === 0 ? -1 : 1} character={character} active={focused.id === character.id} width={artworkWidth} height={artworkHeight} ink={ink} paper={cardPaper} reduced={reduced}
                showPreviews={previewCharacter === character.id} onSelect={() => choose(character)} />) : null}
            </Animated.View>
          </ServiceTutorialTarget>
          <Animated.View style={[s.caption, { opacity: caption, transform: [{ translateY: caption.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }] }]}>
            {requireExplicitChoice ? <ServiceTutorialTarget steps={selected ? ['comicName'] : []} style={s.nameBox}>
              <ThemedTextInput testID="comic-character-name" accessibilityLabel={t('comicDay.character.nameHint')} placeholder={t('comicDay.character.nameHint')} placeholderTextColor={muted} value={names[focused.id] ?? ''} maxLength={24} autoCorrect={false} returnKeyType="done" onFocus={() => choose(focused)} onChangeText={updateTutorialName} editable={!starting} style={[s.nameInput, { color: ink, borderColor: muted }]} />
            </ServiceTutorialTarget> : editing === focused.id ? <View style={s.nameBox}>
              <ThemedTextInput accessibilityLabel={t('comicDay.character.rename')} value={draft} onChangeText={setDraft} maxLength={24} autoFocus selectTextOnFocus returnKeyType="done" onSubmitEditing={saveName} style={[s.nameInput, { color: ink, borderColor: muted }]} />
              <View style={s.editActions}>
                <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); setEditing(null); }} style={s.editButton}><ThemedText style={{ color: muted }}>{t('common.cancel')}</ThemedText></Pressable>
                <Pressable accessibilityRole="button" disabled={!draft.trim()} accessibilityState={{ disabled: !draft.trim() }} onPress={() => { tapHaptic('confirm'); saveName(); }} style={[s.editButton, { opacity: draft.trim() ? 1 : 0.4 }]}><ThemedText style={{ color: ink }}>{t('common.save')}</ThemedText></Pressable>
              </View>
            </View> : <ThemedText testID="comic-character-selected-name" numberOfLines={1} style={[s.name, { color: ink }]}>{focusedName}</ThemedText>}
            {!tightEditing ? <View style={s.descriptionRow}>
            <ThemedText numberOfLines={1} style={[s.description, { color: muted }]}>{t(focused.description)}</ThemedText>
            <View accessible accessibilityLabel={t('comicDay.sceneCount', { count: focused.scenes.length })} style={s.countIcon}>
              <Svg width={24} height={22} viewBox="0 0 26 22" accessible={false}><Path d="M7 2.5L22.5 3.5L21.4 18.5L6.2 17.4Z M4.2 5L19.7 6L18.6 21L3.4 19.8Z M8.3 7.8L15.7 8.3M8 10.7L14.3 11.1M7.7 13.5L12.4 13.8" fill="none" stroke={muted} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </View>
            </View> : null}
          </Animated.View>
          {!tightEditing ? <View style={[s.characters, compact && s.charactersCompact]}>
            {COMIC_CHARACTERS.map(character => <Pressable key={character.id} testID={`comic-character-select-${character.id}`} accessibilityRole="button" accessibilityLabel={t('comicDay.character.choose', { name: names[character.id] ?? t(character.name) })} accessibilityState={{ selected: selected?.id === character.id, disabled: starting }} disabled={starting} onPress={() => choose(character)} style={s.characterOption}>
              <View style={[s.portrait, { backgroundColor: cardPaper }]}>
                <ComicSceneImage imageKey={`${character.id}:cover:960`} source={character.cover} fallbackSource={character.preview[0].source} contentFit="cover" contentPosition="top" style={s.portraitImage} />
                {selected?.id === character.id ? <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={48} height={48} viewBox="0 0 58 58" accessible={false}><Path d="M29 2C44 1.5 56 13 55.5 29C56 44 44 56 29 55.5C13.5 56 2 44 2.5 29C2 13.5 14 2 29 2Z" fill="none" stroke={ink} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" /></Svg> : null}
              </View>
              <ThemedText numberOfLines={2} style={[s.optionName, { color: ink, textDecorationLine: selected?.id === character.id ? 'underline' : 'none' }]}>{names[character.id] ?? t(character.name)}</ThemedText>
            </Pressable>)}
          </View> : null}
          {!requireExplicitChoice && editing === null ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.character.rename')} disabled={starting} onPress={editName} style={s.renameButton}>
            <ThemedText style={[s.renameLabel, { color: muted }]}>{t('comicDay.character.rename')}</ThemedText>
            <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false}><Path d="M4 16L16.5 3.5L20.5 7.5L8 20L3 21Z M14.5 5.5L18.5 9.5 M4 16L8 20" fill="none" stroke={muted} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable> : null}
          {!compact ? <View style={s.upcoming}><ThemedText style={[s.upcomingLabel, { color: muted }]}>{t('comicDay.character.new')} · {t('comicDay.character.soon')}</ThemedText></View> : null}
        </Animated.View>
      </View>
      <View style={s.footer}>
        <ServiceTutorialTarget steps={requireExplicitChoice && canStart ? ['comicReady'] : []}>
          <Pressable testID="comic-character-start" accessibilityRole="button" disabled={!canStart || starting} accessibilityState={{ disabled: !canStart || starting, busy: starting }} accessibilityLabel={canStart && selected ? t('comicDay.character.startWithName', { name: names[selected.id] ?? t(selected.name) }) : t('comicDay.character.nameHint')} onPress={start} style={({ pressed }) => [s.start, (!canStart || starting) && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.985 }] }]}>
            <SettingsPenFrame color={ink} />
            <ThemedText style={[s.startLabel, { color: ink }]}>{canStart && selected ? t('comicDay.character.startWithName', { name: names[selected.id] ?? t(selected.name) }) : t('comicDay.character.start')}</ThemedText>
            <Svg width={21} height={18} viewBox="0 0 30 24" accessible={false}><Path d="M3 12.4L25.4 11.8 M18.5 5.3L26 11.9L18.7 18.5 M4.1 13.1L24.1 12.8" fill="none" stroke={ink} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        </ServiceTutorialTarget>
      </View>
      </View>
    </KeyboardAvoidingView>
  </ServiceTutorialTarget>;
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 }, layout: { flex: 1, minHeight: 0 }, content: { flex: 1, minHeight: 0, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }, contentCompact: { paddingTop: 6, paddingBottom: 4 }, body: { flex: 1, minHeight: 0, width: '100%', maxWidth: 520, alignSelf: 'center' },
  heading: { marginBottom: 12, flexShrink: 0 }, headingCompact: { marginBottom: 6 }, titleRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }, closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  spotlight: { flex: 1, minHeight: 0, alignSelf: 'stretch' }, stage: { flex: 1, minHeight: 0, width: '100%', alignSelf: 'center', overflow: 'hidden' },
  castingCard: { position: 'absolute', left: '50%', top: 8, padding: 7, borderRadius: 6, shadowColor: '#403624', shadowOffset: { width: 2, height: 7 }, shadowRadius: 11, shadowOpacity: 0.16, elevation: 3 },
  mainArtwork: { flex: 1, borderRadius: 3, overflow: 'hidden' }, cover: { width: '100%', height: '100%' },
  thumbnailRail: { position: 'absolute', right: 0, top: 8, gap: 4, zIndex: 4 }, thumbnail: { width: 40, height: 44, padding: 3, borderRadius: 3, overflow: 'hidden' },
  caption: { alignItems: 'center', gap: 3, flexShrink: 0 }, name: { fontSize: 24, lineHeight: 30, textAlign: 'center' }, descriptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, description: { fontSize: 14, lineHeight: 20, textAlign: 'center', flexShrink: 1 }, countIcon: { justifyContent: 'center' },
  nameBox: { width: '100%', maxWidth: 320 }, nameInput: { textAlign: 'center', fontSize: 22, minHeight: 46, borderBottomWidth: 0.6 }, editActions: { flexDirection: 'row', justifyContent: 'center', gap: 16 }, editButton: { minWidth: 56, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  characters: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 18, marginTop: 12, flexShrink: 0 }, charactersCompact: { marginTop: 6 }, characterOption: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4, gap: 4, maxWidth: 130, minWidth: 88, minHeight: 76 },
  portrait: { padding: 5, width: 48, height: 48, borderRadius: 24 }, portraitImage: { flex: 1, borderRadius: 19 }, optionName: { fontSize: 15, lineHeight: 20, textAlign: 'center' },
  renameButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, marginTop: 0, flexShrink: 0 }, renameLabel: { fontSize: 14 },
  upcoming: { alignSelf: 'center', marginTop: 18 }, upcomingLabel: { fontSize: 12, opacity: 0.7 },
  footer: { flexShrink: 0, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 6 },
  start: { alignSelf: 'center', width: '100%', maxWidth: 340, minHeight: 56, paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, startLabel: { fontSize: 19, lineHeight: 28, flexShrink: 1 },
});
