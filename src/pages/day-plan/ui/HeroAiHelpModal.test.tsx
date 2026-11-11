import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroAiHelpModal } from './HeroAiHelpModal';

jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ locale: 'ko', t: (key: string) => key }) }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').Modal }));
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: jest.requireActual('react-native').View }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));

it('opens the visual walkthrough and closes from the header', async () => {
  const close = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroAiHelpModal onClose={close} />); });
  const byId = (id: string) => tree.root.findAllByProps({ testID: id })[0];
  expect(byId('hero-ai-visual-guide')).toBeTruthy();
  expect(tree.root.findAllByProps({ testID: 'hero-help-video' })).toHaveLength(0);
  act(() => byId('hero-help-mode-1').props.onPress());
  expect(byId('hero-help-mode-1').props.accessibilityState.selected).toBe(true);
  act(() => byId('hero-ai-help-close').props.onPress());
  expect(close).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
