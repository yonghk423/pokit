import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { CUSTOM_FLOW_ICON_OPTIONS } from '@shared/lib/customFlowAppearanceCatalog';

import { IconSymbol } from './icon-symbol';
import { controlIllustrationSources } from './controlIllustrationSources';

jest.mock('expo-image', () => ({ Image: 'WebpImage' }));
jest.mock('expo-symbols', () => ({ SymbolView: 'SystemSymbol' }));

let renderer: ReactTestRenderer;
afterEach(() => act(() => renderer?.unmount()));

it('renders all routine illustrations with the WebP decoder at a fixed point size', () => {
  for (const name of CUSTOM_FLOW_ICON_OPTIONS) {
    act(() => { renderer = create(<IconSymbol name={name} size={24} color="#888888" />); });
    const image = renderer.root.findByType(Image);
    expect(image.props.source).toBeTruthy();
    expect(image.props.useAppleWebpCodec).toBe(false);
    expect(image.props.contentFit).toBe('contain');
    expect(image.props.style).toEqual({ width: 24, height: 24 });
    expect(image.props.tintColor).toBeUndefined();
    expect(renderer.root.findAllByType(SymbolView)).toHaveLength(0);
    act(() => renderer.unmount());
  }
});

it('keeps existing system controls on their symbol renderer', () => {
  act(() => { renderer = create(<IconSymbol name="heart" size={16} color="#123456" />); });
  expect(renderer.root.findByType(SymbolView).props.tintColor).toBe('#123456');
  expect(renderer.root.findAllByType(Image)).toHaveLength(0);
});

it('uses the detailed illustration assets for settings and toolbar controls', () => {
  for (const name of Object.keys(controlIllustrationSources)) {
    act(() => { renderer = create(<IconSymbol name={name} size={22} color="#222222" />); });
    expect(renderer.root.findByType(Image).props.source).toBe(controlIllustrationSources[name]);
    expect(renderer.root.findAllByType(SymbolView)).toHaveLength(0);
    act(() => renderer.unmount());
  }
});

it('uses simple vector sun and moon outlines instead of the face illustrations', () => {
  for (const name of ['sun.max.fill', 'moon.fill']) {
    act(() => { renderer = create(<IconSymbol name={name} size={24} color="#222222" />); });
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(renderer.root.findAllByType(SymbolView)).toHaveLength(0);
    act(() => renderer.unmount());
  }
});
