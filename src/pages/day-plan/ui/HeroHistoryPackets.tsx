import { HeroTrashIcon } from './HeroTrashIcon';
import { getClockNow } from '@shared/lib/time/appClock';
import { comicDiaryDate } from '../lib/heroCalendar';
import { polaroidScatter } from '../lib/polaroidScatter';
import { AppWallpaperBackground } from '@shared/ui/app-wallpaper';
import { useWallpaperStore } from '@shared/lib/wallpaper/wallpaperStore';
import { EmptyDiaryIcon } from './HeroDiaryCalendar';
import { CloseIcon } from '@shared/ui/icon-symbol/CloseIcon';
import { BackChevron } from '@shared/ui/icon-symbol';
import { HeroHistorySceneDetail } from './HeroHistorySceneDetail';
import { AppAlert } from '@shared/lib/app-alert';
import { useTranslation } from '@shared/lib/i18n';
import { useId, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { AppModal } from '@shared/ui/app-modal';
import { SurfaceTexture } from '@shared/ui/surface-texture';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';

import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { groupDiaryLibrary } from '../lib/heroDiaryGroups';
import type { ComicDayScene } from '../lib/heroDayStorage';
import type { ComicDiary } from '../lib/heroDiaryStorage';
import { COMIC_SCENES } from '../lib/heroSceneImages';
import { COMIC_CHARACTERS } from '../lib/heroCharacters';
import { ComicSceneImage } from './HeroSceneImage';
import { ComicDayBoard } from './HeroDayBoard';
import { HeroCardToolsProvider } from '../model/heroCardToolsPortal';
import type { HeroCardText } from './HeroCardCaption';

const dateLabel = (date: string) => date === 'undated' ? 'UNDATED' : new Date(`${date}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
const timeLabel = (n: number) => n > 0 ? new Date(n).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
function source(diary: ComicDiary, index = 0) {
  const scene = diary.scenes[index];
  return scene?.artworkUri ? { uri: scene.artworkUri } : COMIC_SCENES.find(item => item.id === scene?.image)?.source ?? COMIC_CHARACTERS.find(item => item.id === diary.characterId)?.cover;
}
function Sleeve() {
  const reflection = `sleeve-${useId().replace(/:/g, '')}`;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}><Svg width="100%" height="100%" viewBox="0 0 200 260" preserveAspectRatio="none">
    <Defs><LinearGradient id={reflection} x1="0%" y1="0%" x2="100%" y2="30%">
      <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.65" /><Stop offset="0.24" stopColor="#FFFFFF" stopOpacity="0.04" /><Stop offset="0.68" stopColor="#FFFFFF" stopOpacity="0.08" /><Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
    </LinearGradient></Defs>
    <Path d="M4 2L197 4 195 255 3 258Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" />
    <Path d="M5 5L195 5Q175 12 151 10T102 12T51 10T5 17Z" opacity={0.3} fill={`url(#${reflection})`} />
    <Path d="M5 24L16 41 8 80 14 123 7 179 17 237 43 249 8 252Z M194 23L184 49 191 85 183 132 190 181 180 235 155 250 192 251Z" fill={`url(#${reflection})`} />
    <Path d="M7 251L31 240 62 252 96 244 130 252 167 241 193 253 194 258 4 258Z" fill={`url(#${reflection})`} />
    <Path d="M7 25L13 48 8 83M7 110L12 142 8 177M12 219L18 239 42 248M191 32L185 56 190 82M189 127L184 157 190 180M184 222L178 239 156 250M7 255L60 254 98 250 142 255 191 254" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.7" />
    <Path d="M5 8L5 248M195 9L193 249M15 237L33 247 61 251M180 236L167 247 145 253" fill="none" stroke="rgba(104,101,90,0.10)" strokeWidth="0.6" />
  </Svg></View>;
}
function Packet({ date, diaries, width, onPress }: { date: string; diaries: ComicDiary[]; width: number; onPress: () => void }) {
  const { t } = useTranslation();
  const count = diaries.reduce((total, diary) => total + diary.scenes.length, 0);
  const countLabel = `${count} ${count === 1 ? 'entry' : 'entries'}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${dateLabel(date)}, ${countLabel}`} onPress={onPress} style={{ width, height: width * 1.45 }}>
    <View style={[s.bag, { top: 46 }]}>
      {[...diaries.slice(0, 3)].reverse().map((diary, i, all) => <View key={diary.id} style={[s.print, StyleSheet.absoluteFill, { margin: 6, top: 6, bottom: 4, transform: [{ rotate: `${i === all.length - 1 ? 0 : i % 2 ? -7 : 6}deg` }] }]}><PaperGrain opacity={0.4} /><ComicSceneImage source={source(diary)} imageKey={`packet:${diary.id}:${diary.scenes[0]?.artworkUri}`} preserveFullImage contentFit="contain" backgroundColor="#FCFBF7" style={{ flex: 1 }} /></View>)}
      <Sleeve />
    </View>
    <View style={[s.label, { minHeight: 46, padding: 4, gap: 2 }]}><PaperGrain opacity={0.65} /><ThemedText numberOfLines={1} adjustsFontSizeToFit style={[s.date, { fontSize: 9, lineHeight: 13 }]}>{dateLabel(date)}</ThemedText><ThemedText style={[s.count, { fontSize: 9, lineHeight: 12 }]}>{countLabel}</ThemedText><View style={[s.staple, { left: 12 }]} /><View style={[s.staple, { right: 12 }]} /></View>
  </Pressable>;
}
export function HeroHistoryPackets({ diaries, onCreate, onDeleteMany, onRemoveScenes, onUpdateScene }: { diaries: ComicDiary[]; onRemoveScenes?: (entries: { diaryId: string; sceneId: string }[]) => void; onCreate: () => void; onDeleteMany: (ids: string[]) => void; onUpdateScene: (diaryId: string, sceneId: string, text: HeroCardText) => void }) {
  const { t } = useTranslation();
  const confirmDelete = (ids: string[]) => {
    if (!ids.length) return;
    tapHaptic('warn');
    AppAlert.alert(t('comicDiary.delete'), t('comicDiary.deleteManyMessage', { count: ids.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('comicDiary.deleteSelected', { count: ids.length }), style: 'destructive', onPress: () => { onDeleteMany(ids); setSelected([]); setSelecting(false); } },
    ], { cancelable: true });
  };
  const hasWallpaper = useWallpaperStore(state => !!state.wallpaper);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const groups = groupDiaryLibrary(diaries, 'month');
  const [year, setYear] = useState(() => Number(groups.find(g => g.date !== 'undated')?.date.slice(0, 4) ?? getClockNow().getFullYear()));
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [dateGridOpen, setDateGridOpen] = useState(false);
  const [sceneDetail, setSceneDetail] = useState<string | null>(null);
  const group = groups.find(g => g.date === opened);
  const entries = group?.diaries.flatMap<{ key: string; diary: ComicDiary; scene: ComicDayScene | undefined; index: number }>(diary => diary.scenes.length ? diary.scenes.map((scene, index) => ({ key: `${diary.id}:${scene.id}`, diary, scene, index })) : [{ key: diary.id, diary, scene: undefined, index: 0 }]) ?? [];
  const selectedEntry = entries.find(item => item.key === sceneDetail);
  const removeScenes = (keys: string[]) => {
    const targets = entries.filter(item => keys.includes(item.key) && item.scene);
    if (!targets.length) return;
    AppAlert.alert(t('comicDay.deleteScene'), t('comicDay.deleteHint'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('comicDay.deleteScene'), style: 'destructive', onPress: () => {
        onRemoveScenes?.(targets.map(item => ({ diaryId: item.diary.id, sceneId: item.scene!.id })));
        setSceneDetail(null);
      } },
    ], { cancelable: true });
  };

  const visible = groups.filter(g => g.date.startsWith(`${year}-`) || g.date === 'undated');
  const packetCanvasWidth = Math.min(520, Math.max(1, width - 32));
  const packetLayout = polaroidScatter(packetCanvasWidth, visible.map(group => group.date), {}, 'packets');
  const moveYear = (delta: number) => { tapHaptic('select'); setYear(value => value + delta); setSelected([]); };
  const close = () => { if (sceneDetail) setSceneDetail(null); else { setOpened(null); setDetail(null); setDateGridOpen(false); } };
  return <View style={{ flex: 1, paddingTop: insets.top }}>
    <View style={s.month}><Pressable testID="history-previous-year" accessibilityRole="button" accessibilityLabel={t('comicDiary.previousYear')} onPress={() => moveYear(-1)} style={s.touch}><BackChevron color="#000000" /></Pressable><View style={{ width: 180, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ textAlign: 'center' }}>{year}</ThemedText></View><Pressable testID="history-next-year" accessibilityRole="button" accessibilityLabel={t('comicDiary.nextYear')} onPress={() => moveYear(1)} style={s.touch}><View style={{ transform: [{ rotate: '180deg' }] }}><BackChevron color="#000000" /></View></Pressable><Pressable testID="history-selection-toggle" accessibilityRole="button" accessibilityLabel={selecting ? t('common.cancel') : t('comicDiary.delete')} onPress={() => { setSelecting(!selecting); setSelected([]); }} style={[s.touch, { position: 'absolute', right: 4 }]}>{selecting ? <CloseIcon color="#292E28" /> : <HeroTrashIcon size={28} />}</Pressable></View>
    <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}><View style={{ alignSelf: 'center', width: packetCanvasWidth, height: packetLayout.height }}>
      {visible.map((g, i) => <View key={g.date} style={{ position: 'absolute', left: packetLayout.frames[i].left, top: packetLayout.frames[i].top, width: packetLayout.frames[i].width, zIndex: packetLayout.frames[i].zIndex, transform: [{ rotate: `${packetLayout.frames[i].rotation}deg` }] }}><Packet date={g.date} diaries={g.diaries} width={packetLayout.frames[i].width} onPress={() => { tapHaptic(); if (selecting) setSelected(current => current.includes(g.date) ? current.filter(date => date !== g.date) : [...current, g.date]); else { setOpened(g.date); setDetail(null); setDateGridOpen(true); } }} />{selecting && selected.includes(g.date) ? <View pointerEvents="none" style={{ position: 'absolute', right: 3, top: 4, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}><Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M4 12L9 18L21 5" stroke="#000000" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg></View> : null}</View>)}
    </View></ScrollView>
    {!visible.length ? <View testID="history-empty-state" pointerEvents="none" accessible accessibilityRole="image" accessibilityLabel={t('comicDiary.yearEmpty')} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}><EmptyDiaryIcon ink="#777B72" /><ThemedText style={{ fontSize: 15, color: '#777B72', textAlign: 'center' }}>{t('comicDiary.yearEmpty')}</ThemedText></View> : null}
    {selecting ? <Pressable testID="history-delete-selected" accessibilityRole="button" disabled={!selected.length} onPress={() => confirmDelete(groups.filter(g => selected.includes(g.date)).flatMap(g => g.diaries.map(d => d.id)))} style={[s.touch, { opacity: selected.length ? 1 : 0.3 }]}><ThemedText style={{ color: '#000000' }}>{t('comicDiary.deleteSelected', { count: selected.length })}</ThemedText></Pressable> : null}
    {group ? <AppModal visible animationType="none" onRequestClose={close}><View style={{ flex: 1, backgroundColor: '#F7F6F4', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {hasWallpaper ? <AppWallpaperBackground /> : <SurfaceTexture kind="wrinkled" opacity={0.18} />}
      <View style={s.header}>
        <View style={{ width: 88, alignItems: 'flex-start' }}><Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={close} style={s.touch}><BackChevron color="#202020" /></Pressable></View>
        <ThemedText testID="history-detail-date" style={{ flex: 1, textAlign: 'center', color: '#292E28', fontSize: 18 }}>{dateLabel(group.date)}</ThemedText>
        <View style={{ width: 88, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { setOpened(null); setDetail(null); setDateGridOpen(false); }} style={[s.touch, { minWidth: 52 }]}><ThemedText style={{ color: '#292E28', fontSize: 15 }}>{t('common.close')}</ThemedText></Pressable>
        </View>
      </View>
      <View style={{ flex: 1 }}>
      <View style={StyleSheet.absoluteFill}>
        <HeroCardToolsProvider><ComicDayBoard syncMainState={false} focusSceneId={detail} diaryTitle={dateLabel(group.date)} hideEntryActions hideCharacterHeading onAdd={onCreate} historyOverview overviewOpen={dateGridOpen} onOverviewChange={setDateGridOpen} onRemove={key => removeScenes([key])} onRemoveMany={removeScenes} items={entries.map(item => ({ key: item.key, icon: 'photo' as const, label: item.scene?.title ?? '', memo: item.scene?.memo, artworkUri: item.scene?.artworkUri, exportDate: comicDiaryDate(item.diary) ?? item.diary.createdAt, faceColor: item.scene?.paper, inkColor: item.scene?.pen, fontId: item.scene?.fontId }))} ink="#292E28" muted="#73796C" isDark={false} choices={Object.fromEntries(entries.filter(item => item.scene).map(item => [item.key, item.scene!.image]))} onOpen={key => { const item = entries.find(entry => entry.key === key); if (item?.scene) setSceneDetail(key); }} onEditCard={(key, text) => { const item = entries.find(entry => entry.key === key); if (item?.scene) onUpdateScene(item.diary.id, item.scene.id, text); }} /></HeroCardToolsProvider>

      </View>
      </View>
      {selectedEntry?.scene ? <HeroHistorySceneDetail onSaveText={text => onUpdateScene(selectedEntry.diary.id, selectedEntry.scene!.id, text)} scene={selectedEntry.scene} source={source(selectedEntry.diary, selectedEntry.index)} date={selectedEntry.diary.createdAt} onDelete={() => removeScenes([selectedEntry.key])} onClose={() => setSceneDetail(null)} /> : null}
    </View></AppModal> : null}
  </View>;
}
const s = StyleSheet.create({
  openPacket: { paddingBottom: 16 },
  openSleeve: { position: 'absolute', top: 64, bottom: 0, left: -9, right: -9, backgroundColor: 'rgba(255,255,255,0.06)', shadowColor: '#575247', shadowOpacity: 0.17, shadowRadius: 5, shadowOffset: { width: 2, height: 5 } },
  openLabel: { minHeight: 76, zIndex: 1, transform: [{ rotate: '-1deg' }], borderTopWidth: 0.7, borderTopColor: '#FFFFFF', shadowOpacity: 0.23, shadowRadius: 3 },
  openContents: { paddingTop: 32, paddingHorizontal: 8, gap: 27, paddingBottom: 12 },
  looseRecord: { minHeight: 184 },
  recordBacking: { position: 'absolute', top: 5, bottom: -4, left: 3, right: 3, backgroundColor: '#EAE8DF', shadowColor: '#514A3D', shadowOpacity: 0.19, shadowRadius: 3, shadowOffset: { width: 1, height: 3 } },
  recordPaper: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 9, backgroundColor: '#F8F7F1', borderTopWidth: 0.7, borderTopColor: '#FFFFFF', shadowColor: '#514A3D', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 2, height: 4 } },
  recordPhoto: { width: '46%', height: 166, padding: 5, paddingBottom: 16, shadowOpacity: 0.16, shadowRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, minHeight: 44 }, heading: { fontSize: 25, color: '#24241F' }, touch: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }, search: { marginHorizontal: 24, borderBottomWidth: 0.5, borderColor: '#AAA89F', minHeight: 40 }, month: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  bag: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.07)', shadowColor: '#484238', shadowOpacity: 0.24, shadowRadius: 5, shadowOffset: { width: 3, height: 6 } },
  label: { minHeight: 62, backgroundColor: '#F3F2EC', padding: 10, alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#403C32', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 1, height: 4 } }, date: { fontSize: 12, lineHeight: 16, color: '#24241F' }, count: { fontSize: 11, lineHeight: 14, color: '#55534D' }, staple: { position: 'absolute', bottom: 8, height: 2, width: 17, backgroundColor: '#A6A59F', borderTopColor: '#FAFAF7', borderTopWidth: 0.6 },
  print: { backgroundColor: '#FCFBF7', padding: 6, paddingBottom: 16, shadowColor: '#403C32', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 1, height: 3 } }, record: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, backgroundColor: '#FCFBF8', shadowColor: '#403C32', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 1, height: 4 } }, detail: { flex: 1, backgroundColor: '#FCFBF8' }, title: { fontSize: 25, marginTop: 18, marginBottom: 14 }, memo: { fontSize: 18, lineHeight: 29, marginBottom: 24 }, actions: { borderTopWidth: 0.5, borderColor: '#CBC8BE', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', minHeight: 52 },
});
