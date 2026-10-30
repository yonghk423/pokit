import { HeroSavedPhotos } from './HeroSavedPhotos';
import { AppAlert } from '@shared/lib/app-alert';
import { HeroPhotoPreview } from './HeroPhotoPreview';
import { StyleSheet } from 'react-native';
import { getHeroAiRemaining, resumeHeroAiJob, generateHeroImages } from '../lib/heroAiClient';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroPersonalizationFlow } from './HeroPersonalizationFlow';
import { HeroPhotoSource } from './HeroPhotoSource';
import { ComicGalleryCard } from './HeroGalleryCard';
jest.mock('../lib/heroAiClient', () => ({ ...jest.requireActual('../lib/heroAiClient'), getHeroAiRemaining: jest.fn().mockRejectedValue(new Error('offline')), resumeHeroAiJob: jest.fn(), generateHeroImages: jest.fn() }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
jest.mock('./HeroGalleryCard', () => ({ ComicGalleryCard: () => null }));
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: () => null }));

it('requires a photo, caps face scenes at three, and restores capacity on deselection', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPersonalizationFlow onClose={jest.fn()} />); });
  const next = () => tree.root.findAllByProps({ testID: 'hero-personal-next' })[0];
  expect(next().props.disabled).toBe(true);
  act(() => tree.root.findByType(HeroPhotoSource).props.onChange('file:///face.jpg'));
  act(() => next().props.onPress());
  expect(next().props.disabled).toBe(true);
  const ids = tree.root.findAllByType(ComicGalleryCard).slice(0, 4).map(card => card.props.id);
  const tap = (id: string) => tree.root.findAllByType(ComicGalleryCard).find(card => card.props.id === id)!.props.onToggle(id);
  for (const id of ids) act(() => tap(id));
  expect(tree.root.findAllByType(ComicGalleryCard).filter(card => card.props.order > 0)).toHaveLength(3);
  expect(tree.root.findAllByProps({ testID: 'hero-daily-limit-warning' }).length).toBeGreaterThan(0);
  act(() => tap(ids[0]));
  expect(tree.root.findAllByProps({ testID: 'hero-daily-limit-warning' })).toHaveLength(0);
  act(() => tap(ids[3]));
  expect(tree.root.findAllByType(ComicGalleryCard).filter(card => card.props.order > 0)).toHaveLength(3);
  act(() => tree.unmount());
});

it('keeps the initial whole photo and caps added photos at three', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPersonalizationFlow initialMode="photo" onClose={jest.fn()} />); });
  act(() => tree.root.findByType(HeroPhotoSource).props.onChange('file:///one.jpg'));
  act(() => tree.root.findAllByProps({ testID: 'hero-personal-next' })[0].props.onPress());
  expect(tree.root.findByType(HeroPhotoSource).props.selectionLimit).toBe(2);
  expect(tree.root.findAllByType(HeroPhotoPreview)[0].props.uri).toBe('file:///one.jpg');
  const cardSize = () => StyleSheet.flatten(tree.root.findAllByProps({ testID: 'hero-selected-photo-card' })[0].props.style);
  expect(cardSize().height).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-selected-photo-grid' })[0].props.onLayout({ nativeEvent: { layout: { width: 350 } } }));
  expect(cardSize().width).toBe(170);
  expect(cardSize().height).toBeCloseTo(170);

  act(() => tree.root.findByType(HeroPhotoSource).props.onSelect(['file:///two.jpg', 'file:///three.jpg', 'file:///four.jpg']));
  expect(tree.root.findAllByType(HeroPhotoSource)).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-daily-limit-warning' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});


it('generates once on repeated taps, previews saved files and applies only returned results', async () => {
  const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
  const images = [{ uri: 'file:///hero-ai/generated.png', sceneId: '05-work' as const }];
  jest.mocked(generateHeroImages).mockResolvedValue({ images, remaining: 2 });
  const apply = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow initialMode="photo" onClose={jest.fn()} onApply={apply} />); });
  act(() => tree.root.findByType(HeroPhotoSource).props.onChange('file:///source.jpg'));
  const next = () => tree.root.findAllByProps({ testID: 'hero-personal-next' })[0];
  act(() => next().props.onPress());
  await act(async () => { next().props.onPress(); next().props.onPress(); });
  expect(generateHeroImages).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledTimes(1);
  const confirm = alert.mock.calls[0][2]![1].onPress!;
  await act(async () => { confirm(); confirm(); });
  expect(generateHeroImages).toHaveBeenCalledTimes(1);
  expect(apply).not.toHaveBeenCalled();
  const button = tree.root.findAllByProps({ testID: 'hero-result-apply' })[0];
  act(() => button.props.onPress());
  expect(apply).toHaveBeenCalledWith(images);
  act(() => tree.unmount());
  alert.mockRestore();
});


