import { ComicSceneImage } from './ComicSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/comicSceneThumbnails';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { ComicCheck } from './ComicCheck';
import Svg, { Path } from 'react-native-svg';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { loadComicCharacterName, saveComicCharacterName } from '../lib/comicCharacterName';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { PaperGrain } from '@shared/ui/paper-grain';
import { COMIC_CHARACTERS, type ComicCharacter } from '../lib/comicCharacters';
export function ComicCharacterChooser({ onStart, ink, muted, isDark }: { onStart: (character: ComicCharacter) => void; ink: string; muted: string; isDark: boolean }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ComicCharacter>(COMIC_CHARACTERS[0]);
  const [names, setNames] = useState(() => Object.fromEntries(COMIC_CHARACTERS.map(character => [character.id, loadComicCharacterName(character.id)])));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const displayName = (character: ComicCharacter) => names[character.id] ?? t(character.name);
  const saveName = () => {
    if (!editing) return;
    const name = saveComicCharacterName(editing, draft);
    if (!name) return;
    setNames(current => ({ ...current, [editing]: name }));
    setEditing(null);
  };
  return <View style={{ flex: 1 }}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <ThemedText style={[s.title, { color: ink }]}>{t('comicDay.character.title')}</ThemedText>
      <ThemedText style={[s.subtitle, { color: muted }]}>{t('comicDay.character.hint')}</ThemedText>
      {COMIC_CHARACTERS.map(character => <Pressable key={character.id} accessibilityRole="button" accessibilityLabel={displayName(character)} accessibilityState={{ selected: selected.id === character.id }} onPress={() => { tapHaptic('select'); setSelected(character); }} style={[s.card, { backgroundColor: isDark ? '#262B28' : '#FFFFFF', borderColor: selected.id === character.id ? '#8DDAC2' : muted }]}>
        <PaperGrain opacity={0.18} />
        <ComicSceneImage imageKey={`${character.id}:cover`} source={character.cover} fallbackSource={character.preview[0].source} style={s.cover} priority="high" />
        {selected.id === character.id ? <View pointerEvents="none" style={s.check}>
          <ComicCheck checked size={30} />
        </View> : null}
        {editing === character.id ? <View style={s.editBox}>
          <ThemedTextInput accessibilityLabel={t('comicDay.character.rename')} value={draft} onChangeText={setDraft} maxLength={24} autoFocus selectTextOnFocus returnKeyType="done" onSubmitEditing={saveName} style={[s.nameInput, { color: ink, borderColor: muted }]} />
          <View style={s.editActions}>
            <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); setEditing(null); }} style={s.editButton}><ThemedText style={{ color: muted, fontSize: 13 }}>{t('common.cancel')}</ThemedText></Pressable>
            <Pressable accessibilityRole="button" disabled={!draft.trim()} accessibilityState={{ disabled: !draft.trim() }} onPress={() => { tapHaptic('confirm'); saveName(); }} style={[s.editButton, { backgroundColor: '#C8EBDD', opacity: draft.trim() ? 1 : 0.4 }]}><ThemedText style={{ color: '#202020', fontSize: 13 }}>{t('common.save')}</ThemedText></Pressable>
          </View>
        </View> : <View style={s.nameRow}>
          <ThemedText style={[s.name, { color: ink }]}>{displayName(character)}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.character.rename')} onPress={() => { tapHaptic(); setDraft(displayName(character)); setEditing(character.id); }} style={s.editButton}>
            <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}><Path d="M4 16L16.5 3.5L20.5 7.5L8 20L3 21Z M14.5 5.5L18.5 9.5 M4 16L8 20" fill="none" stroke={ink} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        </View>}
        <ThemedText style={[s.description, { color: muted }]}>{t(character.description)}</ThemedText>
        <View style={s.previews}>{character.preview.map(scene => <ComicSceneImage key={scene.id} imageKey={`${scene.id}:small`} source={COMIC_SCENE_THUMBNAILS[scene.id].small} fallbackSource={scene.source} style={s.preview} />)}</View>
        <ThemedText style={[s.count, { color: muted }]}>{t('comicDay.sceneCount', { count: character.scenes.length })}</ThemedText>
        <HanddrawnFrame color={selected.id === character.id ? '#78BDA9' : muted} />
      </Pressable>)}
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
      <ThemedText style={{ color: muted, textAlign: 'center', fontSize: 12 }}>{t('comicDay.character.selected', { name: displayName(selected) })}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.character.startWithName', { name: displayName(selected) })} onPress={() => { tapHaptic(); onStart(selected); }} style={({ pressed }) => [s.start, pressed && { opacity: 0.75, transform: [{ translateY: 1 }] }]}>
        <PaperGrain opacity={0.32} /><HanddrawnFrame color="#52645B" />
        <ThemedText style={{ color: '#202020', fontSize: 14, lineHeight: 20, flexShrink: 1 }}>{t('comicDay.character.startWithName', { name: displayName(selected) })}</ThemedText>
        <Svg width={21} height={18} viewBox="0 0 30 24" accessible={false}><Path d="M3 12.4L25.4 11.8 M18.5 5.3L26 11.9L18.7 18.5 M4.1 13.1L24.1 12.8" fill="none" stroke="#202020" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  content: { padding: 18, paddingBottom: 24 }, title: { fontSize: 24, marginBottom: 6 }, subtitle: { fontSize: 13, marginBottom: 20 },
  card: { padding: 8, overflow: 'hidden' }, cover: { width: '100%', aspectRatio: 1.35 }, check: { position: 'absolute', top: 16, right: 16, width: 30, height: 30 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 4 }, editButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 10 }, editBox: { marginTop: 10, gap: 4 }, editActions: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, nameInput: { textAlign: 'center', fontSize: 22, minHeight: 44, borderBottomWidth: 0.6 },
  name: { textAlign: 'center', fontSize: 24, flexShrink: 1 }, description: { textAlign: 'center', fontSize: 13, marginTop: 2 }, previews: { flexDirection: 'row', gap: 6, marginTop: 14 }, preview: { flex: 1, aspectRatio: 1.3 }, count: { textAlign: 'center', fontSize: 12, marginVertical: 8 },
  upcoming: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 16, opacity: 0.6 }, footer: { padding: 14, gap: 8, borderTopWidth: 0.5 }, start: { alignSelf: 'center', maxWidth: '94%', minHeight: 38, backgroundColor: '#C8EBDD', paddingHorizontal: 18, paddingVertical: 7, gap: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
