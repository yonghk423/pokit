import { cloneElement, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Animated, PanResponder, ScrollView, View, useAnimatedValue, type StyleProp, type ViewStyle, type PressableProps } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { moveHeroCharacter, readHeroCharacterOrder, saveHeroCharacterOrder } from '../lib/heroCharacterOrder';

export const HERO_STYLE_ORDER_KEY = 'pokit:hero-style-order:v1';
function Slot({ offset, children }: { offset: number; children: ReactElement }) {
  const x = useAnimatedValue(0);
  useEffect(() => { Animated.timing(x, { toValue: offset, duration: 160, useNativeDriver: true }).start(); }, [offset, x]);
  return <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>;
}
export function HeroReorderableStyleRail({ children, storageKey = HERO_STYLE_ORDER_KEY, itemWidth = 50, gap = 12, scrollTestID = 'hero-inline-style-scroll', style, scrollStyle, contentContainerStyle }: {
  children: [ReactElement<PressableProps>[], ReactNode]; storageKey?: string; itemWidth?: number; gap?: number; scrollTestID?: string; style?: StyleProp<ViewStyle>; scrollStyle?: StyleProp<ViewStyle>; contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const stride = itemWidth + gap;
  const contentWidth = useRef(0);
  const [order, setOrder] = useState(() => readHeroCharacterOrder(storageKey));
  const [moving, setMoving] = useState<{ id: string; start: number; target: number } | null>(null);
  const session = useRef<{ id: string; start: number; target: number; x: number; scroll: number } | null>(null);
  const suppressed = useRef(false);
  const claimed = useRef(false);
  const offset = useRef(0);
  const pointer = useRef(0);
  const bounds = useRef({ x: 0, width: 0 });
  const scroll = useRef<ScrollView>(null);
  const viewport = useRef<View>(null);
  const x = useAnimatedValue(0);
  const lift = useAnimatedValue(0);
  const update = (pageX: number) => {
    const current = session.current;
    if (!current) return;
    pointer.current = pageX;
    const delta = pageX - current.x + offset.current - current.scroll;
    x.setValue(delta);
    const target = Math.max(0, Math.min(order.length - 1, current.start + Math.round(delta / stride)));
    if (target !== current.target) {
      current.target = target;
      setMoving({ id: current.id, start: current.start, target });
      tapHaptic('select');
    }
  };
  const finish = (cancel = false) => {
    const current = session.current;
    if (!current) return;
    session.current = null;
    claimed.current = false;
    if (!cancel) {
      const next = moveHeroCharacter(order, current.id, current.target);
      setOrder(next);
      saveHeroCharacterOrder(next, storageKey);
    }
    setMoving(null);
    x.setValue(0);
    Animated.timing(lift, { toValue: 0, duration: 140, useNativeDriver: true }).start();
  };
  const handlers = useRef({ update, finish });
  useLayoutEffect(() => { handlers.current = { update, finish }; });
  // PanResponder stores callbacks; refs are read only when touch events fire.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: () => !!session.current,
    onPanResponderGrant: () => { claimed.current = true; },
    onPanResponderMove: (_, gesture) => handlers.current.update(gesture.moveX),
    onPanResponderRelease: () => handlers.current.finish(),
    onPanResponderTerminate: () => handlers.current.finish(true),
    onPanResponderTerminationRequest: () => false,
  }));
  const active = !!moving;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      const { x: left, width } = bounds.current;
      if (!width) return;
      const direction = pointer.current < left + 24 ? -1 : pointer.current > left + width - 24 ? 1 : 0;
      if (!direction) return;
      const max = Math.max(0, contentWidth.current - width);
      offset.current = Math.max(0, Math.min(max, offset.current + direction * 4));
      scroll.current?.scrollTo({ x: offset.current, animated: false });
      handlers.current.update(pointer.current);
    }, 30);
    return () => clearInterval(timer);
  }, [active, order.length, stride]);
  const [items, upcoming] = children;
  return <View ref={viewport} style={style} {...pan.panHandlers} onLayout={() => viewport.current?.measureInWindow((left, _top, width) => { bounds.current = { x: left, width }; })}>
    <ScrollView ref={scroll} testID={scrollTestID} style={scrollStyle} horizontal scrollEnabled={!moving} keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}
      onScroll={event => { offset.current = event.nativeEvent.contentOffset.x; }} scrollEventThrottle={16}
      onContentSizeChange={width => { contentWidth.current = width; }}
      contentContainerStyle={[{ paddingVertical: 8, paddingHorizontal: 4, gap, alignItems: 'flex-start' }, contentContainerStyle]}>
      {/* Cloned press handlers read refs only during touch events, never while rendering. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {order.map((id, index) => {
        const item = items.find(child => child.key === id);
        if (!item) return null;
        const selected = moving?.id === id;
        const shift = moving && !selected ? moving.start < index && index <= moving.target ? -stride : moving.target <= index && index < moving.start ? stride : 0 : 0;
        return <Animated.View key={id} style={{ zIndex: selected ? 10 : 0, transform: selected ? [{ translateX: x }, { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] : [] }}>
          <Slot offset={shift}>{cloneElement(item, {
            delayLongPress: 350,
            onPressIn: () => { if (!session.current) suppressed.current = false; },
            onLongPress: event => {
              suppressed.current = true;
              const pageX = event.nativeEvent.pageX;
              pointer.current = pageX;
              session.current = { id, start: index, target: index, x: pageX, scroll: offset.current };
              setMoving({ id, start: index, target: index });
              tapHaptic('select');
              Animated.timing(lift, { toValue: 1, duration: 140, useNativeDriver: true }).start();
            },
            onPressOut: () => { setTimeout(() => { if (session.current && !claimed.current) handlers.current.finish(); }, 0); },
            onPress: event => { if (!suppressed.current) item.props.onPress?.(event); },
          })}</Slot>
        </Animated.View>;
      })}
      {upcoming}
    </ScrollView>
  </View>;
}
