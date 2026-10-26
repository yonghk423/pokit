import { useEffect, useId, useRef, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { setTutorialHole, useTutorialGuideLayer } from '@shared/ui/tutorial-guide-layer';
import { useServiceTutorial, type ServiceStep } from '../model/serviceTutorial';
/** Register the real control's position; the guide lives in a touch-through layer above its sheet. */
export function ServiceTutorialTarget({ steps, children, style, spotlight = true }: { steps: ServiceStep[]; children: ReactNode; style?: StyleProp<ViewStyle>; spotlight?: boolean }) {
  const active = useServiceTutorial(state => state.active && state.step !== 'finish' && state.completed.length < 2 && steps.includes(state.step));
  const layer = useTutorialGuideLayer();
  const id = useId();
  const ref = useRef<View>(null);
  const publish = useRef<() => void>(() => {});
  useEffect(() => {
    if (!active || !layer || !spotlight) return;
    layer.target(id, ref.current);
    return () => layer.target(id, null);
  }, [active, layer, id, spotlight]);
  useEffect(() => {
    if (!active) { publish.current = () => {}; setTutorialHole(id, null); return; }
    let live = true;
    const measure = () => {
      const node = ref.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (!live) return;
        setTutorialHole(id, width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    };
    publish.current = measure;
    measure();
    const timer = setInterval(measure, 250);
    return () => { live = false; publish.current = () => {}; clearInterval(timer); setTutorialHole(id, null); };
  }, [active, id]);
  return <View ref={ref} collapsable={false} style={style} onLayout={() => publish.current()}>{children}</View>;
}
