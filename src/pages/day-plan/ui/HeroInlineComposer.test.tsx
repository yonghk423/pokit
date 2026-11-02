import { AppAlert } from '@shared/lib/app-alert';
import { Keyboard, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroInlineComposer, HERO_SELECTED_STYLE_KEY } from './HeroInlineComposer';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { HeroPhotoSource } from './HeroPhotoSource';
import { loadHeroSavedFaces, deleteHeroFace } from '../lib/heroSavedFaces';
import { getHeroAiRemaining, generateHeroImages, resumeHeroAiJob, cancelHeroAiJob, dismissHeroAiJob } from '../lib/heroAiClient';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: jest.requireActual('react-native').View }));
jest.mock('./HeroPhotoSource', () => ({ HeroPhotoSource: jest.requireActual('react-native').View, HeroPhotoIcon: () => null }));
jest.mock('../lib/heroSavedFaces', () => ({ loadHeroSavedFaces: jest.fn(async () => []), saveHeroFace: jest.fn(), deleteHeroFace: jest.fn() }));
jest.mock('../lib/heroAiClient', () => ({ generateHeroImages: jest.fn(), resumeHeroAiJob: jest.fn(), getHeroAiRemaining: jest.fn(async () => 3), getPendingHeroAiJob: jest.fn(async () => null), cancelHeroAiJob: jest.fn(async () => undefined), dismissHeroAiJob: jest.fn(async () => undefined), HeroAiError: class extends Error {} }));
beforeEach(() => { localStorageClient.removeItem(HERO_SELECTED_STYLE_KEY); jest.clearAllMocks(); jest.mocked(getHeroAiRemaining).mockResolvedValue(3); jest.mocked(loadHeroSavedFaces).mockResolvedValue([{ id: 'person', uri: 'file:///person.jpg' }]); jest.mocked(generateHeroImages).mockResolvedValue({ images: [{ uri: 'file:///result.png' }], remaining: 2 }); });
it('opens face registration outside the writing scroll, dismisses the keyboard and preserves the draft', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" title="제목" memo="작성 중인 내용" ink="#222" onApply={jest.fn()} onClose={jest.fn()} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.onFocus());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-add-face' })[0].props.onPress());
  expect(dismiss).toHaveBeenCalled();
  expect(tree.root.findAllByProps({ testID: 'hero-face-registration-modal' }).length).toBeGreaterThan(0);
  const scroll = tree.root.findAllByProps({ testID: 'hero-inline-story-scroll' })[0];
  expect(scroll.findAllByProps({ testID: 'hero-face-photo-actions' })).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-face-registration-close' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-face-registration-modal' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.value).toBe('작성 중인 내용');
  expect(tree.root.findAllByProps({ testID: 'hero-inline-title' })[0].props.value).toBe('제목');
  expect(generateHeroImages).not.toHaveBeenCalled();
  act(() => tree.unmount());
  dismiss.mockRestore();
});
it('restores the selected fifth style after leaving and sends its matching reference and profile', async () => {
  let tree!: ReactTestRenderer;
  const render = () => <HeroInlineComposer sceneId="05-work" memo="공항에서 비행기를 기다렸다." ink="#222" onApply={jest.fn(async () => undefined)} onClose={jest.fn()} />;
  await act(async () => { tree = create(render()); });
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-style-protagonist-5' })[0].props.onPress());
  expect(localStorageClient.getItemRaw(HERO_SELECTED_STYLE_KEY)).toBe('protagonist-5');
  act(() => tree.unmount());
  await act(async () => { tree = create(render()); });
  expect(tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.accessibilityLabel).toBe('comicDay.character.five');
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ scenes: ['p5-01-platform'], story: expect.objectContaining({ styleId: 'protagonist-5' }) }));
  act(() => tree.unmount());
});

it.each([
  ['protagonist-3', 'p3-14-dog-walk'],
  ['protagonist-4', 'p4-19-station-wait'],
  ['protagonist-6', 'p6-01-rush-hour-commute'],
])('sends the canonical painted reference when selecting %s', async (styleId, sceneId) => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" memo="Same diary" ink="#222" onApply={jest.fn(async () => undefined)} onClose={jest.fn()} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: `hero-inline-style-${styleId}` })[0].props.onPress());
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ scenes: [sceneId], story: expect.objectContaining({ styleId }) }));
  act(() => tree.unmount());
});

