import { SnsIcon } from '@features/library-share/SnsIcon';
import { LibraryShareSheet } from '@features/library-share/LibraryShareSheet';
import { AppAlert } from '@shared/lib/app-alert';
import { getYes24DisplayTitle } from '@features/yes24-book-search/displayTitle';
import { useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { AppModal } from '@shared/ui/app-modal';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View, useAnimatedValue, useWindowDimensions } from 'react-native';
import Reanimated, { Easing as MotionEasing, FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookSearchSheet, type BookSearchSelection } from '../../src/pages/goal-detail-settings/ui/category/reading/ui/BookSearchSheet';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { PaperGrain } from '@shared/ui/paper-grain';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { controlIllustrationArtwork } from '@shared/ui/icon-symbol/controlIllustrationSources';
import { catalogFeeds, requestYes24, type CatalogFeed, type CatalogSelection, type Yes24BookDetail } from '@features/yes24-book-search';
import { IconSymbol } from '@shared/ui/icon-symbol';

import { libraryBooksKey as key, type Book, type Placement } from '@entities/day-plan/lib/libraryBooks';
const ink = '#3D3934';
const paper = '#F7F4EE';
const bookTilts = [-5, 4, -3, 3, -4, 5];
const boardPadding = 20;
const columnGap = 12;
const shelfCoverPercent = 80;

function clamp(value: number, limit: number) {
  return Math.max(0, Math.min(value, limit));
}

function MovableBook({ children, placement, arrangeVersion, locked, selected, width, maxX, maxY, scroll, onOpen, label, onPlace }: {
  children: ReactNode;
  placement: Placement;
  arrangeVersion: number;
  locked: boolean;
  selected?: boolean;
  onOpen: () => void;
  label: string;
  width: number;
  maxX: number;
  maxY: number;
  scroll: ReturnType<typeof Gesture.Native>;
  onPlace: (placement: Placement) => void;
}) {
  const [lifted, setLifted] = useState(false);
  const x = useAnimatedValue(placement.x);
  const y = useAnimatedValue(placement.y);
  const angle = useAnimatedValue(placement.angle);
  const previousArrange = useRef(arrangeVersion);
  const reduceMotion = useReducedMotion();
  const current = useRef(placement);
  const origin = useRef(placement);
  const gestureKind = useRef<'drag' | 'rotate' | null>(null);

  function paint(next: Placement) {
    current.current = next;
    x.setValue(next.x);
    y.setValue(next.y);
    angle.setValue(next.angle);
  }

  useLayoutEffect(() => {
    const arranging = previousArrange.current !== arrangeVersion;
    previousArrange.current = arrangeVersion;
    if (gestureKind.current) return;
    if (!arranging || reduceMotion) {
      paint(placement);
      return;
    }
    current.current = placement;
    const timing = { duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true };
    const motion = Animated.parallel([
      Animated.timing(x, { ...timing, toValue: placement.x }),
      Animated.timing(y, { ...timing, toValue: placement.y }),
      Animated.timing(angle, { ...timing, toValue: placement.angle }),
    ]);
    motion.start();
    return () => motion.stop();
  }, [placement.x, placement.y, placement.angle, arrangeVersion, reduceMotion]);

  function start(kind: 'drag' | 'rotate') {
    gestureKind.current = kind;
    origin.current = current.current;
    setLifted(true);
    tapHaptic('select');
  }

  function finish(kind: 'drag' | 'rotate', success: boolean) {
    if (gestureKind.current !== kind) return;
    gestureKind.current = null;
    setLifted(false);
    if (success) onPlace(current.current);
    else paint(placement);
  }

  const drag = Gesture.Pan()
    .enabled(!locked)
    .maxPointers(1)
    .activateAfterLongPress(250)
    .blocksExternalGesture(scroll)
    .runOnJS(true)
    .onStart(() => { if (!gestureKind.current) start('drag'); })
    .onUpdate(event => {
      if (gestureKind.current !== 'drag' || event.numberOfPointers !== 1) return;
      paint({
        ...origin.current,
        x: clamp(origin.current.x + event.translationX, maxX),
        y: clamp(origin.current.y + event.translationY, maxY),
      });
    })
    .onFinalize((_event, success) => finish('drag', success));

  const rotation = Gesture.Rotation()
    .enabled(!locked)
    .blocksExternalGesture(scroll)
    .runOnJS(true)
    .onStart(() => start('rotate'))
    .onUpdate(event => {
      const degrees = origin.current.angle + event.rotation * 180 / Math.PI;
      paint({ ...origin.current, angle: ((degrees % 360) + 540) % 360 - 180 });
    })
    .onFinalize((_event, success) => finish('rotate', success));

  const tap = Gesture.Tap().maxDuration(250).maxDistance(8).runOnJS(true)
    .onTouchesDown((event, manager) => { if (event.numberOfTouches > 1) manager.fail(); })
    .onEnd((_event, success) => { if (success) onOpen(); });

  return (
    <GestureDetector gesture={Gesture.Race(tap, Gesture.Simultaneous(drag, rotation))}>
      <Animated.View collapsable={false} style={[
        styles.card,
        { width, left: 0, top: 0, zIndex: lifted ? 100 : 1, transform: [{ translateX: x }, { translateY: y }] },
      ]}>
        <Animated.View accessible accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}
          accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={event => {
            if (event.nativeEvent.actionName === 'activate') onOpen();
          }} style={{
          transform: [{ rotate: angle.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }) }],
        }}>
          {children}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function BookCover({ book, displayTitle, onReady }: { book: Book; displayTitle?: string; onReady?: () => void }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  if (!book.cover || failedUrl === book.cover) {
    return displayTitle
      ? <ThemedText style={styles.coverTitle} numberOfLines={4}>{displayTitle}</ThemedText>
      : <IconSymbol name="book.closed.fill" size={18} color={ink} />;
  }
  return <>
    <View pointerEvents="none" accessible={false} style={styles.coverSkeleton}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonAuthor} />
    </View>
    <Image source={{ uri: book.cover }} style={StyleSheet.absoluteFill} contentFit="cover"
      recyclingKey={book.cover} cachePolicy="memory-disk" transition={onReady ? 0 : 140} onDisplay={onReady}
      onError={() => { setFailedUrl(book.cover); onReady?.(); }} />
  </>;
}

