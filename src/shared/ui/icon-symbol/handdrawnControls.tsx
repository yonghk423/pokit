import Svg, { Path } from 'react-native-svg';
import type { ColorValue } from 'react-native';

const DRAWINGS: Record<string, string[]> = {
  'arrow.up.arrow.down': ['M7.3 20q-.3-8 .1-16m-4 4 4-4 3.7 3.8M16.6 4q.3 8-.1 16m-3.8-3.8 3.8 3.8 3.8-4'],
  checklist: ['M9 6h11M9 12h10M9 18h11', 'm3 5 1.4 1.6L7 3.5M3 11h3v3H3ZM3 17h3v3H3Z'],
  'hand.raised.fill': ['M7 12V6q0-2 2-1v5-6q2-2 3 0v6-7q2-2 3 0v7-5q2-1 3 1v8q-1 7-6 7-4 0-6-4l-3-5q1-2 3 0l1 1'],
  'chart.bar.fill': ['M3 13h4v8H3ZM10 8h4v13h-4ZM17 3h4v18h-4Z', 'M4.5 15v4M11.5 10v9M18.5 5v14'],
  'pills.fill': ['M3.8 11.5 10 5.3q4-3 7 0t0 6L10.8 18q-4 3-7 0t0-6.5Z', 'm7 8 6.5 6.5M17 14q6 0 5 4-1 4-6 2-3-2 1-6ZM16 17h5'],
  'figure.stand': ['M12 2.5a2 2 0 1 0 .1 0M8 9q4-3 8 0l1 7M7 16l1-7m2 3-.3 9M14 12l.3 9M10 8v6h4V8'],
  'plus.circle': ['M12 2.8C0 2.4-.2 21 11.8 21.2c12.2.3 12.6-18.3.2-18.4Z', 'M7 12h10M12 7v10'],
  timer: ['M12 6C2 6 2 22 12 22S22 6 12 6Z', 'M9 2h6M12 2v4M19 5l2 2M12 9v5l3 1'],
  'text.alignleft': ['M3 5q9-.3 18 0M3 10h12M3 15h17M3 20h10'],
  'note.text': ['M3.5 3.6q8-.4 17 0l-.2 17-16.9-.1Z', 'M7 8h10M7 12h9M7 16h6'],
  pencil: ['m4 16 11.5-12 4 3.5L8 20l-5 1Z', 'm13.7 6 4 3.6M4 16l4 4M6.4 16.6l9-9'],
  checkmark: ['M4 12.1q2.5 2.1 5 5.2Q15 10 20.3 5.5'],
  xmark: ['M5 5.3q7 6.4 14 13.5M18.8 5q-6.5 7-13.6 14'],
  plus: ['M4 12.2q8-.4 16-.1M12.2 4q-.4 8-.1 16'],
  'chevron.left': ['M15.7 4.6c-2.4 2.6-5.2 4.8-7.2 7.5 2.2 2.5 4.7 4.8 7.4 7.2'],
  'chevron.right': ['M8.3 4.6c2.4 2.6 5.2 4.8 7.2 7.5-2.2 2.5-4.7 4.8-7.4 7.2'],
  'rectangle.stack': ['M4.2 7.2q7.7-.4 15.5 0l.1 13-15.6.1Z', 'M6 4.5l12 .1M7.5 2.3h9'],
  'bell.fill': ['M5 17q2-2 2-7 0-6 5-6.2 5 .3 5 6.2 0 5 2 7-7 .7-14 0Z', 'M10 20q2 2 4-.1M11.8 2v1.8'],
  'book.fill': ['M3.1 4.3Q8 3 12 6q4-3 8.9-1.5l-.1 15q-5-1.3-8.8 1.1-4-2.6-8.9-1.2Z', 'M12 6v14M5.5 7q2-.2 4 1M14.5 8l4-1M5.5 10q2-.2 4 1'],
  clock: ['M12 2.8C0 2.4-.2 21 11.8 21.2c12.2.3 12.6-18.3.2-18.4Z', 'M12 6.1l-.2 6.2 4.1 2'],
  'info.circle': ['M12 2.8C0 2.4-.2 21 11.8 21.2c12.2.3 12.6-18.3.2-18.4Z', 'm10.5 10 1.9-.1-.1 6.8m-2.3 0h4.5M12 6.5v.3'],
  'list.bullet.rectangle': ['M3 4.3q9-.5 18-.1l-.2 15.7-17.7-.1Z', 'M6 8h.3m2.9 0h8.3M6 12h.3m2.9 0h7.6M6 16h.3m2.9 0h8.1'],
  'square.grid.2x2': ['M3.2 3.1 10 3l-.1 7-6.8-.1ZM14 3.1l6.8.2-.1 6.7-6.8-.1ZM3.1 14l6.9.1-.1 6.8-6.7-.1ZM14 14.1l6.8-.1.1 6.8-7-.1Z'],
  'paintbrush.fill': ['m8 14 9.2-11 3 2.5L11 16Z', 'M8 14q-5-.3-4 4 .3 2.1-2 3 8.5 1 9-5M15 6l3 2.5'],
  textformat: ['m3 19 5-15 5 15M5 13h6M15 10q7-2 5.5 5v4m-.1-5q-6-2-6 2 .1 4 5.9 1'],
  'arrow.clockwise': ['M19.8 9Q17 1 9 4 1 7 4 15q3 8 11 5 4-2 5-5M20 3.8l-.1 5.3-5.3-.2'],
  'megaphone.fill': ['m3.2 9 6-.8 10-4-.1 15-10-4-6-.6Z', 'm6 15 2 6 4-.1-2-5.1M9 8v7'],
  'paperplane.fill': ['m2.8 10 18-7-6.3 18-4.2-7Z', 'M10.3 14 20.8 3.1M10.3 14l-.3 5.5 3-2.3'],
  'star.fill': ['m12 2.8 2.9 6 6.6.7-4.8 4.7 1.1 6.6-5.9-3.1-5.8 3.2 1-6.7-4.7-4.6 6.6-.9Z'],
  tag: ['m3 4 8 .2 10 9-8 8L3.1 12Z', 'M7 7h.1'],
  'text.quote': ['M4 7h6v6H7q-.3 4-3 4M14 7h6v6h-3q-.3 4-3 4'],
  'arrow.down.app.fill': ['M4 5h4M16 5h4v15H4V5M12 2v12M8 10l4 4 4-4'],
  'checkmark.circle': ['M12 2.8C0 2.4-.2 21 11.8 21.2c12.2.3 12.6-18.3.2-18.4Z', 'm7 12 3.2 3.2 6.7-7.1'],
  circle: ['M12 2.8C0 2.4-.2 21 11.8 21.2c12.2.3 12.6-18.3.2-18.4Z'],
  'sun.max.fill': ['M12 6C4 6 4 18 12 18s8-12 0-12Z', 'M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2'],
  'moon.fill': ['M19.8 16Q9 19 8 5.1 8 3 9.3 2.5-2 7.5 4.8 17.8q6.8 8.1 15-1.8Z'],
  'figure.run': ['M13 3a2 2 0 1 0 .1 0M9 8l4-2 3 4 4 1M13 7l-2 6-5 2-3 5m8-7 4 2 1 6M9 8l-4 3'],
  magnifyingglass: ['M15.7 5.2c-3.2-3-8.3-2-10.3 1.4-2.2 3.9-.3 8.6 3.6 9.6 4.2 1.2 8-1.9 8.3-5.8.2-2-.5-3.7-1.6-5.2Z', 'm15 15.2 5.5 5.2', 'M5.9 9.3c.4-2 1.7-3.1 3.4-3.5'],
  trash: ['M4.5 6.9q7.5-.4 15 .1M9 6.5l.3-3.1 5.5.1.4 3.1', 'm6.4 7.1.7 13.2q4.7.7 9.6-.1l.8-13.1', 'm9.5 10.2.3 7.6m4.7-7.7-.2 7.8'],
  'slider.horizontal.3': ['M3.3 5.6h5m4.6.1 7.8-.1M3.2 12l10.1.1m4.7-.2h2.8M3.4 18.4h3.3m4.7 0 9.3.1', 'M8.5 3.6q4.3-1.2 4.4 2.1-.1 3-4.3 1.9ZM13.5 10q4.2-1 4.4 2-.1 3.3-4.4 2ZM7 16.4q4.1-1.1 4.2 2-.1 3.1-4.3 1.9Z'],
  'chevron.down': ['M4.2 8.4q3.8 3.8 7.8 7.1 3.7-3.8 7.7-7.4'],
  'keyboard.chevron.compact.down': [
    'M3.3 3.7q8.6-.5 17.4 0l.2 10.2q-8.9.5-17.9 0Z',
    'M6.4 6.7h.3m3.3 0h.3m3.3 0h.3m3.3 0h.3M6.3 9.7h.3m3.3 0h.3m3.3 0h.3m3.3 0h.3M8.5 12.1q3.5.2 7-.1',
    'M8.2 18.3q1.8 1.5 3.8 3 2-1.5 3.8-3.2',
  ],
  'chevron.up': ['M4.1 15.9q4-3.8 7.9-7.3 3.8 3.5 7.7 7.1'],
};
const ALIASES: Record<string, string> = {
  'trash.fill': 'trash', bell: 'bell.fill', 'checkmark.circle.fill': 'checkmark.circle',
  'square.stack': 'rectangle.stack', 'square.stack.fill': 'rectangle.stack',
};
export function hasHanddrawnControl(name: string) { return (ALIASES[name] ?? name) in DRAWINGS; }
export function HanddrawnControl({ name, size, color }: { name: string; size: number; color: ColorValue }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} pointerEvents="none">
    {DRAWINGS[ALIASES[name] ?? name]?.map((d, index) => <Path key={index} d={d} stroke={color} strokeWidth={name === 'chevron.left' || name === 'chevron.right' ? 1.25 : index === 2 && name === 'magnifyingglass' ? 0.65 : 1.35} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
  </Svg>;
}