it('restores a pending job style ahead of a different saved preference', async () => {
  localStorageClient.setItemRaw(HERO_SELECTED_STYLE_KEY, 'protagonist-5');
  const job = { id: 'hero-style-recover', mode: 'photo' as const, count: 1, scenes: ['p2-04-birthday-surprise' as const], inputsPath: 'file:///inputs', createdAt: 0, story: { text: '기존 이야기', source: 'character' as const, styleId: 'protagonist-2' as const } };
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" recoveryJob={job} onApply={jest.fn()} onClose={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.accessibilityLabel).toBe('comicDay.character.two');
  act(() => tree.unmount());
});
it('creates one image from writing and commits it to the same card before acknowledging the job', async () => {
  const apply = jest.fn(async () => { expect(dismissHeroAiJob).not.toHaveBeenCalled(); });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" targetDiaryId="diary" targetSceneId="scene" onApply={apply} onClose={jest.fn()} />); });
  const button = () => tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0];
  expect(button().props.disabled).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.onChangeText('카페에서 책을 읽었다.'));
  await act(async () => { button().props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ mode: 'face', photo: 'file:///person.jpg', scenes: ['05-work'], photos: [], story: { cardAspectRatio: 0.8, text: '카페에서 책을 읽었다.', source: 'character', styleId: 'protagonist-1' }, targetDiaryId: 'diary', targetSceneId: 'scene' }));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ memo: '카페에서 책을 읽었다.' }), 'file:///result.png', expect.any(String));
  expect(dismissHeroAiJob).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
it('requires one uploaded photo plus writing and sends both together', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={jest.fn(async () => undefined)} onClose={jest.fn()} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-mode-photo' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.onChangeText('바닷가 여행'));
  expect(tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.disabled).toBe(true);
  const source = tree.root.findAllByType(HeroPhotoSource).find(node => node.props.mode === 'photo')!;
  expect(source.props.selectionLimit).toBe(1);
  act(() => source.props.onChange('file:///source.jpg'));
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ photos: ['file:///source.jpg'], story: { cardAspectRatio: 0.8, text: '바닷가 여행', source: 'photo', styleId: 'protagonist-1' } }));
  act(() => tree.unmount());
});
it('resumes the original job without submitting a new generation', async () => {
  jest.mocked(resumeHeroAiJob).mockResolvedValue({ images: [{ uri: 'file:///recovered.png' }], remaining: 2 });
  const job = { id: 'hero-recover', mode: 'photo' as const, count: 1, scenes: ['05-work' as const], inputsPath: 'file:///inputs', createdAt: 0, targetSceneId: 'original', story: { text: '기존 이야기', source: 'character' as const } };
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" recoveryJob={job} onApply={jest.fn(async () => undefined)} onClose={jest.fn()} />); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(resumeHeroAiJob).toHaveBeenCalledWith(job, expect.any(Function), expect.any(AbortSignal), expect.any(Function));
  expect(generateHeroImages).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

it('uses the saved person without a default character item and keeps upcoming styles informational', async () => {
  jest.mocked(loadHeroSavedFaces).mockResolvedValue([{ id: 'person', uri: 'file:///person.jpg' }]);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={jest.fn(async () => undefined)} onClose={jest.fn()} />); });
  expect(tree.root.findAll(node => node.props.children === 'comicDay.inline.protagonist')).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-face-0' })[0].props.accessibilityState.selected).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-style-upcoming-0' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-inline-coming-soon' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-style-protagonist-1' })[0].props.accessibilityState.selected).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.onChangeText('오늘의 이야기'));
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ mode: 'face', photo: 'file:///person.jpg', scenes: ['05-work'] }));
  act(() => tree.unmount());
});

it('caps estimated progress before the image arrives and shows 100 only for a real result', async () => {
  jest.useFakeTimers();
  let finish!: (value: { images: { uri: string }[]; remaining: number }) => void;
  jest.mocked(generateHeroImages).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const apply = jest.fn(async () => undefined);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" memo="Story" ink="#222" onApply={apply} onClose={jest.fn()} />); });
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); });
  const percent = () => tree.root.findAllByProps({ testID: 'hero-inline-progress' })[0].props.accessibilityValue.now;
  expect(percent()).toBe(0);
  act(() => jest.advanceTimersByTime(120000));
  expect(percent()).toBeGreaterThan(0);
  act(() => jest.advanceTimersByTime(600000));
  expect(percent()).toBeLessThan(100);
  expect(apply).not.toHaveBeenCalled();
  await act(async () => { finish({ images: [{ uri: 'file:///done.png' }], remaining: 2 }); });
  expect(percent()).toBe(100);
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(apply).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  jest.useRealTimers();
});

