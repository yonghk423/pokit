import { useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { ComicSceneImage } from './HeroSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import Svg, { Path } from 'react-native-svg';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { PaperGrain } from '@shared/ui/paper-grain';
import { COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';
import { SettingsPenFrame } from '../../settings/lib/settingsPen';

function CharacterArtworkGallery({ character, ink, muted, onSelect }: { character: ComicCharacter; ink: string; muted: string; onSelect: () => void }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const artwork = [
    { id: 'cover', source: character.cover, fallback: character.preview[0].source, label: t(character.name) },
    ...character.preview.map(scene => ({ id: scene.id, source: COMIC_SCENE_THUMBNAILS[scene.id], fallback: scene.source, label: t(scene.label) })),
  ];
  const current = artwork[active] ?? artwork[0];
  return <View style={s.gallery}>
    <Pressable testID={`comic-character-cover-${character.id}`} accessibilityRole="button" accessibilityLabel={current.label} onPress={() => { tapHaptic('select'); onSelect(); }} style={s.mainArtwork}>
      <ComicSceneImage imageKey={`${character.id}:${current.id}:960`} source={current.source} fallbackSource={current.fallback} contentFit="contain" style={s.cover} priority="high" />
    </Pressable>
    <View style={s.thumbnailRail}>
      <ScrollView testID={`comic-character-thumbnails-${character.id}`} nestedScrollEnabled showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbnails}>
        {artwork.map((image, index) => <Pressable key={image.id} testID={`comic-character-thumbnail-${character.id}-${image.id}`} accessibilityRole="button" accessibilityLabel={image.label} accessibilityState={{ selected: index === active }} onPress={() => { tapHaptic('select'); setActive(index); onSelect(); }} style={s.thumbnail}>
          <ComicSceneImage imageKey={`${character.id}:${image.id}:960`} source={image.source} fallbackSource={image.fallback} contentFit="contain" style={s.preview} />
          {active === index ? <SettingsPenFrame color={ink} /> : null}
        </Pressable>)}
      </ScrollView>
      <View pointerEvents="none" style={s.scrollHint}>
        <Svg width={14} height={9} viewBox="0 0 14 9" accessible={false}><Path d="M2 2L6.8 6.5L12 1.8" fill="none" stroke={muted} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </View>
    </View>
  </View>;
}

export function ComicCharacterChooser({ onStart, ink, muted, isDark, requireExplicitChoice = false }: { requireExplicitChoice?: boolean; onStart: (character: ComicCharacter, name?: string) => void; ink: string; muted: string; isDark: boolean }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ComicCharacter | null>(requireExplicitChoice ? null : COMIC_CHARACTERS[0]);
  // Names belong to this new diary draft, never to the shared character artwork.
  const [names, setNames] = useState<Record<string, string | null>>(() => Object.fromEntries(COMIC_CHARACTERS.map(character => [character.id, null])));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const startedTutorialRun = useRef<string | null | undefined>(undefined);
  const tutorialStep = useServiceTutorial(state => state.active && state.mode === 'comic' ? state.step : null);
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
      // A previous diary must not prevent leaving the character chooser.
      // Claim this run before starting so rerenders cannot create duplicate diaries.
      startedTutorialRun.current = tutorial.runId;
      onStart(chosen, names[chosen.id]?.trim() || t(chosen.name));
    }
    });
    return () => cancelAnimationFrame(frame);
  }, [tutorialStep, requireExplicitChoice, selected, names, onStart, t]);
  const displayName = (character: ComicCharacter) => names[character.id] ?? t(character.name);
  const canStart = Boolean(selected && (!requireExplicitChoice || names[selected.id]?.trim()));
  const saveName = () => {
    if (!editing) return;
    const name = draft.trim().slice(0, 24);
    if (!name) return;
    setNames(current => ({ ...current, [editing]: name }));
    setEditing(null);
  };
  return <ServiceTutorialTarget steps={requireExplicitChoice ? ['comicCharacter', 'comicName', 'comicReady'] : []} spotlight={false} style={{ flex: 1 }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <ThemedText style={[s.title, { color: ink }]}>{t('comicDay.character.title')}</ThemedText>
      <ThemedText style={[s.subtitle, { color: muted }]}>{t('comicDay.character.hint')}</ThemedText>
      {COMIC_CHARACTERS.map((character, index) => <ServiceTutorialTarget key={character.id} style={s.characterCard} steps={requireExplicitChoice && !selected && index === 0 ? ['comicCharacter', 'comicName', 'comicReady'] : []}><View style={[s.card, { backgroundColor: isDark ? '#262B28' : '#FFFFFF' }]}>
        <PaperGrain opacity={0.18} />
        <CharacterArtworkGallery character={character} ink={ink} muted={muted} onSelect={() => { setSelected(character); useServiceTutorial.getState().advance('comicCharacter', 'comicName'); }} />
        {requireExplicitChoice ? <View style={s.editBox}>
          <ServiceTutorialTarget steps={selected?.id === character.id && !names[character.id]?.trim() ? ['comicCharacter', 'comicName', 'comicReady'] : []}>
            <ThemedTextInput accessibilityLabel={t('comicDay.character.nameHint')} placeholder={t('comicDay.character.nameHint')} placeholderTextColor={muted}
              value={names[character.id] ?? ''} maxLength={24} autoCorrect={false} returnKeyType="done"
              onFocus={() => setSelected(character)}
              onChangeText={value => { setSelected(character); setNames(current => ({ ...current, [character.id]: value })); const tut = useServiceTutorial.getState(); tut.advance('comicCharacter', 'comicName'); if (value.trim()) tut.advance('comicName', 'comicReady'); else tut.advance('comicReady', 'comicName'); }}
              style={[s.nameInput, { color: ink, borderColor: muted }]} />
          </ServiceTutorialTarget>
        </View> : editing === character.id ? <View style={s.editBox}>
          <ThemedTextInput accessibilityLabel={t('comicDay.character.rename')} value={draft} onChangeText={setDraft} maxLength={24} autoFocus selectTextOnFocus returnKeyType="done" onSubmitEditing={saveName} style={[s.nameInput, { color: ink, borderColor: muted }]} />
          <View style={s.editActions}>
            <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); setEditing(null); }} style={s.editButton}><ThemedText style={{ color: muted, fontSize: 13 }}>{t('common.cancel')}</ThemedText></Pressable>
            <Pressable accessibilityRole="button" disabled={!draft.trim()} accessibilityState={{ disabled: !draft.trim() }} onPress={() => { tapHaptic('confirm'); saveName(); }} style={[s.editButton, { backgroundColor: '#F3F0E8', opacity: draft.trim() ? 1 : 0.4 }]}><ThemedText style={{ color: '#202020', fontSize: 13 }}>{t('common.save')}</ThemedText></Pressable>
          </View>
        </View> : <View style={s.nameRow}>
          <ThemedText style={[s.name, { color: ink }]}>{displayName(character)}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.character.rename')} onPress={() => { tapHaptic(); setDraft(displayName(character)); setEditing(character.id); }} style={s.editButton}>
            <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}><Path d="M4 16L16.5 3.5L20.5 7.5L8 20L3 21Z M14.5 5.5L18.5 9.5 M4 16L8 20" fill="none" stroke={ink} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        </View>}
        <View accessible accessibilityLabel={t('comicDay.sceneCount', { count: character.scenes.length })} style={s.countIcon}>
          <Svg width={26} height={22} viewBox="0 0 26 22" accessible={false}>
            <Path d="M7 2.5L22.5 3.5L21.4 18.5L6.2 17.4Z M4.2 5L19.7 6L18.6 21L3.4 19.8Z" fill="#FFFFFF" stroke={muted} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M8.3 7.8L15.7 8.3M8 10.7L14.3 11.1M7.7 13.5L12.4 13.8" fill="none" stroke={muted} strokeWidth={0.7} strokeLinecap="round" />
          </Svg>
        </View>
        <SettingsPenFrame color={selected?.id === character.id ? ink : muted} />
      </View></ServiceTutorialTarget>)}
      <View style={s.upcoming}>
        <PaperGrain opacity={0.18} /><HanddrawnFrame color={muted} />
        <Svg width={42} height={48} viewBox="0 0 42 48" accessible={false}>
          <Path d="M21.4 5.6C15.9 5.4 12.7 10.3 13.3 16.3C13.5 21.7 16.6 25.6 21.4 25.2C26.7 25.3 29.6 20.8 29.2 15.4C29.5 9.6 26 5.6 21.4 5.6Z M16.1 25.1C8.7 27.6 5.2 32.5 5.6 42.2L36.4 41.7C36.6 32.2 32.6 27.1 26 25 M15 7.6C11.7 10.9 11.6 17.8 14.2 21.9 M8.1 33.4L7.5 40.2 M33.9 34L34.3 40.2" fill="none" stroke={muted} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M15 32L27 32M13 35L29 35M11 38L31 38" stroke={muted} strokeWidth={0.35} opacity={0.45} />
        </Svg>
        <View><ThemedText style={{ color: muted, fontSize: 17 }}>{t('comicDay.character.new')}</ThemedText><ThemedText style={{ color: muted, fontSize: 12 }}>{t('comicDay.character.soon')}</ThemedText></View>
      </View>
    </ScrollView>
    <View style={[s.footer, { borderColor: muted }]}>
      <ThemedText style={{ color: muted, textAlign: 'center', fontSize: 12 }}>{requireExplicitChoice && selected && !canStart ? t('comicDay.character.nameHint') : selected ? t('comicDay.character.selected', { name: displayName(selected) }) : t('comicDay.character.hint')}</ThemedText>
      <ServiceTutorialTarget steps={requireExplicitChoice && canStart ? ['comicCharacter', 'comicName', 'comicReady'] : []}><Pressable accessibilityRole="button" disabled={!canStart} accessibilityState={{ disabled: !canStart }} accessibilityLabel={canStart && selected ? t('comicDay.character.startWithName', { name: displayName(selected) }) : t('comicDay.character.nameHint')} onPress={() => {
        if (!selected || !canStart) return;
        tapHaptic();
        const tutorial = useServiceTutorial.getState();
        // Tutorial Start must match coach "Later": advance to comicPick, then the effect calls onStart.
        // Calling onStart here claimed the run early and left a blank board until the next touch.
        if (requireExplicitChoice && tutorial.active && tutorial.mode === 'comic') {
          if (['comicCharacter', 'comicName', 'comicReady'].includes(tutorial.step)) {
            tutorial.skipStep();
            return;
          }
          if (tutorial.step === 'comicPick' && startedTutorialRun.current === tutorial.runId) return;
        }
        onStart(selected, names[selected.id]?.trim() || t(selected.name));
      }} style={({ pressed }) => [s.start, !canStart && { opacity: 0.45 }, pressed && { opacity: 0.75, transform: [{ translateY: 1 }] }]}>
        <SettingsPenFrame color="#171510" />
        <ThemedText style={{ color: '#000000', fontSize: 19, lineHeight: 30, flexShrink: 1 }}>{canStart && selected ? t('comicDay.character.startWithName', { name: displayName(selected) }) : t('comicDay.character.nameHint')}</ThemedText>
        <Svg width={21} height={18} viewBox="0 0 30 24" accessible={false}><Path d="M3 12.4L25.4 11.8 M18.5 5.3L26 11.9L18.7 18.5 M4.1 13.1L24.1 12.8" fill="none" stroke="#202020" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Pressable></ServiceTutorialTarget>
    </View>
  </KeyboardAvoidingView></ServiceTutorialTarget>;
}
const s = StyleSheet.create({
  content: { padding: 14, paddingBottom: 24 }, title: { fontSize: 24, marginBottom: 6 }, subtitle: { fontSize: 13, marginBottom: 20 },
  characterCard: { width: '100%', alignSelf: 'stretch', marginBottom: 12 },
  card: { padding: 10, overflow: 'hidden', borderRadius: 8 },
  gallery: { height: 128, flexDirection: 'row', gap: 8 }, mainArtwork: { flex: 1, minWidth: 0, borderRadius: 6, overflow: 'hidden' }, cover: { width: '100%', height: '100%' },
  thumbnailRail: { width: 52, height: 128 }, thumbnails: { gap: 8, paddingTop: 3, paddingBottom: 18, paddingHorizontal: 3 }, thumbnail: { minHeight: 62, width: 46, padding: 4 }, preview: { width: '100%', height: 54, borderRadius: 3 }, scrollHint: { position: 'absolute', bottom: 1, left: 0, right: 0, height: 12, alignItems: 'center', justifyContent: 'flex-end' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, marginRight: 60, gap: 4 }, editButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 10 }, editBox: { marginTop: 8, marginRight: 60, gap: 4 }, editActions: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, nameInput: { textAlign: 'center', fontSize: 22, minHeight: 44, borderBottomWidth: 0.6 },
  name: { textAlign: 'center', fontSize: 22, flexShrink: 1 }, countIcon: { alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center', marginTop: 2, height: 22 },
  upcoming: { alignSelf: 'stretch', width: '100%', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4, opacity: 0.6 }, footer: { padding: 14, gap: 8, borderTopWidth: 0.5 }, start: { alignSelf: 'center', width: '92%', maxWidth: 292, minHeight: 62, backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 16, gap: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
