import { HeroCardCaption } from './HeroCardCaption';
import { ComicSceneDeck } from './HeroSceneDeck';
import { HeroCardStack } from './HeroCardStack';
import { DayPlanTabFocusContext } from '../model/dayPlanTabFocus';
import { StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Animated, View } from 'react-native';
import { ComicDayBoard } from './HeroDayBoard';
beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/completion-radio-button', () => ({ CompletionRadioButton: () => null }));
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: () => null }));
jest.mock('react-native-gesture-handler', () => {
  const chain = () => {
    const gesture: Record<string, unknown> = {};
    for (const name of ['enabled', 'activeOffsetY', 'failOffsetX', 'onEnd', 'onBegin', 'onStart', 'minDuration', 'maxDistance', 'activateAfterLongPress', 'runOnJS']) gesture[name] = (value: unknown) => { gesture[`${name}Value`] = value; return gesture; };
    return gesture;
  };
  return { ScrollView: jest.requireActual('react-native').ScrollView, GestureDetector: ({ children }: { children: unknown }) => children, Gesture: { Pan: chain, LongPress: chain, Native: chain, Simultaneous: (...gestures: unknown[]) => ({ gestures }) } };
});
jest.mock('react-native-reanimated', () => ({ runOnJS: (fn: (...args: unknown[]) => unknown) => fn }));

function isVisible(node: ReactTestInstance): boolean {
  for (let current: ReactTestInstance | null = node; current; current = current.parent) {
    if (['comic-card-deck-layer', 'comic-card-grid-layer'].includes(current.props.testID) && current.props.accessibilityElementsHidden === true) return false;
  }
  return true;
}

it('selects multiple cards without opening them, supports select all and clears selection on cancel', () => {
  const onOpen = jest.fn();
  const onRemoveMany = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDayBoard items={[{ key: 'one', label: 'First', icon: '' }, { key: 'two', label: 'Second', icon: '' }, { key: 'three', label: 'Third', icon: '' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={onOpen} onAdd={jest.fn()} onRemoveMany={onRemoveMany} />); });
  const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function' && isVisible(node))[0];
  act(() => { button('comicDay.toggleDelete').props.onPress(); });
  expect(button('comicDay.deleteSelected').props.disabled).toBe(true);
  act(() => { button('First').props.onPress(); });
  act(() => { button('Second').props.onPress(); });
  expect(onOpen).not.toHaveBeenCalled();
  expect(onRemoveMany).not.toHaveBeenCalled();
  act(() => { button('comicDay.deleteSelected').props.onPress(); });
  expect(onRemoveMany).toHaveBeenLastCalledWith(['one', 'two']);
  act(() => { button('comicDay.selectAll').props.onPress(); });
  act(() => { button('comicDay.deleteSelected').props.onPress(); });
  expect(onRemoveMany).toHaveBeenLastCalledWith(['one', 'two', 'three']);
  act(() => { button('comicDay.clearSelection').props.onPress(); });
  expect(button('comicDay.deleteSelected').props.disabled).toBe(true);
  act(() => { button('First').props.onPress(); });
  act(() => { button('common.cancel').props.onPress(); });
  act(() => { button('comicDay.toggleDelete').props.onPress(); });
  expect(button('comicDay.deleteSelected').props.disabled).toBe(true);
  act(() => { tree.unmount(); });
});