it('resumes a persisted request on mount without requiring the original picker photo or a generate tap', async () => {
  const images = [{ uri: 'file:///restored.png' }];
  jest.mocked(resumeHeroAiJob).mockResolvedValue({ images, remaining: 1 });
  const recoveryJob = { id: 'hero-restored-123', mode: 'photo' as const, scenes: [], count: 2, inputsPath: 'file:///inputs.json', createdAt: 1 };
  const apply = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow recoveryJob={recoveryJob} onClose={jest.fn()} onApply={apply} />); });
  expect(resumeHeroAiJob).toHaveBeenCalledWith(recoveryJob, expect.any(Function));
  expect(tree.root.findAllByType(HeroPhotoSource)).toHaveLength(0);
  expect(apply).not.toHaveBeenCalled();
  act(() => tree.unmount());
});


it('uses the remaining quota as the selection limit and preserves selection across gallery sizes', async () => {
  jest.mocked(getHeroAiRemaining).mockResolvedValueOnce(1);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow onClose={jest.fn()} />); });
  act(() => tree.root.findByType(HeroPhotoSource).props.onChange('file:///face.jpg'));
  act(() => tree.root.findAllByProps({ testID: 'hero-personal-next' })[0].props.onPress());
  const cards = () => tree.root.findAllByType(ComicGalleryCard);
  const ids = cards().slice(0, 2).map(card => card.props.id);
  act(() => cards()[0].props.onToggle(ids[0]));
  act(() => cards()[1].props.onToggle(ids[1]));
  expect(cards().filter(card => card.props.order > 0)).toHaveLength(1);
  const heading = tree.root.findAll(node => node.props.children === 'comicDay.personal.count');
  expect(heading.length).toBeGreaterThan(0);
  const mode = tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.viewOne' && typeof node.props.onPress === 'function')[0];
  act(() => mode.props.onPress());
  expect(cards()[0].props.columns).toBe(1);
  expect(cards()[0].props.order).toBe(1);
  act(() => tree.unmount());
});

it('limits added photos to the remaining quota and blocks generation when exhausted', async () => {
  jest.mocked(getHeroAiRemaining).mockResolvedValueOnce(1);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow initialMode="photo" onClose={jest.fn()} />); });
  act(() => tree.root.findByType(HeroPhotoSource).props.onChange('file:///source.jpg'));
  act(() => tree.root.findAllByProps({ testID: 'hero-personal-next' })[0].props.onPress());
  expect(tree.root.findAllByType(HeroPhotoSource)).toHaveLength(0);
  act(() => tree.unmount());
  jest.mocked(getHeroAiRemaining).mockResolvedValueOnce(0);
  await act(async () => { tree = create(<HeroPersonalizationFlow initialMode="photo" onClose={jest.fn()} />); });
  act(() => tree.root.findByType(HeroPhotoSource).props.onChange('file:///source.jpg'));
  expect(tree.root.findAllByProps({ testID: 'hero-personal-next' })[0].props.disabled).toBe(true);
  expect(tree.root.findByType(HeroPhotoSource).props.selectionLimit).toBe(0);
  expect(JSON.stringify(tree.toJSON())).toContain('comicDay.ai.exhausted');
  act(() => tree.unmount());
});


it('shows the chosen name as the photo source screen title', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPersonalizationFlow characterName="  서연  " onClose={jest.fn()} />); });
  expect(tree.root.findAll(node => node.props.children === '서연').length).toBeGreaterThan(0);
  expect(tree.root.findAll(node => node.props.children === 'comicDay.personal.title')).toHaveLength(0);
  act(() => tree.unmount());
});


it('filters AI face scenes by category and search without losing selected scenes', async () => {
  const { COMIC_SCENE_CATEGORIES, comicSceneMatchesCategory } = jest.requireActual('../lib/heroSceneImages');
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow onClose={jest.fn()} />); });
  act(() => tree.root.findByType(HeroPhotoSource).props.onChange('file:///face.jpg'));
  act(() => tree.root.findAllByProps({ testID: 'hero-personal-next' })[0].props.onPress());
  const cards = () => tree.root.findAllByType(ComicGalleryCard);
  const id = cards()[0].props.id;
  act(() => cards()[0].props.onToggle(id));
  const category = COMIC_SCENE_CATEGORIES.find((item: { id: string }) => item.id !== 'all');
  const tab = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  act(() => tab(category.label).props.onPress());
  expect(cards().length).toBeGreaterThan(0);
  expect(cards().every(card => comicSceneMatchesCategory(card.props.id, category.id))).toBe(true);
  const search = tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.search' && typeof node.props.onChangeText === 'function')[0];
  act(() => search.props.onChangeText('no-matching-scene'));
  expect(cards()).toHaveLength(0);
  act(() => search.props.onChangeText(''));
  act(() => tab(COMIC_SCENE_CATEGORIES[0].label).props.onPress());
  expect(cards().find(card => card.props.id === id)!.props.order).toBe(1);
  act(() => tree.unmount());
});

