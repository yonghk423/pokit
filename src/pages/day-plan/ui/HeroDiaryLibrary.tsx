import { groupDiaryLibrary, groupedDiaryTitle } from '../lib/heroDiaryGroups';
import { parseLocalDateKeyToDate } from '@entities/day-plan/lib/localDateKey';
import { loadComicCharacterName } from '../lib/heroCharacterName';
import { SettingsPenIcon } from '../../settings/lib/settingsPen';
import { COMIC_SCENES } from '../lib/heroSceneImages';
import { useEffect, useState, type ReactNode } from 'react';
import Svg, { Path } from 'react-native-svg';
import { AccessibilityInfo, FlatList, LayoutAnimation, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { penContour } from '@shared/ui/pen-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { COMIC_CHARACTERS } from '../lib/heroCharacters';
import { HeroEmptySceneIcon } from './HeroEmptySceneIcon';
import { HeroEmptyDiaryIcon } from './HeroEmptyDiaryIcon';
import { HeroCreateDiaryIcon } from './HeroCreateDiaryIcon';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import type { ComicDiary } from '../lib/heroDiaryStorage';
import { ComicCheck } from './HeroCheck';
import { ComicSceneImage } from './HeroSceneImage';

function SearchPenLine() {
  const [width, setWidth] = useState(320);
  return <View pointerEvents="none" style={s.searchLine} onLayout={({ nativeEvent: { layout } }) => {
    if (layout.width > 0) setWidth(previous => previous === layout.width ? previous : layout.width);
  }}>
    <Svg width="100%" height={5} viewBox={`0 0 ${width} 5`} accessible={false}>
      <Path d={penContour([[1.5, 2.8], [width * 0.22, 2.4], [width * 0.48, 2.9], [width * 0.76, 2.5], [width - 1.5, 2.7]], 1.6, 0.6)} fill="#555A4F" />
    </Svg>
  </View>;
}

// Keep rows in normal layout so native measurement and virtualized cells agree.
// A zero-height clip around absolutely positioned rows can stay empty on iOS.
function DiaryAccordionPanel({ open, children }: { open: boolean; children: ReactNode }) {
  return <View testID="comic-diary-accordion-panel" pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
    {open ? <View testID="comic-diary-accordion-content" collapsable={false} style={s.accordionContent}>{children}</View> : null}
  </View>;
}

export function ComicDiaryLibrary({ diaries, activeId, initialRenameId, onClose, onCreate, onOpen, onRename, onDelete, onDeleteMany }: {
  diaries: ComicDiary[]; activeId: string | null; initialRenameId?: string | null; onClose: () => void; onCreate: () => void;
  onOpen: (id: string) => void; onRename: (id: string, title: string) => void; onDelete: (id: string) => void; onDeleteMany?: (ids: string[]) => void;
}) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled()).then(value => { if (mounted) setReduceMotion(Boolean(value)); }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; listener.remove(); };
  }, []);
  const allGroups = groupDiaryLibrary(diaries);
  const renameDate = allGroups.find(group => group.diaries.some(diary => diary.id === initialRenameId))?.date;
  const firstDate = (renameDate && renameDate !== 'undated' ? renameDate : allGroups.find(group => group.date !== 'undated')?.date) ?? '';
  const [month, setMonth] = useState(() => firstDate.slice(0, 7));
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({ [renameDate ?? firstDate]: true, undated: true }));
  const [query, setQuery] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selected = diaries.filter(diary => selectedIds.has(diary.id));
  const toggleSelection = (ids: string[]) => {
    tapHaptic('select');
    setSelectedIds(current => {
      const next = new Set(current);
      const remove = ids.every(id => current.has(id));
      for (const id of ids) { if (remove) next.delete(id); else next.add(id); }
      return next;
    });
  };
  const toggleSelectionMode = () => {
    tapHaptic('select'); setSelecting(value => !value); setSelectedIds(new Set()); setMenuId(null); setRenamingId(null);
  };
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(initialRenameId ?? null);
  const [draft, setDraft] = useState(() => diaries.find(item => item.id === initialRenameId)?.title ?? '');
  const save = () => { if (renamingId && draft.trim()) { tapHaptic('confirm'); onRename(renamingId, draft); setRenamingId(null); } };
  const characterNameFor = (diary: ComicDiary) => diary.characterName?.trim() || loadComicCharacterName(diary.characterId) || t((COMIC_CHARACTERS.find(character => character.id === diary.characterId) ?? COMIC_CHARACTERS[0]).name);
  const searchQuery = query.trim().toLocaleLowerCase();
  const filtered = diaries.filter(diary => [diary.title, characterNameFor(diary), ...diary.scenes.map(scene => scene.title)].some(value => value.toLocaleLowerCase().includes(searchQuery)));
  const sections = groupDiaryLibrary(filtered).filter(group => searchQuery || group.date === 'undated' || group.date.startsWith(month));
  const moveMonth = (delta: number) => {
    tapHaptic('select');
    const base = parseLocalDateKeyToDate(`${month}-01`) ?? new Date();
    const next = new Date(base.getFullYear(), base.getMonth() + delta, 1, 12);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setMonth(key); setMenuId(null);
    const first = allGroups.find(group => group.date.startsWith(key));
    if (first) setExpanded(current => ({ ...current, [first.date]: true }));
  };
  const previewSource = (diary: ComicDiary) => diary.scenes[0]?.artworkUri ? { uri: diary.scenes[0].artworkUri } : diary.scenes[0] ? COMIC_SCENE_THUMBNAILS[diary.scenes[0].image] : COMIC_CHARACTERS.find(character => character.id === diary.characterId)!.cover;
  const createDiary = () => { tapHaptic(); onCreate(); };
  const renderDiary = (item: ComicDiary) => {
    const first = item.scenes[0];
    const source = first?.artworkUri ? { uri: first.artworkUri } : first ? COMIC_SCENE_THUMBNAILS[first.image] : COMIC_CHARACTERS.find(character => character.id === item.characterId)!.cover;
    const heading = groupedDiaryTitle(item);
    const time = item.createdAt > 0 ? new Date(item.createdAt).toLocaleTimeString(locale ?? 'ko', { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
    const characterName = characterNameFor(item);
    return <View style={s.rowPaper}>
      <View style={s.row}>
        <Pressable accessibilityRole={selecting ? "checkbox" : "button"} accessibilityLabel={t(selecting ? 'comicDiary.selectItem' : 'comicDiary.open', { title: heading })} accessibilityHint={characterName} accessibilityState={selecting ? { checked: selectedIds.has(item.id) } : { selected: activeId === item.id }} onPress={() => { if (selecting) toggleSelection([item.id]); else { tapHaptic(); onOpen(item.id); } }} style={s.open}>
          {selecting ? <ComicCheck checked={selectedIds.has(item.id)} size={24} /> : null}
          <ComicSceneImage imageKey={`diary:${item.id}:${first?.image ?? 'cover'}`} source={source} fallbackSource={first ? COMIC_SCENES.find(scene => scene.id === first.image)!.source : COMIC_CHARACTERS.find(character => character.id === item.characterId)!.preview[0].source} style={s.cover} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {time ? <ThemedText style={s.time}>{time}</ThemedText> : null}
            <ThemedText numberOfLines={2} style={s.title}>{heading}</ThemedText>
            <View style={s.metadata}>
              <ThemedText numberOfLines={1} style={s.characterName}>{characterName}</ThemedText>
              <ThemedText style={s.count}>·</ThemedText>
              {item.scenes.length ? <ThemedText style={s.count}>{t('comicDiary.sceneCount', { count: item.scenes.length })}</ThemedText> : <HeroEmptySceneIcon color="#777" size={24} />}
            </View>
          </View>
        </Pressable>
        {!selecting ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.manage', { title: item.title })} accessibilityState={{ expanded: menuId === item.id }} style={s.touch} onPress={() => { tapHaptic('select'); setRenamingId(null); setMenuId(menuId === item.id ? null : item.id); }}><Svg width={19} height={15} viewBox="0 0 19 15" accessible={false}>
          <Path d="M3.1 6.2C4.4 6 4.6 7.1 4.3 7.9C3.9 8.7 2.6 8.5 2.5 7.6C2.3 6.9 2.5 6.4 3.1 6.2Z M9.3 6.1C10.5 6.2 10.6 7.5 10 8.1C9.4 8.7 8.2 8.3 8.3 7.4C8.2 6.7 8.6 6.1 9.3 6.1Z M15.1 6.2C16.2 6 16.8 7.2 16.2 8C15.7 8.8 14.3 8.3 14.3 7.5C14.2 6.8 14.5 6.4 15.1 6.2Z" fill="#363636" />
        </Svg></Pressable> : null}
      </View>
      {menuId === item.id && renamingId !== item.id ? <View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.rename')} onPress={() => { tapHaptic(); setDraft(item.title); setRenamingId(item.id); }} style={s.menuButton}><SettingsPenIcon name="pencil" size={25} color="#303030" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.delete')} onPress={() => { tapHaptic('warn'); onDelete(item.id); }} style={s.menuButton}><SettingsPenIcon name="trash.fill" size={25} color="#303030" /></Pressable>
      </View> : null}
      {renamingId === item.id ? <View style={s.rename}>
        <ThemedTextInput accessibilityLabel={t('comicDiary.rename')} value={draft} onChangeText={setDraft} maxLength={60} autoFocus selectTextOnFocus onSubmitEditing={save} returnKeyType="done" style={s.renameInput} />
        <View style={s.actions}><Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => { tapHaptic(); setRenamingId(null); }} style={s.menuButton}><ThemedText style={s.count}>{t('common.cancel')}</ThemedText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('common.save')} disabled={!draft.trim()} accessibilityState={{ disabled: !draft.trim() }} onPress={save} style={s.menuButton}><ThemedText style={s.count}>{t('common.save')}</ThemedText></Pressable></View>
      </View> : null}
    </View>;

  };
  return <AppModal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFill} onPress={() => { tapHaptic(); onClose(); }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.paper, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PaperGrain opacity={0.24} /><HanddrawnFrame color="#939393" />
        <View style={s.header}><ThemedText style={s.heading}>{t('comicDiary.library')}</ThemedText><Pressable accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); onClose(); }} style={s.touch}><ThemedText style={s.close}>×</ThemedText></Pressable></View>
        <View style={s.toolbar}>
          {!selecting ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.create')} onPress={createDiary} style={s.create}><HeroCreateDiaryIcon variant="stack" size={32} /></Pressable> : <ThemedText accessibilityLiveRegion="polite" style={s.count}>{t('comicDiary.selectedCount', { count: selected.length })}</ThemedText>}
          {onDeleteMany && (diaries.length > 0 || selecting) ? <Pressable accessibilityRole="button" accessibilityLabel={t(selecting ? 'common.cancel' : 'comicDiary.select')} onPress={toggleSelectionMode} style={s.menuButton}><ThemedText style={s.selectionText}>{t(selecting ? 'common.cancel' : 'comicDiary.select')}</ThemedText></Pressable> : null}
        </View>
        <View style={s.searchRow}>
          <Svg pointerEvents="none" width={21} height={21} viewBox="0 0 24 24" accessible={false}>
            <Path d="M10.1 3.5C6.3 3.3 3.4 6.3 3.5 10.1C3.4 13.8 6.5 16.7 10.2 16.5C14 16.6 16.8 13.5 16.5 9.9C16.5 6.2 13.8 3.4 10.1 3.5ZM14.8 15L20.6 20.9" fill="none" stroke="#72766F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <ThemedTextInput accessibilityLabel={t('comicDiary.search')} value={query} onChangeText={setQuery} style={s.search} />
          <SearchPenLine />
        </View>
        {month && !searchQuery ? <View style={s.monthRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('comicCalendar.previous')} onPress={() => moveMonth(-1)} style={s.touch}><ThemedText style={s.monthArrow}>‹</ThemedText></Pressable>
          <ThemedText style={s.monthLabel}>{month.replace('-', '.')}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('comicCalendar.next')} onPress={() => moveMonth(1)} style={s.touch}><ThemedText style={s.monthArrow}>›</ThemedText></Pressable>
        </View> : null}
        <FlatList removeClippedSubviews={false} data={sections} extraData={{ expanded, activeId, menuId, renamingId, draft, selecting, selectedIds }} keyExtractor={group => group.date} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[s.list, sections.length === 0 && s.listEmpty]} ListEmptyComponent={query.trim() || diaries.length > 0 ? <ThemedText style={s.empty}>{t('comicDiary.noResults')}</ThemedText> : <Pressable testID="comic-empty-diary-create" accessibilityRole="button" accessibilityLabel={t('comicDiary.create')} onPress={createDiary} style={s.emptyIconButton}><HeroEmptyDiaryIcon /></Pressable>} renderItem={({ item: group }) => {
            const open = Boolean(searchQuery || expanded[group.date] || group.diaries.some(diary => diary.id === renamingId));
            const day = parseLocalDateKeyToDate(group.date);

            return <View><View style={s.dateHeaderRow}>
              {selecting ? <Pressable testID={`comic-diary-select-date-${group.date}`} accessibilityRole="checkbox" accessibilityLabel={t('comicDiary.selectDate', { date: day ? day.toLocaleDateString(locale ?? 'ko', { month: 'long', day: 'numeric' }) : t('comicDiary.undated') })} accessibilityState={{ checked: group.diaries.every(diary => selectedIds.has(diary.id)) ? true : group.diaries.some(diary => selectedIds.has(diary.id)) ? 'mixed' : false }} onPress={() => toggleSelection(group.diaries.map(diary => diary.id))} style={s.touch}><ComicCheck checked={group.diaries.every(diary => selectedIds.has(diary.id))} size={24} /></Pressable> : null}
              <Pressable testID={`comic-diary-group-${group.date}`} accessibilityRole="button" accessibilityLabel={day ? day.toLocaleDateString(locale ?? 'ko', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : t('comicDiary.undated')} accessibilityState={{ expanded: open }} onPress={() => { tapHaptic('select'); if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(current => ({ ...current, [group.date]: !open })); }} style={s.dateHeader}>
              <View style={{ flex: 1 }}><ThemedText style={s.dateHeading}>{day ? day.toLocaleDateString(locale ?? 'ko', { month: 'long', day: 'numeric', weekday: 'long' }) : t('comicDiary.undated')}</ThemedText><ThemedText style={s.count}>{t('comicCalendar.diaryCount', { count: group.diaries.length })}</ThemedText></View>
              {!open ? <View style={s.previewPair}>{group.diaries.slice(0, 2).map((diary, index) => <View key={diary.id} style={{ width: 30, height: 34, marginLeft: index ? -7 : 0, transform: [{ rotate: index ? '7deg' : '-6deg' }] }}><ComicSceneImage imageKey={`library-preview:${diary.id}:${diary.scenes[0]?.artworkUri ?? diary.scenes[0]?.image ?? 'cover'}`} source={previewSource(diary)} style={StyleSheet.absoluteFill} /></View>)}</View> : null}
              <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d={penContour(open ? [[5, 15], [11.7, 8], [19, 14.5]] : [[5, 8], [12, 15], [19, 7.5]], 1.4, 0.6)} fill="#555A4F" /></Svg>
            </Pressable></View>
              <DiaryAccordionPanel open={open}>{group.diaries.map(item => <View key={item.id}>{renderDiary(item)}</View>)}</DiaryAccordionPanel>
            </View>;
        }} />
        {selecting ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.deleteSelected', { count: selected.length })} disabled={!selected.length} accessibilityState={{ disabled: !selected.length }} onPress={() => { tapHaptic('warn'); onDeleteMany?.(selected.map(diary => diary.id)); }} style={[s.deleteSelected, !selected.length && { opacity: 0.35 }]}><SettingsPenIcon name="trash.fill" size={22} color="#303030" /><ThemedText style={s.selectionText}>{t('comicDiary.deleteSelected', { count: selected.length })}</ThemedText></Pressable> : <ThemedText accessibilityRole="text" accessibilityLabel={t('comicDiary.total', { count: diaries.length })} style={s.footer}>{diaries.length}</ThemedText>}
      </KeyboardAvoidingView>
    </View>
  </AppModal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }, paper: { width: '87%', maxWidth: 420, flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 17 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, heading: { color: '#252525', fontSize: 24, flex: 1 }, touch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, close: { color: '#343434', fontSize: 30 },
  create: { alignSelf: 'flex-start', width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, action: { color: '#272727', fontSize: 19 }, searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 }, searchLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 5 }, search: { flex: 1, minWidth: 0, color: '#303030', minHeight: 44, fontSize: 15 }, list: { gap: 10, paddingBottom: 12 }, listEmpty: { flexGrow: 1, justifyContent: 'center' }, emptyIconButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  accordionContent: { gap: 10, paddingTop: 10 },
  rowPaper: { paddingVertical: 7, borderBottomWidth: 0.4, borderColor: '#D3D5CC' }, row: { flexDirection: 'row', alignItems: 'center' }, open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 2, minWidth: 0 }, cover: { width: 51, height: 54 }, title: { color: '#303030', fontSize: 17, lineHeight: 24 }, count: { color: '#727272', fontSize: 13, lineHeight: 20 },
  monthRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }, monthLabel: { fontSize: 20, lineHeight: 28, color: '#30342B', minWidth: 110, textAlign: 'center' }, monthArrow: { fontSize: 30, color: '#555A4F' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56 }, selectionText: { color: '#303030', fontSize: 16 }, deleteSelected: { minHeight: 48, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', borderTopWidth: 0.6, borderColor: '#A5A89F' },
  dateHeaderRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 0.7, borderColor: '#8D9285' },
  dateHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 66, paddingVertical: 10 }, dateHeading: { fontSize: 19, lineHeight: 27, color: '#30342B' }, previewPair: { flexDirection: 'row', paddingRight: 5 }, time: { color: '#777B70', fontSize: 12, lineHeight: 18 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }, characterName: { color: '#4C5149', fontSize: 14, lineHeight: 20, flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 6 }, menuButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, rename: { paddingHorizontal: 6, paddingVertical: 8 }, renameInput: { color: '#303030', fontSize: 17, minHeight: 44, borderBottomWidth: 0.6, borderColor: '#A5A5A5' }, footer: { color: '#25231F', textAlign: 'center', fontSize: 22, lineHeight: 30, paddingVertical: 10 }, empty: { color: '#818181', fontSize: 15, textAlign: 'center', paddingVertical: 36 },
});
