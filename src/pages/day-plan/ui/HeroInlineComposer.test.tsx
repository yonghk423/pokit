import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroInlineComposer } from './HeroInlineComposer';
import { HeroPhotoSource } from './HeroPhotoSource';
import { loadHeroSavedFaces } from '../lib/heroSavedFaces';
import { generateHeroImages, resumeHeroAiJob, cancelHeroAiJob, dismissHeroAiJob } from '../lib/heroAiClient';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: jest.requireActual('react-native').View }));
jest.mock('./HeroPhotoSource', () => ({ HeroPhotoSource: jest.requireActual('react-native').View, HeroPhotoIcon: () => null }));
jest.mock('../lib/heroSavedFaces', () => ({ loadHeroSavedFaces: jest.fn(async () => []), saveHeroFace: jest.fn(), deleteHeroFace: jest.fn() }));
jest.mock('../lib/heroAiClient', () => ({ generateHeroImages: jest.fn(), resumeHeroAiJob: jest.fn(), getPendingHeroAiJob: jest.fn(async () => null), cancelHeroAiJob: jest.fn(async () => undefined), dismissHeroAiJob: jest.fn(async () => undefined), HeroAiError: class extends Error {} }));
beforeEach(() => { jest.clearAllMocks(); jest.mocked(loadHeroSavedFaces).mockResolvedValue([]); jest.mocked(generateHeroImages).mockResolvedValue({ images: [{ uri: 'file:///result.png' }], remaining: 2 }); });
it('creates one image from writing and commits it to the same card before acknowledging the job', async () => {
  const apply = jest.fn(async () => { expect(dismissHeroAiJob).not.toHaveBeenCalled(); });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" targetDiaryId="diary" targetSceneId="scene" onApply={apply} onClose={jest.fn()} />); });
  const button = () => tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0];
  expect(button().props.disabled).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.onChangeText('카페에서 책을 읽었다.'));
  await act(async () => { button().props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ mode: 'photo', scenes: ['05-work'], photos: [], story: { text: '카페에서 책을 읽었다.', source: 'character' }, targetDiaryId: 'diary', targetSceneId: 'scene' }));
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
  expect(generateHeroImages).toHaveBeenCalledWith(expect.objectContaining({ photos: ['file:///source.jpg'], story: { text: '바닷가 여행', source: 'photo' } }));
  act(() => tree.unmount());
});
it('resumes the original job without submitting a new generation', async () => {
  jest.mocked(resumeHeroAiJob).mockResolvedValue({ images: [{ uri: 'file:///recovered.png' }], remaining: 2 });
  const job = { id: 'hero-recover', mode: 'photo' as const, count: 1, scenes: ['05-work' as const], inputsPath: 'file:///inputs', createdAt: 0, targetSceneId: 'original', story: { text: '기존 이야기', source: 'character' as const } };
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" recoveryJob={job} onApply={jest.fn(async () => undefined)} onClose={jest.fn()} />); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(resumeHeroAiJob).toHaveBeenCalledWith(job, expect.any(Function), expect.any(AbortSignal));
  expect(generateHeroImages).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

it('uses the saved person without a default character item and keeps upcoming styles informational', async () => {
  jest.mocked(loadHeroSavedFaces).mockResolvedValue([{ id: 'person', uri: 'file:///person.jpg' }]);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" ink="#222" onApply={jest.fn(async () => undefined)} onClose={jest.fn()} />); });
  expect(tree.root.findAll(node => node.props.children === 'comicDay.inline.protagonist')).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-face-0' })[0].props.accessibilityState.selected).toBe(true);
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
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-cancel-generation' })[0].props.onPress());
  expect(jest.mocked(generateHeroImages).mock.calls[0][0].signal?.aborted).toBe(true);
  await act(async () => { finish({ images: [{ uri: 'file:///late.png' }], remaining: 2 }); });
  expect(cancelHeroAiJob).toHaveBeenCalled();
  expect(apply).not.toHaveBeenCalled();
  expect(tree.root.findAllByProps({ testID: 'hero-inline-story' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});

it('keeps the composer neutral while preserving the target card colors on completion', async () => {
  const apply = jest.fn(async () => undefined);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroInlineComposer sceneId="05-work" paper="#B0E8D7" ink="#B22222" onApply={apply} onClose={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-inline-paper' })[0].props.style[1].backgroundColor).toBe('#F7F6F1');
  const input = tree.root.findAllByProps({ testID: 'hero-inline-story' })[0];
  expect(input.props.style[1].color).toBe('#343933');
  act(() => input.props.onChangeText('A story'));
  await act(async () => { tree.root.findAllByProps({ testID: 'hero-inline-generate' })[0].props.onPress(); await new Promise(resolve => setTimeout(resolve, 500)); });
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ paper: '#B0E8D7', pen: '#B22222' }), expect.any(String), expect.any(String));
  act(() => tree.unmount());
});