it.each([true, false])('reserves the quota row during loading and after completion (success: %s)', async success => {
  let resolve!: (value: number) => void;
  let reject!: (error: Error) => void;
  jest.mocked(getHeroAiRemaining).mockReturnValueOnce(new Promise<number>((yes, no) => { resolve = yes; reject = no; }));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow onClose={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-quota-skeleton' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'hero-quota-slot' })[0].props.accessibilityState.busy).toBe(true);
  await act(async () => { if (success) resolve(2); else reject(new Error('offline')); });
  expect(tree.root.findAllByProps({ testID: 'hero-quota-skeleton' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-quota-slot' })[0].props.accessibilityState.busy).toBe(false);
  act(() => tree.unmount());
});


it('allows up to three photos from the first picker and carries all of them into generation', async () => {
  jest.mocked(getHeroAiRemaining).mockResolvedValueOnce(3);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow onClose={jest.fn()} />); });
  expect(tree.root.findByType(HeroPhotoSource).props.selectionLimit).toBe(3);
  act(() => {
    tree.root.findByType(HeroPhotoSource).props.onChange('file:///one.jpg');
    tree.root.findByType(HeroPhotoSource).props.onSelect(['file:///one.jpg', 'file:///two.jpg', 'file:///three.jpg', 'file:///four.jpg']);
  });
  act(() => tree.root.findAllByProps({ testID: 'hero-personal-next' })[0].props.onPress());
  expect(tree.root.findAllByType(HeroPhotoPreview).map(node => node.props.uri)).toEqual(['file:///one.jpg', 'file:///two.jpg', 'file:///three.jpg']);
  act(() => tree.unmount());
});


it('keeps selected photos when cancelling the generation confirmation and can ask again', async () => {
  const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
  jest.mocked(generateHeroImages).mockClear();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPersonalizationFlow initialMode="photo" onClose={jest.fn()} />); });
  act(() => tree.root.findByType(HeroPhotoSource).props.onChange('file:///keep.jpg'));
  const next = () => tree.root.findAllByProps({ testID: 'hero-personal-next' })[0];
  act(() => next().props.onPress());
  act(() => next().props.onPress());
  act(() => alert.mock.calls[0][2]![0].onPress!());
  expect(generateHeroImages).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(HeroPhotoPreview)[0].props.uri).toBe('file:///keep.jpg');
  act(() => next().props.onPress());
  expect(alert).toHaveBeenCalledTimes(2);
  act(() => alert.mock.calls[1][3]!.onDismiss!());
  act(() => next().props.onPress());
  expect(alert).toHaveBeenCalledTimes(3);
  act(() => tree.unmount());
  alert.mockRestore();
});

it('shows a visible recovery error with retry rather than leaving an empty recovery screen', async () => {
  const { HeroAiError } = jest.requireActual('../lib/heroAiClient');
  jest.mocked(resumeHeroAiJob).mockRejectedValueOnce(new HeroAiError('connection'));
  const recoveryJob = { id: 'hero-failed-123', mode: 'photo' as const, scenes: [], count: 1, inputsPath: 'file:///inputs.json', createdAt: 1 };
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow recoveryJob={recoveryJob} onClose={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-recovery-error' }).length).toBeGreaterThan(0);
  expect(JSON.stringify(tree.toJSON())).toContain('comicDay.ai.connection');
  jest.mocked(resumeHeroAiJob).mockResolvedValueOnce({ images: [{ uri: 'file:///recovered.png' }], remaining: 2 });
  await act(async () => tree.root.findAllByProps({ testID: 'hero-recovery-retry' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-result-apply' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});


it('allows saved photos to be reused even with zero remaining generations', async () => {
  jest.mocked(getHeroAiRemaining).mockResolvedValueOnce(0);
  const reuse = jest.fn();
  const calls = jest.mocked(generateHeroImages).mock.calls.length;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow onClose={jest.fn()} onReuse={reuse} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-saved-open' })[0].props.onPress());
  const photos = [{ uri: 'file:///saved.png' }];
  act(() => tree.root.findByType(HeroSavedPhotos).props.onApply(photos));
  expect(reuse).toHaveBeenCalledWith(photos);
  expect(jest.mocked(generateHeroImages).mock.calls.length).toBe(calls);
  act(() => tree.unmount());
});