it('cancels a running generation and never applies its late result', async () => {
  let finish!: (value: { images: { uri: string }[]; remaining: number }) => void;
  jest.mocked(generateHeroImages).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const apply = jest.fn(async () => undefined);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={apply} onClose={jest.fn()} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.onChangeText('이야기'));
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); });
  const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-cancel-generation' })[0].props.onPress());
  expect(jest.mocked(generateHeroImages).mock.calls[0][0].signal?.aborted).toBe(false);
  act(() => alert.mock.calls[0][2]![0].onPress?.());
  expect(jest.mocked(generateHeroImages).mock.calls[0][0].signal?.aborted).toBe(false);
  act(() => tree.root.findAllByProps({ accessibilityLabel: 'common.close' })[0].props.onPress());
  act(() => alert.mock.calls[1][2]![1].onPress?.());
  alert.mockRestore();
  expect(jest.mocked(generateHeroImages).mock.calls[0][0].signal?.aborted).toBe(true);
  await act(async () => { finish({ images: [{ uri: 'file:///late.png' }], remaining: 2 }); });
  expect(cancelHeroAiJob).toHaveBeenCalled();
  expect(apply).not.toHaveBeenCalled();
  expect(tree.root.findAllByProps({ testID: 'hero-inline-story' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});

it('previews the target card colors in the composer and preserves them on completion', async () => {
  const apply = jest.fn(async () => undefined);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" paper="#B0E8D7" ink="#B22222" onApply={apply} onClose={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-inline-paper' })[0].props.style[1].backgroundColor).toBe('#B0E8D7');
  const input = tree.root.findAllByProps({ testID: 'hero-inline-story' })[0];
  expect(StyleSheet.flatten(input.props.style).color).toBe('#B22222');
  act(() => input.props.onChangeText('A story'));
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ paper: '#B0E8D7', pen: '#B22222' }), expect.any(String), expect.any(String));
  act(() => tree.unmount());
});
it('changes paper and font colors from the generation row and saves the chosen colors on the card', async () => {
  const apply = jest.fn(async () => undefined);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" memo="A story" onApply={apply} onClose={jest.fn()} />); });
  const row = tree.root.findAllByProps({ testID: 'hero-inline-generation-row' })[0];
  expect(row.findAllByProps({ testID: 'hero-inline-paper-color' }).length).toBeGreaterThan(0);
  expect(row.findAllByProps({ testID: 'hero-inline-pen-color' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-paper-color' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-paper-#C8EBDD' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-inline-paper' })[0].props.style[1].backgroundColor).toBe('#C8EBDD');
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-pen-color' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-pen-#47436A' })[0].props.onPress());
  expect(StyleSheet.flatten(tree.root.findAllByProps({ testID: 'hero-inline-title' })[0].props.style).color).toBe('#47436A');
  expect(StyleSheet.flatten(tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.style).color).toBe('#47436A');
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ cardAppearance: { paper: '#C8EBDD', pen: '#47436A' } }));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ paper: '#C8EBDD', pen: '#47436A' }), 'file:///result.png', expect.any(String));
  act(() => tree.unmount());
});

