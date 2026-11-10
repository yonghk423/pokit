import { HeroPolaroidSurface } from './HeroPolaroidSurface';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { formatHeroPolaroidDate, HeroPolaroidExport } from './HeroPolaroidExport';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(), releaseCapture: jest.fn() }));
jest.mock('@shared/lib/ui-font', () => ({ useEffectiveAppFontId: () => 'hiMelody', resolveAppFontFamily: (id: string) => id === 'cafe24ShiningStar' ? 'Cafe24Shiningstar' : 'HiMelody_400Regular' }));

it('formats the recorded date without UTC conversion shifting a date-only value', () => {
  expect(formatHeroPolaroidDate('2026-10-29')).toBe('2026. 10. 29');
  expect(formatHeroPolaroidDate(new Date(2026, 10, 1, 23, 59))).toBe('2026. 11. 01');
});

it('exports a 1:1.2 canvas at native resolution after its image and layout are ready', async () => {
  jest.useFakeTimers();
  const size = jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(900, 1200));
  jest.mocked(captureRef).mockResolvedValue('file:///polaroid.png');
  const complete = jest.fn(), error = jest.fn();
  let tree!: ReactTestRenderer;
  try {
    act(() => { tree = create(<HeroPolaroidExport content={{ uri: 'file:///art.png', processedUri: 'data:image/png;base64,corrected', title: '작은 행복을 굽는 오후', date: '2026. 10. 29' }} onComplete={complete} onError={error} />, { createNodeMock: () => ({}) }); });
    const surface = tree.root.findAllByProps({ testID: 'hero-polaroid-export' })[0];
    const image = tree.root.findAllByProps({ testID: 'hero-polaroid-image' })[0];
    expect(image.props.resizeMode).toBe('cover');
    expect(image.props.source.uri).toBe('data:image/png;base64,corrected');
    expect(image.props.style).toMatchObject({ width: 324, height: 291.6 });
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-title' })[0].props.children).toBe('작은 행복을 굽는 오후');
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-date' })[0].props.date).toBe('2026. 10. 29');
    act(() => surface.props.onLayout({ nativeEvent: { layout: { height: 562 } } }));
    expect(captureRef).not.toHaveBeenCalled();
    await act(async () => { image.props.onLoad(); });
    await act(async () => { jest.advanceTimersByTime(100); });
    // The source photo may decode before either paper texture. Never export that blank stock.
    expect(captureRef).not.toHaveBeenCalled();
    const textures = tree.root.findByType(HeroPolaroidSurface).findAllByType(Image);
    expect(textures).toHaveLength(2);
    act(() => textures[0].props.onLoad());
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(captureRef).not.toHaveBeenCalled();
    act(() => textures[1].props.onLoad());
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(captureRef).toHaveBeenCalledWith(expect.anything(), { format: 'png', quality: 1, result: 'tmpfile', useRenderInContext: true });
    // renderInContext does not scale the view into an explicitly larger canvas.
    const options = jest.mocked(captureRef).mock.calls[0][1];
    expect(options).not.toHaveProperty('width');
    expect(options).not.toHaveProperty('height');
    expect(complete).not.toHaveBeenCalled();
    const canvas = tree.root.findAllByProps({ testID: 'hero-polaroid-canvas' })[0];
    const fitted = tree.root.findAllByProps({ testID: 'hero-polaroid-fitted-print' })[0];
    expect(canvas.props.style).toMatchObject({ width: 360, height: 432, backgroundColor: '#FFFFFF' });
    expect(canvas.props.style.height / canvas.props.style.width).toBeCloseTo(1.2);
    expect(fitted.props.resizeMode).toBe('contain');
    expect(fitted.props.style).toEqual({ width: 324, height: 388.8 });
    expect(fitted.props.source.uri).toBe('file:///polaroid.png');
    jest.mocked(captureRef).mockResolvedValue('file:///feed.png');
    act(() => { canvas.props.onLayout(); fitted.props.onLoad(); });
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(complete).toHaveBeenCalledWith('file:///feed.png');
    expect(error).not.toHaveBeenCalled();
  } finally {
    act(() => tree?.unmount());
    size.mockRestore();
    jest.useRealTimers();
  }
});

it('exports only the title with its font and ink on white paper', () => {
  const size = jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(900, 1200));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPolaroidExport content={{ uri: 'file:///art.png', title: 'Title', memo: 'Memo', date: '2026. 11. 06', showDate: false, paper: '#C8EBDD', pen: '#1565C0', fontId: 'cafe24ShiningStar' }} onComplete={jest.fn()} onError={jest.fn()} />); });
  const surface = tree.root.findAllByProps({ testID: 'hero-polaroid-export' })[0];
  expect(surface.props.style).toMatchObject({ backgroundColor: '#F9F9F6' });
  for (const id of ['hero-polaroid-title']) {
    const node = tree.root.findAllByProps({ testID: id })[0];
    expect(node.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'Cafe24Shiningstar', color: '#1565C0' })]));
  }
  expect(tree.root.findAllByProps({ testID: 'hero-polaroid-memo' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-polaroid-date' })).toHaveLength(0);
  act(() => tree.unmount());
  size.mockRestore();
});

it('shows no text when title is blank even if memo and date exist', () => {
  const size = jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(900, 1200));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPolaroidExport content={{ uri: 'file:///art.png', title: '   ', memo: 'Do not use memo as a title', date: '2026. 11. 06', showDate: false }} onComplete={jest.fn()} onError={jest.fn()} />); });
  try {
    for (const id of ['hero-polaroid-title', 'hero-polaroid-memo', 'hero-polaroid-date']) expect(tree.root.findAllByProps({ testID: id })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-image' }).length).toBeGreaterThan(0);
  } finally { act(() => tree.unmount()); size.mockRestore(); }
});

it('omits the date from exported images when date display is disabled', () => {
  const size = jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(900, 1200));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPolaroidExport content={{ uri: 'file:///art.png', title: 'Title', date: '2026. 11. 07', showDate: false }} onComplete={jest.fn()} onError={jest.fn()} />); });
  try {
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-date' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-title' }).length).toBeGreaterThan(0);
  } finally { act(() => tree.unmount()); size.mockRestore(); }
});

it('omits writing without deleting it or hiding the date when text display is disabled', () => {
  const size = jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(900, 1200));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPolaroidExport content={{ uri: 'file:///art.png', title: 'Keep the original title', memo: 'Memo', date: '2026. 11. 07', showText: false }} onComplete={jest.fn()} onError={jest.fn()} />); });
  try {
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-title' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-memo' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-date' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'hero-polaroid-image' }).length).toBeGreaterThan(0);
  } finally { act(() => tree.unmount()); size.mockRestore(); }
});