it('opens a diary as a card deck and shows the comic grid only from the layout button', () => {
  const transition = jest.spyOn(Animated, 'timing');
  const onOpen = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDayBoard diaryTitle="Diary" items={[{ key: 'one', label: 'First', icon: '' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={onOpen} onAdd={jest.fn()} />); });
  const byId = (id: string) => tree.root.findAll(node => node.props.testID === id);
  const deck = () => byId('comic-scene-deck').filter(isVisible);
  expect(deck().length).toBeGreaterThan(0);
  expect(byId('comic-show-cards')).toHaveLength(0);
  act(() => { byId('comic-card-tools-fab').find(node => typeof node.props.onPress === 'function')!.props.onPress(); });
  act(() => { byId('comic-board-view')[0].props.onPress(); });
  expect(deck()).toHaveLength(0);
  expect(byId('comic-scene-deck').length).toBeGreaterThan(0);
  expect(byId('comic-card-grid-layer')[0].props.pointerEvents).toBe('auto');
  expect(transition).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 580, useNativeDriver: true }));
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.boardView' && node.props.accessibilityState?.expanded === true)).toHaveLength(0);
  act(() => { byId('comic-card-tools-fab').find(node => typeof node.props.onPress === 'function')!.props.onPress(); });
  act(() => { byId('comic-board-view')[0].props.onPress(); });
  expect(tree.root.findAll(node => node.props.accessibilityViewIsModal === true).length).toBeGreaterThan(0);
  act(() => { tree.root.findAll(node => node.props.accessibilityLabel === 'common.close' && typeof node.props.onPress === 'function' && isVisible(node))[0].props.onPress(); });
  act(() => { byId('comic-card-tools-fab').find(node => typeof node.props.onPress === 'function')!.props.onPress(); });
  act(() => { byId('comic-show-cards')[0].props.onPress(); });
  expect(deck().length).toBeGreaterThan(0);
  expect(transition).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0, duration: 420, useNativeDriver: true }));
  transition.mockRestore();
  act(() => { tree.unmount(); });
});

it('returns to the card deck when delete mode started there is turned off', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDayBoard diaryTitle="Diary" items={[{ key: 'one', label: 'First', icon: '' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} onAdd={jest.fn()} onRemoveMany={jest.fn()} />); });
  const deck = () => tree.root.findAll(node => node.props.testID === 'comic-scene-deck' && isVisible(node));
  const trash = () => tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.toggleDelete' && typeof node.props.onPress === 'function' && isVisible(node))[0];
  act(() => { trash().props.onPress(); });
  expect(deck()).toHaveLength(0);
  act(() => { tree.root.findAll(node => node.props.accessibilityLabel === 'common.cancel' && typeof node.props.onPress === 'function' && isVisible(node))[0].props.onPress(); });
  expect(deck().length).toBeGreaterThan(0);
  act(() => { trash().props.onPress(); });
  act(() => { tree.root.findAll(node => node.props.accessibilityLabel === 'common.cancel' && typeof node.props.onPress === 'function' && isVisible(node))[0].props.onPress(); });
  expect(deck().length).toBeGreaterThan(0);
  act(() => { tree.unmount(); });
});


it('shows the protagonist name without the section title and reveals tools through the drawer', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDayBoard diaryTitle="Diary" characterName="주인공1" items={[{ key: 'one', label: 'First', icon: '' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} onAdd={jest.fn()} onRemoveMany={jest.fn()} />); });
  expect(tree.root.findAll(node => node.props.children === 'comicDay.title')).toHaveLength(0);
  expect(tree.root.findAll(node => node.props.children === '주인공1').length).toBeGreaterThan(0);
  expect(tree.root.findByType(require('./CardToolsFab').CardToolsFab).props.concept).toBe('film');
  const drawer = () => tree.root.findAll(node => node.props.testID === 'comic-card-tools-fab' && typeof node.props.onPress === 'function' && isVisible(node))[0];
  expect(drawer().props.accessibilityState.expanded).toBe(false);
  act(() => { drawer().props.onPress(); });
  expect(drawer().props.accessibilityState.expanded).toBe(true);
  act(() => { tree.unmount(); });
});

it('uses a held upward swipe for overview, a held downward swipe to return, and no long-press deletion', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDayBoard diaryTitle="Diary" items={[{ key: 'one', label: 'First', icon: '' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} onAdd={jest.fn()} onRemove={jest.fn()} onRemoveMany={jest.fn()} />); });
  const { GestureDetector } = jest.requireMock('react-native-gesture-handler');
  const deck = () => tree.root.findAll(node => node.props.testID === 'comic-scene-deck' && isVisible(node));
  act(() => { deck().find(node => typeof node.props.onLayout === 'function')!.props.onLayout({ nativeEvent: { layout: { width: 340, height: 600 } } }); });
  act(() => jest.advanceTimersByTime(50));
  const up = tree.root.findAllByType(GestureDetector).find(node => node.props.gesture.activateAfterLongPressValue === 350)!.props.gesture;
  expect(up.enabledValue).toBe(true);
  expect(tree.root.findAll(node => typeof node.props.onLongPress === 'function')).toHaveLength(0);
  act(() => { up.onEndValue({ translationY: -20 }, true); });
  expect(deck().length).toBeGreaterThan(0);
  act(() => { up.onEndValue({ translationY: -90 }, true); });
  expect(deck()).toHaveLength(0);
  const down = () => tree.root.findAllByType(GestureDetector).map(node => node.props.gesture).find(gesture => gesture.gestures?.[1]?.activeOffsetYValue === 16).gestures[1];
  expect(down().activateAfterLongPressValue).toBe(350);
  const scroll = tree.root.findAllByProps({ testID: 'comic-card-overview' })[0];
  act(() => { scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 100 } } }); down().onBeginValue(); down().onEndValue({ translationY: 100 }, true); });
  expect(deck()).toHaveLength(0);
  act(() => { scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 0 } } }); down().onBeginValue(); down().onEndValue({ translationY: 100 }, true); });
  expect(deck().length).toBeGreaterThan(0);
  act(() => { tree.unmount(); });
});


