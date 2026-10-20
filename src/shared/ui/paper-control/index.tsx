import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';

function grayscale(value: unknown, fallback: string) {
  if (typeof value !== 'string' || value === 'transparent') return fallback;
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (!hex) return value;
  const n = hex[1];
  const gray = Math.round(0.299 * parseInt(n.slice(0, 2), 16) + 0.587 * parseInt(n.slice(2, 4), 16) + 0.114 * parseInt(n.slice(4, 6), 16));
  return `rgb(${gray},${gray},${gray})`;
}

/** Paper controls preserve layout, press callbacks, and selected/disabled states. */
export function PaperControl({ children, style, preserveColor = false, ...props }: PressableProps & { preserveColor?: boolean }) {
  const dark = useColorScheme() === 'dark';
  const decorate = props.accessibilityRole !== 'checkbox';
  return <Pressable {...props} style={state => {
    const base = typeof style === 'function' ? style(state) : style;
    const face = StyleSheet.flatten(base)?.backgroundColor;
    return [base, decorate && { borderWidth: 0, borderRadius: 0, backgroundColor: preserveColor ? (face ?? (dark ? '#292929' : '#FFFFFF')) : grayscale(face, dark ? '#292929' : '#FFFFFF'), shadowOpacity: 0, elevation: 0, overflow: 'hidden' }];
  }}>
    {state => <>{decorate ? <><PaperGrain /><HanddrawnFrame color={dark ? '#D5D5D5' : '#454545'} bold={props.accessibilityState?.selected || props.accessibilityState?.checked === true} /></> : null}{typeof children === 'function' ? children(state) : children}</>}
  </Pressable>;
}
