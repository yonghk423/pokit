import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { formatHeroPolaroidDate, HeroPolaroidExport } from './HeroPolaroidExport';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(), releaseCapture: jest.fn() }));
jest.mock('@shared/lib/ui-font', () => ({ useEffectiveAppFontId: () => 'hiMelody', resolveAppFontFamily: () => 'HiMelody_400Regular' }));

it('formats the recorded date without UTC conversion shifting a date-only value', () => {
  expect(formatHeroPolaroidDate('2026-10-29')).toBe('2026. 10. 29');
  expect(formatHeroPolaroidDate(new Date(2026, 10, 1, 23, 59))).toBe('2026. 11. 01');
});

it('captures only the card bounds at native resolution after its image and layout are ready', async () => {
  jest.useFakeTimers();
  const size = jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(900, 1200));
  jest.mocked(captureRef).mockResolvedValue('file:///polaroid.png');
  const complete = jest.fn(), error = jest.fn();
  let tree!: ReactTestRenderer;
  try {
    act(() => { tree = create(<HeroPolaroidExport content={{ uri: 'file:///art.png', title: '작은 행복을 굽는 오후', date: '2026. 10. 29' }} onComplete={complete} onError={error} />, { createNodeMock: () => ({}) }); });
    const surface = tree.root.findAllByProps({ testID: 'hero-polaroid-export' })[0];
    const image = tree.root.findAllByProps({ testID: 'hero-polaroid-image' })[0];
    expect(image.props.style).toMatchObject({ width: 324, height: 432 });
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-title' })[0].props.children).toBe('작은 행복을 굽는 오후');
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-date' })[0].props.children).toBe('2026. 10. 29');
    act(() => surface.props.onLayout({ nativeEvent: { layout: { height: 562 } } }));
    expect(captureRef).not.toHaveBeenCalled();
    await act(async () => { image.props.onLoad(); });
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(captureRef).toHaveBeenCalledWith(expect.anything(), { format: 'png', quality: 1, result: 'tmpfile', useRenderInContext: true });
    // renderInContext does not scale the view into an explicitly larger canvas.
    const options = jest.mocked(captureRef).mock.calls[0][1];
    expect(options).not.toHaveProperty('width');
    expect(options).not.toHaveProperty('height');
    expect(complete).toHaveBeenCalledWith('file:///polaroid.png');
    expect(error).not.toHaveBeenCalled();
  } finally {
    act(() => tree?.unmount());
    size.mockRestore();
    jest.useRealTimers();
  }
});
