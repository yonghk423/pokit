import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, View, type LayoutRectangle } from 'react-native';
export { clearTutorialOffPathHandler, setTutorialHole, setTutorialOffPathHandler } from './offPath';
export type GuideFrame = { target: LayoutRectangle | null; width: number; height: number };
type RenderGuide = (frame: GuideFrame) => ReactNode;
type Entry = { id: string; render: RenderGuide };
type Layer = {
  show: (entry: Entry) => void;
  hide: (id: string) => void;
  target: (id: string, view: View | null) => void;
};
const Context = createContext<Layer | null>(null);
export const useTutorialGuideLayer = () => useContext(Context);
/** Guides are touch-through. Never place a full-screen input shield over real service controls. */
export function TutorialGuideLayer({ children }: { children: ReactNode }) {
  const root = useRef<View>(null);
  const targets = useRef(new Map<string, View>());
  const [entry, setEntry] = useState<Entry | null>(null);
  const [frame, setFrame] = useState<GuideFrame>({ target: null, width: 0, height: 0 });
  const keyboardY = useRef<number | null>(null);
  const show = useCallback((next: Entry) => setEntry(next), []);
  const hide = useCallback((id: string) => setEntry(current => current?.id === id ? null : current), []);
  const target = useCallback((id: string, view: View | null) => {
    if (view) targets.current.set(id, view); else targets.current.delete(id);
  }, []);
  const context = useMemo(() => ({ show, hide, target }), [show, hide, target]);
  useEffect(() => {
    if (!entry) return;
    let live = true;
    const sample = () => root.current?.measureInWindow((x, y, width, fullHeight) => {
      if (!live || !width || !fullHeight) return;
      const height = Math.max(0, Math.min(fullHeight, keyboardY.current == null ? fullHeight : keyboardY.current - y));
      const views = [...targets.current.values()].reverse();
      const commit = (rect: LayoutRectangle | null) => {
        if (!live) return;
        setFrame(prior => {
          const a = prior.target, b = rect;
          return prior.width === width && prior.height === height && (a === b || (a && b && Math.abs(a.x-b.x)<1 && Math.abs(a.y-b.y)<1 && Math.abs(a.width-b.width)<1 && Math.abs(a.height-b.height)<1)) ? prior : { width, height, target: rect };
        });
      };
      const find = (index: number) => {
        const view = views[index];
        if (!view) { commit(null); return; }
        view.measureInWindow((tx, ty, tw, th) => {
          const rect = { x: tx-x, y: ty-y, width: tw, height: th };
          if (tw > 0 && th > 0 && rect.y >= 0 && rect.y+th <= height && rect.x >= 0 && rect.x < width) commit(rect);
          else find(index+1);
        });
      };
      find(0);
    });
    sample();
    const timer = setInterval(sample, 250);
    const shown = Keyboard.addListener('keyboardDidShow', event => { keyboardY.current = event.endCoordinates.screenY; sample(); });
    const hidden = Keyboard.addListener('keyboardDidHide', () => { keyboardY.current = null; sample(); });
    return () => { live = false; clearInterval(timer); shown.remove(); hidden.remove(); };
  }, [entry]);
  return <Context.Provider value={context}><View ref={root} collapsable={false} style={s.root}>
    {children}
    {entry && frame.width > 0 ? <View collapsable={false} pointerEvents="box-none" style={s.overlay}>{entry.render(frame)}</View> : null}
  </View></Context.Provider>;
}
const s = StyleSheet.create({ root: { flex: 1 }, overlay: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000 } });
