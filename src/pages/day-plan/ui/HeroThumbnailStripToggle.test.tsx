import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { clearPokitLocalStorage } from '@shared/lib/storage/localStorageClient';
import { isHeroThumbnailStripCollapsed } from '@shared/lib/storage/heroThumbnailStripStorage';
import { HeroThumbnailStripToggle } from './HeroThumbnailStripToggle';

jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ locale: 'ko' }) }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));
beforeEach(async () => { await clearPokitLocalStorage(); });

it('toggles the strip and restores its last state after remounting', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroThumbnailStripToggle isDark={false} enabled />); });
  const button = () => tree.root.findAllByProps({ testID: 'hero-thumbnail-strip-toggle' })[0];
  expect(button().props.accessibilityState.expanded).toBe(true);
  act(() => button().props.onPress());
  expect(isHeroThumbnailStripCollapsed()).toBe(true);
  expect(button().props.accessibilityState.expanded).toBe(false);
  act(() => tree.unmount());
  act(() => { tree = create(<HeroThumbnailStripToggle isDark={false} enabled />); });
  expect(button().props.accessibilityState.expanded).toBe(false);
  act(() => button().props.onPress());
  expect(isHeroThumbnailStripCollapsed()).toBe(false);
  act(() => tree.unmount());
});