it('copies layout coordinates before React processes queued state updates', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDayBoard diaryTitle="Diary" items={[{ key: 'one', label: 'First', icon: '' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} onAdd={jest.fn()} />); });
  const grid = tree.root.findAllByProps({ testID: 'comic-card-grid-layout' })[0];
  let released = false;
  const event = {
    get nativeEvent() {
      if (released) throw new Error('Layout event has been released');
      return { layout: { width: 360, y: 32 } };
    },
  };
  act(() => {
    grid.props.onLayout({ nativeEvent: { layout: { width: 350, y: 16 } } });
    grid.props.onLayout(event);
    released = true;
  });
  const motion = tree.root.findByType(require('./HeroOverviewCardMotion').HeroOverviewCardMotion);
  expect(motion.props.parentTop).toBe(32);
  act(() => tree.unmount());
});


jest.mock('./HeroCardStack', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const { GestureDetector } = jest.requireMock('react-native-gesture-handler');
  return { HeroCardStack: React.forwardRef(function MockStack({ active, enabled, overviewGesture, width, cardWidth, renderPage, onChange }: { overviewGesture?: unknown; active: number; enabled: boolean; width: number; cardWidth: number; renderPage: (index: number, interactive: boolean, focused: boolean) => unknown; onChange: (index: number) => void }, ref: unknown) {
    React.useImperativeHandle(ref, () => ({ turnTo: onChange }));
    return <GestureDetector gesture={overviewGesture ?? {}}><View testID="comic-card-stack" width={width} cardWidth={cardWidth}>{renderPage(active, enabled, true)}</View></GestureDetector>;
  }) };
});

it('scales the main scene card up on iPad-sized stages', () => {
  const { ComicSceneDeck } = require('./HeroSceneDeck');
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneDeck items={[{ key: 'one', label: 'First' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} />, { createNodeMock: () => ({ scrollTo: jest.fn(), measure: jest.fn() }) }); });
  const deck = tree.root.findAllByProps({ testID: 'comic-scene-deck' })[0];
  act(() => deck.props.onLayout({ nativeEvent: { layout: { width: 1024, height: 1100 } } }));
  act(() => jest.advanceTimersByTime(50));
  const stack = tree.root.findAllByProps({ testID: 'comic-card-stack' })[0];
  expect(stack.props.cardWidth).toBe(560);
  act(() => tree.unmount());
});

it('uses a live stack without the capture module and preserves measured detail fronts', () => {
  const nativeModuleGetter = jest.spyOn(require('react-native').TurboModuleRegistry, 'get').mockReturnValue(null);
  const { ComicSceneDeck } = require('./HeroSceneDeck');
  const onOpen = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneDeck items={[{ key: 'one', label: 'First' }, { key: 'two', label: 'Second' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={onOpen} />, { createNodeMock: () => ({ scrollTo: jest.fn(), measure: (_callback: unknown) => undefined, measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(12, 180, 366, 360) }) }); });
  const deck = tree.root.findAllByProps({ testID: 'comic-scene-deck' })[0];
  act(() => deck.props.onLayout({ nativeEvent: { layout: { width: 390, height: 650 } } }));
  act(() => jest.advanceTimersByTime(50));
  expect(tree.root.findAllByProps({ testID: 'comic-card-stack' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'comic-page-pager' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'comic-paper-turn' })).toHaveLength(0);
  tree.root.findAllByType(View).filter(node => node.props.collapsable === false).forEach(node => {
    node.instance.measureInWindow = (callback: (x: number, y: number, width: number, height: number) => void) => callback(12, 180, 366, 360);
  });
  const card = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && !node.props.accessibilityState && typeof node.props.onPress === 'function')[0];
  act(() => card('First').props.onPress());
  expect(onOpen).toHaveBeenLastCalledWith('one', expect.objectContaining({ frame: { left: 12, top: 180, width: 366, height: 360 } }));
  const secondThumb = tree.root.findAll(node => node.props.accessibilityLabel === 'Second' && !!node.props.accessibilityState && typeof node.props.onPress === 'function')[0];
  act(() => secondThumb.props.onPress());
  act(() => card('Second').props.onPress());
  expect(onOpen).toHaveBeenLastCalledWith('two', expect.objectContaining({ frame: { left: 12, top: 180, width: 366, height: 360 } }));
  expect(secondThumb.props.accessibilityState.selected).toBe(true);
  nativeModuleGetter.mockRestore();
  act(() => tree.unmount());
});

