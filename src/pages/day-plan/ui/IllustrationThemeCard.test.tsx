jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: jest.fn().mockResolvedValue({ exists: false }) }));
import * as fs from 'expo-file-system/legacy';
import { View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'expo-image';
import Svg, { Text as SvgText } from 'react-native-svg';
import { IllustrationThemeCard } from './IllustrationThemeCard';
import { IllustrationCalendarThumbnailOverlay } from './IllustrationCalendarThumbnailOverlay';
import { CALENDAR_ARTWORK_LAYOUTS } from '../lib/illustrationCalendarLayouts';
jest.mock('../lib/illustrationCalendarAssets', () => ({ illustrationCalendarBackgroundUri: () => 'file:///calendar.webp' }));
jest.mock('@shared/lib/time/useTodayDate', () => ({ useTodayDate: () => new Date(2026, 10, 13, 12) }));

const theme = { design: 'city-animation-everyday-01', themeId: 'everyday-cinema-01-platform', title: 'Platform', concept: 'Everyday Cinema' } as const;

it('shows the current calendar after the artwork loads and keeps the card apply action', () => {
  const apply = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IllustrationThemeCard theme={theme} width={180} height={411} dark={false} selected={false} error={false} onApply={apply} />); });
  try {
    expect(tree.root.findAllByType(IllustrationCalendarThumbnailOverlay)).toHaveLength(0);
    act(() => tree.root.findByType(Image).props.onDisplay());
    const texts = tree.root.findAllByType(SvgText);
    expect(texts.find(node => node.props.testID === 'illustration-thumbnail-month')?.props.children.join('')).toBe('2026.11');
    expect(texts.filter(node => node.props.testID?.startsWith('illustration-thumbnail-day-'))).toHaveLength(30);
    act(() => tree.root.findByProps({ testID: `illustration-theme-${theme.themeId}` }).props.onPress());
    expect(apply).toHaveBeenCalledWith(theme);
  } finally { act(() => tree.unmount()); }
});

it('uses each artwork size and coordinates with the same cover crop, including leap February', () => {
  for (const themeId of [theme.themeId, '01-rush-hour-commute']) {
    const layout = CALENDAR_ARTWORK_LAYOUTS[themeId];
    let tree!: ReactTestRenderer;
    act(() => { tree = create(<IllustrationCalendarThumbnailOverlay themeId={themeId} width={180} height={411} month={new Date(2028, 1, 1, 12)} />); });
    try {
      expect(tree.root.findByType(Svg).props.viewBox).toBe(`0 0 ${layout.size[0]} ${layout.size[1]}`);
      expect(tree.root.findByType(Svg).props.preserveAspectRatio).toBe('xMidYMid slice');
      const days = tree.root.findAllByType(SvgText).filter(node => node.props.testID?.startsWith('illustration-thumbnail-day-'));
      expect(days).toHaveLength(29);
      const first = days.find(node => node.props.testID === 'illustration-thumbnail-day-1')!;
      // 2028-02-01 is Tuesday, with Monday as the first column.
      expect(first.props.x).toBeCloseTo((layout.grid[0] + 1.5 * layout.grid[2] / 7) * layout.size[0]);
    } finally { act(() => tree.unmount()); }
  }
});


it('keeps the full thumbnail height for city animation while cropping the paper tail on everyday cinema', () => {
  const city = { ...theme, design: 'city-animation-03', themeId: '03-spilled-coffee-report', concept: '보고서 위에 다시 채워가는 하루' } as const;
  for (const item of [city, theme]) {
    let tree!: ReactTestRenderer;
    act(() => { tree = create(<IllustrationThemeCard theme={item} width={180} height={411} dark={false} selected={false} error={false} onApply={jest.fn()} />); });
    try {
      const frame = tree.root.findAllByType(View).find(node => node.props.style?.overflow === 'hidden')!;
      if (item === city) expect(frame.props.style.height).toBe(411);
      else expect(frame.props.style.height).toBeLessThan(411);
      expect(tree.root.findByType(Image).props.style.height).toBe(411);
    } finally { act(() => tree.unmount()); }
  }
});


it('uses the downloaded original instead of a bundled store thumbnail', async () => {
  (fs.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true, isDirectory: false, size: 113012, md5: CALENDAR_ARTWORK_LAYOUTS[theme.themeId].md5 });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IllustrationThemeCard theme={theme} width={180} height={411} dark={false} selected={false} error={false} onApply={jest.fn()} />); });
  expect(tree.root.findByType(Image).props.source).toEqual({ uri: 'file:///calendar.webp' });
  expect(tree.root.findByType(Image).props.allowDownscaling).toBe(false);
  act(() => tree.unmount());
});
