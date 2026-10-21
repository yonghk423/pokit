import { ComicSceneImage } from './ComicSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/comicSceneThumbnails';
import { COMIC_BOARD_MODES, comicCardLayout, comicPageLayout, diagonalComicPage, diagonalPanelPath, type ComicPanel, loadComicBoardMode, saveComicBoardMode, type ComicBoardMode } from '../lib/comicBoardLayout';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { Image } from 'expo-image';
import { useState } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { ThemedText } from '@shared/ui/themed-text';
import { COMIC_SCENES, resolveComicScene, type ComicSceneId } from '../lib/comicSceneImages';
import type { CircularRoutineItem } from './CircularRoutineTimetable';

const modeLabels = { small: 'comicDay.boardSmall', two: 'comicDay.boardTwo', one: 'comicDay.boardOne', comic: 'comicDay.boardComic', hero: 'comicDay.boardHero', page: 'comicDay.boardPage', diagonal: 'comicDay.boardDiagonal' } as const;
function LayoutDiagram({ mode, ink, size = 42 }: { mode: ComicBoardMode; ink: string; size?: number }) {
  const paths = { small: 'M16 4V32 M28 4V32 M4 13H40 M4 23H40', two: 'M22 4V32 M4 18H40', one: 'M4 13H40 M4 23H40', comic: 'M22 4V13 M4 13H40 M4 23H40 M22 23V32', hero: 'M4 22H40 M22 22V32', page: 'M24 4V23 M24 13H40 M4 23H40', diagonal: 'M18 4L26 18 M4 18H40 M26 18L18 32' };
  return <Svg width={size} height={size * 0.82} viewBox="0 0 44 36" accessible={false}><Rect x={4} y={4} width={36} height={28} fill="none" stroke={ink} strokeWidth={1.2} /><Path d={paths[mode]} stroke={ink} strokeWidth={1.2} fill="none" /></Svg>;
}

