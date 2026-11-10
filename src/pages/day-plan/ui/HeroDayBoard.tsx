import { HeroCardFlipContext } from './HeroDiaryCardSides';
import { HeroTrashIcon } from './HeroTrashIcon';
import { heroCameraBottom } from './HeroCameraPrintAnimation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DayPlanCanvasContext } from '../model/dayPlanHeaderActions';
import { HeroRestingCamera } from './HeroRestingCamera';
import { HeroDraggablePrint } from './HeroDraggablePrint';
import { loadPrintPositions, savePrintPosition } from '../lib/heroPrintPositions';
import { HeroScaledPrint } from './HeroScaledPrint';
import { polaroidScatter } from '../lib/polaroidScatter';
import { useWallpaperStore } from '@shared/lib/wallpaper/wallpaperStore';
import type { AppFontId } from '@shared/lib/ui-font';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { HeroPolaroidSurface } from './HeroPolaroidSurface';
import { HeroCharacterPickerActionContext } from '../model/heroCharacterPickerAction';
import { HeroRandomDraftCard, type HeroRandomDraftHandle } from './HeroRandomDraftCard';
import { HeroEntryActions } from './HeroEntryActions';
import type { HeroCardText } from './HeroCardCaption';
import { useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { MateBagIcon } from './MateBagIcon';
import { DayPlanTabFocusContext } from '../model/dayPlanTabFocus';
import type { HeroCardOpen } from './HeroCardFlip';
import { HeroOverviewCardMotion, type HeroDeckFrame } from './HeroOverviewCardMotion';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { CardToolsFab, type CardToolAction } from './CardToolsFab';
import { HeroCardToolsPortal, HeroCardToolsRegisterContext, HeroCardToolsOutlet } from '../model/heroCardToolsPortal';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { ComicCheck } from './HeroCheck';
import { SketchPaperButton } from '@shared/ui/sketch-paper-button';
import { ComicSceneImage } from './HeroSceneImage';
import { ComicSceneDeck } from './HeroSceneDeck';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { COMIC_BOARD_MODES, comicCardLayout, comicPageLayout, diagonalComicPage, diagonalPanelPath, type ComicPanel, loadComicBoardMode, saveComicBoardMode, type ComicBoardMode } from '../lib/heroBoardLayout';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { Image } from 'expo-image';
import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { Image as NativeImage, Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { ThemedText } from '@shared/ui/themed-text';
import { COMIC_SCENES, resolveComicScene, type ComicSceneId } from '../lib/heroSceneImages';
import { COMIC_CHARACTERS, SELECTABLE_COMIC_SCENES, type ComicCharacter } from '../lib/heroCharacters';
import type { CircularRoutineItem } from './CircularRoutineTimetable';

const modeLabels = { small: 'comicDay.boardSmall', two: 'comicDay.boardTwo', one: 'comicDay.boardOne', comic: 'comicDay.boardComic', hero: 'comicDay.boardHero', page: 'comicDay.boardPage', diagonal: 'comicDay.boardDiagonal' } as const;
function LayoutDiagram({ mode, ink, size = 42 }: { mode: ComicBoardMode; ink: string; size?: number }) {
  const paths = { small: 'M16 4V32 M28 4V32 M4 13H40 M4 23H40', two: 'M22 4V32 M4 18H40', one: 'M4 13H40 M4 23H40', comic: 'M22 4V13 M4 13H40 M4 23H40 M22 23V32', hero: 'M4 22H40 M22 22V32', page: 'M24 4V23 M24 13H40 M4 23H40', diagonal: 'M18 4L26 18 M4 18H40 M26 18L18 32' };
  return <Svg width={size} height={size * 0.82} viewBox="0 0 44 36" accessible={false}><Rect x={4} y={4} width={36} height={28} fill="none" stroke={ink} strokeWidth={1.2} /><Path d={paths[mode]} stroke={ink} strokeWidth={1.2} fill="none" /></Svg>;
}

/** Last measured grid width, so switching back from the deck paints panels at their final size. */
let lastBoardWidth = 0;

type BoardItem = Omit<CircularRoutineItem, 'completed'> & { completed?: boolean; memo?: string; artworkUri?: string; exportDate?: string | number; fontId?: AppFontId };
type Common = { ink: string; muted: string; isDark: boolean; choices: Record<string, ComicSceneId> };
type SceneLibrary = readonly typeof COMIC_SCENES[number][];
export function ComicDayBoard({ syncMainState = true, presentationOverride, emptyContent, focusSceneId, onOpenBag, historyOverview = false, overviewOpen, onOverviewChange, onAddPhoto, onCreateRandom, onDraftChange, onActiveSceneChange, hideEntryActions = false, sceneLibrary = SELECTABLE_COMIC_SCENES, hideCharacterHeading = false, detailOpen = false, diaryTitle, items, ink, muted, isDark, choices, onOpen, onEditCard, onComplete, onAdd, onEditTime, onRemove, onRemoveMany, characterName, character = COMIC_CHARACTERS[0], onSelectCharacter, onRenameCharacter }: Common & {
  syncMainState?: boolean;
  presentationOverride?: 'stack' | 'carousel';
  emptyContent?: ReactNode;
  onOpenBag?: () => void;
  historyOverview?: boolean;
  overviewOpen?: boolean;
  onOverviewChange?: (open: boolean) => void;
  onAddPhoto?: () => void;
  hideEntryActions?: boolean;
  onActiveSceneChange?: (id: string) => void;
  focusSceneId?: string | null;
  onDraftChange?: (image: ComicSceneId, text: HeroCardText) => void;
  onCreateRandom?: (image: ComicSceneId, text: HeroCardText, addAnother?: boolean) => void;
  sceneLibrary?: SceneLibrary;
  hideCharacterHeading?: boolean;
  detailOpen?: boolean;
  diaryTitle?: string;
  items: BoardItem[]; onOpen: (key: string, card?: HeroCardOpen) => void; onComplete?: (key: string) => void;
  onRemove?: (key: string) => void;
  onEditCard?: (key: string, text: HeroCardText) => void;
  onRemoveMany?: (keys: string[]) => void;
  characterName?: string; character?: ComicCharacter; onSelectCharacter?: () => void; onRenameCharacter?: () => void;
  onAdd: () => void; onEditTime?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const toolsHost = useContext(HeroCardToolsRegisterContext);
  const registerAdd = useContext(HeroCharacterPickerActionContext)?.registerAdd;
  const focused = useContext(DayPlanTabFocusContext);
  const randomDraftRef = useRef<HeroRandomDraftHandle>(null);
  const [emptyScene] = useState(() => sceneLibrary[Math.floor(Math.random() * sceneLibrary.length)] ?? COMIC_SCENES[0]);
  const [viewMode, updateViewMode] = useState<ComicBoardMode>(() => diaryTitle ? 'small' : loadComicBoardMode());
  useEffect(() => {
    if (viewMode === 'diagonal') {
      updateViewMode('comic');
      saveComicBoardMode('comic');
    }
  }, [viewMode]);
  const animateLayout = () => undefined;
  const setViewMode = (mode: ComicBoardMode) => {
    if (mode === viewMode) return;
    animateLayout();
    updateViewMode(mode);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  // Diaries open as a card deck; the comic grid appears only from the layout button.
  const cardsFirst = !!diaryTitle;
  const [localGridOpen, updateGridOpen] = useState(false);
  const gridOpen = overviewOpen ?? localGridOpen;
  const setGridOpen = (open: boolean) => {
    if (open === gridOpen) return;
    gridScrollRef.current?.scrollTo({ y: 0, animated: false });
    gridOffsetRef.current = 0;
    updateGridOpen(open);
    onOverviewChange?.(open);
  };
  const showCards = cardsFirst && !gridOpen;
  useLayoutEffect(() => {
    if (!syncMainState || !focused || !cardsFirst || !items.length || detailOpen) return;
    registerAdd?.(onAdd);
    return () => registerAdd?.(null);
  }, [syncMainState, registerAdd, focused, cardsFirst, items.length, detailOpen, onAdd]);
  const small = viewMode === 'small';
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const selectedKeys = items.filter(item => selectedForDeletion.includes(item.key)).map(item => item.key);
  const toggleSelected = (key: string) => setSelectedForDeletion(previous => previous.includes(key) ? previous.filter(value => value !== key) : [...previous, key]);
  const [overviewFocusKey, setOverviewFocusKey] = useState<string | null>(null);
  useEffect(() => { if (gridOpen) setOverviewFocusKey(null); }, [gridOpen]);
  const openItem = (key: string) => {
    if (deleteMode && onRemoveMany) toggleSelected(key);
    else if (cardsFirst) { setOverviewFocusKey(key); setGridOpen(false); }
    else onOpen(key);
  };
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
  const activeCardFlip = useRef<(() => void) | null>(null);
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
  const gridNative = Gesture.Native();
  const gridGesture = Gesture.Simultaneous(gridNative, gridDismiss, gridHoldFeedback);
  const { width: windowWidth } = useWindowDimensions();
  const [boardWidth, setBoardWidth] = useState(() => lastBoardWidth || Math.max(1, windowWidth - 32));
  const safeInsets = useSafeAreaInsets();
  const canvasContext = useContext(DayPlanCanvasContext);
  const setCanvasExpanded = canvasContext?.setExpanded;
  useLayoutEffect(() => {
    setCanvasExpanded?.(cardsFirst);
    return () => setCanvasExpanded?.(false);
  }, [setCanvasExpanded, cardsFirst]);
  const upperReach = (canvasContext?.headerHeight ?? 0) + safeInsets.top;
  const [scatterHeights, setScatterHeights] = useState<Record<string, number>>({});
  const [printPositions, setPrintPositions] = useState(loadPrintPositions);
  const [draggingPrint, setDraggingPrint] = useState<string | null>(null);
  const scatter = polaroidScatter(boardWidth, items.map(item => item.key), scatterHeights);
  const anchors = scatter.frames;
  scatter.frames = scatter.frames.map((frame, index) => {
    const saved = printPositions[items[index].key];
    return saved ? { ...frame, left: Math.max(4, Math.min(boardWidth - frame.width - 4, saved.x * boardWidth)), top: Math.max(8 - upperReach, saved.y * boardWidth), rotation: saved.rotation ?? frame.rotation, zIndex: 100 + saved.order } : frame;
  });
  scatter.height = Math.max(scatter.height, ...scatter.frames.map(frame => frame.top + frame.height + 36));
  const [sourceFrame, setSourceFrame] = useState<HeroDeckFrame>({ active: 0, width: Math.max(1, windowWidth - 24), height: 320 });
  const activeKey = items[sourceFrame.active]?.key;
  useEffect(() => { if (activeKey) onActiveSceneChange?.(activeKey); }, [activeKey, onActiveSceneChange]);
  const [stageWidth, setStageWidth] = useState(windowWidth);
  const gridScrollRef = useRef<ScrollView>(null);
  const overviewSettled = !showCards;
  const [overviewProgress] = useState(() => new Animated.Value(showCards ? 0 : 1));
  // Visibility must change in the same commit as pointer events and layout.
  // Updating native opacity in an effect briefly exposes the previous layer.
  const deckVisibility = { opacity: showCards ? 1 : 0 };
  const gridVisibility = { opacity: showCards ? 0 : 1 };

  const [uploadedRatios, setUploadedRatios] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    const uris = [...new Set(items.map(item => item.artworkUri).filter((uri): uri is string => !!uri))];
    for (const uri of uris) {
      if (uploadedRatios[uri]) continue;
      NativeImage.getSize(uri, (width, height) => {
        if (live && width > 0 && height > 0) setUploadedRatios(previous => ({ ...previous, [uri]: width / height }));
      }, () => { if (live) setUploadedRatios(previous => ({ ...previous, [uri]: 1 })); });
    }
    return () => { live = false; };
  }, [items, uploadedRatios]);

  const renderCard = (item: BoardItem, index: number, panel?: ComicPanel, pageTop = 0) => {
    if (cardsFirst) {
      const scene = resolveComicScene(item.key, item.label, choices);
      const title = item.label.trim();
      const provided = !item.artworkUri || item.artworkUri.includes('/character-packs/protagonist-7/');
      // Do not paint a square provisional photo before its actual ratio arrives.
      if (!provided && item.artworkUri && !uploadedRatios[item.artworkUri]) return null;
      const printHeight = scatter.frames[index].width * 2 * 1.2;
      return <HeroOverviewCardMotion key={item.key} progress={overviewProgress} index={index} count={items.length} enabled={false} source={sourceFrame} stageWidth={stageWidth} sourceTop={sourceFrame.top ?? 0} parentTop={0} targetRotation={anchors[index].rotation} targetZIndex={draggingPrint === item.key ? 100000 : scatter.frames[index].zIndex} onMeasureHeight={height => setScatterHeights(previous => Math.abs((previous[item.key] ?? 0) - height) < 1 ? previous : { ...previous, [item.key]: height })} style={{ position: 'absolute', left: anchors[index].left, top: anchors[index].top, width: scatter.frames[index].width }}>
        <HeroDraggablePrint minTop={8 - upperReach} anchorLeft={anchors[index].left} anchorTop={anchors[index].top} anchorRotation={anchors[index].rotation} onRotate={angle => setPrintPositions(savePrintPosition(item.key, scatter.frames[index].left / boardWidth, scatter.frames[index].top / boardWidth, angle))} rotation={scatter.frames[index].rotation} enabled={gridOpen && overviewSettled && !deleteMode} scrollGesture={gridNative} dismissGesture={gridDismiss} left={scatter.frames[index].left} top={scatter.frames[index].top} width={scatter.frames[index].width} boardWidth={boardWidth} bottom={scatter.height + 120} onActive={active => setDraggingPrint(active ? item.key : null)} onDrop={(x, y) => setPrintPositions(savePrintPosition(item.key, x / boardWidth, y / boardWidth))}>
        <HeroScaledPrint width={scatter.frames[index].width}>
        <Pressable accessibilityRole="button" accessibilityLabel={title || t('comicDay.showCards')} onPress={() => { tapHaptic(); openItem(item.key); }} style={({ pressed }) => [s.polaroid, provided && { height: printHeight }, { opacity: pressed ? 0.75 : 1 }]}>
          <HeroPolaroidSurface />
          <ComicSceneImage preserveFullImage showSkeletonOnMount contentFit="contain" backgroundColor="#EEEEEC" imageKey={`history-grid:${item.artworkUri ?? scene.id}`} source={item.artworkUri ? { uri: item.artworkUri } : COMIC_SCENE_THUMBNAILS[scene.id] ?? scene.source} style={{ width: '100%', ...(provided ? { height: Math.max(1, printHeight - 66) } : { aspectRatio: item.artworkUri ? uploadedRatios[item.artworkUri] ?? 1 : 3 / 4 }) }} />
          <View style={{ minHeight: 44, ...(provided ? { flex: 1, overflow: 'hidden' as const } : { flexGrow: 1 }), paddingTop: 7, paddingHorizontal: 2, gap: 3 }}>
            {title ? <ThemedText fontId={item.fontId} numberOfLines={2} style={{ color: item.inkColor ?? ink, fontSize: 12, lineHeight: 17 }}>{title}</ThemedText> : null}
          </View>
        </Pressable>
        </HeroScaledPrint>
        </HeroDraggablePrint>
      </HeroOverviewCardMotion>;
    }
    const layout = comicCardLayout(viewMode, index);
    const wide = layout.wide;
    const diagonal = panel?.diagonal;
    const cardInk = item.inkColor ?? ink;
    const memo = item.memo?.trim().replace(/\s+/g, ' ') ?? '';
    const captionHeight = memo ? 70 : 52;
    const time = item.startMinutes == null ? item.timeLabel : `${String(Math.floor(item.startMinutes / 60) % 24).padStart(2, '0')}:${String(item.startMinutes % 60).padStart(2, '0')}`;
    return <HeroOverviewCardMotion key={item.key} progress={overviewProgress} index={index} count={items.length}
      enabled={false} source={sourceFrame} stageWidth={stageWidth} sourceTop={(hideCharacterHeading ? 0 : 56) + (sourceFrame.top ?? 0)}
      parentTop={pageTop} style={panel ? { position: 'absolute', left: panel.left, top: panel.top, width: panel.width, height: panel.height } : { width: layout.width }}>
      <View pointerEvents="box-none" style={[s.card, { backgroundColor: item.faceColor ?? (isDark ? '#262B28' : '#FFFFFF'), borderColor: muted }, panel && { height: panel.height }, diagonal && { borderWidth: 0, backgroundColor: 'transparent', overflow: 'visible' }]}>
        {diagonal && panel ? <Svg pointerEvents="box-none" width={panel.width} height={panel.height} style={StyleSheet.absoluteFill}><Path d={diagonalPanelPath(panel)} fill={item.faceColor ?? (isDark ? '#262B28' : '#FFFFFF')} stroke={muted} strokeWidth={0.9} /></Svg> : null}
        <View pointerEvents="box-none" style={diagonal ? { marginLeft: diagonal.side === 'right' ? diagonal.slant + 2 : 2, marginRight: diagonal.side === 'left' ? diagonal.slant + 2 : 2, paddingTop: 1 } : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel={item.label} delayLongPress={500} onLongPress={!deleteMode && onRemove ? () => { tapHaptic('warn'); onRemove(item.key); } : undefined} onPress={() => { tapHaptic(); openItem(item.key); }} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
          <ComicSceneImage contentFit="contain" contentPosition="center" backgroundColor={item.faceColor ?? (isDark ? '#262B28' : '#FFFFFF')} imageKey={`${item.artworkUri ?? resolveComicScene(item.key, item.label, choices).id}:960`} source={item.artworkUri ? { uri: item.artworkUri } : COMIC_SCENE_THUMBNAILS[resolveComicScene(item.key, item.label, choices).id]} fallbackSource={item.artworkUri ? undefined : resolveComicScene(item.key, item.label, choices).source} style={{ width: '100%', height: panel ? Math.max(30, panel.height - captionHeight - 2) : boardWidth * layout.imageRatio }} />
        </Pressable>
        <View style={[s.comicCaption, { borderTopColor: muted, height: captionHeight }]}>
          <View style={s.captionMeta}>
            <ThemedText style={{ color: muted, fontSize: 10, lineHeight: 15 }}>{String(index + 1).padStart(2, '0')}</ThemedText>
            {onEditTime ? <Pressable accessibilityRole="button" accessibilityLabel={time ? t('todo.timeA11y', { time }) : t('dayPlan.timeUnsetA11y')} onPress={() => { tapHaptic(); onEditTime?.(item.key, item.label); }} hitSlop={5} style={s.compactTime}>
              <ThemedText numberOfLines={1} style={{ color: muted, fontSize: 10, lineHeight: 15 }}>◷ {time ?? t('comicDay.time')}</ThemedText>
            </Pressable> : null}
          </View>
          <View style={s.captionTitleRow}>
            <View style={{ flex: 1, minHeight: 27, justifyContent: 'center' }}>
              <ThemedText fontId={item.fontId} numberOfLines={1} style={{ color: cardInk, fontSize: small ? 11 : wide ? 15 : 12, lineHeight: 20 }}>{item.label}</ThemedText>
            </View>
            {onComplete ? <CompletionRadioButton checked={item.completed ?? false} isDark={isDark} size={20} appearance="ink" motion="gentle" accessibilityLabel={item.label} onPress={() => onComplete(item.key)} /> : null}
            {onRemoveMany && deleteMode ? <Pressable accessibilityRole="checkbox" accessibilityLabel={t('comicDay.selectForDeletion', { label: item.label })} accessibilityState={{ checked: selectedKeys.includes(item.key) }} onPress={() => { tapHaptic('select'); toggleSelected(item.key); }} style={s.panelRemove}><ComicCheck tone="destructive" checked={selectedKeys.includes(item.key)} size={25} /></Pressable> : onRemove && deleteMode ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.removeFromSequence', { label: item.label })} onPress={() => { tapHaptic('warn'); onRemove(item.key); }} hitSlop={5} style={[s.panelRemove, { backgroundColor: isDark ? '#262B28' : '#FFFFFF' }]}><ThemedText style={{ color: ink, fontSize: 17, lineHeight: 22 }}>×</ThemedText></Pressable> : null}
          </View>
          {memo ? <View style={{ minHeight: 17 }}>
            <ThemedText fontId={item.fontId} numberOfLines={1} ellipsizeMode="tail" style={{ color: cardInk, opacity: 0.75, fontSize: small ? 10 : 11, lineHeight: 16 }}>{memo}</ThemedText>
          </View> : null}
        </View>
        </View>
      </View>
    </HeroOverviewCardMotion>;

  };
  const heading = <>{!hideCharacterHeading ? <View style={s.headingRow}>

  </View> : null}{!showCards && !diaryTitle ? <ThemedText style={[s.hint, { color: muted }]}>{t('comicDay.hint', { count: items.length })}</ThemedText> : null}</>;
  const bagAction: CardToolAction | undefined = FEATURE_FLAGS.mateShortcut && onOpenBag ? { key: 'bag', testID: 'comic-open-mate-bag', label: t('tabs.dayPlan'), onPress: () => { useServiceTutorial.getState().advance('comicTools', 'rhythmAdd', { mode: 'rhythm' }); onOpenBag(); }, tutorialSteps: ['comicTools'], icon: <MateBagIcon isDark={isDark} /> } : undefined;
  const tools = !historyOverview && !(cardsFirst && gridOpen) && items.length > 0 && !(deleteMode && onRemoveMany) && !menuOpen ? <HeroCardToolsPortal><CardToolsFab compact docked={!!toolsHost} isDark={isDark} overview={gridOpen} testID="comic-card-tools-fab" concept="film" belowAction={bagAction} actions={[
    ...(cardsFirst && gridOpen ? [{ key: 'cards', testID: 'comic-show-cards', label: t('comicDay.showCards'), onPress: () => { setMenuOpen(false); setDeleteMode(false); setDeleteFromCards(false); setSelectedForDeletion([]); setGridOpen(false); }, icon: <Svg width={26} height={26} viewBox="0 0 30 30"><Path d="M10 3L25 4L26 21L12 22ZM6 7L21 6L23 25L7 26Z" fill={isDark ? '#313632' : '#FFFFFF'} stroke={ink} strokeWidth={1} strokeLinejoin="round" /><Path d="M3 11L18 10L20 28L4 28Z" fill={isDark ? '#313632' : '#FFFFFF'} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" /></Svg> } satisfies CardToolAction] : []),
    ...(!deleteMode ? [{ key: 'layout', testID: 'comic-board-view', label: t('comicDay.boardView'), selected: menuOpen, onPress: () => { if (cardsFirst) setGridOpen(!gridOpen); else setMenuOpen(value => !value); }, icon: <LayoutDiagram mode={viewMode} ink={ink} size={26} /> } satisfies CardToolAction] : []),
    ...(onRemove || onRemoveMany ? [{ key: 'delete', testID: 'comic-card-delete-mode', label: t('comicDay.toggleDelete'), selected: deleteMode, onPress: toggleDeleteMode, icon: <HeroTrashIcon size={29} color={ink} /> } satisfies CardToolAction] : []),
  ]} /></HeroCardToolsPortal> : !items.length && bagAction ? <ServiceTutorialTarget steps={['comicTools']} style={{ position: 'absolute', right: 14, bottom: 96, zIndex: 4 }}><Pressable testID={bagAction.testID} accessibilityRole="button" accessibilityLabel={bagAction.label} onPress={() => { tapHaptic(); bagAction.onPress(); }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 4 }}>{bagAction.icon}</Pressable></ServiceTutorialTarget> : null;
  const hasWallpaper = useWallpaperStore(state => !!state.wallpaper);
  const canvas = hasWallpaper ? 'transparent' : isDark ? '#262B28' : 'transparent';
  const mainCamera = syncMainState && cardsFirst && (gridOpen || !items.length) && !historyOverview && !deleteMode && !detailOpen ? <Pressable
    testID="hero-duvet-camera" accessibilityRole="button" accessibilityLabel={t('comicDay.photo.choose')}
    onPress={() => { tapHaptic(); (onAddPhoto ?? onAdd)(); }}
    style={({ pressed }) => ({ position: 'absolute', right: 20, bottom: heroCameraBottom(safeInsets.bottom), width: 75, height: 53, zIndex: 3, transform: [ { translateY: pressed ? 1.5 : 0 }, { scale: pressed ? 0.985 : 1 }] })}>
    <HeroRestingCamera dark={isDark} />
  </Pressable> : null;
  if (!items.length && syncMainState && cardsFirst && !historyOverview) return <View style={{ flex: 1, backgroundColor: canvas }}>
    <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 180, paddingTop: safeInsets.top + 60 }}>
      <Pressable testID="hero-empty-photo-print" accessibilityRole="button" accessibilityLabel="사진을 추가해주세요." onPress={() => { tapHaptic(); (onAddPhoto ?? onAdd)(); }} style={({ pressed }) => ({ width: 140, aspectRatio: 1 / 1.2, paddingHorizontal: 7, paddingTop: 8, paddingBottom: 28, opacity: pressed ? 0.75 : 1, shadowColor: '#302C24', shadowOpacity: 0.16, shadowRadius: 4, shadowOffset: { width: 0, height: 3 }, transform: [{ rotate: '-2deg' }] })}>
        <HeroPolaroidSurface />
        <View style={{ flex: 1, backgroundColor: isDark ? '#383C37' : '#E5E5DF', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          <ThemedText style={{ color: muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{'사진을\n추가해주세요.'}</ThemedText>
        </View>
      </Pressable>
    </View>
    {mainCamera}
  </View>;
  if (!items.length && emptyContent) return <View style={{ flex: 1, backgroundColor: canvas }}>{emptyContent}</View>;
  if (!items.length) return <View style={{ flex: 1, backgroundColor: canvas }}>
    <View style={[s.deckHeading, hideCharacterHeading && { height: 0 }]}>{hideCharacterHeading ? null : heading}</View>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingTop: onCreateRandom ? (hideEntryActions ? 12 : 76) : 24, gap: 16 }}>
      {onCreateRandom ? <HeroRandomDraftCard ref={randomDraftRef} onChange={onDraftChange} scene={emptyScene} ink={ink} muted={muted} isDark={isDark} onSave={onCreateRandom} /> : <>
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
      </>}
      <ServiceTutorialTarget steps={['comicStart']}><SketchPaperButton iconOnly strongFrame frameless softKey label={t('comicDay.add')} ink={ink} onPress={onAdd} /></ServiceTutorialTarget>
    </View>
    {onAddPhoto && !hideEntryActions ? <View style={{ position: 'absolute', left: 16, top: 8, zIndex: 4 }}><HeroEntryActions ink={ink} character={character} onPhoto={onAddPhoto} onScenes={onAdd} /></View> : null}
  {tools}
  {!cardsFirst && !showCards && toolsHost ? <View style={{ position: 'absolute', right: 18, bottom: 80 }}><HeroCardToolsOutlet /></View> : null}
  </View>;
  return <View style={{ flex: 1, backgroundColor: canvas }} onLayout={({ nativeEvent: { layout } }) => {  if (focused && layout.width > 0) setStageWidth(previous => previous === layout.width ? previous : layout.width); }}>
    {cardsFirst ? <Animated.View testID="comic-card-deck-layer" pointerEvents={showCards ? 'auto' : 'none'} accessibilityElementsHidden={!showCards} importantForAccessibility={showCards ? 'auto' : 'no-hide-descendants'} style={[StyleSheet.absoluteFill, { top: upperReach }, deckVisibility]}>
      <View style={[s.deckHeading, hideCharacterHeading && { height: 0 }]}>{hideCharacterHeading ? null : heading}</View>
      <HeroCardFlipContext.Provider value={activeCardFlip}><View style={s.deckStage}>
        <ComicSceneDeck syncMainState={syncMainState} presentationOverride={presentationOverride} focusKey={overviewFocusKey ?? focusSceneId} detailOpen={detailOpen} items={items} ink={ink} muted={muted} isDark={isDark} choices={choices} onOpen={onOpen} onRemove={onRemove} onEditCard={onEditCard} interactive={showCards} onFrameChange={setSourceFrame} onShowOverview={() => { setGridOpen(true); setMenuOpen(false); }} />
      </View>
      </HeroCardFlipContext.Provider>
      {!historyOverview ? <View testID="hero-carousel-close" style={[s.deckAdd, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        {showCards && !detailOpen ? <Pressable testID="hero-main-card-flip" accessibilityRole="button" accessibilityLabel="회전" onPress={() => activeCardFlip.current?.()} style={{ minWidth: 48, height: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: ink, fontSize: 17 }}>회전</ThemedText></Pressable> : null}
        {showCards && !detailOpen ? <Pressable testID="comic-close-carousel" accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { tapHaptic('select'); setGridOpen(true); setMenuOpen(false); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: ink, fontSize: 17, lineHeight: 24 }}>닫기</ThemedText></Pressable> : null}
      </View> : null}
    </Animated.View> : null}
    <Animated.View testID="comic-card-grid-layer" pointerEvents={showCards ? 'none' : 'auto'} accessibilityElementsHidden={showCards} importantForAccessibility={showCards ? 'no-hide-descendants' : 'auto'} style={[{ flex: 1 }, gridVisibility]}>
  <GestureDetector gesture={gridGesture}><ScrollView ref={gridScrollRef} removeClippedSubviews={false} scrollEnabled={!showCards} testID="comic-card-overview" onScrollBeginDrag={() => setMenuOpen(false)} onScroll={event => { gridOffsetRef.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={[s.board, { flexGrow: 1, paddingTop: cardsFirst ? upperReach + 6 : 6 }]}>

    {heading}
    <View testID="comic-card-grid-layout" style={cardsFirst ? { height: scatter.height, position: 'relative', overflow: 'visible' } : s.grid} onLayout={event => {
      const width = Math.round(event.nativeEvent.layout.width);
      if (!focused || width <= 0) return;
      lastBoardWidth = width;
      setBoardWidth(previous => previous === width ? previous : width);
    }}>
      {!cardsFirst && (viewMode === 'hero' || viewMode === 'page' || viewMode === 'diagonal') ? Array.from({ length: Math.ceil(items.length / (viewMode === 'hero' ? 3 : 4)) }, (_, pageIndex) => {
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
    {!cardsFirst ? <ServiceTutorialTarget steps={!showCards ? ['comicStart'] : []} style={s.add}><SketchPaperButton label={t('comicDay.add')} ink={ink} onPress={onAdd} /></ServiceTutorialTarget> : null}
  </ScrollView></GestureDetector>
  {deleteMode && onRemoveMany ? <View style={[s.selectionBar, { backgroundColor: isDark ? '#262B28' : '#FFFFFF', borderColor: muted }]}>
    <View style={s.selectionActions}>
      <ThemedText style={{ color: ink, fontSize: 13 }}>{t('comicDay.selectedSceneCount', { count: selectedKeys.length })}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={t(selectedKeys.length === items.length && items.length > 0 ? 'comicDay.clearSelection' : 'comicDay.selectAll')} onPress={() => { tapHaptic('select'); setSelectedForDeletion(selectedKeys.length === items.length ? [] : items.map(item => item.key)); }} style={s.selectionTouch}><ThemedText style={{ color: ink, fontSize: 13 }}>{t(selectedKeys.length === items.length && items.length > 0 ? 'comicDay.clearSelection' : 'comicDay.selectAll')}</ThemedText></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={toggleDeleteMode} style={s.selectionTouch}><ThemedText style={{ color: ink, fontSize: 13 }}>{t('common.cancel')}</ThemedText></Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.deleteSelected', { count: selectedKeys.length })} accessibilityState={{ disabled: !selectedKeys.length }} disabled={!selectedKeys.length} onPress={() => { tapHaptic('warn'); onRemoveMany(selectedKeys); }} style={[s.bulkDelete, { opacity: selectedKeys.length ? 1 : 0.35 }]}>
      <HanddrawnFrame color={muted} /><ThemedText style={{ color: ink, fontSize: 15 }}>{t('comicDay.deleteSelected', { count: selectedKeys.length })}</ThemedText>
    </Pressable>
  </View> : null}
  </Animated.View>
  {mainCamera}
  {tools}
  {!cardsFirst && !showCards && toolsHost ? <View style={{ position: 'absolute', right: 18, bottom: 80 }}><HeroCardToolsOutlet /></View> : null}
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

export function ComicSceneDetail({ item, choices, ink, onEditTime }: Omit<Common, 'isDark'> & {
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
  </View>;
}
const s = StyleSheet.create({
  polaroid: { flexGrow: 1, padding: 7, paddingTop: 12, paddingBottom: 7, shadowColor: '#403624', shadowOpacity: 0.22, shadowRadius: 3, shadowOffset: { width: 0, height: 3 }, elevation: 3, marginBottom: 14 },
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
