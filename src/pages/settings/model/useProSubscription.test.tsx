import { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Purchases from 'react-native-purchases';
import { useProSubscription } from './useProSubscription';
import { manageSubscription } from '@features/subscriptions';

jest.mock('react-native-purchases', () => ({ __esModule: true, default: { getOfferings: jest.fn(), purchasePackage: jest.fn(), invalidateCustomerInfoCache: jest.fn() } }));
const mockState = { hydrate: jest.fn(), isConfigured: true, refreshCustomerInfo: jest.fn(), customerInfo: null as unknown, applyCustomerInfo: jest.fn() };
const mockRestore = jest.fn();
jest.mock('@features/subscriptions', () => ({
  useSubscriptionStore: Object.assign((selector: (state: typeof mockState) => unknown) => selector(mockState), { getState: () => mockState }),
  getActiveProEntitlement: (info: { entitlement?: unknown } | null) => info?.entitlement ?? null,
  manageSubscription: jest.fn(),
  selectIsPro: (state: typeof mockState) => !!(state.customerInfo as { pro?: boolean } | null)?.pro,
  restorePurchases: (...args: unknown[]) => mockRestore(...args),
}));
let hook: ReturnType<typeof useProSubscription>;
let tree: ReactTestRenderer;
function Harness() {
  const value = useProSubscription();
  useLayoutEffect(() => { hook = value; });
  return null;
}
const monthly = { product: { identifier: 'monthly', priceString: '₩3,000' } };
beforeEach(() => {
  jest.clearAllMocks();
  mockState.isConfigured = true;
  mockState.customerInfo = null;
  mockState.hydrate.mockResolvedValue(undefined);
  mockState.applyCustomerInfo.mockImplementation(info => { mockState.customerInfo = info; });
  jest.mocked(Purchases.getOfferings).mockResolvedValue({ current: { monthly, annual: null } } as never);
});
afterEach(() => { act(() => tree?.unmount()); });
async function mount() { await act(async () => { tree = create(<Harness />); }); }
it('uses actual Offering packages and activates only the returned entitlement', async () => {
  await mount();
  expect(hook.status).toBe('ready');
  expect(hook.packages.monthly?.product.priceString).toBe('₩3,000');
  jest.mocked(Purchases.purchasePackage).mockResolvedValue({ customerInfo: { pro: true } } as never);
  await act(async () => { expect(await hook.transact('monthly')).toBe('active'); });
  expect(Purchases.purchasePackage).toHaveBeenCalledWith(monthly);
});
it('does not offer unavailable packages and handles missing Offerings', async () => {
  jest.mocked(Purchases.getOfferings).mockResolvedValue({ current: null } as never);
  await mount();
  expect(hook.status).toBe('unavailable');
  expect(await hook.transact('yearly')).toBe('unavailable');
  expect(Purchases.purchasePackage).not.toHaveBeenCalled();
});
it('handles unavailable configuration and fetch failures', async () => {
  mockState.isConfigured = false;
  await mount();
  expect(hook.status).toBe('unavailable');
  expect(Purchases.getOfferings).not.toHaveBeenCalled();
  mockState.isConfigured = true;
  jest.mocked(Purchases.getOfferings).mockRejectedValue(new Error('offline'));
  await act(async () => { await hook.reload(); });
  expect(hook.status).toBe('error');
});
it('handles cancellation without granting access', async () => {
  await mount();
  jest.mocked(Purchases.purchasePackage).mockRejectedValue({ userCancelled: true });
  await act(async () => { expect(await hook.transact('monthly')).toBe('cancelled'); });
  expect(mockState.applyCustomerInfo).not.toHaveBeenCalled();
  expect(hook.busy).toBe(false);
});
it('distinguishes a purchase without Pro from an active restoration', async () => {
  await mount();
  jest.mocked(Purchases.purchasePackage).mockResolvedValue({ customerInfo: { pro: false } } as never);
  await act(async () => { expect(await hook.transact('monthly')).toBe('none'); });
  mockRestore.mockResolvedValue({ ok: true, customerInfo: { pro: true } });
  await act(async () => { expect(await hook.transact()).toBe('active'); });
});
it('prevents duplicate transactions while a purchase is pending', async () => {
  await mount();
  let complete!: (value: never) => void;
  jest.mocked(Purchases.purchasePackage).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => {
    const first = hook.transact('monthly');
    expect(await hook.transact('monthly')).toBe('cancelled');
    complete({ customerInfo: { pro: true } } as never);
    await first;
  });
  expect(Purchases.purchasePackage).toHaveBeenCalledTimes(1);
});

it('blocks a second new purchase for an existing Pro subscriber', async () => {
  mockState.customerInfo = { pro: true, entitlement: { productIdentifier: 'monthly' } };
  await mount();
  expect(hook.currentPlan).toBe('monthly');
  expect(await hook.transact('monthly')).toBe('unavailable');
  expect(Purchases.purchasePackage).not.toHaveBeenCalled();
});

it('refreshes after store management without claiming the selected plan is active', async () => {
  mockState.customerInfo = { pro: true, entitlement: { productIdentifier: 'monthly' } };
  jest.mocked(manageSubscription).mockResolvedValue('opened');
  await mount();
  await act(async () => { expect(await hook.manage()).toBe('opened'); });
  expect(Purchases.invalidateCustomerInfoCache).toHaveBeenCalledTimes(1);
  expect(mockState.refreshCustomerInfo).toHaveBeenCalledTimes(1);
  expect(hook.currentPlan).toBe('monthly');
  expect(Purchases.purchasePackage).not.toHaveBeenCalled();
});
it('keeps Test Store management separate from real store changes', async () => {
  mockState.customerInfo = { pro: true, entitlement: { productIdentifier: 'monthly', store: 'TEST_STORE' } };
  jest.mocked(manageSubscription).mockResolvedValue('test_store');
  await mount();
  await act(async () => { expect(await hook.manage()).toBe('test_store'); });
  expect(mockState.refreshCustomerInfo).not.toHaveBeenCalled();
});
