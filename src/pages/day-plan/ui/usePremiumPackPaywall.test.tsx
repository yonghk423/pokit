import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { usePremiumPackPaywall } from './usePremiumPackPaywall';
import { markProIntroductionSeen } from '@features/subscriptions/lib/proIntroduction';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

let mockPromotion = true;
jest.mock('@shared/config/proPromotion', () => ({ PRO_FREE_ACCESS_END: '2026-12-01T00:00:00+09:00', isProFreeAccessActive: () => mockPromotion }));
jest.mock('../../settings/ui/ProPreviewPage', () => ({ ProPreviewPage: 'ProScreen' }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').View }));
let paywall!: ReturnType<typeof usePremiumPackPaywall>;
function Host() { paywall = usePremiumPackPaywall(); return paywall.modal; }
beforeEach(() => { mockPromotion = true; localStorageClient.removeItem('pokit:pro-promotion-introduction'); localStorageClient.removeItem('pokit:pro-introduction-seen'); });

it('shows the introduction once across pack downloads, remounts and other features', async () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Host />); });
  let first!: Promise<string>;
  act(() => { first = paywall.present(); });
  expect(tree.root.findAllByType('ProScreen' as never)).toHaveLength(1);
  act(() => tree.root.findByType('ProScreen' as never).props.onPromotionContinue());
  expect(await first).toBe('promotion');
  act(() => tree.unmount());
  act(() => { tree = create(<Host />); });
  await expect(paywall.present()).resolves.toBe('promotion');
  expect(tree.root.findAllByType('ProScreen' as never)).toHaveLength(0);
  act(() => tree.unmount());
});

it('does not repeat an introduction already viewed in another feature', async () => {
  markProIntroductionSeen();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Host />); });
  await expect(paywall.present()).resolves.toBe('promotion');
  expect(tree.toJSON()).toBeNull();
  act(() => tree.unmount());
});

it('never opens the introduction again after the promotion ends', async () => {
  markProIntroductionSeen();
  mockPromotion = false;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Host />); });
  await expect(paywall.present()).resolves.toBe('not_presented');
  expect(tree.root.findAllByType('ProScreen' as never)).toHaveLength(0);
  act(() => tree.unmount());
});

it('records the first view even outside a promotion and shares it across remounts', async () => {
  mockPromotion = false;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Host />); });
  let result!: Promise<string>;
  act(() => { result = paywall.present(); });
  expect(tree.root.findAllByType('ProScreen' as never)).toHaveLength(1);
  act(() => tree.root.findByType('ProScreen' as never).props.onClose());
  expect(await result).toBe('cancelled');
  act(() => tree.unmount());
  act(() => { tree = create(<Host />); });
  await expect(paywall.present()).resolves.toBe('not_presented');
  expect(tree.toJSON()).toBeNull();
  act(() => tree.unmount());
});

it('preserves an introduction already viewed before the policy change', async () => {
  localStorageClient.setJson('pokit:pro-promotion-introduction', '2026-12-01T00:00:00+09:00');
  mockPromotion = false;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Host />); });
  await expect(paywall.present()).resolves.toBe('not_presented');
  expect(tree.toJSON()).toBeNull();
  act(() => tree.unmount());
});
