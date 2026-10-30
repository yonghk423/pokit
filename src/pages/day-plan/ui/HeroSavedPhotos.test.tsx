import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroSavedPhotos } from './HeroSavedPhotos';
import { loadHeroAiLibrary } from '../lib/heroAiLibrary';
jest.mock('../lib/heroAiLibrary', () => ({ loadHeroAiLibrary: jest.fn() }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
it('reuses selected local images in selection order without generating images', async () => {
  const images = [{ uri: 'file:///one.png' }, { uri: 'file:///two.png' }];
  jest.mocked(loadHeroAiLibrary).mockResolvedValue(images);
  const onApply = jest.fn(); let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroSavedPhotos onBack={jest.fn()} onApply={onApply} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-saved-apply' })[0].props.disabled).toBe(true);
  const cards = () => tree.root.findAllByProps({ testID: 'hero-saved-photo' }).filter(node => typeof node.props.onPress === 'function');
  act(() => cards()[1].props.onPress());
  act(() => cards()[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-saved-apply' })[0].props.onPress());
  expect(onApply).toHaveBeenCalledWith([images[1], images[0]]);
  act(() => tree.unmount());
});