it('opens color and illustration palettes separately without losing the writing', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" memo="Keep my story" onApply={jest.fn()} onClose={jest.fn()} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-paper-color' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.accessibilityState.expanded).toBe(false);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-color-palette' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-inline-color-palette' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.value).toBe('Keep my story');
  act(() => tree.unmount());
});
it('restores chosen card colors when resuming a pending generation', async () => {
  const apply = jest.fn(async () => undefined);
  const job = { id: 'hero-recover-colors', mode: 'photo' as const, scenes: ['05-work' as const], count: 1, inputsPath: 'file:///inputs', createdAt: 0, story: { text: 'Recovered story', source: 'character' as const }, cardAppearance: { paper: '#D5E3F6', pen: '#693B48' } };
  jest.mocked(resumeHeroAiJob).mockResolvedValue({ images: [{ uri: 'file:///recovered-colors.png' }], remaining: 2 });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" paper="#FFFFFF" ink="#222" recoveryJob={job} onApply={apply} onClose={jest.fn()} />); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ paper: '#D5E3F6', pen: '#693B48' }), 'file:///recovered-colors.png', job.id);
  expect(generateHeroImages).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

it('opens detailed help and closes it without losing the draft or generating an image', async () => {
  const close = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={jest.fn()} onClose={close} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.onChangeText('유지할 이야기'));
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-help' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-ai-help-modal' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-ai-help-close' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-ai-help-modal' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.value).toBe('유지할 이야기');
  expect(generateHeroImages).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

it('toggles a floating style list without replacing the draft and closes it on selection', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={jest.fn()} onClose={jest.fn()} />); });
  const options = () => tree.root.findAllByProps({ testID: 'hero-inline-style-options' })[0];
  const toggle = () => tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0];
  expect(options().props.pointerEvents).toBe('none');
  act(() => toggle().props.onPress());
  expect(toggle().props.accessibilityState.expanded).toBe(true);
  expect(options().props.pointerEvents).toBe('auto');
  act(() => toggle().props.onPress());
  expect(options().props.accessibilityElementsHidden).toBe(true);
  act(() => toggle().props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-style-protagonist-1' })[0].props.onPress());
  expect(toggle().props.accessibilityState.expanded).toBe(false);
  expect(generateHeroImages).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

it('renders no bare strings outside native text elements in either mode', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={jest.fn()} onClose={jest.fn()} />); });
  const check = (node: any): void => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(check); return; }
    for (const child of node.children ?? []) {
      if (typeof child === 'string') expect(node.type).toMatch(/text/i);
      else check(child);
    }
  };
  check(tree.toJSON());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.onPress());
  check(tree.toJSON());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-mode-photo' })[0].props.onPress());
  check(tree.toJSON());
  act(() => tree.unmount());
});

it('dismisses the keyboard from the bottom toolbar without clearing the story', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" memo="Keep this draft" onApply={jest.fn()} onClose={jest.fn()} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-dismiss-keyboard' })[0].props.onPress());
  expect(dismiss).toHaveBeenCalled();
  expect(tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.value).toBe('Keep this draft');
  act(() => tree.unmount());
  dismiss.mockRestore();
});

it('provides a separate title and lined body, preserving the title on the generated card', async () => {
  const apply = jest.fn(async () => undefined);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={apply} onClose={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-inline-notebook-lines' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-title' })[0].props.onChangeText('A quiet afternoon'));
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.onChangeText('I read a book by the window.'));
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ story: { cardAspectRatio: 0.8, title: 'A quiet afternoon', text: 'I read a book by the window.', source: 'character', styleId: 'protagonist-1' } }));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ title: 'A quiet afternoon', memo: 'I read a book by the window.' }), 'file:///result.png', expect.any(String));
  act(() => tree.unmount());
});


it('keeps the add person control outside the compact horizontal rail with many saved people', async () => {
  jest.mocked(loadHeroSavedFaces).mockResolvedValue(Array.from({ length: 12 }, (_, index) => ({ id: `person-${index}`, uri: `file:///person-${index}.jpg` })));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={jest.fn()} onClose={jest.fn()} />); });
  const rail = tree.root.findAllByProps({ testID: 'hero-inline-face-rail' })[0];
  expect(rail.props.horizontal).toBe(true);
  expect(StyleSheet.flatten(rail.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
  expect(StyleSheet.flatten(rail.props.contentContainerStyle).gap).toBe(6);
  expect(rail.findAllByProps({ testID: 'hero-inline-face-11' }).length).toBeGreaterThan(0);
  expect(StyleSheet.flatten(tree.root.findAllByProps({ imageKey: 'saved-face-avatar:file:///person-0.jpg' })[0].props.style)).toMatchObject({ width: 42, height: 42 });
  expect(StyleSheet.flatten(tree.root.findAllByProps({ testID: 'hero-inline-face-ring-11' })[0].props.style)).toMatchObject({ borderWidth: 1.5, borderColor: '#368F80' });
  expect(rail.findAllByProps({ testID: 'hero-inline-add-face' })).toHaveLength(0);
  const add = tree.root.findAllByProps({ testID: 'hero-inline-add-face' })[0];
  expect(StyleSheet.flatten(add.props.style)).toMatchObject({ width: 52, flexShrink: 0 });
  expect(StyleSheet.flatten(add.findByProps({ testID: 'hero-inline-add-face-icon-slot' }).props.style)).toMatchObject({ height: 56, alignItems: 'center', justifyContent: 'center' });
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-face-0' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-inline-face-0' })[0].props.accessibilityState.selected).toBe(true);
  expect(StyleSheet.flatten(tree.root.findAllByProps({ imageKey: 'saved-face-avatar:file:///person-11.jpg' })[0].props.style)).toMatchObject({ width: 42, height: 42 });
  expect(StyleSheet.flatten(tree.root.findAllByProps({ testID: 'hero-inline-face-ring-0' })[0].props.style)).toMatchObject({ borderWidth: 1.5, borderColor: '#368F80' });
  act(() => add.props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-face-photo-actions' })[0].props.pointerEvents).toBe('auto');
  act(() => tree.unmount());
});

