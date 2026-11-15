import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroMiniMemo, limitMiniMemo } from './HeroMiniMemo';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
jest.mock('../model/diaryTheme', () => ({ useDiaryTheme: () => ({ source: { uri: 'file:///memo.webp' } }) }));
jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getItemRaw: jest.fn(() => ''), setItemRaw: jest.fn() } }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));
it('limits pasted Korean and English text without splitting emoji', () => {
  expect(limitMiniMemo('오늘도행복해요')).toBe('오늘도행복해요');
  expect(limitMiniMemo('가'.repeat(31))).toBe('가'.repeat(30));
  expect(limitMiniMemo('a'.repeat(31))).toBe('a'.repeat(30));
  expect(limitMiniMemo('😀'.repeat(31))).toBe('😀'.repeat(30));
  expect(limitMiniMemo('a\nb')).toBe('ab');
});
it('saves only on Save and retains the memo after remounting', () => {
  const key = 'pokit:mini-memo:2026-11-14';
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroMiniMemo storageKey={key} ko />); });
  act(() => tree.root.findByProps({ testID: 'hero-mini-memo' }).props.onPress());
  act(() => tree.root.findByProps({ testID: 'hero-mini-memo-input' }).props.onChangeText('내일도행복해'));
  expect(localStorageClient.setItemRaw).not.toHaveBeenCalled();
  act(() => tree.root.findByProps({ testID: 'hero-mini-memo-save' }).props.onPress());
  expect(localStorageClient.setItemRaw).toHaveBeenCalledWith(key, '내일도행복해');
  act(() => tree.unmount());
  jest.mocked(localStorageClient.getItemRaw).mockReturnValueOnce('내일도행복해');
  act(() => { tree = create(<HeroMiniMemo storageKey={key} ko />); });
  expect(tree.root.findByProps({ testID: 'hero-mini-memo' }).props.accessibilityLabel).toContain('내일도행복해');
  act(() => tree.unmount());
});

it('grows the editor and displays all 30 saved characters on a larger memo', () => {
  const text = '가'.repeat(30);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroMiniMemo storageKey="memo-grow" ko />); });
  try {
    const smallWidth = tree.root.findByProps({ testID: 'hero-mini-memo' }).props.style.width;
    act(() => tree.root.findByProps({ testID: 'hero-mini-memo' }).props.onPress());
    act(() => tree.root.findByProps({ testID: 'hero-mini-memo-input' }).props.onChangeText(text));
    act(() => tree.root.findByProps({ testID: 'hero-mini-memo-input' }).props.onContentSizeChange({ nativeEvent: { contentSize: { height: 112 } } }));
    expect(tree.root.findByProps({ testID: 'hero-mini-memo-editor-paper' }).props.style.height).toBe(204);
    act(() => tree.root.findByProps({ testID: 'hero-mini-memo-save' }).props.onPress());
    expect(tree.root.findByProps({ testID: 'hero-mini-memo-text' }).props.children).toBe(text);
    expect(tree.root.findByProps({ testID: 'hero-mini-memo-text' }).props.numberOfLines).toBeUndefined();
    expect(tree.root.findByProps({ testID: 'hero-mini-memo' }).props.style.width).toBeGreaterThan(smallWidth);
    expect(localStorageClient.setItemRaw).toHaveBeenCalledWith('memo-grow', text);
  } finally { act(() => tree.unmount()); }
});
