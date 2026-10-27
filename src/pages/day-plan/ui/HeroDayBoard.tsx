import type { HeroCardText } from './HeroCardCaption';
import { useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { MateBagIcon } from './MateBagIcon';
import { DayPlanTabFocusContext } from '../model/dayPlanTabFocus';
import type { HeroCardOpen } from './HeroCardFlip';
import { DECK_OVERVIEW_MOTION } from '../lib/deckOverviewMotion';
import { HeroOverviewCardMotion, type HeroDeckFrame } from './HeroOverviewCardMotion';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { CardToolsFab, type CardToolAction } from './CardToolsFab';
import { DAY_PLAN_DECK_TOP } from '../lib/dayPlanDeckMetrics';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { ComicCheck } from './HeroCheck';
import { SketchPaperButton } from '@shared/ui/sketch-paper-button';
import { ComicSceneImage } from './HeroSceneImage';
import { ComicSceneDeck } from './HeroSceneDeck';
import { HeroCharacterNameButton } from './HeroCharacterNameButton';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { COMIC_BOARD_MODES, comicCardLayout, comicPageLayout, diagonalComicPage, diagonalPanelPath, type ComicPanel, loadComicBoardMode, saveComicBoardMode, type ComicBoardMode } from '../lib/heroBoardLayout';
import { PenFrame } from '@shared/ui/pen-frame';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { Image } from 'expo-image';
import { useContext, useEffect, useRef, useState } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { Animated, Easing, LayoutAnimation, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { ThemedText } from '@shared/ui/themed-text';
import { COMIC_SCENES, resolveComicScene, type ComicSceneId } from '../lib/heroSceneImages';
import type { CircularRoutineItem } from './CircularRoutineTimetable';

const modeLabels = { small: 'comicDay.boardSmall', two: 'comicDay.boardTwo', one: 'comicDay.boardOne', comic: 'comicDay.boardComic', hero: 'comicDay.boardHero', page: 'comicDay.boardPage', diagonal: 'comicDay.boardDiagonal' } as const;
function LayoutDiagram({ mode, ink, size = 42 }: { mode: ComicBoardMode; ink: string; size?: number }) {
  const paths = { small: 'M16 4V32 M28 4V32 M4 13H40 M4 23H40', two: 'M22 4V32 M4 18H40', one: 'M4 13H40 M4 23H40', comic: 'M22 4V13 M4 13H40 M4 23H40 M22 23V32', hero: 'M4 22H40 M22 22V32', page: 'M24 4V23 M24 13H40 M4 23H40', diagonal: 'M18 4L26 18 M4 18H40 M26 18L18 32' };
  return <Svg width={size} height={size * 0.82} viewBox="0 0 44 36" accessible={false}><Rect x={4} y={4} width={36} height={28} fill="none" stroke={ink} strokeWidth={1.2} /><Path d={paths[mode]} stroke={ink} strokeWidth={1.2} fill="none" /></Svg>;
}

/** Last measured grid width, so switching back from the deck paints panels at their final size. */
let lastBoardWidth = 0;

type BoardItem = Omit<CircularRoutineItem, 'completed'> & { completed?: boolean; memo?: string };
type Common = { ink: string; muted: string; isDark: boolean; choices: Record<string, ComicSceneId> };
type SceneLibrary = readonly typeof COMIC_SCENES[number][];
export function ComicDayBoard({ onOpenBag, sceneLibrary = COMIC_SCENES, hideCharacterHeading = false, detailOpen = false, diaryTitle, items, ink, muted, isDark, choices, onOpen, onEditCard, onComplete, onAdd, onEditTime, onRemove, onRemoveMany, characterName, onSelectCharacter, onRenameCharacter }: Common & {
  onOpenBag?: () => void;
  sceneLibrary?: SceneLibrary;
  hideCharacterHeading?: boolean;
  detailOpen?: boolean;
  diaryTitle?: string;
  items: BoardItem[]; onOpen: (key: string, card?: HeroCardOpen) => void; onComplete?: (key: string) => void;
  onRemove?: (key: string) => void;
  onEditCard?: (key: string, text: HeroCardText) => void;
  onRemoveMany?: (keys: string[]) => void;
  characterName?: string; onSelectCharacter?: () => void; onRenameCharacter?: () => void;
  onAdd: () => void; onEditTime?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const focused = useContext(DayPlanTabFocusContext);
  const [emptyScene] = useState(() => sceneLibrary[Math.floor(Math.random() * sceneLibrary.length)] ?? COMIC_SCENES[0]);
  const [viewMode, updateViewMode] = useState(loadComicBoardMode);
  const animateLayout = () => LayoutAnimation.configureNext({
    duration: 300,
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
  const setViewMode = (mode: ComicBoardMode) => {
    if (mode === viewMode) return;
    animateLayout();
    updateViewMode(mode);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  // Diaries open as a card deck; the comic grid appears only from the layout button.
  const cardsFirst = !!diaryTitle;
  const [gridOpen, updateGridOpen] = useState(false);
  const setGridOpen = (open: boolean) => {
    if (open === gridOpen) return;
    gridScrollRef.current?.scrollTo({ y: 0, animated: false });
    gridOffsetRef.current = 0;
    updateGridOpen(open);
  };
  const showCards = cardsFirst && !gridOpen;
  const small = viewMode === 'small';
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const selectedKeys = items.filter(item => selectedForDeletion.includes(item.key)).map(item => item.key);
  const toggleSelected = (key: string) => setSelectedForDeletion(previous => previous.includes(key) ? previous.filter(value => value !== key) : [...previous, key]);
  const openItem = (key: string) => { if (deleteMode && onRemoveMany) toggleSelected(key); else onOpen(key); };
  // Deleting from the card deck borrows the grid; leaving delete mode returns to the deck.
  const [deleteFromCards, setDeleteFromCards] = useState(false);
  const toggleDeleteMode = () => {
    setSelectedForDeletion([]); setMenuOpen(false);
    if (deleteMode) {
      setDeleteMode(false);
      if (deleteFromCards) { setGridOpen(false); setDeleteFromCards(false); }
      return;
    }
    setDeleteFromCards(showCards);
    setGridOpen(true);
    setDeleteMode(true);
  };
  const gridOffsetRef = useRef(0);
  const holdStartedAtTopRef = useRef(false);
  const closeGrid = () => { tapHaptic(); setGridOpen(false); setMenuOpen(false); };
  const gridDismiss = Gesture.Pan().enabled(cardsFirst && gridOpen && !deleteMode)
    .activateAfterLongPress(350).activeOffsetY(16).failOffsetX([-16, 16]).runOnJS(true)
    // Gesture handlers run on touch events, never during render.
    // eslint-disable-next-line react-hooks/refs
    .onBegin(() => { holdStartedAtTopRef.current = gridOffsetRef.current <= 1; })
    // eslint-disable-next-line react-hooks/refs
    .onEnd((event, success) => { if (success && holdStartedAtTopRef.current && event.translationY > 64) closeGrid(); });
  const gridHoldFeedback = Gesture.LongPress().enabled(cardsFirst && gridOpen && !deleteMode)
    .minDuration(350).maxDistance(14).runOnJS(true).onStart(() => tapHaptic());
  const gridGesture = Gesture.Simultaneous(Gesture.Native(), gridDismiss, gridHoldFeedback);
  const { width: windowWidth } = useWindowDimensions();
  const [boardWidth, setBoardWidth] = useState(() => lastBoardWidth || Math.max(1, windowWidth - 32));
  const [sourceFrame, setSourceFrame] = useState<HeroDeckFrame>({ active: 0, width: Math.max(1, windowWidth - 24), height: 320 });
  const [stageWidth, setStageWidth] = useState(windowWidth);
  const [gridTop, setGridTop] = useState(0);
  const gridScrollRef = useRef<ScrollView>(null);
  const [overviewProgress] = useState(() => new Animated.Value(cardsFirst ? 0 : 1));
  useEffect(() => {
    if (!focused) { overviewProgress.stopAnimation(); overviewProgress.setValue(showCards ? 0 : 1); return; }
    const animation = Animated.timing(overviewProgress, {
      toValue: showCards ? 0 : 1,
      duration: showCards ? DECK_OVERVIEW_MOTION.closeDuration : DECK_OVERVIEW_MOTION.openDuration,
      easing: Easing.bezier(...DECK_OVERVIEW_MOTION.bezier), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [showCards, overviewProgress, focused]);
  const deckVisibility = {
    opacity: overviewProgress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 0, 0], extrapolate: 'clamp' }),
    transform: [{ scale: overviewProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] }) }],
  };
  const gridVisibility = {
    opacity: overviewProgress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
  };

  const renderCard = (item: BoardItem, index: number, panel?: ComicPanel, pageTop = 0) => {
    const layout = comicCardLayout(viewMode, index);
    const wide = layout.wide;
    const diagonal = panel?.diagonal;
    const cardInk = item.inkColor ?? ink;
    const memo = item.memo?.trim().replace(/\s+/g, ' ') ?? '';
    const captionHeight = memo ? 70 : 52;
    const time = item.startMinutes == null ? item.timeLabel : `${String(Math.floor(item.startMinutes / 60) % 24).padStart(2, '0')}:${String(item.startMinutes % 60).padStart(2, '0')}`;
    return <HeroOverviewCardMotion key={item.key} progress={overviewProgress} index={index} count={items.length}
      enabled={cardsFirst} source={sourceFrame} stageWidth={stageWidth} sourceTop={(hideCharacterHeading ? DAY_PLAN_DECK_TOP : 56) + (sourceFrame.top ?? 0)}
      parentTop={gridTop + pageTop} style={panel ? { position: 'absolute', left: panel.left, top: panel.top, width: panel.width, height: panel.height } : { width: layout.width }}>
      <View pointerEvents="box-none" style={[s.card, { backgroundColor: item.faceColor ?? (isDark ? '#262B28' : '#FFFFFF'), borderColor: muted }, panel && { height: panel.height }, diagonal && { borderWidth: 0, backgroundColor: 'transparent', overflow: 'visible' }]}>
        {diagonal && panel ? <Svg pointerEvents="box-none" width={panel.width} height={panel.height} style={StyleSheet.absoluteFill}><Path d={diagonalPanelPath(panel)} fill={item.faceColor ?? (isDark ? '#262B28' : '#FFFFFF')} stroke={muted} strokeWidth={0.9} onPress={() => { tapHaptic(); openItem(item.key); }} accessibilityLabel={item.label} /></Svg> : null}
        <View pointerEvents="box-none" style={diagonal ? { marginLeft: diagonal.side === 'right' ? diagonal.slant + 2 : 2, marginRight: diagonal.side === 'left' ? diagonal.slant + 2 : 2, paddingTop: 1 } : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={() => { tapHaptic(); openItem(item.key); }} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
          <ComicSceneImage contentFit="contain" backgroundColor={item.faceColor ?? (isDark ? '#262B28' : '#FFFFFF')} imageKey={`${resolveComicScene(item.key, item.label, choices).id}:960`} source={COMIC_SCENE_THUMBNAILS[resolveComicScene(item.key, item.label, choices).id]} fallbackSource={resolveComicScene(item.key, item.label, choices).source} style={{ width: '100%', height: panel ? Math.max(30, panel.height - captionHeight - 2) : boardWidth * layout.imageRatio }} />
        </Pressable>
        <View style={[s.comicCaption, { borderTopColor: muted, height: captionHeight }]}>
          <View style={s.captionMeta}>
            <ThemedText style={{ color: muted, fontSize: 10, lineHeight: 15 }}>{String(index + 1).padStart(2, '0')}</ThemedText>
            {onEditTime ? <Pressable accessibilityRole="button" accessibilityLabel={time ? t('todo.timeA11y', { time }) : t('dayPlan.timeUnsetA11y')} onPress={() => { tapHaptic(); onEditTime?.(item.key, item.label); }} hitSlop={5} style={s.compactTime}>
              <ThemedText numberOfLines={1} style={{ color: muted, fontSize: 10, lineHeight: 15 }}>◷ {time ?? t('comicDay.time')}</ThemedText>
            </Pressable> : null}
          </View>
          <View style={s.captionTitleRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={() => { tapHaptic(); openItem(item.key); }} style={{ flex: 1, minHeight: 27, justifyContent: 'center' }}>
              <ThemedText numberOfLines={1} style={{ color: cardInk, fontSize: small ? 11 : wide ? 15 : 12, lineHeight: 20 }}>{item.label}</ThemedText>
            </Pressable>
            {onComplete ? <CompletionRadioButton checked={item.completed ?? false} isDark={isDark} size={20} appearance="ink" motion="gentle" accessibilityLabel={item.label} onPress={() => onComplete(item.key)} /> : null}
            {onRemoveMany && deleteMode ? <Pressable accessibilityRole="checkbox" accessibilityLabel={t('comicDay.selectForDeletion', { label: item.label })} accessibilityState={{ checked: selectedKeys.includes(item.key) }} onPress={() => { tapHaptic('select'); toggleSelected(item.key); }} style={s.panelRemove}><ComicCheck tone="destructive" checked={selectedKeys.includes(item.key)} size={25} /></Pressable> : onRemove && deleteMode ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.removeFromSequence', { label: item.label })} onPress={() => { tapHaptic('warn'); onRemove(item.key); }} hitSlop={5} style={[s.panelRemove, { backgroundColor: isDark ? '#262B28' : '#FFFFFF' }]}><ThemedText style={{ color: ink, fontSize: 17, lineHeight: 22 }}>×</ThemedText></Pressable> : null}
          </View>
          {memo ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.memo')} onPress={() => { tapHaptic(); openItem(item.key); }} style={{ minHeight: 17 }}>
            <ThemedText numberOfLines={1} ellipsizeMode="tail" style={{ color: cardInk, opacity: 0.75, fontSize: small ? 10 : 11, lineHeight: 16 }}>{memo}</ThemedText>
          </Pressable> : null}
        </View>
        </View>
      </View>
    </HeroOverviewCardMotion>;

  };
  const heading = <>{!hideCharacterHeading ? <View style={s.headingRow}>
    {!hideCharacterHeading && characterName ? <HeroCharacterNameButton name={characterName} ink={ink} enabled={focused} fontSize={18} lineHeight={26} onPress={() => (onRenameCharacter ?? onSelectCharacter)?.()} /> : null}
  </View> : null}{!showCards ? <ThemedText style={[s.hint, { color: muted }]}>{t(diaryTitle ? 'comicDiary.sceneCount' : 'comicDay.hint', { count: items.length })}</ThemedText> : null}</>;
  const bagAction: CardToolAction | undefined = onOpenBag ? { key: 'bag', testID: 'comic-open-mate-bag', label: t('tabs.dayPlan'), onPress: () => { useServiceTutorial.getState().advance('comicTools', 'rhythmAdd', { mode: 'rhythm' }); onOpenBag(); }, tutorialSteps: ['comicTools'], icon: <MateBagIcon isDark={isDark} /> } : undefined;
  const tools = items.length > 0 && !(deleteMode && onRemoveMany) && !menuOpen ? <CardToolsFab isDark={isDark} overview={gridOpen} testID="comic-card-tools-fab" concept="film" belowAction={bagAction} actions={[
    ...(cardsFirst && gridOpen ? [{ key: 'cards', testID: 'comic-show-cards', label: t('comicDay.showCards'), onPress: () => { setMenuOpen(false); setDeleteMode(false); setDeleteFromCards(false); setSelectedForDeletion([]); setGridOpen(false); }, icon: <Svg width={26} height={26} viewBox="0 0 30 30"><Path d="M10 3L25 4L26 21L12 22ZM6 7L21 6L23 25L7 26Z" fill={isDark ? '#313632' : '#FFFFFF'} stroke={ink} strokeWidth={1} strokeLinejoin="round" /><Path d="M3 11L18 10L20 28L4 28Z" fill={isDark ? '#313632' : '#FFFFFF'} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" /></Svg> } satisfies CardToolAction] : []),
    ...(!deleteMode ? [{ key: 'layout', testID: 'comic-board-view', label: t('comicDay.boardView'), selected: menuOpen, onPress: () => { if (showCards) setGridOpen(true); else setMenuOpen(value => !value); }, icon: <LayoutDiagram mode={viewMode} ink={ink} size={26} /> } satisfies CardToolAction] : []),
    ...(onRemove || onRemoveMany ? [{ key: 'delete', testID: 'comic-card-delete-mode', label: t('comicDay.toggleDelete'), selected: deleteMode, onPress: toggleDeleteMode, icon: <Image source={require('../../../../assets/control-illustrations/trash.webp')} style={{ width: 29, height: 29 }} contentFit="contain" accessible={false} /> } satisfies CardToolAction] : []),
  ]} /> : !items.length && bagAction ? <ServiceTutorialTarget steps={['comicTools']} style={{ position: 'absolute', right: 14, bottom: 96, zIndex: 4 }}><Pressable testID={bagAction.testID} accessibilityRole="button" accessibilityLabel={bagAction.label} onPress={() => { tapHaptic(); bagAction.onPress(); }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 4 }}>{bagAction.icon}</Pressable></ServiceTutorialTarget> : null;
  const canvas = isDark ? '#262B28' : '#F7F6F4';
  if (!items.length) return <View style={{ flex: 1, backgroundColor: canvas }}>
    <View style={[s.deckHeading, hideCharacterHeading && { height: DAY_PLAN_DECK_TOP }]}>{hideCharacterHeading ? null : heading}</View>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
      <ServiceTutorialTarget steps={['comicStart']} style={{ width: '100%', maxWidth: 440 }}><Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.add')} onPress={() => { tapHaptic(); onAdd(); }} style={{ width: '100%', aspectRatio: 1.15, borderRadius: 18, overflow: 'hidden' }}>
        <ComicSceneImage
          priority="high"
          contentFit="contain"
          backgroundColor={canvas}
          imageKey={`${emptyScene.id}:empty-hero`}
          source={emptyScene.source}
          style={StyleSheet.absoluteFill}
        />
      </Pressable></ServiceTutorialTarget>
      <ServiceTutorialTarget steps={['comicStart']}><SketchPaperButton iconOnly strongFrame label={t('comicDay.add')} ink={ink} onPress={onAdd} /></ServiceTutorialTarget>
    </View>
    {tools}
  </View>;
  return <View style={{ flex: 1, backgroundColor: canvas }} onLayout={({ nativeEvent: { layout } }) => { if (focused && layout.width > 0) setStageWidth(previous => previous === layout.width ? previous : layout.width); }}>
    {cardsFirst ? <Animated.View testID="comic-card-deck-layer" pointerEvents={showCards ? 'auto' : 'none'} accessibilityElementsHidden={!showCards} importantForAccessibility={showCards ? 'auto' : 'no-hide-descendants'} style={[StyleSheet.absoluteFill, deckVisibility]}>
      <View style={[s.deckHeading, hideCharacterHeading && { height: DAY_PLAN_DECK_TOP }]}>{hideCharacterHeading ? null : heading}</View>
      <View style={s.deckStage}>
        <ComicSceneDeck detailOpen={detailOpen} items={items} ink={ink} muted={muted} isDark={isDark} choices={choices} onOpen={onOpen} onEditCard={onEditCard} interactive={showCards} onFrameChange={setSourceFrame} onShowOverview={() => { setGridOpen(true); setMenuOpen(false); }} />
      </View>
      <ServiceTutorialTarget steps={showCards ? ['comicStart'] : []} style={s.deckAdd}><SketchPaperButton iconOnly strongFrame label={t('comicDay.add')} ink={ink} onPress={onAdd} /></ServiceTutorialTarget>
    </Animated.View> : null}
    <Animated.View testID="comic-card-grid-layer" pointerEvents={showCards ? 'none' : 'auto'} accessibilityElementsHidden={showCards} importantForAccessibility={showCards ? 'no-hide-descendants' : 'auto'} style={[{ flex: 1 }, gridVisibility]}>
  <GestureDetector gesture={gridGesture}><ScrollView ref={gridScrollRef} scrollEnabled={!showCards} testID="comic-card-overview" onScrollBeginDrag={() => setMenuOpen(false)} onScroll={event => { gridOffsetRef.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={[s.board, { flexGrow: 1 }]}>

    {heading}
    <View testID="comic-card-grid-layout" style={s.grid} onLayout={event => {
      const { width, y } = event.nativeEvent.layout;
      if (!focused || width <= 0) return;
      setGridTop(previous => previous === y ? previous : y);
      lastBoardWidth = width;
      setBoardWidth(previous => previous === width ? previous : width);
    }}>
      {viewMode === 'hero' || viewMode === 'page' || viewMode === 'diagonal' ? Array.from({ length: Math.ceil(items.length / (viewMode === 'hero' ? 3 : 4)) }, (_, pageIndex) => {
        const groupSize = viewMode === 'hero' ? 3 : 4;
        const group = items.slice(pageIndex * groupSize, (pageIndex + 1) * groupSize);
        const page = viewMode === 'diagonal' ? diagonalComicPage(group.length, boardWidth) : comicPageLayout(viewMode, group.length, boardWidth);
        let pageTop = 0;
        for (let before = 0; before < pageIndex; before++) {
          const priorCount = Math.min(groupSize, items.length - before * groupSize);
          pageTop += (viewMode === 'diagonal' ? diagonalComicPage(priorCount, boardWidth) : comicPageLayout(viewMode, priorCount, boardWidth)).height + 8;
        }
        return <View key={group[0].key} style={{ width: '100%', height: page.height }}>{group.map((item, index) => renderCard(item, pageIndex * groupSize + index, page.panels[index], pageTop))}</View>;
      }) : items.map((item, index) => renderCard(item, index))}
    </View>
    {!items.length ? <ThemedText style={[s.empty, { color: muted }]}>{t('comicDay.empty')}</ThemedText> : null}
    <ServiceTutorialTarget steps={!showCards ? ['comicStart'] : []} style={s.add}><SketchPaperButton label={t('comicDay.add')} ink={ink} onPress={onAdd} /></ServiceTutorialTarget>
  </ScrollView></GestureDetector>
  {deleteMode && onRemoveMany ? <View style={[s.selectionBar, { backgroundColor: isDark ? '#262B28' : '#FFFFFF', borderColor: muted }]}>
    <View style={s.selectionActions}>
      <ThemedText style={{ color: ink, fontSize: 13 }}>{t('comicDay.selectedSceneCount', { count: selectedKeys.length })}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={t(selectedKeys.length === items.length && items.length > 0 ? 'comicDay.clearSelection' : 'comicDay.selectAll')} onPress={() => setSelectedForDeletion(selectedKeys.length === items.length ? [] : items.map(item => item.key))} style={s.selectionTouch}><ThemedText style={{ color: ink, fontSize: 13 }}>{t(selectedKeys.length === items.length && items.length > 0 ? 'comicDay.clearSelection' : 'comicDay.selectAll')}</ThemedText></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={toggleDeleteMode} style={s.selectionTouch}><ThemedText style={{ color: ink, fontSize: 13 }}>{t('common.cancel')}</ThemedText></Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.deleteSelected', { count: selectedKeys.length })} accessibilityState={{ disabled: !selectedKeys.length }} disabled={!selectedKeys.length} onPress={() => { tapHaptic('warn'); onRemoveMany(selectedKeys); }} style={[s.bulkDelete, { opacity: selectedKeys.length ? 1 : 0.35 }]}>
      <HanddrawnFrame color={muted} /><ThemedText style={{ color: ink, fontSize: 15 }}>{t('comicDay.deleteSelected', { count: selectedKeys.length })}</ThemedText>
    </Pressable>
  </View> : null}
  </Animated.View>
  {tools}
  {menuOpen ? <>
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFill} onPress={() => { tapHaptic(); setMenuOpen(false); }} />
    <View accessibilityViewIsModal style={[s.viewMenu, { backgroundColor: isDark ? '#262B28' : '#FFFFFF' }]}>
      <PaperGrain opacity={0.2} /><HanddrawnFrame color={muted} />
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={s.menuContent} showsVerticalScrollIndicator={false}>
      <ThemedText style={{ color: ink, fontSize: 17, marginBottom: 10 }}>{t('comicDay.boardView')}</ThemedText>
      <View style={s.menuGrid}>{COMIC_BOARD_MODES.map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityLabel={t(modeLabels[mode])} accessibilityState={{ selected: viewMode === mode }} onPress={() => { tapHaptic('select'); setViewMode(mode); saveComicBoardMode(mode); setMenuOpen(false); }} style={[s.modeOption, { borderColor: muted }, viewMode === mode && { backgroundColor: '#F3F0E8' }]}>
        <LayoutDiagram mode={mode} ink={viewMode === mode ? '#202020' : ink} />
      </Pressable>)}</View>
      </ScrollView>
    </View>
  </> : null}
  </View>;
}

export function ComicSceneDetail({ item, choices, ink, muted, onChoose, onEditTime, sceneLibrary = COMIC_SCENES.filter(scene => !scene.id.startsWith('puppy-')) }: Omit<Common, 'isDark'> & {
  sceneLibrary?: SceneLibrary;
  item: CircularRoutineItem; onChoose: (id: ComicSceneId) => void; onEditTime?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const current = resolveComicScene(item.key, item.label, choices);
  return <View style={s.hero}>
    {onEditTime ? <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); onEditTime(item.key, item.label); }} style={s.time}>
      <ThemedText style={{ color: ink }}>◷ {item.timeLabel ?? t('dayPlan.timeUnsetHint')}</ThemedText>
    </Pressable> : null}
    <ComicSceneImage priority="high" contentFit="contain" backgroundColor="#F5E8CF" imageKey={`${current.id}:detail-hero`} source={current.source} style={{ width: '100%', aspectRatio: 3 / 4 }} />
    <ThemedText style={{ color: ink, fontSize: 13 }}>{t('comicDay.change')}</ThemedText>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {sceneLibrary.map(scene => <Pressable key={scene.id} accessibilityRole="button" accessibilityLabel={t(scene.label)} accessibilityState={{ selected: current.id === scene.id }} onPress={() => { tapHaptic('select'); onChoose(scene.id); }} style={[s.thumbnail, { borderColor: 'transparent' }]}>
        {current.id === scene.id ? <PenFrame color={ink} /> : null}
        <ComicSceneImage contentFit="contain" backgroundColor="#F5E8CF" imageKey={`${scene.id}:detail-thumb`} source={scene.source} style={{ width: 64, height: 44 }} />
        <ThemedText style={{ color: muted, fontSize: 11, textAlign: 'center' }}>{t(scene.label)}</ThemedText>
      </Pressable>)}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  selectionBar: { padding: 12, gap: 8, borderTopWidth: 0.5 },
  selectionActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectionTouch: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 8 },
  bulkDelete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  viewMenu: { position: 'absolute', right: 16, top: 52, width: 226, maxWidth: '90%', maxHeight: '80%', borderRadius: 5, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  menuContent: { padding: 16 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  modeOption: { width: '47%', minHeight: 60, padding: 8, borderWidth: 0.5, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  board: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  deckHeading: { height: 56, paddingHorizontal: 16, paddingTop: 6 },
  deckStage: { flex: 1, minHeight: 0 },
  deckAdd: { position: 'absolute', right: 16, bottom: 8, alignSelf: 'flex-end', zIndex: 2 },
  headingRow: { height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 0 },
  deleteToggle: { width: 44, height: 44, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  titleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  heading: { fontSize: 18 }, hint: { fontSize: 12, marginBottom: 8 }, emptyIcon: { alignSelf: 'flex-start', marginTop: 2, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  comicCaption: { height: 52, paddingHorizontal: 7, paddingTop: 3, paddingBottom: 2, borderTopWidth: 0.5 },
  captionMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 17 }, compactTime: { flex: 1, alignItems: 'flex-end' }, captionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  panelRemove: { minWidth: 27, minHeight: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  card: { borderWidth: 0.8, overflow: 'hidden', borderRadius: 1 },
  time: { minHeight: 44, justifyContent: 'center', flexShrink: 1 },
  add: { marginTop: 20, marginBottom: 8 },
  empty: { textAlign: 'center', paddingVertical: 40 }, hero: { gap: 10, marginBottom: 24 },
  thumbnail: { padding: 3, borderWidth: 2 },
});
