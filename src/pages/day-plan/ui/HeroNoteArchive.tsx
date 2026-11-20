import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { AppWallpaperBackground } from '@shared/ui/app-wallpaper';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { loadNoteArchive, type ArchivedNoteMonth } from '../lib/heroNoteArchive';
import { HeroCanvasNote } from './HeroCanvasNote';

// Fixed offsets keep each month in place when returning from the editor.
const notebookPlacements = [
  { x: -2, y: 2, angle: -6 }, { x: 2, y: 10, angle: 5 },
  { x: -1, y: 4, angle: -4 }, { x: 2, y: 9, angle: 6 },
  { x: -2, y: 0, angle: -5 }, { x: 1, y: 7, angle: 4 },
];
// A shuffled pastel palette; the year shifts it without changing colors on rerender.
const notebookColors = [
  { cover: '#E9DCEB', spine: '#CDBDD1' }, // lilac
  { cover: '#DCE8D9', spine: '#BCCDB7' }, // sage
  { cover: '#F2DDD2', spine: '#D8BFB2' }, // peach
  { cover: '#DAE7EE', spine: '#B8CDD9' }, // sky
  { cover: '#F0E8C9', spine: '#D5CAA4' }, // butter
  { cover: '#EEDADD', spine: '#D3B9BF' }, // rose
  { cover: '#D7E9E2', spine: '#B5CEC3' }, // mint
  { cover: '#E0DFF0', spine: '#BFBED6' }, // periwinkle
  { cover: '#F1E1C9', spine: '#D7C3A5' }, // apricot
  { cover: '#E8DFD5', spine: '#CDC0B2' }, // oat
  { cover: '#D9E8E9', spine: '#B7CECF' }, // aqua
  { cover: '#ECDDE5', spine: '#D0BAC7' }, // mauve
];
const monthName = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

export function HeroNoteArchive({ year }: { year: number }) {
  const insets = useSafeAreaInsets();
  const [months, setMonths] = useState(loadNoteArchive);
  const [opened, setOpened] = useState<ArchivedNoteMonth | null>(null);
  const [selected, setSelected] = useState(0);
  const [editorTop, setEditorTop] = useState(0);
  useFocusEffect(useCallback(() => { setMonths(loadNoteArchive()); }, []));
  const visible = months.filter(group => group.month.startsWith(`${year}-`));
  const note = opened?.entries[selected];
  const close = () => { setOpened(null); setMonths(loadNoteArchive()); };
  return <View style={{ flex: 1 }}>
    <ScrollView testID="archive-notebook-scroll" contentContainerStyle={s.content}>
      <View testID="archive-notebook-grid" style={s.grid}>
        {visible.map(group => {
          const colors = notebookColors[(Number(group.month.slice(0, 4)) + Number(group.month.slice(5)) - 1) % notebookColors.length];
          const placement = notebookPlacements[(Number(group.month.slice(5)) - 1) % notebookPlacements.length];
          return <View key={group.month} style={s.cell}>
          <Pressable testID={`archive-notebook-${group.month}`} accessibilityRole="button" accessibilityLabel={`${monthName(group.month)} ${year}, ${group.entries.length} ${group.entries.length === 1 ? 'entry' : 'entries'}`} onPress={() => { tapHaptic(); setSelected(0); setOpened(group); }} style={[s.notebook, { backgroundColor: colors.cover, transform: [{ translateX: placement.x }, { translateY: placement.y }, { rotate: `${placement.angle}deg` }] }]}>
            <PaperGrain opacity={0.55} />
            <View pointerEvents="none" style={[s.spine, { backgroundColor: colors.spine }]} />
            <View pointerEvents="none" style={s.pages} />
            <ThemedText numberOfLines={1} adjustsFontSizeToFit style={s.month}>{monthName(group.month)}</ThemedText>
            <ThemedText style={s.year}>{year}</ThemedText>
            <View style={{ flex: 1 }} />
            <ThemedText numberOfLines={1} adjustsFontSizeToFit style={s.count}>{group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}</ThemedText>
            <View pointerEvents="none" style={s.band} />
          </Pressable>
        </View>; })}
      </View>
      {!visible.length ? <ThemedText style={s.empty}>No notes this year.</ThemedText> : null}
    </ScrollView>
    {opened && note ? <AppModal visible animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: '#F7F6F4', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <AppWallpaperBackground />
        <View style={s.header}>
          <ThemedText style={s.heading}>{monthName(opened.month)} {year}</ThemedText>
          <Pressable testID="archive-note-close" accessibilityRole="button" accessibilityLabel="Close notebook" onPress={close} style={s.close}><ThemedText>Close</ThemedText></Pressable>
        </View>
        <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dates}>
          {opened.entries.map((entry, index) => <Pressable key={entry.key} testID={`archive-note-date-${entry.monthly ? 'monthly' : entry.date}`} accessibilityRole="tab" accessibilityState={{ selected: selected === index }} onPress={() => { tapHaptic('select'); setSelected(index); }} style={s.day}>
            <ThemedText style={{ color: '#30342B', opacity: selected === index ? 1 : 0.5, textDecorationLine: selected === index ? 'underline' : 'none' }}>{entry.monthly ? 'Monthly' : new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</ThemedText>
          </Pressable>)}
        </ScrollView></View>
        <View style={{ flex: 1 }} onLayout={({ nativeEvent }) => setEditorTop(nativeEvent.layout.y)}>
          <HeroCanvasNote key={note.key} date={note.date} ink="#30342B" archiveView keyboardVerticalOffset={editorTop} monthlyHeight={note.monthly ? 0 : undefined} />
        </View>
      </View>
    </AppModal> : null}
  </View>;
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 120, alignItems: 'center' },
  grid: { width: '100%', maxWidth: 520, flexDirection: 'row', flexWrap: 'wrap', rowGap: 32 },
  cell: { width: '33.333333%', paddingHorizontal: 7, alignItems: 'center' },
  notebook: { width: '86%', aspectRatio: 0.79, backgroundColor: '#EFE7D2', borderTopRightRadius: 12, borderBottomRightRadius: 12, paddingTop: 12, paddingLeft: 7, paddingRight: 16, paddingBottom: 12, boxShadow: '2px 5px 7px rgba(65,53,32,0.22)' },
  spine: { position: 'absolute', top: 0, bottom: 3, left: 3, width: 2, backgroundColor: '#D8CFBA' },
  pages: { position: 'absolute', bottom: 2, left: 4, right: 4, height: 3, backgroundColor: '#D5CCB7', borderBottomRightRadius: 8 },
  band: { position: 'absolute', right: 9, top: 0, bottom: 0, width: 5, backgroundColor: '#363732', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#56564D' },
  month: { fontSize: 12, lineHeight: 17, color: '#303129' }, year: { fontSize: 14, lineHeight: 20, color: '#303129' }, count: { fontSize: 11, lineHeight: 16, color: '#555348' },
  empty: { paddingTop: 100, color: '#777B72', textAlign: 'center' },
  header: { minHeight: 52, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 12 }, heading: { flex: 1, fontSize: 18, color: '#30342B' }, close: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  dates: { paddingHorizontal: 16, gap: 8, paddingBottom: 28 }, day: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
});