function LibraryBookArt({ book, displayTitle, large = false, onReady, share = false }: { book: Book; displayTitle?: string; large?: boolean; share?: boolean; onReady?: () => void }) {
  return (
    <View style={[styles.book, large ? styles.largeBook : styles.shelfShadow, share && { width: '100%', marginBottom: 0 }]}>
      <View style={styles.backCover} />
      <View style={styles.pageBlock}>
        <View style={[styles.pageLine, { bottom: 1 }]} />
        <View style={[styles.pageLine, { bottom: 3 }]} />
      </View>
      <View style={styles.frontCover}>
        <BookCover book={book} displayTitle={displayTitle} onReady={onReady} />
        <View pointerEvents="none" style={styles.spine} />
        <View pointerEvents="none" style={styles.coverHighlight} />
      </View>
    </View>
  );
}

function PeriodArrow({ previous = false }: { previous?: boolean }) {
  return <Svg width={16} height={16} viewBox="0 0 16 16">
    <Path d="M6 3L11 8L6 13" transform={previous ? 'translate(16 0) scale(-1 1)' : undefined}
      fill="none" stroke={ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

function Bestsellers({ selection, onPreview }: { selection: CatalogSelection; onPreview: (book: Yes24BookDetail) => void }) {
  const { locale } = useTranslation();
  const [items, setItems] = useState<Yes24BookDetail[] | null>(null);
  const { feed, query, categoryId } = selection;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    requestYes24<{ items: Yes24BookDetail[] }>({ operation: 'catalog', feed, query, categoryId }).then(result => {
      if (active) {
        setItems(result.items ?? []);
      }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [feed, query, categoryId, attempt]);
  return <ScrollView style={styles.scroll} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96 }}>
    {failed ? <Pressable accessibilityRole="button" onPress={() => { setFailed(false); setAttempt(n => n + 1); }}>
      <ThemedText style={styles.count}>Couldn’t load bestsellers. Tap to retry.</ThemedText>
    </Pressable> : !items || !items.length ? <ThemedText style={styles.count}>
      {items ? 'No results available.' : 'Loading…'}
    </ThemedText> : items.map((book, index) => <Pressable key={book.itemId} accessibilityRole="button"
      style={styles.rankRow} onPress={() => onPreview(book)}>
      <ThemedText style={styles.rank}>{String(book.rank ?? index + 1).padStart(2, '0')}</ThemedText>
      <Image source={book.coverUrl || controlIllustrationArtwork.book} style={{ width: 54, height: 76 }} contentFit="contain" />
      <View style={{ flex: 1 }}>
        <ThemedText numberOfLines={2} style={styles.text}>{getYes24DisplayTitle(book.title, locale).title}</ThemedText>
        <ThemedText numberOfLines={2} style={styles.author}>{book.author}</ThemedText>
      </View>
      <PeriodArrow />
    </Pressable>)}
  </ScrollView>;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

export default function Library() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [period, setPeriod] = useState<'Monthly' | 'Yearly' | 'YES24 Bestsellers'>('Monthly');
  const [cursor, setCursor] = useState(() => new Date());
  const [books, setBooks] = useState(() => localStorageClient.getJson<Book[]>(key) ?? []);
  const [sharing, setSharing] = useState(false);
  const [deleteIds, setDeleteIds] = useState<Set<string> | null>(null);
  const deleting = deleteIds !== null;
  function pressTrash() {
    tapHaptic('select');
    if (!deleteIds) { setDeleteIds(new Set()); return; }
    if (!deleteIds.size) { setDeleteIds(null); return; }
    AppAlert.alert(t('common.delete'), t('library.confirmDelete', { count: deleteIds.size }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        save(booksRef.current.filter(book => !deleteIds.has(book.id)));
        setDeleteIds(null);
      } },
    ]);
  }
  const [menu, setMenu] = useState(false);
  const [feed, setFeed] = useState<CatalogFeed>('bestsellerMonthly');
  const exploring = period === 'YES24 Bestsellers';
  const daily = exploring && feed === 'bestsellerDaily';
  const month = monthKey(cursor);
  const showsDate = !exploring || daily || feed === 'bestsellerMonthly';
  const day = String(cursor.getDate()).padStart(2, '0');
  const selection = { feed, query: month + '-' + (daily ? day : '01'), categoryId: '001' };
  function chooseFeed(next: CatalogFeed) {
    setDeleteIds(null);
    setFeed(next);
    setAddedBookId(null);
    setMenu(false);
    setPeriod('YES24 Bestsellers');
  }
  const visibleBooks = books.filter(book => {
    const added = book.addedMonth ?? monthKey(new Date());
    return period !== 'Yearly' ? added === month : added.slice(0, 4) === month.slice(0, 4);
  });
  function movePeriod(delta: number) {
    setDeleteIds(null);
    setAddedBookId(null);
    if (daily) { setCursor(date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta)); return; }
    setCursor(date => new Date(date.getFullYear(), date.getMonth() + delta * (period !== 'Yearly' ? 1 : 12), 1));
  }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const reviewScrollRef = useRef<ScrollView>(null);
  const reviewInputFocused = useRef(false);
  const [previewBook, setPreviewBook] = useState<Yes24BookDetail | null>(null);
  const [search, setSearch] = useState(false);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [viewport, setViewport] = useState(() => ({
    width: window.width - insets.left - insets.right,
    height: 0,
  }));
  const [scroll] = useState(() => Gesture.Native());
  const booksRef = useRef(books);
  const pendingBook = useRef<Book | null>(null);
  const [arrangeVersion, setArrangeVersion] = useState(0);
  const [addedBookId, setAddedBookId] = useState<string | null>(null);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      if (reviewInputFocused.current) requestAnimationFrame(() => reviewScrollRef.current?.scrollToEnd({ animated: true }));
    });
    return () => subscription.remove();
  }, []);
  function save(next: Book[]) {
    booksRef.current = next;
    localStorageClient.setJson(key, next);
    setBooks(next);
  }
  useLayoutEffect(() => {
    const stored = booksRef.current;
    if (stored.some(book => !book.addedMonth)) {
      const fallback = monthKey(new Date());
      save(stored.map(book => book.addedMonth ? book : { ...book, addedMonth: fallback }));
    }
  }, []);
  function add(selection: BookSearchSelection) {
    const id = 'yes24:' + selection.book.itemId;
    const existing = booksRef.current.find(book => book.id === id);
    if (existing) return;
    const { title, author, coverUrl, link } = selection.book;
    pendingBook.current = { id, title, author, cover: coverUrl, link, addedMonth: month, updatedAt: Date.now() };
    if (Platform.OS !== 'ios') finishAddingBook();
  }
  function finishAddingBook() {
    const book = pendingBook.current;
    pendingBook.current = null;
    if (!book) return;
    setAddedBookId(book.id);
    save([...booksRef.current, book]);
  }
  const columnWidth = Math.max(0, Math.floor((viewport.width - 2 * (boardPadding + columnGap)) / 3));
  const rowHeight = Math.ceil(columnWidth * shelfCoverPercent / 100 / 0.69 + 26);
  const boardHeight = Math.max(viewport.height, Math.ceil(visibleBooks.length / 3) * rowHeight + 2 * boardPadding,
    ...visibleBooks.map(book => (book.aligned ? 0 : book.placement?.y ?? 0) + rowHeight + boardPadding));
  const maxX = Math.max(0, viewport.width - columnWidth);
  const maxY = Math.max(0, boardHeight - rowHeight);
  function placementFor(book: Book, index: number): Placement {
    const saved = book.aligned ? undefined : book.placement;
    return {
      x: clamp(saved?.x ?? boardPadding + index % 3 * (columnWidth + columnGap), maxX),
      y: clamp(saved?.y ?? boardPadding + Math.floor(index / 3) * rowHeight, maxY),
      angle: saved?.angle ?? (book.aligned ? 0 : bookTilts[index % bookTilts.length]!),
    };
  }
  const selected = books.find(book => book.id === selectedId);
  const mockSearch = selected?.id.startsWith('mock-book:');
  const yes24Url = mockSearch
    ? 'https://www.yes24.com/Product/Search?domain=ALL&query=' + encodeURIComponent(selected!.title)
    : selected?.id.startsWith('yes24:') ? selected.link : undefined;
  function titleFor(book: Book) {
    return book.id.startsWith('yes24:') ? getYes24DisplayTitle(book.title, locale).title : book.title;
  }
  function saveReview() {
    if (!selected) return;
    save(booksRef.current.map(book => book.id === selected.id ? { ...book, review: draft.trim(), updatedAt: Date.now() } : book));
    setSelectedId(null);
  }
  const gridActive = visibleBooks.length > 0 && visibleBooks.every(book => book.aligned);
  const showsYes24Books = visibleBooks.some(book => book.id.startsWith('yes24:'));
  const catalogMenuButton = <Pressable accessibilityRole="button" accessibilityLabel={t('library.catalog.menu')} accessibilityState={{ expanded: menu }} onPress={() => setMenu(!menu)} style={styles.arrow}>
    <Svg width={22} height={22} viewBox="0 0 22 22"><Path d="M3 5h16M3 11h16M3 17h16" stroke={ink} strokeWidth={1.6} strokeLinecap="round" /></Svg>
  </Pressable>;
  return <View style={{ flex: 1, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }}>
    <View style={styles.header}>
      <View style={styles.headerSide}><Pressable accessibilityRole="button" accessibilityLabel={t('settings.title')} onPress={() => { tapHaptic('select'); router.push('/settings'); }} style={styles.arrow}>
        <Svg width={22} height={22} viewBox="0 0 22 22"><Path d="M5 11h.1M11 11h.1M17 11h.1" stroke={ink} strokeWidth={2.6} strokeLinecap="round" /></Svg>
      </Pressable></View>
      {showsDate ? <>
      <Pressable accessibilityRole="button" accessibilityLabel={daily ? 'Previous day' : period !== 'Yearly' ? 'Previous month' : 'Previous year'} style={styles.arrow} onPress={() => movePeriod(-1)}>
        <PeriodArrow previous />
      </Pressable>
      {catalogMenuButton}
      <ThemedText numberOfLines={1} adjustsFontSizeToFit style={styles.periodDate}>{daily ? cursor.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : period !== 'Yearly' ? monthFormatter.format(cursor) : String(cursor.getFullYear())}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={daily ? 'Next day' : period !== 'Yearly' ? 'Next month' : 'Next year'} style={styles.arrow} onPress={() => movePeriod(1)}>
        <PeriodArrow />
      </Pressable>
      </> : <>{catalogMenuButton}<ThemedText style={styles.periodDate}>YES24</ThemedText></>}
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('goalDetail.reading.searchBook')} onPress={() => setSearch(true)} style={styles.arrow}>
          <IconSymbol name="magnifyingglass" size={19} color={ink} />
        </Pressable>
      </View>
    </View>
    {menu ? <ScrollView style={styles.scroll} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 90 }}>
      {catalogFeeds.map((key, index) => <Reanimated.View key={key} entering={FadeInDown
        .duration(360).delay(index * 22).easing(MotionEasing.out(MotionEasing.cubic))
        .withInitialValues({ opacity: 0, transform: [{ translateY: -6 }] }).reduceMotion(ReduceMotion.System)}>
        <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => chooseFeed(key)}>
          <ThemedText style={styles.text}>{t(`library.catalog.${key}`)}</ThemedText>
        </Pressable>
      </Reanimated.View>)}
    </ScrollView> : <>
    <View style={styles.switchRow}>
      {(['Monthly', 'Yearly'] as const).map(option => <Pressable key={option} accessibilityRole="tab"
        accessibilityState={{ selected: period === option }} style={[styles.mode, period === option && styles.activeMode]} onPress={() => { setDeleteIds(null); setAddedBookId(null); setPeriod(option); }}>
        <ThemedText style={styles.text}>{option}</ThemedText>
      </Pressable>)}
    </View>
    {period === 'YES24 Bestsellers' ? <>
      <ThemedText style={styles.count}>{t(`library.catalog.${feed}`)}</ThemedText>
      <Bestsellers key={JSON.stringify(selection)} selection={selection} onPreview={setPreviewBook} />
    </> : <>
    <View style={styles.shelfTools}>
      <ThemedText style={styles.count}>{deleteIds?.size ? t('library.selectedCount', { count: deleteIds.size }) : deleting ? t('library.pickDelete') : `${visibleBooks.length} ${visibleBooks.length === 1 ? 'book' : 'books'}`}</ThemedText>
      {!!visibleBooks.length && <View style={{ flexDirection: 'row' }}>
        {<Pressable accessibilityRole="button" accessibilityLabel="SNS" style={styles.arrow} onPress={() => { tapHaptic('select'); setSharing(true); }}>
          <SnsIcon color={ink} />
        </Pressable>}
        <Pressable accessibilityRole="button" accessibilityState={{ selected: deleting }}
          accessibilityLabel={t(deleteIds?.size ? 'common.delete' : deleting ? 'todo.deleteModeOff' : 'todo.deleteModeOn')} style={styles.arrow}
          onPress={pressTrash}>
          <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"
            stroke={deleting ? '#A53E38' : ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t(gridActive ? 'library.restoreLayout' : 'library.arrange')} style={styles.arrow} onPress={() => {
        tapHaptic('select');
        setDeleteIds(null);
        const ids = new Set(visibleBooks.map(book => book.id));
        setArrangeVersion(version => version + 1);
        save(booksRef.current.map(book => ids.has(book.id) ? { ...book, aligned: !gridActive, updatedAt: Date.now() } : book));
      }}>
        <Svg width={22} height={22} viewBox="0 0 22 22"><Path d={gridActive
          ? 'M17.5 5Q13 0 6 2.5M8 0.8L5.8 2.6L8.6 3.5 M2 7h6v6H2z M14 6l5.7 1.6-1.7 6-5.7-1.6z M2 16h6v5H2z M13 16h6v5h-6z'
          : 'M3 3h6v6H3z M13 3h6v6h-6z M3 13h6v6H3z M13 13h6v6h-6z'} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" fill="none" /></Svg>
        </Pressable>
      </View>}
    </View>
    <GestureDetector key={period + (period !== 'Yearly' ? month : cursor.getFullYear())} gesture={scroll}>
      <ScrollView style={styles.scroll} onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        if (width <= 0 || height <= 0) return;
        setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
      }}>
        <View style={[styles.collection, { minHeight: boardHeight }, !visibleBooks.length && styles.emptyBoard]}>
        {!visibleBooks.length && <Pressable accessibilityRole="button" onPress={() => setSearch(true)} style={styles.empty}>
          <Svg accessible={false} width={48} height={48} viewBox="0 0 48 48">
            <Defs>
              <RadialGradient id="bookShadow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor="#51483B" stopOpacity={0.22} />
                <Stop offset="1" stopColor="#51483B" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={28} cy={40} rx={19} ry={5} fill="url(#bookShadow)" />
            <Path d="M5 10Q3 12 5 17L16 40Q17 43 21 42L44 36L42 30L29 6Z"
              fill="#E0DDD6" stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
            <Path d="M17 36Q16 39 19 40L43 34L42 30Z" fill="#FAF9F6" stroke={ink} strokeWidth={1.1} />
            <Path d="M19 38L21 45L23 42L26 43L24 37Z" fill="#D5D1CA" stroke={ink} strokeWidth={1.1} />
            <Path d="M6 10L29 4L44 29L19 36Q17 37 16 34L5 13Q4 11 6 10Z"
              fill="#F9F8F4" stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
            <Path d="M8 10L19 34M6 15L8 13M9 23L12 20M13 31L15 28"
              fill="none" stroke="#716B64" strokeWidth={1} strokeLinecap="round" />
          </Svg>
          <ThemedText style={styles.text}>＋ {t('goalDetail.reading.searchBook')}</ThemedText>
        </Pressable>}
        {columnWidth > 0 && visibleBooks.map((book, index) => {
          const placement = placementFor(book, index);
          return <MovableBook selected={deleteIds?.has(book.id)} locked={gridActive || deleting} arrangeVersion={arrangeVersion} key={book.id} width={columnWidth} maxX={maxX} maxY={maxY}
            scroll={scroll} placement={placement} label={titleFor(book)} onOpen={() => {
              tapHaptic('select');
              if (deleting) {
                setDeleteIds(previous => {
                  if (!previous) return null;
                  const next = new Set(previous);
                  if (next.has(book.id)) next.delete(book.id);
                  else next.add(book.id);
                  return next;
                });
                return;
              }
              setDraft(book.review ?? '');
              setSelectedId(book.id);
            }} onPlace={next => {
              save(booksRef.current.map(item => item.id === book.id ? { ...item, aligned: false, placement: next, updatedAt: Date.now() } : item));
            }}>
              <Reanimated.View entering={book.id === addedBookId
                ? FadeInDown.duration(250).delay(Platform.OS === 'ios' ? 0 : 280).reduceMotion(ReduceMotion.System)
                : undefined}>
                <LibraryBookArt book={book} displayTitle={titleFor(book)} />
                {deleteIds?.has(book.id) && <View pointerEvents="none" style={styles.selectedBadge}>
                  <Svg width={16} height={16} viewBox="0 0 16 16"><Path d="m3 8 3 3 7-7" stroke="white" strokeWidth={2} fill="none" /></Svg>
                </View>}
              </Reanimated.View>
          </MovableBook>;
        })}
        </View>
      </ScrollView>
    </GestureDetector>
    {showsYes24Books && <ThemedText style={styles.attribution}>YES24</ThemedText>}
    </>}
    </>}
    {sharing && <LibraryShareSheet placementFor={placementFor} bookWidth={columnWidth * shelfCoverPercent / 100} renderBook={(book, onReady) => <LibraryBookArt share onReady={onReady} book={book} displayTitle={titleFor(book)} />} books={visibleBooks} heading={period === 'Yearly' ? String(cursor.getFullYear()) : monthFormatter.format(cursor)} titleFor={titleFor} close={() => setSharing(false)} />}
    {selected && <AppModal visible nativeAnimation="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedId(null)}>
      <SafeAreaView style={styles.page}>
        <PaperGrain opacity={0.42} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.detailHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('dayPlan.close')}
              style={styles.closeButton} onPress={() => setSelectedId(null)}>
              <IconSymbol name="xmark" size={20} color={ink} />
            </Pressable>
          </View>
        <ScrollView ref={reviewScrollRef} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.detailContent}>
          <View style={styles.bookSummary}>
            <LibraryBookArt book={selected} displayTitle={titleFor(selected)} large />
            <View style={styles.bookInfo}>
              <ThemedText style={styles.detailTitle}>{titleFor(selected)}</ThemedText>
              {!!selected.author && <ThemedText style={styles.detailAuthor}>{selected.author}</ThemedText>}
              {yes24Url && (
                <Pressable accessibilityRole="link" style={styles.action}
                  onPress={() => void Linking.openURL(yes24Url).catch(() => undefined)}>
                  <ThemedText style={styles.author}>{mockSearch ? t('library.searchYes24') : 'YES24'}</ThemedText>
                  <Svg width={17} height={17} viewBox="0 0 20 20"><Path d="M4.8 15.2Q9.6 10.1 15.1 4.9M6.9 5.2Q11 5 15.3 4.7Q15 8.8 15.1 13" stroke="#746D63" strokeWidth={1.55} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
                </Pressable>
              )}
            </View>
          </View>
          <ThemedText style={styles.text}>{t('library.shortReview')}</ThemedText>
          <View style={styles.reviewPaper}>
            <View pointerEvents="none" style={styles.rule} />
            <ThemedTextInput multiline maxLength={240} value={draft} onChangeText={setDraft}
              onFocus={() => {
                reviewInputFocused.current = true;
                setTimeout(() => { if (reviewInputFocused.current) reviewScrollRef.current?.scrollToEnd({ animated: true }); }, 250);
              }}
              onBlur={() => { reviewInputFocused.current = false; }}
              onContentSizeChange={() => { if (reviewInputFocused.current) requestAnimationFrame(() => reviewScrollRef.current?.scrollToEnd({ animated: true })); }}
              accessibilityLabel={t('library.shortReview')} placeholder={t('library.reviewPlaceholder')}
              placeholderTextColor="#746D63" style={styles.reviewInput} />
          </View>
          <View style={styles.reviewActions}>
            <Pressable accessibilityRole="button" style={[styles.saveButton, styles.cancelButton]} onPress={() => {
              setDraft(selected.review ?? '');
              setSelectedId(null);
            }}>
              <ThemedText style={styles.text}>{t('common.cancel')}</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.saveButton} onPress={saveReview}>
              <PaperGrain opacity={0.46} />
              <HanddrawnFrame color={ink} />
              <ThemedText style={styles.text}>{t('common.save')}</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppModal>}
    <BookSearchSheet diaryStyle initialBook={previewBook} visible={search || !!previewBook} ink={ink} muted="#726C63" surface={paper} line="#ABA398" onClose={() => { setSearch(false); setPreviewBook(null); }} onDismiss={finishAddingBook} onSelect={add} />
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper },
  header: { paddingHorizontal: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: ink, fontSize: 26, lineHeight: 34 },
  text: { color: ink, fontSize: 17 },
  headerSide: { flex: 1 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  periodDate: { maxWidth: '43%', fontSize: 20, textAlign: 'center', color: ink },
  switchRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  mode: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6, borderBottomWidth: 1, borderColor: 'transparent' },
  activeMode: { borderColor: ink },
  count: { textAlign: 'center', color: '#746D63', fontSize: 14, marginVertical: 6 },
  scroll: { flex: 1 },
  selectedBadge: { position: 'absolute', top: 3, right: '11%', borderRadius: 12, padding: 3, backgroundColor: ink },
  shelfTools: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuItem: { minHeight: 44, justifyContent: 'center' },
  rankRow: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rank: { width: 27, fontSize: 18, color: ink },
  collection: { position: 'relative' },
  card: { position: 'absolute' },
  detailHeader: { alignItems: 'flex-end', paddingHorizontal: 18 },
  detailContent: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 32, gap: 12 },
  bookSummary: { gap: 16, alignItems: 'center', marginBottom: 24 },
  bookInfo: { alignSelf: 'stretch', alignItems: 'center', gap: 6 },
  detailTitle: { textAlign: 'center', color: ink, fontSize: 24, lineHeight: 31 },
  detailAuthor: { textAlign: 'center', color: '#746D63', fontSize: 16 },
  largeBook: { width: '42%', maxWidth: 176, marginBottom: 0 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  reviewPaper: { minHeight: 88, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#C8C1B4' },
  rule: { position: 'absolute', top: 56, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#C8C1B4' },
  reviewInput: { minHeight: 88, color: ink, paddingHorizontal: 4, paddingVertical: 4, fontSize: 17, lineHeight: 24, textAlignVertical: 'top', backgroundColor: 'transparent' },
  reviewActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelButton: { backgroundColor: '#ECE8E0', borderWidth: 1, borderColor: '#C8C1B6' },
  saveButton: { paddingHorizontal: 24, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2ECDF', borderRadius: 4, overflow: 'hidden' },
  coverSkeleton: { ...StyleSheet.absoluteFill, backgroundColor: '#E8E5DE', paddingHorizontal: '13%', paddingTop: '25%', gap: 5 },
  skeletonTitle: { width: '82%', height: 5, borderRadius: 2, backgroundColor: '#D2CEC6' },
  skeletonAuthor: { width: '52%', height: 3, borderRadius: 2, backgroundColor: '#D8D4CC' },
  coverTitle: { color: ink, fontSize: 14, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
  book: {
    width: `${shelfCoverPercent}%`, alignSelf: 'center', aspectRatio: 0.69, marginBottom: 10, borderRadius: 4,
    backgroundColor: '#E4E2DD', elevation: 3, shadowColor: '#343434',
    shadowOpacity: 0.16, shadowRadius: 5, shadowOffset: { width: 2, height: 4 },
  },
  shelfShadow: { elevation: 4, shadowOpacity: 0.23, shadowRadius: 6, shadowOffset: { width: 2, height: 5 } },
  backCover: { ...StyleSheet.absoluteFill, borderRadius: 4, backgroundColor: '#D7D5D0' },
  pageBlock: {
    position: 'absolute', top: 4, right: 1, bottom: 2, left: 3,
    borderRadius: 3, backgroundColor: '#ECEAE5', borderRightWidth: 1, borderRightColor: '#D1CFC9',
  },
  pageLine: { position: 'absolute', left: 3, right: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#D8D6D1' },
  frontCover: {
    ...StyleSheet.absoluteFill, right: 3, bottom: 6, borderRadius: 3,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1EFEB',
  },
  spine: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
    backgroundColor: 'rgba(30,30,30,0.12)', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.27)',
  },
  coverHighlight: {
    ...StyleSheet.absoluteFill, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  attribution: { color: '#746D63', fontSize: 11, lineHeight: 16, textAlign: 'right', paddingHorizontal: 20 },
  author: { color: '#746D63', fontSize: 14 },
  emptyBoard: { justifyContent: 'center' },
  empty: { gap: 8, alignSelf: 'center', alignItems: 'center', padding: 12 },
  action: { minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center' },
});
