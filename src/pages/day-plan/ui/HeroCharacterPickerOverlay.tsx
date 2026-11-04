import { HeroGeneratedCollectionCard, useHeroGeneratedImages } from './HeroGeneratedCollectionCard';
import type { HeroAiLibraryImage } from '../lib/heroAiLibrary';
import { useComicCharacterNames } from '../lib/heroCharacterName';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, View, useAnimatedValue, useWindowDimensions } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { PenFrame } from '@shared/ui/pen-frame';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { moveHeroCharacter, readHeroCharacterOrder, saveHeroCharacterOrder } from '../lib/heroCharacterOrder';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { SELECTABLE_COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';

function PickerPreview({ source, fallback, width, height, isDark, id, contain = false }: { source: ImageSource | number; fallback: ImageSource | number; width: number; height: number; isDark: boolean; id: string; contain?: boolean }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return <View testID={`hero-picker-preview-frame-${id}`} style={{ width, height, overflow: 'hidden' }}>
    <Image testID={`hero-picker-image-${id}`} source={failed ? fallback : source} contentFit={contain ? 'contain' : 'cover'} transition={150} style={StyleSheet.absoluteFill} onDisplay={() => setReady(true)} onError={() => { if (failed) setReady(true); else setFailed(true); }} />
    {!ready ? <View testID={`hero-picker-skeleton-${id}`} pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#363B37' : '#E9E6DF', padding: 12, justifyContent: 'flex-end', gap: 6 }]}>
      <View style={{ position: 'absolute', top: '16%', left: '18%', width: '64%', height: '45%', borderRadius: 18, backgroundColor: isDark ? '#414640' : '#E0DCD3' }} />
      <View style={{ width: '65%', height: 5, borderRadius: 3, backgroundColor: isDark ? '#494E48' : '#D9D5CC' }} />
      <View style={{ width: '42%', height: 5, borderRadius: 3, backgroundColor: isDark ? '#494E48' : '#D9D5CC' }} />
    </View> : null}
  </View>;
}

function PickerCardSlot({ id, offset, active, width, height, children }: { id: string; offset: number; active: boolean; width: number; height: number; children: React.ReactNode }) {
  const x = useAnimatedValue(0);
  const wasActive = useRef(false);
  // Each card keeps its own translation node through reordering. Never attach
  // a shared native transform to one card and detach it from another.
  useLayoutEffect(() => {
    x.stopAnimation();
    const immediate = active || wasActive.current;
    wasActive.current = active;
    if (immediate) { x.setValue(offset); return; }
    const animation = Animated.timing(x, { toValue: offset, duration: 160, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [active, offset, x]);
  return <Animated.View testID={`hero-picker-position-${id}`} style={{ width, height, flexShrink: 0, zIndex: active ? 10 : 0, transform: [{ translateX: x }] }}>{children}</Animated.View>;
}

export function HeroCharacterPickerOverlay({ selectedId, isDark, onSelect, onClose, onChooseGenerated }: { onChooseGenerated?: (image: HeroAiLibraryImage) => void; selectedId?: string; isDark: boolean; onSelect: (character: ComicCharacter) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const nameFor = useComicCharacterNames();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = Math.max(80, Math.min(124, (width - 64) / 2.5, (height - insets.top - insets.bottom - 180) * 0.6));
  const imageHeight = cardWidth * 1.1;
  const cardHeight = imageHeight + 48;
  const [previews] = useState(() => Object.fromEntries(SELECTABLE_COMIC_CHARACTERS.map(character => {
    const scene = character.scenes[Math.floor(Math.random() * character.scenes.length)];
    return [character.id, scene ? COMIC_SCENE_THUMBNAILS[scene.id] ?? scene.source : character.cover];
  })));
  const generatedImages = useHeroGeneratedImages();
  const [savedOrder, setOrder] = useState(() => readHeroCharacterOrder(undefined, ['generated-illustrations']));
  const order = savedOrder.filter(id => id !== 'generated-illustrations' || generatedImages.length > 0);
  const characters = order.map(id => SELECTABLE_COMIC_CHARACTERS.find(character => character.id === id) ?? { ...SELECTABLE_COMIC_CHARACTERS[0], id });
  const [dragging, setDragging] = useState<{ id: string; start: number; target: number } | null>(null);
  const drag = useRef<{ id: string; start: number; target: number; pageX: number; scrollStart: number } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const pointerX = useRef(0);
  const suppressPress = useRef(false);
  const panActive = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const stride = cardWidth + 10;
  const updateDrag = (pageX: number) => {
    const current = drag.current;
    if (!current) return;
    pointerX.current = pageX;
    const delta = pageX - current.pageX + scrollOffset.current - current.scrollStart;
    setDragOffset(delta);
    const target = Math.max(0, Math.min(order.length - 1, current.start + Math.round(delta / stride)));
    if (target !== current.target) {
      current.target = target;
      setDragging({ id: current.id, start: current.start, target });
      tapHaptic('select');
    }
  };
  const endDrag = (cancel = false) => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    panActive.current = false;
    if (!cancel) {
      const next = moveHeroCharacter(order, current.id, current.target);
      setOrder(next);
      saveHeroCharacterOrder(next);
    }
    setDragging(null);
    setDragOffset(0);
  };
  const dragHandlers = useRef({ updateDrag, endDrag });
  useLayoutEffect(() => { dragHandlers.current = { updateDrag, endDrag }; });
  // PanResponder stores these callbacks; refs are read only when a touch event fires.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: () => !!drag.current,
    onPanResponderGrant: () => { panActive.current = true; },
    onPanResponderMove: (_, gesture) => dragHandlers.current.updateDrag(gesture.moveX),
    onPanResponderRelease: () => dragHandlers.current.endDrag(),
    onPanResponderTerminate: () => dragHandlers.current.endDrag(true),
    onPanResponderTerminationRequest: () => false,
  }));
  useEffect(() => {
    if (!dragging) return;
    const timer = setInterval(() => {
      const viewportWidth = Math.min(width - 40, 440) - 24;
      const left = (width - viewportWidth) / 2;
      const direction = pointerX.current < left + 32 ? -1 : pointerX.current > left + viewportWidth - 32 ? 1 : 0;
      if (!direction) return;
      const max = Math.max(0, (order.length + 1) * stride + 12 - viewportWidth);
      const next = Math.max(0, Math.min(max, scrollOffset.current + direction * 5));
      scrollOffset.current = next;
      scrollRef.current?.scrollTo({ x: next, animated: false });
      updateDrag(pointerX.current);
    }, 30);
    return () => clearInterval(timer);
  // The drag session reads current coordinates from refs; target changes do not restart scrolling.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!dragging, width, stride, order.length]);
  const ink = isDark ? '#EEEDE5' : '#292E28';
  const paper = isDark ? '#262B28' : '#F7F6F4';
  const cardStyle = { width: cardWidth, height: cardHeight, flexShrink: 0, padding: 5, backgroundColor: paper, shadowColor: '#161B16', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.22 : 0.1, shadowRadius: 4, elevation: 2 };
  const progress = useAnimatedValue(0);
  const closing = useRef(false);
  const live = useRef(true);
  const reduced = useRef(false);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; progress.stopAnimation(); };
  }, [progress]);
  const show = () => {
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (!live.current || closing.current) return;
      reduced.current = value;
      Animated.timing(progress, { toValue: 1, duration: value ? 0 : 300, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }).start();
    }, () => { if (live.current && !closing.current) progress.setValue(1); });
  };
  const close = (complete: () => void = onClose) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: reduced.current ? 0 : 180, easing: Easing.in(Easing.quad), useNativeDriver: true, isInteraction: false }).start(({ finished }) => { if (finished && live.current) complete(); });
  };
  return <AppModal transparent animationType="none" statusBarTranslucent onShow={show} onRequestClose={() => close()}>
    <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 76 }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(25,30,25,0.14)', opacity: progress }]} />
      <Pressable testID="hero-character-picker-backdrop" accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => close()} style={StyleSheet.absoluteFill} />
      <Animated.View testID="hero-character-picker-overlay" {...pan.panHandlers} accessibilityViewIsModal style={{ width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: paper, padding: 8, overflow: 'hidden', opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 8 }}>
          <ThemedText numberOfLines={1} style={{ flex: 1, color: ink, fontSize: 17 }}>{t('tabs.comicDay')}</ThemedText>
          <Pressable testID="hero-character-picker-close" accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => close()} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center' }}><HanddrawnControl name="xmark" color={ink} size={20} /></Pressable>
        </View>
        <ScrollView ref={scrollRef} scrollEnabled={!dragging} onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.x; }} scrollEventThrottle={16} testID="hero-character-picker-scroll" horizontal showsHorizontalScrollIndicator={false} style={{ height: cardHeight + 24, flexGrow: 0, marginHorizontal: 4 }} contentContainerStyle={{ paddingHorizontal: 6, paddingVertical: 10, gap: 10, alignItems: 'flex-start' }}>
          {characters.map((character, index) => {
            const active = dragging?.id === character.id;
            const shift = dragging && !active
              ? dragging.start < index && index <= dragging.target ? -stride
                : dragging.target <= index && index < dragging.start ? stride : 0
              : 0;
            return <PickerCardSlot key={character.id} id={character.id} width={cardWidth} height={cardHeight} active={active} offset={active ? dragOffset : shift}>
                {character.id === 'generated-illustrations' ? <HeroGeneratedCollectionCard images={generatedImages} compact width={cardWidth} height={cardHeight} ink={ink} paper={paper} onChoose={onChooseGenerated}
                  delayLongPress={350}
                  onPressIn={() => { if (!drag.current) suppressPress.current = false; }}
                  onLongPress={event => {
                    if (closing.current) return;
                    suppressPress.current = true;
                    const pageX = event.nativeEvent.pageX;
                    pointerX.current = pageX;
                    drag.current = { id: character.id, start: index, target: index, pageX, scrollStart: scrollOffset.current };
                    setDragging({ id: character.id, start: index, target: index });
                    tapHaptic('select');
                    setDragOffset(0);
                  }}
                  onPressOut={() => { setTimeout(() => { if (drag.current && !panActive.current) endDrag(); }, 0); }}
                  onPress={() => { if (suppressPress.current) return false; }} /> : <>
                <Pressable testID={`hero-character-picker-${character.id}`} accessibilityRole="button" accessibilityLabel={t('comicDay.character.choose', { name: nameFor(character.id, t(character.name)) })} accessibilityState={{ selected: selectedId === character.id }}
                  delayLongPress={350}
                  onPressIn={() => { if (!drag.current) suppressPress.current = false; }}
                  onLongPress={event => {
                    if (closing.current) return;
                    suppressPress.current = true;
                    const pageX = event.nativeEvent.pageX;
                    pointerX.current = pageX;
                    drag.current = { id: character.id, start: index, target: index, pageX, scrollStart: scrollOffset.current };
                    setDragging({ id: character.id, start: index, target: index });
                    tapHaptic('select');
                    setDragOffset(0);
                  }}
                  onPressOut={() => { setTimeout(() => { if (drag.current && !panActive.current) endDrag(); }, 0); }}
                  onPress={() => { if (suppressPress.current) return; tapHaptic('select'); close(() => { const chosen = SELECTABLE_COMIC_CHARACTERS.find(item => item.id === character.id); if (chosen) onSelect(chosen); }); }} style={cardStyle}>
                  <PickerPreview id={character.id} source={previews[character.id]} fallback={character.cover} width={cardWidth - 10} height={imageHeight} isDark={isDark} />
                  <View style={{ height: 38, alignItems: 'center', justifyContent: 'center' }}><ThemedText numberOfLines={1} style={{ color: ink, fontSize: 14 }}>{nameFor(character.id, t(character.name))}</ThemedText></View>
                  <PenFrame color={ink} straight />
                </Pressable></>}

            </PickerCardSlot>;
          })}
        </ScrollView>
        <PenFrame color={ink} />
      </Animated.View>
    </View>
  </AppModal>;
}