it('keeps the original pen style and sends the separately selected second style to generation', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" memo="오늘의 이야기" ink="#222" onApply={jest.fn(async () => undefined)} onClose={jest.fn()} />); });
  const option = (id: number) => tree.root.findAllByProps({ testID: `hero-inline-style-protagonist-${id}` })[0];
  expect(option(1).props.accessibilityState.selected).toBe(true);
  expect(option(2).props.accessibilityState.selected).toBe(false);
  act(() => option(2).props.onPress());
  expect(option(1).props.accessibilityState.selected).toBe(false);
  expect(option(2).props.accessibilityState.selected).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-style-toggle' })[0].props.accessibilityLabel).toBe('comicDay.character.two');
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ scenes: ['p2-04-birthday-surprise'] }));
  act(() => tree.unmount());
});

it('keeps the app-open instruction until the server confirms background processing', async () => {
 jest.mocked(generateHeroImages).mockImplementation(()=>new Promise(()=>undefined));
 let tree!: ReactTestRenderer;
 await act(async()=>{tree=create(<HeroInlineComposer sceneId="05-work" memo="My day" ink="#222" onApply={jest.fn()} onClose={jest.fn()}/>);});
 await act(async()=>{tree.root.findAllByProps({testID:'hero-inline-generate'})[0].props.onPress();});
 const instruction=()=>tree.root.findAllByProps({testID:'hero-inline-keep-app-open'})[0];
 expect(instruction().props.children).toBe('comicDay.inline.uploading');
 const input=jest.mocked(generateHeroImages).mock.calls[0][0];
 act(()=>input.onSubmitted?.());
 expect(instruction().props.children).toBe('comicDay.inline.backgroundReady');
 act(()=>tree.unmount());
});

it('anchors the toolbar to the keyboard using the current workspace bounds after the header collapses', async () => {
  const listeners = new Map<string, (event: any) => void>();
  const subscribe = jest.spyOn(Keyboard, 'addListener').mockImplementation((name, callback) => {
    listeners.set(name, callback);
    return { remove: jest.fn() } as any;
  });
  let top = 180;
  let height = 620;
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={jest.fn()} onClose={jest.fn()} />);
  });
  const workspace = tree.root.findAllByProps({ testID: 'hero-inline-composer' })[0];
  workspace.instance.measureInWindow = (callback: Function) => callback(0, top, 390, height);
  const layout = () => tree.root.findAllByProps({ testID: 'hero-inline-composer' })[0].props.onLayout();
  const padding = () => StyleSheet.flatten(tree.root.findByProps({ testID: 'hero-inline-keyboard-space' }).props.style).paddingBottom;
  act(layout);
  act(() => listeners.get('keyboardWillShow')?.({ endCoordinates: { screenY: 500 }, duration: 0 }));
  expect(padding()).toBe(300);
  top = 60;
  height = 740;
  act(layout);
  expect(padding()).toBe(300); // More writing height, same toolbar position.
  height = 440; // A resized parent already ends at the keyboard: no double inset.
  act(layout);
  expect(padding()).toBe(0);
  act(() => listeners.get('keyboardWillHide')?.({ duration: 0 }));
  expect(padding()).toBe(0);
  act(() => tree.unmount());
  subscribe.mockRestore();
});

it('generates from a title alone and rejects an entirely blank text draft', async () => {
  let tree!: ReactTestRenderer;
  const apply = jest.fn(async () => undefined);
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={apply} onClose={jest.fn()} />); });
  const button = () => tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0];
  expect(button().props.disabled).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-title' })[0].props.onChangeText('   '));
  expect(button().props.disabled).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-title' })[0].props.onChangeText('겨울에는 귤이지'));
  expect(button().props.disabled).toBe(false);
  await act(async () => { button().props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ story: expect.objectContaining({ title: '겨울에는 귤이지', text: '', source: 'character' }) }));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ title: '겨울에는 귤이지', memo: '' }), 'file:///result.png', expect.any(String));
  act(() => tree.unmount());
});