type BoardItem = Omit<CircularRoutineItem, 'completed'> & { completed?: boolean; memo?: string };
type Common = { ink: string; muted: string; isDark: boolean; choices: Record<string, ComicSceneId> };
export function ComicDayBoard({ items, ink, muted, isDark, choices, onOpen, onComplete, onAdd, onEditTime, onRemove, characterName, onSelectCharacter, onRenameCharacter }: Common & {
  items: BoardItem[]; onOpen: (key: string) => void; onComplete?: (key: string) => void;
  onRemove?: (key: string) => void;
  characterName?: string; onSelectCharacter?: () => void; onRenameCharacter?: () => void;
  onAdd: () => void; onEditTime?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState(loadComicBoardMode);
  const [menuOpen, setMenuOpen] = useState(false);
  const small = viewMode === 'small';
  const [deleteMode, setDeleteMode] = useState(false);
  const [boardWidth, setBoardWidth] = useState(340);
  const renderCard = (item: BoardItem, index: number, panel?: ComicPanel) => {
    const layout = comicCardLayout(viewMode, index);
    const wide = layout.wide;
    const diagonal = panel?.diagonal;
    const cardInk = item.inkColor ?? ink;
    const memo = item.memo?.trim().replace(/\s+/g, ' ') ?? '';
    const captionHeight = memo ? 70 : 52;
    const time = item.startMinutes == null ? item.timeLabel : `${String(Math.floor(item.startMinutes / 60) % 24).padStart(2, '0')}:${String(item.startMinutes % 60).padStart(2, '0')}`;
    return <View pointerEvents="box-none" key={item.key} style={panel ? { position: 'absolute', left: panel.left, top: panel.top, width: panel.width, height: panel.height } : { width: layout.width }}>
      <View pointerEvents="box-none" style={[s.card, { backgroundColor: item.faceColor ?? (isDark ? '#262B28' : '#FFFFFF'), borderColor: muted }, panel && { height: panel.height }, diagonal && { borderWidth: 0, backgroundColor: 'transparent', overflow: 'visible' }]}>
        {diagonal && panel ? <Svg pointerEvents="box-none" width={panel.width} height={panel.height} style={StyleSheet.absoluteFill}><Path d={diagonalPanelPath(panel)} fill={item.faceColor ?? (isDark ? '#262B28' : '#FFFFFF')} stroke={muted} strokeWidth={0.9} onPress={() => onOpen(item.key)} accessibilityLabel={item.label} /></Svg> : null}
        <View pointerEvents="box-none" style={diagonal ? { marginLeft: diagonal.side === 'right' ? diagonal.slant + 2 : 2, marginRight: diagonal.side === 'left' ? diagonal.slant + 2 : 2, paddingTop: 1 } : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onOpen(item.key)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
          <ComicSceneImage contentFit="contain" backgroundColor={item.faceColor ?? (isDark ? '#262B28' : '#FFFFFF')} imageKey={`${resolveComicScene(item.key, item.label, choices).id}:${small ? 'small' : 'large'}`} source={COMIC_SCENE_THUMBNAILS[resolveComicScene(item.key, item.label, choices).id][small ? 'small' : 'large']} style={{ width: '100%', height: panel ? Math.max(30, panel.height - captionHeight - 2) : boardWidth * layout.imageRatio }} />
        </Pressable>
        <View style={[s.comicCaption, { borderTopColor: muted, height: captionHeight }]}>
          <View style={s.captionMeta}>
            <ThemedText style={{ color: muted, fontSize: 10, lineHeight: 15 }}>{String(index + 1).padStart(2, '0')}</ThemedText>
            {onEditTime ? <Pressable accessibilityRole="button" accessibilityLabel={time ? t('todo.timeA11y', { time }) : t('dayPlan.timeUnsetA11y')} onPress={() => onEditTime?.(item.key, item.label)} hitSlop={5} style={s.compactTime}>
              <ThemedText numberOfLines={1} style={{ color: muted, fontSize: 10, lineHeight: 15 }}>◷ {time ?? t('comicDay.time')}</ThemedText>
            </Pressable> : null}
          </View>
          <View style={s.captionTitleRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onOpen(item.key)} style={{ flex: 1, minHeight: 27, justifyContent: 'center' }}>
              <ThemedText numberOfLines={1} style={{ color: cardInk, fontSize: small ? 11 : wide ? 15 : 12, lineHeight: 20 }}>{item.label}</ThemedText>
            </Pressable>
            {onComplete ? <CompletionRadioButton checked={item.completed ?? false} isDark={isDark} size={20} appearance="ink" motion="gentle" accessibilityLabel={item.label} onPress={() => onComplete(item.key)} /> : null}
            {onRemove && deleteMode ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.removeFromSequence', { label: item.label })} onPress={() => onRemove(item.key)} hitSlop={5} style={[s.panelRemove, { backgroundColor: isDark ? '#262B28' : '#FFFFFF' }]}><ThemedText style={{ color: ink, fontSize: 17, lineHeight: 22 }}>×</ThemedText></Pressable> : null}
          </View>
          {memo ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.memo')} onPress={() => onOpen(item.key)} style={{ minHeight: 17 }}>
            <ThemedText numberOfLines={1} ellipsizeMode="tail" style={{ color: cardInk, opacity: 0.75, fontSize: small ? 10 : 11, lineHeight: 16 }}>{memo}</ThemedText>
          </Pressable> : null}
        </View>
        </View>
      </View>
    </View>;

  };
  return <View style={{ flex: 1 }}>
  <ScrollView onScrollBeginDrag={() => setMenuOpen(false)} showsVerticalScrollIndicator={false} contentContainerStyle={s.board}>
    <View style={s.headingRow}>
      <View style={s.titleGroup}>
        <ThemedText numberOfLines={1} style={[s.heading, { color: ink }]}>{t('comicDay.title')}</ThemedText>
        {characterName ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.character.rename')} onPress={onRenameCharacter ?? onSelectCharacter} style={s.characterName}><ThemedText numberOfLines={1} style={{ color: muted, fontSize: 12, lineHeight: 18 }}>{characterName}</ThemedText></Pressable> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.boardView')} accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen(value => !value)} style={[s.deleteToggle, menuOpen && { backgroundColor: '#C8EBDD' }]}><LayoutDiagram mode={viewMode} ink={ink} size={26} /></Pressable>
      {onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.toggleDelete')} accessibilityState={{ selected: deleteMode }} onPress={() => setDeleteMode(value => !value)} style={[s.deleteToggle, deleteMode && { backgroundColor: '#C8EBDD' }]}>
        <Image source={require('../../../../assets/control-illustrations/trash.webp')} style={{ width: 29, height: 29 }} contentFit="contain" accessible={false} />
      </Pressable> : null}
    </View>
    <ThemedText style={[s.hint, { color: muted }]}>{t('comicDay.hint')}</ThemedText>
    <View style={s.grid} onLayout={event => setBoardWidth(event.nativeEvent.layout.width)}>
      {viewMode === 'hero' || viewMode === 'page' || viewMode === 'diagonal' ? Array.from({ length: Math.ceil(items.length / (viewMode === 'hero' ? 3 : 4)) }, (_, pageIndex) => {
        const groupSize = viewMode === 'hero' ? 3 : 4;
        const group = items.slice(pageIndex * groupSize, (pageIndex + 1) * groupSize);
        const page = viewMode === 'diagonal' ? diagonalComicPage(group.length, boardWidth) : comicPageLayout(viewMode, group.length, boardWidth);
        return <View key={group[0].key} style={{ width: '100%', height: page.height }}>{group.map((item, index) => renderCard(item, pageIndex * groupSize + index, page.panels[index]))}</View>;
      }) : items.map((item, index) => renderCard(item, index))}
    </View>
    {!items.length ? <ThemedText style={[s.empty, { color: muted }]}>{t('comicDay.empty')}</ThemedText> : null}
    <Pressable accessibilityRole="button" onPress={onAdd} style={[s.add, { borderColor: muted }]}>
      <ThemedText style={{ color: ink }}>＋ {t('comicDay.add')}</ThemedText>
    </Pressable>
  </ScrollView>
  {menuOpen ? <>
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
    <View accessibilityViewIsModal style={[s.viewMenu, { backgroundColor: isDark ? '#262B28' : '#FFFFFF' }]}>
      <PaperGrain opacity={0.2} /><HanddrawnFrame color={muted} />
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={s.menuContent} showsVerticalScrollIndicator={false}>
      <ThemedText style={{ color: ink, fontSize: 17, marginBottom: 10 }}>{t('comicDay.boardView')}</ThemedText>
      <View style={s.menuGrid}>{COMIC_BOARD_MODES.map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityLabel={t(modeLabels[mode])} accessibilityState={{ selected: viewMode === mode }} onPress={() => { setViewMode(mode); saveComicBoardMode(mode); setMenuOpen(false); }} style={[s.modeOption, { borderColor: muted }, viewMode === mode && { backgroundColor: '#C8EBDD' }]}>
        <LayoutDiagram mode={mode} ink={viewMode === mode ? '#202020' : ink} />
      </Pressable>)}</View>
      </ScrollView>
    </View>
  </> : null}
  </View>;
}

