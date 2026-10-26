import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';

type Rect = LayoutRectangle;
const holes = new Map<string, Rect>();
const listeners = new Set<() => void>();
let ask: (() => void) | null = null;

function emit() {
  listeners.forEach(listener => listener());
}

export function setTutorialOffPathHandler(handler: (() => void) | null) {
  ask = handler;
  emit();
}

export function clearTutorialOffPathHandler(handler: () => void) {
  if (ask === handler) setTutorialOffPathHandler(null);
}

export function tutorialOffPathAsk() {
  ask?.();
}

/** Window-space rects the current tutorial step is allowed to use. */
export function setTutorialHole(id: string, rect: Rect | null) {
  if (!rect) {
    if (!holes.has(id)) return;
    holes.delete(id);
  } else {
    const prior = holes.get(id);
    if (prior && Math.abs(prior.x - rect.x) < 1 && Math.abs(prior.y - rect.y) < 1 && Math.abs(prior.width - rect.width) < 1 && Math.abs(prior.height - rect.height) < 1) return;
    holes.set(id, rect);
  }
  emit();
}

function useTutorialOffPath() {
  const [snapshot, setSnapshot] = useState<{ holes: Rect[]; armed: boolean }>({ holes: [], armed: false });
  useEffect(() => {
    const sync = () => setSnapshot({ holes: [...holes.values()], armed: ask != null });
    sync();
    listeners.add(sync);
    return () => { listeners.delete(sync); };
  }, []);
  return snapshot;
}

function subtractRect(area: Rect, hole: Rect): Rect[] {
  const left = Math.max(area.x, hole.x);
  const top = Math.max(area.y, hole.y);
  const right = Math.min(area.x + area.width, hole.x + hole.width);
  const bottom = Math.min(area.y + area.height, hole.y + hole.height);
  if (right <= left || bottom <= top) return [area];
  const parts: Rect[] = [];
  if (top > area.y) parts.push({ x: area.x, y: area.y, width: area.width, height: top - area.y });
  if (bottom < area.y + area.height) parts.push({ x: area.x, y: bottom, width: area.width, height: area.y + area.height - bottom });
  if (left > area.x) parts.push({ x: area.x, y: top, width: left - area.x, height: bottom - top });
  if (right < area.x + area.width) parts.push({ x: right, y: top, width: area.x + area.width - right, height: bottom - top });
  return parts;
}

/** Catches presses outside the current step and asks whether to leave the tutorial. */
export function TutorialOffPathShield({ enabled }: { enabled: boolean }) {
  const { holes: allowed, armed: handled } = useTutorialOffPath();
  const armed = enabled && handled;
  const [regions, setRegions] = useState<Rect[]>([]);
  const [host, setHost] = useState<View | null>(null);
  useEffect(() => {
    if (!armed || !host || allowed.length === 0) { setRegions([]); return; }
    let live = true;
    const sample = () => {
      if (typeof host.measureInWindow !== 'function') return;
      host.measureInWindow((x, y, width, height) => {
        if (!live || width <= 0 || height <= 0) return;
        const screen: Rect = { x: 0, y: 0, width, height };
        const opened = allowed.map(hole => ({
          x: hole.x - x - 10, y: hole.y - y - 10, width: hole.width + 20, height: hole.height + 20,
        }));
        const next = opened.reduce((areas, hole) => areas.flatMap(area => subtractRect(area, hole)), [screen])
          .filter(rect => rect.width > 8 && rect.height > 8);
        setRegions(prior => prior.length === next.length && prior.every((rect, index) => Math.abs(rect.x - next[index].x) < 1 && Math.abs(rect.y - next[index].y) < 1 && Math.abs(rect.width - next[index].width) < 1 && Math.abs(rect.height - next[index].height) < 1) ? prior : next);
      });
    };
    sample();
    const timer = setInterval(sample, 250);
    return () => { live = false; clearInterval(timer); };
  }, [armed, host, allowed]);
  if (!armed) return null;
  return <View ref={setHost} collapsable={false} pointerEvents="box-none" style={s.shield}>
    {regions.map(rect => <Pressable key={`${Math.round(rect.x)}:${Math.round(rect.y)}:${Math.round(rect.width)}:${Math.round(rect.height)}`} accessible={false} onPress={tutorialOffPathAsk} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />)}
  </View>;
}

const s = StyleSheet.create({ shield: { ...StyleSheet.absoluteFill, zIndex: 900, elevation: 900 } });
