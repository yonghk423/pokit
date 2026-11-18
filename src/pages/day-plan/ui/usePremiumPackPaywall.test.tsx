import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { usePremiumPackPaywall } from './usePremiumPackPaywall';
import { markProIntroductionSeen } from '@features/subscriptions/lib/proIntroduction';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';


jest.mock('../../settings/ui/ProPreviewPage', () => ({ ProPreviewPage: 'ProScreen' }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').View }));
let paywall!: ReturnType<typeof usePremiumPackPaywall>;
function Host() { paywall = usePremiumPackPaywall(); return paywall.modal; }
beforeEach(() => { localStorageClient.removeItem('pokit:pro-promotion-introduction'); localStorageClient.removeItem('pokit:pro-introduction-seen'); });

it('reopens the paywall after a previous introduction and returns the purchase result', async () => {
  markProIntroductionSeen();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Host />); });
  for (const result of ['cancelled', 'purchased']) {
    let pending!: Promise<string>;
    act(() => { pending = paywall.present(); });
    const screen = tree.root.findByType('ProScreen' as never);
    act(() => result === 'cancelled' ? screen.props.onClose() : screen.props.onActivated(result));
    expect(await pending).toBe(result);
  }
  act(() => tree.unmount());
});