export function ComicSceneDetail({ item, choices, ink, muted, onChoose, onEditTime }: Omit<Common, 'isDark'> & {
  item: CircularRoutineItem; onChoose: (id: ComicSceneId) => void; onEditTime?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const current = resolveComicScene(item.key, item.label, choices);
  return <View style={s.hero}>
    {onEditTime ? <Pressable accessibilityRole="button" onPress={() => onEditTime(item.key, item.label)} style={s.time}>
      <ThemedText style={{ color: ink }}>◷ {item.timeLabel ?? t('dayPlan.timeUnsetHint')}</ThemedText>
    </Pressable> : null}
    <Image source={current.source} style={{ width: '100%', aspectRatio: 1.5 }} contentFit="cover" transition={150} />
    <ThemedText style={{ color: ink, fontSize: 13 }}>{t('comicDay.change')}</ThemedText>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {COMIC_SCENES.map(scene => <Pressable key={scene.id} accessibilityRole="button" accessibilityLabel={t(scene.label)} accessibilityState={{ selected: current.id === scene.id }} onPress={() => onChoose(scene.id)} style={[s.thumbnail, { borderColor: current.id === scene.id ? '#79BFB5' : 'transparent' }]}>
        <Image source={scene.source} style={{ width: 64, height: 44 }} contentFit="cover" />
        <ThemedText style={{ color: muted, fontSize: 11, textAlign: 'center' }}>{t(scene.label)}</ThemedText>
      </Pressable>)}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  viewMenu: { position: 'absolute', right: 16, top: 52, width: 226, maxWidth: '90%', maxHeight: '80%', borderRadius: 5, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  menuContent: { padding: 16 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  modeOption: { width: '47%', minHeight: 60, padding: 8, borderWidth: 0.5, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  board: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 0 },
  deleteToggle: { width: 44, height: 44, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  titleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  characterName: { flexShrink: 1, maxWidth: 90, minHeight: 36, justifyContent: 'center' },
  heading: { fontSize: 21 }, hint: { fontSize: 12, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  comicCaption: { height: 52, paddingHorizontal: 7, paddingTop: 3, paddingBottom: 2, borderTopWidth: 0.5 },
  captionMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 17 }, compactTime: { flex: 1, alignItems: 'flex-end' }, captionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  panelRemove: { minWidth: 27, minHeight: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  card: { borderWidth: 0.8, overflow: 'hidden', borderRadius: 1 },
  time: { minHeight: 44, justifyContent: 'center', flexShrink: 1 },
  add: { marginTop: 22, borderWidth: 1, borderStyle: 'dashed', padding: 20, alignItems: 'center' },
  empty: { textAlign: 'center', paddingVertical: 40 }, hero: { gap: 10, marginBottom: 24 },
  thumbnail: { padding: 3, borderWidth: 2 },
});
