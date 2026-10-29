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
  act(() => tree.root.findByType(HeroPhotoSource).props.onSelect(['file:///two.jpg', 'file:///three.jpg', 'file:///four.jpg']));
  expect(tree.root.findAllByType(HeroPhotoSource)).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-daily-limit-warning' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});


it('generates once on repeated taps, previews saved files and applies only returned results', async () => {
  const images = [{ uri: 'file:///hero-ai/generated.png', sceneId: '05-work' as const }];
  jest.mocked(generateHeroImages).mockResolvedValue({ images, remaining: 2 });
  const apply = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPersonalizationFlow initialMode="photo" onClose={jest.fn()} onApply={apply} />); });
  act(() => tree.root.findByType(HeroPhotoSource).props.onChange('file:///source.jpg'));
  const next = () => tree.root.findAllByProps({ testID: 'hero-personal-next' })[0];
  act(() => next().props.onPress());
  await act(async () => { next().props.onPress(); next().props.onPress(); });
  expect(generateHeroImages).toHaveBeenCalledTimes(1);
  expect(apply).not.toHaveBeenCalled();
  const button = tree.root.findAllByProps({ testID: 'hero-result-apply' })[0];
  act(() => button.props.onPress());
  expect(apply).toHaveBeenCalledWith(images);
  act(() => tree.unmount());
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