it('requires a photo and allows its title alone without a body', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={jest.fn(async () => undefined)} onClose={jest.fn()} />); });
  const button = () => tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0];
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-mode-photo' })[0].props.onPress());
  const source = tree.root.findAllByType(HeroPhotoSource).find(node => node.props.mode === 'photo')!;
  act(() => source.props.onChange('file:///source.jpg'));
  expect(button().props.disabled).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-title' })[0].props.onChangeText('겨울에는 귤이지'));
  expect(button().props.disabled).toBe(false);
  act(() => source.props.onChange(null));
  expect(button().props.disabled).toBe(true);
  act(() => source.props.onChange('file:///source.jpg'));
  await act(async () => { button().props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ photos: ['file:///source.jpg'], story: expect.objectContaining({ title: '겨울에는 귤이지', text: '', source: 'photo' }) }));
  act(() => tree.unmount());
});

it('blocks text generation without a protagonist even when both title and body are present', async () => {
  jest.mocked(loadHeroSavedFaces).mockResolvedValue([]);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" title="겨울에는 귤이지" memo="귤을 먹었다" ink="#222" onApply={jest.fn()} onClose={jest.fn()} />); });
  const button = tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0];
  expect(button.props.disabled).toBe(true);
  await act(async () => button.props.onPress());
  expect(generateHeroImages).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

it('confirms a long-pressed protagonist before deleting and disables generation when the selected face is removed', async () => {
  const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
  jest.mocked(deleteHeroFace).mockResolvedValue([]);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" title="겨울에는 귤이지" ink="#222" onApply={jest.fn()} onClose={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.disabled).toBe(false);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-face-0' })[0].props.onLongPress());
  expect(deleteHeroFace).not.toHaveBeenCalled();
  const buttons = alert.mock.calls.at(-1)![2]!;
  expect(buttons.some(button => button.style === 'cancel')).toBe(true);
  await act(async () => { buttons.find(button => button.style === 'destructive')!.onPress?.(); });
  expect(deleteHeroFace).toHaveBeenCalledWith('person');
  expect(tree.root.findAllByProps({ testID: 'hero-inline-face-0' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.disabled).toBe(true);
  act(() => tree.unmount());
  alert.mockRestore();
});

it('loads the remaining count above the generate icon and refreshes when reopened', async () => {
  let tree!: ReactTestRenderer;
  const render = (visible: boolean) => <HeroInlineComposer visible={visible} sceneId="05-work" ink="#222" onApply={jest.fn()} onClose={jest.fn()} />;
  await act(async () => { tree = create(render(true)); });
  expect(getHeroAiRemaining).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-remaining' })[0].props.children).toBe('comicDay.inline.remaining');
  jest.mocked(getHeroAiRemaining).mockResolvedValue(100000);
  await act(async () => tree.update(render(false)));
  await act(async () => tree.update(render(true)));
  expect(getHeroAiRemaining).toHaveBeenCalledTimes(2);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-remaining' })[0].props.children).toBe('comicDay.inline.unlimited');
  act(() => tree.unmount());
});


it('does not schedule layout animations for keyboard events after returning to the cards', async () => {
  const listeners = new Map<string, (event: any) => void>();
  const subscribe = jest.spyOn(Keyboard, 'addListener').mockImplementation((name, callback) => {
    listeners.set(name, callback);
    return { remove: jest.fn() } as any;
  });
  const animate = jest.spyOn(Keyboard, 'scheduleLayoutAnimation').mockImplementation(() => undefined);
  const render = (visible: boolean) => <HeroInlineComposer visible={visible} sceneId="05-work" ink="#222" onApply={jest.fn()} onClose={jest.fn()} />;
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { tree = create(render(true)); });
    act(() => listeners.get('keyboardWillShow')?.({ endCoordinates: { screenY: 500 }, duration: 250 }));
    expect(animate).toHaveBeenCalledTimes(1);
    act(() => tree.update(render(false)));
    animate.mockClear();
    act(() => listeners.get('keyboardWillHide')?.({ duration: 250 }));
    expect(animate).not.toHaveBeenCalled();
  } finally {
    act(() => tree?.unmount());
    subscribe.mockRestore(); animate.mockRestore();
  }
});