it.each([false, true])('opens the mate bag with scenes present: %s', withScenes => {
  const onOpenBag = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<ComicDayBoard diaryTitle="Diary" items={withScenes ? [{ key: 'one', label: 'First', icon: '' }] : []} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} onAdd={jest.fn()} onOpenBag={onOpenBag} />);
  });
  const bag = tree.root.findAll(node => node.props.testID === 'comic-open-mate-bag' && typeof node.props.onPress === 'function')[0];
  expect(bag.props.accessibilityRole).toBe('button');
  act(() => bag.props.onPress());
  expect(onOpenBag).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it('restores the selected front after detail and tab returns, rejecting detached stage sizes', () => {
  let tree!: ReactTestRenderer;
  let nativeHeight = 650;
  const items = Array.from({ length: 8 }, (_, index) => ({ key: `scene-${index}`, label: `Scene ${index}` }));
  const render = (focused: boolean, detailOpen = false) => <DayPlanTabFocusContext.Provider value={focused}><ComicSceneDeck items={items} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} detailOpen={detailOpen} /></DayPlanTabFocusContext.Provider>;
  act(() => {
    tree = create(render(true), { createNodeMock: () => ({ scrollTo: jest.fn(), measure: (complete: (x: number, y: number, width: number, height: number) => void) => complete(0, 0, 390, nativeHeight) }) });
  });
  act(() => jest.advanceTimersByTime(90));
  const thumb = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && !!node.props.accessibilityState && typeof node.props.onPress === 'function')[0];
  act(() => thumb('Scene 7').props.onPress());
  const front = () => tree.root.findAllByType(View).find(node => node.props.collapsable === false && StyleSheet.flatten(node.props.style)?.width > 100)!;
  act(() => tree.update(render(true, true)));
  expect(StyleSheet.flatten(front().props.style).opacity).toBe(0);
  act(() => tree.update(render(true, false)));
  act(() => tree.root.findAllByProps({ testID: 'comic-scene-deck' })[0].props.onLayout({ nativeEvent: { layout: { width: 390, height: 1 } } }));
  act(() => jest.advanceTimersByTime(90));
  expect(StyleSheet.flatten(front().props.style).opacity).toBe(1);
  nativeHeight = 1;
  act(() => tree.update(render(false)));
  act(() => tree.root.findAllByProps({ testID: 'comic-scene-deck' })[0].props.onLayout({ nativeEvent: { layout: { width: 390, height: 1 } } }));
  nativeHeight = 650;
  act(() => tree.update(render(true)));
  act(() => jest.advanceTimersByTime(90));
  expect(tree.root.findByType(HeroCardStack).props.height).toBeGreaterThan(500);
  expect(StyleSheet.flatten(front().props.style).opacity).toBe(1);
  expect(thumb('Scene 7').props.accessibilityState.selected).toBe(true);
  act(() => tree.unmount());
});

it('scrolls overflowing thumbnail rows and keeps a short row still', () => {
  let tree!: ReactTestRenderer;
  const render = (count: number) => <ComicSceneDeck items={Array.from({ length: count }, (_, index) => ({ key: `thumb-${index}`, label: `Thumb ${index}` }))} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} />;
  act(() => { tree = create(render(8), { createNodeMock: () => ({ scrollTo: jest.fn(), measure: (complete: (x: number, y: number, width: number, height: number) => void) => complete(0, 0, 390, 650) }) }); });
  act(() => jest.advanceTimersByTime(90));
  act(() => tree.root.findAllByProps({ testID: 'comic-scene-thumbs' })[0].props.onLayout({ nativeEvent: { layout: { width: 250 } } }));
  const scroll = () => tree.root.findAllByProps({ testID: 'comic-scene-thumbs-scroll' })[0];
  expect(scroll().props.scrollEnabled).toBe(true);
  expect(scroll().props.disallowInterruption).toBe(true);
  expect(StyleSheet.flatten(scroll().props.contentContainerStyle).justifyContent).toBe('flex-start');
  act(() => tree.update(render(2)));
  expect(scroll().props.scrollEnabled).toBe(false);
  expect(StyleSheet.flatten(scroll().props.contentContainerStyle).justifyContent).toBe('center');
  act(() => tree.unmount());
});

it('edits the active card in place and pauses deck gestures until saving', () => {
  const onOpen = jest.fn();
  const onEditCard = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneDeck items={[{ key: 'inline-one', label: '운동하기' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={onOpen} onEditCard={onEditCard} />); });
  act(() => tree.root.findAllByProps({ testID: 'comic-scene-deck' })[0].props.onLayout({ nativeEvent: { layout: { width: 390, height: 650 } } }));
  act(() => jest.advanceTimersByTime(50));
  const caption = () => tree.root.findByType(HeroCardCaption);
  act(() => caption().props.onEditingChange(true));
  expect(tree.root.findByType(HeroCardStack).props.swipeEnabled).toBe(false);
  expect(tree.root.findByType(HeroCardStack).props.enabled).toBe(true);
  expect(onOpen).not.toHaveBeenCalled();
  act(() => { caption().props.onSave({ title: '아침 운동', memo: '개운하다.' }); caption().props.onEditingChange(false); });
  expect(onEditCard).toHaveBeenCalledWith('inline-one', { title: '아침 운동', memo: '개운하다.' });
  expect(tree.root.findByType(HeroCardStack).props.swipeEnabled).toBe(true);
  act(() => tree.unmount());
});

it('keeps the edit icon in the return-animation front so the title does not shift during handoff', () => {
  const onOpen = jest.fn();
  let tree!: ReactTestRenderer;
  let front!: ReactTestRenderer;
  const items = [{ key: 'return-one', label: '운동하기', memo: '가볍게 몸을 풀었다.' }];
  const render = (detailOpen: boolean) => <ComicSceneDeck items={items} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={onOpen} onEditCard={jest.fn()} detailOpen={detailOpen} />;
  const options = { createNodeMock: () => ({ scrollTo: jest.fn(), measure: jest.fn(), measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(12, 180, 326, 500) }) };
  act(() => { tree = create(render(false), options); });
  act(() => tree.root.findAllByProps({ testID: 'comic-scene-deck' })[0].props.onLayout({ nativeEvent: { layout: { width: 390, height: 650 } } }));
  act(() => jest.advanceTimersByTime(50));
  tree.root.findAllByType(View).filter(node => node.props.collapsable === false).forEach(node => {
    node.instance.measureInWindow = (callback: (x: number, y: number, width: number, height: number) => void) => callback(12, 180, 326, 500);
  });
  act(() => tree.root.findAll(node => node.props.accessibilityLabel === '운동하기' && !node.props.accessibilityState && typeof node.props.onPress === 'function')[0].props.onPress());
  const opened = onOpen.mock.calls[0][1];
  expect(tree.root.findByType(HeroCardCaption).props.showEdit).toBe(true);
  act(() => { tree.update(render(true)); });
  expect(tree.root.findByType(HeroCardCaption).props.showEdit).toBe(true);
  act(() => opened.readCurrent((current: { front: React.ReactElement }) => { front = create(current.front); }));
  const icon = front.root.findAll(node => node.props.testID === 'hero-card-edit' && typeof node.props.onPress === 'function')[0];
  expect(icon).toBeDefined();
  expect(icon.props.disabled).toBe(true);
  act(() => tree.update(render(false)));
  expect(tree.root.findByType(HeroCardCaption).props.showEdit).toBe(true);
  act(() => { front.unmount(); tree.unmount(); });
});
